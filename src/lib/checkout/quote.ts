import "server-only";
import { getCatalog, getDeliveryMethods } from "@/lib/data/public";
import { createServiceClient } from "@/lib/supabase/server";
import type { CartItemInput } from "./validation";
import type { Product } from "@/lib/types";

export interface QuoteLine {
  index: number;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  error: string | null;
  leadDays: number;
}

export interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  couponError: string | null;
  couponApplied: string | null;
  deliveryFee: number;
  total: number;
  minDate: number; // días mínimos de anticipación
  hasErrors: boolean;
}

/** Valida la personalización contra la definición del producto (servidor). */
export function validateCustomization(product: Product, values: Record<string, string>): string | null {
  const fields = product.customization_fields ?? [];
  const known = new Set(fields.map((f) => f.key));
  for (const k of Object.keys(values)) if (!known.has(k)) return "Personalización no válida.";
  for (const f of fields) {
    if (f.type === "image") continue;
    const v = (values[f.key] ?? "").trim();
    if (f.required && !v) return `Falta «${f.label}» en ${product.name}.`;
    if (!v) continue;
    if (f.maxLength && v.length > f.maxLength) return `«${f.label}» es demasiado largo.`;
    if (f.type === "select" && f.options?.length && !f.options.includes(v)) return `Opción no válida en «${f.label}».`;
    if (f.type === "number" && (!/^-?\d+(\.\d+)?$/.test(v) || (f.min != null && Number(v) < f.min) || (f.max != null && Number(v) > f.max))) return `Valor no válido en «${f.label}».`;
    if (f.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return `Fecha no válida en «${f.label}».`;
  }
  return null;
}

/** Cotización autoritativa: precios desde la base de datos, nunca desde el navegador. */
export async function quoteCart(items: CartItemInput[], couponCode: string, deliveryMethodId: string | null): Promise<Quote> {
  const [{ products }, methods] = await Promise.all([getCatalog(), getDeliveryMethods()]);
  const byId = new Map(products.map((p) => [p.id, p]));
  let subtotal = 0;
  let minDate = 0;
  const lines: QuoteLine[] = items.map((it, index) => {
    const p = byId.get(it.product_id);
    if (!p) return { index, name: "Producto no disponible", unitPrice: 0, quantity: it.quantity, lineTotal: 0, error: "Este producto ya no está disponible.", leadDays: 0 };
    const vs = p.variants ?? [];
    const v = vs.length ? vs.find((x) => x.id === it.variant_id) : null;
    let error: string | null = null;
    if (p.stock_status === "agotado") error = "Producto agotado.";
    else if (vs.length && !v) error = "La opción elegida ya no está disponible.";
    else if (it.quantity < p.min_quantity || it.quantity > p.max_quantity || (it.quantity - p.min_quantity) % p.quantity_step !== 0)
      error = `Cantidad no válida (mínimo ${p.min_quantity}, máximo ${p.max_quantity}).`;
    else error = validateCustomization(p, it.customization);
    const unitPrice = v ? v.price : p.price;
    const lineTotal = unitPrice * it.quantity;
    if (!error) subtotal += lineTotal;
    minDate = Math.max(minDate, p.prep_days_min);
    return { index, name: v ? `${p.name} · ${v.name}` : p.name, unitPrice, quantity: it.quantity, lineTotal, error, leadDays: p.prep_days_min };
  });

  let discount = 0;
  let couponError: string | null = null;
  let couponApplied: string | null = null;
  if (couponCode.trim()) {
    const { data, error } = await createServiceClient().rpc("coupon_discount", { p_code: couponCode, p_subtotal: subtotal });
    const row = Array.isArray(data) ? data[0] : data;
    if (error) couponError = "No se pudo validar el cupón.";
    else if (row?.error) couponError = row.error;
    else if (row?.code) {
      discount = row.discount ?? 0;
      couponApplied = row.code;
    }
  }
  const method = methods.find((m) => m.id === deliveryMethodId);
  const deliveryFee = method?.price ?? 0;
  return {
    lines,
    subtotal,
    discount,
    couponError,
    couponApplied,
    deliveryFee,
    total: Math.max(subtotal - discount, 0) + deliveryFee,
    minDate,
    hasErrors: lines.some((l) => l.error),
  };
}

"use server";
import { headers } from "next/headers";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { CartItemInput, CheckoutInput, orderErrorMessage } from "@/lib/checkout/validation";
import { quoteCart, type Quote } from "@/lib/checkout/quote";
import { getPaymentOptions } from "@/lib/checkout/options";
import { createServiceClient, createSessionClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data/public";
import { whatsappLink } from "@/lib/cms/settings";
import { startPsePayment } from "@/lib/payments/service";
import { getMpConfig } from "@/lib/payments/mercadopago/config";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { formatCOP, formatDate } from "@/lib/format";

const QuoteInput = z.object({
  items: z.array(CartItemInput).max(50),
  coupon: z.string().max(32).default(""),
  deliveryMethodId: z.uuid().nullable().default(null),
});

export async function quoteAction(input: unknown): Promise<{ ok: true; quote: Quote } | { ok: false; error: string }> {
  const parsed = QuoteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Carrito inválido." };
  const ip = clientIp(await headers());
  if (!rateLimit(`quote:${ip}`, 90, 60_000).ok) return { ok: false, error: "Demasiadas solicitudes. Espera un momento." };
  return { ok: true, quote: await quoteCart(parsed.data.items, parsed.data.coupon, parsed.data.deliveryMethodId) };
}

export type PlaceOrderResult =
  | { ok: true; orderUrl: string; redirectUrl?: string; whatsappUrl?: string; number: string; paymentError?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function placeOrderAction(input: unknown): Promise<PlaceOrderResult> {
  const h = await headers();
  const ip = clientIp(h);
  if (!rateLimit(`order:${ip}`, 8, 10 * 60_000).ok) return { ok: false, error: "Has realizado demasiados intentos. Espera unos minutos." };

  const parsed = CheckoutInput.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: "Revisa los datos marcados.", fieldErrors };
  }
  const data = parsed.data;

  const options = await getPaymentOptions();
  if (data.payment_method === "mercadopago_pse" && !options.pse) return { ok: false, error: options.pseReason ?? "PSE no está disponible." };
  if (data.payment_method === "whatsapp" && !options.whatsapp) return { ok: false, error: "El pedido por WhatsApp no está disponible." };

  // Validación autoritativa del carrito (precios, opciones, personalización).
  const quote = await quoteCart(data.items, data.coupon_code, data.delivery_method_id);
  const bad = quote.lines.find((l) => l.error);
  if (bad) return { ok: false, error: bad.error! };
  if (quote.couponError) return { ok: false, error: quote.couponError, fieldErrors: { coupon_code: quote.couponError } };

  // Usuario con sesión (opcional) para vincular el pedido a su cuenta.
  let userId: string | null = null;
  try {
    const { data: u } = await (await createSessionClient()).auth.getUser();
    userId = u.user?.id ?? null;
  } catch {}

  const db = createServiceClient();
  const payer = data.pse ? { entity_type: data.pse.entityType, id_type: data.pse.idType, id_last4: data.pse.idNumber.slice(-4), bank: data.pse.bank } : {};
  const { data: created, error } = await db.rpc("create_order", {
    p: {
      customer: data.customer,
      address: data.address,
      city: data.city,
      neighborhood: data.neighborhood,
      desired_date: data.desired_date,
      delivery_method_id: data.delivery_method_id,
      notes: data.notes,
      payment_method: data.payment_method,
      coupon_code: data.coupon_code,
      user_id: userId,
      payer,
      items: data.items,
    },
  });
  if (error || !created) {
    console.error("[create_order]", error?.message);
    return { ok: false, error: orderErrorMessage(error?.message ?? "") };
  }
  const order = created as { id: string; number: string; public_token: string; total: number };
  revalidateTag("orders", "max");
  const orderUrl = `/pedido/${order.public_token}`;

  if (data.payment_method === "mercadopago_pse") {
    try {
      const { redirectUrl } = await startPsePayment(order.id, { ...data.pse!, zipCode: data.zip_code }, ip);
      return { ok: true, orderUrl, redirectUrl, number: order.number };
    } catch (e) {
      console.error("[PSE]", (e as Error).message);
      return { ok: true, orderUrl, number: order.number, paymentError: "Tu pedido quedó registrado, pero no pudimos iniciar el pago con PSE. Puedes reintentarlo desde la página del pedido." };
    }
  }

  if (data.payment_method === "whatsapp") {
    const s = await getSettings();
    const lines = quote.lines.map((l) => `• ${l.quantity} × ${l.name} — ${formatCOP(l.lineTotal)}`);
    const msg = [
      `¡Hola! Acabo de hacer el pedido *${order.number}* en la tienda en línea.`,
      ...lines,
      `Total: *${formatCOP(order.total)}*`,
      `Fecha deseada: ${formatDate(data.desired_date)}`,
      `Nombre: ${data.customer.name}`,
    ].join("\n");
    return { ok: true, orderUrl, whatsappUrl: whatsappLink(s.whatsapp.number, msg) ?? undefined, number: order.number };
  }

  return { ok: true, orderUrl, number: order.number };
}

const RetryInput = z.object({
  token: z.uuid(),
  pse: z.object({
    entityType: z.enum(["individual", "association"]),
    idType: z.enum(["CC", "CE", "NIT", "TI", "PAS", "RC", "TE", "DI"]),
    idNumber: z.string().trim().regex(/^[0-9A-Za-z-]{4,20}$/),
    bank: z.string().trim().min(1).max(20),
    zipCode: z.string().trim().max(10).regex(/^\d*$/).default(""),
  }),
});

/** Reintenta el pago PSE de un pedido existente (p. ej. tras un rechazo o expiración). */
export async function retryPseAction(input: unknown): Promise<{ ok: true; redirectUrl: string } | { ok: false; error: string }> {
  const ip = clientIp(await headers());
  if (!rateLimit(`retry:${ip}`, 6, 10 * 60_000).ok) return { ok: false, error: "Demasiados intentos. Espera unos minutos." };
  const parsed = RetryInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los datos del pago." };
  if (!getMpConfig().configured) return { ok: false, error: "PSE no está disponible en este momento." };
  const db = createServiceClient();
  const { data: order } = await db.from("orders").select("id, status, payment_status").eq("public_token", parsed.data.token).maybeSingle();
  if (!order) return { ok: false, error: "Pedido no encontrado." };
  if (order.status === "cancelado" || ["aprobado", "en_proceso", "reembolsado"].includes(order.payment_status)) return { ok: false, error: "Este pedido no admite un nuevo pago." };
  try {
    const { redirectUrl } = await startPsePayment(order.id, parsed.data.pse, ip);
    await db.from("orders").update({ payment_method: "mercadopago_pse" }).eq("id", order.id);
    return { ok: true, redirectUrl };
  } catch (e) {
    console.error("[PSE retry]", (e as Error).message);
    return { ok: false, error: "No pudimos iniciar el pago con PSE. Intenta de nuevo más tarde." };
  }
}

/** Bancos PSE para el formulario (datos públicos). */
export async function pseBanksAction() {
  const { getPseInfo } = await import("@/lib/payments/mercadopago/client");
  if (!(await getPaymentOptions()).pse) return { ok: false as const, banks: [] };
  try {
    const info = await getPseInfo();
    return { ok: true as const, banks: info.banks, min: info.min, max: info.max };
  } catch {
    return { ok: false as const, banks: [] };
  }
}

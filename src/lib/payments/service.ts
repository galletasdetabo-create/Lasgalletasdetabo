import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import { getMpConfig } from "./mercadopago/config";
import { createPseOrder, getMpOrder, type MpOrder } from "./mercadopago/client";
import { canTransition, mapMpOrderStatus } from "./mercadopago/status";
import type { PaymentStatus } from "@/lib/types";

export interface PsePayer {
  entityType: "individual" | "association";
  idType: string;
  idNumber: string;
  bank: string;
  zipCode: string;
}

interface OrderRow {
  id: string;
  number: string;
  public_token: string;
  total: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  city: string;
  neighborhood: string;
  status: string;
  payment_status: PaymentStatus;
}

/**
 * Inicia un pago PSE: registra el intento, crea la orden en Mercado Pago y devuelve
 * la URL del banco. El pedido NO se marca como pagado aquí: eso solo ocurre cuando el
 * servidor consulta a Mercado Pago (webhook o verificación al regresar).
 */
export async function startPsePayment(orderId: string, payer: PsePayer, ip: string) {
  const cfg = getMpConfig();
  if (!cfg.configured) throw new Error("MP_NOT_CONFIGURED");
  const db = createServiceClient();
  const { data: order, error } = await db.from("orders").select("*").eq("id", orderId).single<OrderRow>();
  if (error || !order) throw new Error("ORDER_NOT_FOUND");
  if (order.status === "cancelado" || order.payment_status === "aprobado") throw new Error("ORDER_NOT_PAYABLE");

  const { data: payment, error: pErr } = await db
    .from("payments")
    .insert({ order_id: order.id, provider: "mercadopago", environment: cfg.environment, amount: order.total, status: "pendiente" })
    .select("id, idempotency_key")
    .single();
  if (pErr || !payment) throw new Error("PAYMENT_INSERT_FAILED");

  const [firstName, ...rest] = order.customer_name.trim().split(/\s+/);
  try {
    const mp = await createPseOrder({
      externalReference: order.number,
      amount: order.total,
      idempotencyKey: payment.idempotency_key,
      callbackUrl: `${SITE_URL}/pedido/${order.public_token}?pago=retorno`,
      ip,
      bank: payer.bank,
      payer: {
        email: order.customer_email,
        firstName: firstName || order.customer_name,
        lastName: rest.join(" ") || firstName || order.customer_name,
        entityType: payer.entityType,
        idType: payer.idType,
        idNumber: payer.idNumber,
        phone: order.customer_phone,
        zipCode: payer.zipCode,
        street: order.address || "Sin dirección",
        neighborhood: order.neighborhood || "N/A",
        city: order.city || "N/A",
      },
    });
    const redirect = mp.transactions?.payments?.[0]?.payment_method?.redirect_url ?? null;
    const status = mapMpOrderStatus(mp.status, mp.status_detail);
    await db
      .from("payments")
      .update({ provider_order_id: mp.id, provider_payment_id: mp.transactions?.payments?.[0]?.id ?? null, provider_status: mp.status, provider_status_detail: mp.status_detail ?? null, status, redirect_url: redirect, raw: sanitize(mp) })
      .eq("id", payment.id);
    await db.from("orders").update({ payment_status: status === "aprobado" ? "pendiente" : status }).eq("id", order.id);
    if (!redirect) throw new Error("MP_NO_REDIRECT");
    return { redirectUrl: redirect, paymentId: payment.id };
  } catch (e) {
    await db.from("payments").update({ status: "rechazado", provider_status: "error", provider_status_detail: (e as Error).message.slice(0, 200) }).eq("id", payment.id);
    throw e;
  }
}

/** Elimina datos innecesarios antes de guardar la respuesta del proveedor. */
function sanitize(o: MpOrder) {
  return {
    id: o.id,
    status: o.status,
    status_detail: o.status_detail,
    external_reference: o.external_reference,
    total_amount: o.total_amount,
    payments: (o.transactions?.payments ?? []).map((p) => ({ id: p.id, status: p.status, status_detail: p.status_detail, amount: p.amount, method: p.payment_method?.id })),
  };
}

/**
 * Consulta el estado REAL en Mercado Pago y lo aplica de forma idempotente.
 * Lo usan el webhook y la página de retorno. Devuelve null si la orden no es nuestra.
 */
export async function syncProviderOrder(providerOrderId: string) {
  const db = createServiceClient();
  const { data: payment } = await db.from("payments").select("id, order_id, status, amount, created_at").eq("provider_order_id", providerOrderId).maybeSingle();
  if (!payment) return null;
  const mp = await getMpOrder(providerOrderId);
  const next = mapMpOrderStatus(mp.status, mp.status_detail);

  // Defensa adicional: el monto y la referencia deben coincidir con el pedido.
  const { data: order } = await db.from("orders").select("id, number, total, status, payment_status").eq("id", payment.order_id).single();
  if (!order) return null;
  const paidAmount = Number(mp.total_amount ?? mp.transactions?.payments?.[0]?.amount ?? NaN);
  const mismatch = (mp.external_reference && mp.external_reference !== order.number) || (Number.isFinite(paidAmount) && Math.round(paidAmount) !== order.total);
  if (mismatch && next === "aprobado") {
    await db.from("payments").update({ provider_status: mp.status, provider_status_detail: "monto_o_referencia_no_coincide", raw: sanitize(mp) }).eq("id", payment.id);
    await db.from("order_status_history").insert({ order_id: order.id, kind: "note", note: "Alerta: Mercado Pago reportó un pago aprobado cuyo monto o referencia no coincide. Revisar manualmente." });
    return { status: payment.status as PaymentStatus, changed: false };
  }

  let changed = false;
  if (canTransition(payment.status as PaymentStatus, next)) {
    const { data: upd } = await db
      .from("payments")
      .update({ status: next, provider_status: mp.status, provider_status_detail: mp.status_detail ?? null, raw: sanitize(mp) })
      .eq("id", payment.id)
      .eq("status", payment.status) // concurrencia optimista: otra notificación pudo adelantarse
      .select("id");
    changed = !!upd?.length;
  } else {
    await db.from("payments").update({ provider_status: mp.status, provider_status_detail: mp.status_detail ?? null }).eq("id", payment.id);
  }

  if (changed) {
    // El pedido refleja el intento de pago más reciente.
    const { data: latest } = await db.from("payments").select("id").eq("order_id", order.id).order("created_at", { ascending: false }).limit(1).single();
    if (latest?.id === payment.id && canTransition(order.payment_status as PaymentStatus, next)) {
      const patch: Record<string, unknown> = { payment_status: next };
      if (next === "aprobado" && order.status === "pendiente") patch.status = "confirmado";
      await db.from("orders").update(patch).eq("id", order.id);
    }
  }
  return { status: changed ? next : (payment.status as PaymentStatus), changed };
}

/** Verifica el último intento PSE de un pedido (al regresar del banco). */
export async function refreshOrderPayment(orderId: string) {
  if (!getMpConfig().configured) return null;
  const db = createServiceClient();
  const { data: p } = await db
    .from("payments")
    .select("provider_order_id, status")
    .eq("order_id", orderId)
    .not("provider_order_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!p?.provider_order_id || ["aprobado", "reembolsado"].includes(p.status)) return null;
  try {
    return await syncProviderOrder(p.provider_order_id);
  } catch (e) {
    console.error("[refreshOrderPayment]", (e as Error).message);
    return null;
  }
}

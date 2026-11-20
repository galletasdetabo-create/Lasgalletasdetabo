import { createHash } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getMpConfig } from "@/lib/payments/mercadopago/config";
import { verifyMpSignature } from "@/lib/payments/mercadopago/signature";
import { syncProviderOrder } from "@/lib/payments/service";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Webhook de Mercado Pago (tópico "orders").
 * 1) valida la firma HMAC, 2) deduplica por x-request-id, 3) registra el evento,
 * 4) consulta el estado real en la API y 5) actualiza el pedido de forma idempotente.
 * Responde 200/201 rápido; ante un error interno responde 500 para que MP reintente.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`wh:${clientIp(req.headers)}`, 300, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const cfg = getMpConfig();
  const raw = await req.text();
  if (raw.length > 64_000) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  let body: Record<string, unknown> = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const url = req.nextUrl;
  const dataId = url.searchParams.get("data.id") ?? ((body.data as { id?: string })?.id ? String((body.data as { id: string }).id) : null);
  const topic = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? (body.type as string) ?? null;
  const action = (body.action as string) ?? null;
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  const db = createServiceClient();

  const sig = verifyMpSignature({ xSignature, xRequestId, dataId, secret: cfg.webhookSecret, toleranceSeconds: 60 * 60 * 24 * 3 });
  if (!sig.ok) {
    // Se registra el intento rechazado (sin procesarlo) para auditoría.
    await db.from("webhook_events").insert({
      dedupe_key: `rechazado:${crypto.randomUUID()}`,
      topic,
      action,
      resource_id: dataId,
      signature_valid: false,
      payload: { reason: sig.reason },
      status: "rejected",
      error: sig.reason,
    });
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const dedupeKey = xRequestId ? `req:${xRequestId}` : `hash:${createHash("sha256").update(raw + (xSignature ?? "")).digest("hex")}`;
  const { data: inserted, error: insErr } = await db
    .from("webhook_events")
    .insert({ dedupe_key: dedupeKey, topic, action, resource_id: dataId, signature_valid: true, payload: body, status: "processing" })
    .select("id")
    .maybeSingle();

  let eventId = inserted?.id as string | undefined;
  if (insErr) {
    // Notificación repetida (misma x-request-id): si ya se procesó, se confirma sin repetir efectos.
    const { data: prev } = await db.from("webhook_events").select("id, status, attempts").eq("dedupe_key", dedupeKey).maybeSingle();
    if (!prev) return NextResponse.json({ error: "store_failed" }, { status: 500 });
    if (prev.status === "processed" || prev.status === "ignored") return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    await db.from("webhook_events").update({ attempts: (prev.attempts ?? 1) + 1, status: "processing" }).eq("id", prev.id);
    eventId = prev.id;
  }

  const isOrderTopic = (topic ?? "").startsWith("order") || (action ?? "").startsWith("order.");
  if (!isOrderTopic || !dataId) {
    await db.from("webhook_events").update({ status: "ignored", processed_at: new Date().toISOString(), error: !dataId ? "sin data.id" : `tópico no gestionado: ${topic}` }).eq("id", eventId!);
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  try {
    const result = await syncProviderOrder(dataId);
    await db
      .from("webhook_events")
      .update({ status: result ? "processed" : "ignored", processed_at: new Date().toISOString(), error: result ? null : "orden no asociada a esta tienda" })
      .eq("id", eventId!);
    if (result?.changed) revalidateTag("orders", "max");
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    await db.from("webhook_events").update({ status: "error", error: (e as Error).message.slice(0, 500) }).eq("id", eventId!);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}

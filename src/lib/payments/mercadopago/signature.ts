import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Validación de la firma de webhooks de Mercado Pago.
 * Algoritmo verificado contra el SDK oficial (mercadopago-node 3.x, WebhookSignatureValidator):
 *   x-signature: "ts=<segundos>,v1=<hmac hex>"
 *   manifest:    "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"  (se omiten las partes ausentes)
 *   v1 = HMAC-SHA256(secret, manifest) en hexadecimal.
 * La documentación indica que los data.id alfanuméricos se firman en minúsculas,
 * por eso se acepta la variante en minúsculas además del valor recibido.
 */
export type SignatureFailure = "missing_secret" | "missing_header" | "malformed" | "missing_ts" | "missing_hash" | "mismatch" | "stale";

export function parseSignature(header: string) {
  let ts: string | undefined;
  const hashes: Record<string, string> = {};
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    const k = part.slice(0, i).trim().toLowerCase();
    const v = part.slice(i + 1).trim();
    if (!k || !v) continue;
    if (k === "ts") ts = v;
    else if (/^v\d+$/.test(k)) hashes[k] = v;
  }
  return { ts, hashes };
}

export function buildManifest(dataId: string | undefined, requestId: string | undefined, ts: string) {
  const parts: string[] = [];
  if (dataId) parts.push(`id:${dataId}`);
  if (requestId) parts.push(`request-id:${requestId}`);
  parts.push(`ts:${ts}`);
  return parts.join(";") + ";";
}

function safeEqualHex(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function verifyMpSignature(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
  toleranceSeconds?: number;
  now?: number;
}): { ok: true } | { ok: false; reason: SignatureFailure } {
  if (!input.secret) return { ok: false, reason: "missing_secret" };
  const header = input.xSignature?.trim();
  if (!header) return { ok: false, reason: "missing_header" };
  const { ts, hashes } = parseSignature(header);
  if (!ts && !Object.keys(hashes).length) return { ok: false, reason: "malformed" };
  if (!ts) return { ok: false, reason: "missing_ts" };
  if (!/^\d+$/.test(ts)) return { ok: false, reason: "malformed" };
  const received = hashes.v1;
  if (!received) return { ok: false, reason: "missing_hash" };

  const requestId = input.xRequestId?.trim() || undefined;
  const rawId = input.dataId?.trim() || undefined;
  const candidates = [...new Set([rawId, rawId?.toLowerCase()])];
  const match = candidates.some((id) => {
    const expected = createHmac("sha256", input.secret).update(buildManifest(id, requestId, ts)).digest("hex");
    return safeEqualHex(expected, received);
  });
  if (!match) return { ok: false, reason: "mismatch" };

  if (input.toleranceSeconds !== undefined) {
    const drift = Math.abs((input.now ?? Date.now()) - Number(ts) * 1000) / 1000;
    if (drift > input.toleranceSeconds) return { ok: false, reason: "stale" };
  }
  return { ok: true };
}

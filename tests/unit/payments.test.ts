import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildManifest, parseSignature, verifyMpSignature } from "@/lib/payments/mercadopago/signature";
import { canTransition, mapMpOrderStatus } from "@/lib/payments/mercadopago/status";

const secret = "test-secret";
const sign = (id: string | undefined, req: string | undefined, ts: string) => createHmac("sha256", secret).update(buildManifest(id, req, ts)).digest("hex");

describe("firma de webhooks de Mercado Pago", () => {
  it("construye el manifiesto como el SDK oficial", () => {
    expect(buildManifest("123", "abc", "1700000000")).toBe("id:123;request-id:abc;ts:1700000000;");
    expect(buildManifest(undefined, "abc", "1")).toBe("request-id:abc;ts:1;");
    expect(buildManifest("9", undefined, "1")).toBe("id:9;ts:1;");
  });

  it("interpreta la cabecera x-signature", () => {
    expect(parseSignature("ts=1704908010,v1=abc")).toEqual({ ts: "1704908010", hashes: { v1: "abc" } });
    expect(parseSignature(" ts = 5 , v1 = x , foo=bar ")).toEqual({ ts: "5", hashes: { v1: "x" } });
  });

  it("acepta una firma válida", () => {
    const ts = "1704908010";
    const v1 = sign("ORD123", "req-1", ts);
    expect(verifyMpSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: "req-1", dataId: "ORD123", secret })).toEqual({ ok: true });
  });

  it("acepta ids alfanuméricos firmados en minúsculas", () => {
    const ts = "1704908010";
    const v1 = sign("ord123", "req-1", ts);
    expect(verifyMpSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: "req-1", dataId: "ORD123", secret }).ok).toBe(true);
  });

  it("rechaza firmas alteradas, ausentes o con otro secreto", () => {
    const ts = "1704908010";
    const v1 = sign("ORD123", "req-1", ts);
    expect(verifyMpSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: "req-2", dataId: "ORD123", secret })).toEqual({ ok: false, reason: "mismatch" });
    expect(verifyMpSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: "req-1", dataId: "ORD999", secret })).toEqual({ ok: false, reason: "mismatch" });
    expect(verifyMpSignature({ xSignature: null, xRequestId: "req-1", dataId: "ORD123", secret })).toEqual({ ok: false, reason: "missing_header" });
    expect(verifyMpSignature({ xSignature: `v1=${v1}`, xRequestId: "req-1", dataId: "ORD123", secret })).toEqual({ ok: false, reason: "missing_ts" });
    expect(verifyMpSignature({ xSignature: `ts=${ts}`, xRequestId: "req-1", dataId: "ORD123", secret })).toEqual({ ok: false, reason: "missing_hash" });
    expect(verifyMpSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: "req-1", dataId: "ORD123", secret: "" })).toEqual({ ok: false, reason: "missing_secret" });
    expect(verifyMpSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: "req-1", dataId: "ORD123", secret: "otro" }).ok).toBe(false);
  });

  it("rechaza notificaciones demasiado antiguas cuando hay tolerancia", () => {
    const ts = "1000";
    const v1 = sign("1", "r", ts);
    expect(verifyMpSignature({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: "r", dataId: "1", secret, toleranceSeconds: 60, now: 1_000_000_000 })).toEqual({ ok: false, reason: "stale" });
  });
});

describe("estados de pago", () => {
  it("traduce los estados de la Orders API", () => {
    expect(mapMpOrderStatus("processed", "accredited")).toBe("aprobado");
    expect(mapMpOrderStatus("action_required", "waiting_transfer")).toBe("pendiente");
    expect(mapMpOrderStatus("processing", "in_process")).toBe("en_proceso");
    expect(mapMpOrderStatus("failed", "rejected_by_issuer")).toBe("rechazado");
    expect(mapMpOrderStatus("canceled")).toBe("cancelado");
    expect(mapMpOrderStatus("expired")).toBe("expirado");
    expect(mapMpOrderStatus("refunded")).toBe("reembolsado");
    expect(mapMpOrderStatus("charged_back")).toBe("reembolsado");
    expect(mapMpOrderStatus(undefined)).toBe("pendiente");
  });

  it("nunca retrocede un pago aprobado ni acepta transiciones inválidas", () => {
    expect(canTransition("pendiente", "aprobado")).toBe(true);
    expect(canTransition("pendiente", "en_proceso")).toBe(true);
    expect(canTransition("en_proceso", "pendiente")).toBe(false);
    expect(canTransition("aprobado", "pendiente")).toBe(false);
    expect(canTransition("aprobado", "rechazado")).toBe(false);
    expect(canTransition("aprobado", "reembolsado")).toBe(true);
    expect(canTransition("rechazado", "aprobado")).toBe(true);
    expect(canTransition("rechazado", "pendiente")).toBe(false);
    expect(canTransition("aprobado", "aprobado")).toBe(false);
  });
});

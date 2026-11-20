// SIMULADOR LOCAL de Mercado Pago (solo pruebas automatizadas).
// Reproduce los endpoints que usa la tienda: payment_methods, POST/GET /v1/orders,
// una página de "banco" para aprobar/rechazar y el envío de webhooks firmados (HMAC-SHA256).
// No procesa dinero ni se conecta con Mercado Pago.
//
// Uso: SIM_PORT=4599 SIM_APP_URL=http://localhost:7000 SIM_SECRET=sim-secret node scripts/mp-simulator.mjs
import http from "node:http";
import { createHmac, randomUUID } from "node:crypto";

const PORT = Number(process.env.SIM_PORT ?? 4599);
const APP = process.env.SIM_APP_URL ?? "http://localhost:7000";
const SECRET = process.env.SIM_SECRET ?? "sim-secret";
const TOKEN = process.env.SIM_TOKEN ?? "TEST-simulador";
const SELF = `http://127.0.0.1:${PORT}`;
const orders = new Map();
const byIdem = new Map();
const log = [];

const json = (res, code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => r(d)); });

export function sign(dataId, requestId, ts, secret = SECRET) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

async function notify(id, opts = {}) {
  const ts = Math.floor(Date.now() / 1000);
  const requestId = opts.requestId ?? randomUUID();
  const sig = opts.badSignature ? "0".repeat(64) : sign(id, requestId, ts);
  const res = await fetch(`${APP}/api/webhooks/mercadopago?data.id=${id}&type=order`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-signature": `ts=${ts},v1=${sig}`, "x-request-id": requestId },
    body: JSON.stringify({ action: "order.updated", type: "order", data: { id }, live_mode: false, date_created: new Date().toISOString() }),
  });
  log.push({ id, requestId, status: res.status });
  return { status: res.status, requestId };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, SELF);
  const p = url.pathname;

  // Endpoints de la API (requieren Bearer)
  if (p.startsWith("/v1/")) {
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return json(res, 401, { message: "invalid access token" });
    if (p === "/v1/payment_methods" && req.method === "GET") {
      return json(res, 200, [
        { id: "visa", payment_type_id: "credit_card", status: "active" },
        { id: "pse", payment_type_id: "bank_transfer", status: "active", min_allowed_amount: 1600, max_allowed_amount: 340000000, financial_institutions: [{ id: "1051", description: "Banco de prueba (simulador)" }, { id: "1007", description: "Banco simulado 2" }] },
      ]);
    }
    if (p === "/v1/orders" && req.method === "POST") {
      const idem = req.headers["x-idempotency-key"];
      if (!idem) return json(res, 400, { message: "Header X-Idempotency-Key can't be null." });
      if (byIdem.has(idem)) return json(res, 201, orders.get(byIdem.get(idem)));
      const body = JSON.parse(await readBody(req));
      const pay = body?.transactions?.payments?.[0];
      const errors = [];
      if (body.type !== "online") errors.push("type");
      if (!body.external_reference) errors.push("external_reference");
      if (pay?.payment_method?.id !== "pse" || pay?.payment_method?.type !== "bank_transfer") errors.push("payment_method");
      if (!pay?.payment_method?.financial_institution) errors.push("financial_institution");
      if (!body.payer?.email || !body.payer?.identification?.number || !body.payer?.entity_type) errors.push("payer");
      if (!body.config?.online?.callback_url) errors.push("callback_url");
      if (!body.additional_info?.["payer.ip_address"]) errors.push("ip_address");
      if (Number(body.total_amount) < 1600) errors.push("min_amount");
      if (errors.length) return json(res, 400, { message: "invalid fields: " + errors.join(",") });
      const id = "ORDTST" + randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase();
      const order = {
        id, type: "online", status: "action_required", status_detail: "waiting_transfer", external_reference: body.external_reference, total_amount: body.total_amount,
        _callback: body.config.online.callback_url,
        transactions: { payments: [{ id: "PAY" + randomUUID().slice(0, 8), amount: pay.amount, status: "action_required", status_detail: "waiting_transfer", payment_method: { id: "pse", type: "bank_transfer", financial_institution: pay.payment_method.financial_institution, redirect_url: `${SELF}/banco/${id}` } }] },
      };
      orders.set(id, order);
      byIdem.set(idem, id);
      return json(res, 201, order);
    }
    const m = p.match(/^\/v1\/orders\/([A-Za-z0-9_-]+)$/);
    if (m && req.method === "GET") {
      const o = orders.get(m[1]);
      if (!o) return json(res, 404, { message: "order not found" });
      const pub = { ...o };
      delete pub._callback;
      return json(res, 200, pub);
    }
    return json(res, 404, { message: "not found" });
  }

  // Página del "banco" simulado
  const bank = p.match(/^\/banco\/([A-Za-z0-9_-]+)$/);
  if (bank && req.method === "GET") {
    const o = orders.get(bank[1]);
    if (!o) { res.writeHead(404); return res.end("Orden no encontrada"); }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(`<!doctype html><meta charset="utf-8"><title>Banco Prueba PSE (simulador)</title>
<body style="font-family:sans-serif;max-width:480px;margin:40px auto">
<h1>Banco Prueba PSE — SIMULADOR</h1><p>Orden ${o.id} · $${o.total_amount} COP · Ref ${o.external_reference}</p>
<form method="post" action="/banco/${o.id}/resultado"><button name="r" value="aprobado" id="aprobar">Aprobar pago</button>
<button name="r" value="rechazado" id="rechazar">Rechazar pago</button>
<button name="r" value="sin_webhook" id="aprobar-sin-webhook">Aprobar sin enviar webhook</button></form></body>`);
  }
  const result = p.match(/^\/banco\/([A-Za-z0-9_-]+)\/resultado$/);
  if (result && req.method === "POST") {
    const o = orders.get(result[1]);
    const r = new URLSearchParams(await readBody(req)).get("r");
    if (r === "rechazado") { o.status = "failed"; o.status_detail = "rejected_by_bank"; }
    else { o.status = "processed"; o.status_detail = "accredited"; }
    o.transactions.payments[0].status = o.status;
    if (r !== "sin_webhook") await notify(o.id);
    res.writeHead(302, { location: o._callback });
    return res.end();
  }

  // Utilidades de prueba
  if (p === "/__sim/notify" && req.method === "POST") {
    const b = JSON.parse(await readBody(req));
    return json(res, 200, await notify(b.id, b));
  }
  if (p === "/__sim/orders" && req.method === "GET") return json(res, 200, [...orders.values()]);
  if (p === "/__sim/log") return json(res, 200, log);
  res.writeHead(404);
  res.end();
});

server.listen(PORT, "127.0.0.1", () => console.log(`Simulador MP en ${SELF} → webhooks a ${APP}`));

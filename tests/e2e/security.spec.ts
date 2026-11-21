import { createHmac, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { SIM, anon, db } from "./helpers";

const SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET_TEST ?? "sim-secret";
const sign = (id: string, req: string, ts: number) => createHmac("sha256", SECRET).update(`id:${id};request-id:${req};ts:${ts};`).digest("hex");

test.describe("Seguridad", () => {
  test("webhook: rechaza firmas inválidas o ausentes", async ({ request }) => {
    const r1 = await request.post("/api/webhooks/mercadopago?data.id=ORD1&type=order", { data: { type: "order", data: { id: "ORD1" } } });
    expect(r1.status()).toBe(401);
    const ts = Math.floor(Date.now() / 1000);
    const r2 = await request.post("/api/webhooks/mercadopago?data.id=ORD1&type=order", {
      data: { type: "order", data: { id: "ORD1" } },
      headers: { "x-signature": `ts=${ts},v1=${"a".repeat(64)}`, "x-request-id": randomUUID() },
    });
    expect(r2.status()).toBe(401);
  });

  test("webhook: notificación repetida no se procesa dos veces (idempotencia)", async ({ request }) => {
    const { data: orders } = await db().from("payments").select("provider_order_id").not("provider_order_id", "is", null).order("created_at", { ascending: false }).limit(1);
    test.skip(!orders?.length, "Se necesita un pago PSE previo (ejecuta pse.spec.ts primero)");
    const id = orders![0].provider_order_id as string;
    const req = randomUUID();
    const ts = Math.floor(Date.now() / 1000);
    const headers = { "x-signature": `ts=${ts},v1=${sign(id, req, ts)}`, "x-request-id": req };
    const body = { type: "order", action: "order.updated", data: { id } };
    const a = await request.post(`/api/webhooks/mercadopago?data.id=${id}&type=order`, { data: body, headers });
    const b = await request.post(`/api/webhooks/mercadopago?data.id=${id}&type=order`, { data: body, headers });
    expect(a.status()).toBe(200);
    expect(b.status()).toBe(200);
    expect(await b.json()).toMatchObject({ duplicate: true });
    const { count } = await db().from("webhook_events").select("id", { count: "exact", head: true }).eq("dedupe_key", `req:${req}`);
    expect(count).toBe(1);
  });

  test("webhook: ignora órdenes que no pertenecen a la tienda", async ({ request }) => {
    const id = "ORDAJENA123";
    const req = randomUUID();
    const ts = Math.floor(Date.now() / 1000);
    const r = await request.post(`/api/webhooks/mercadopago?data.id=${id}&type=order`, { data: { type: "order", data: { id } }, headers: { "x-signature": `ts=${ts},v1=${sign(id, req, ts)}`, "x-request-id": req } });
    expect(r.status()).toBe(200);
    const { data } = await db().from("webhook_events").select("status").eq("dedupe_key", `req:${req}`).single();
    expect(data!.status).toBe("ignored");
  });

  test("RLS: un visitante no puede leer ni modificar datos privados", async () => {
    const c = anon();
    const orders = await c.from("orders").select("id").limit(1);
    expect(orders.error?.code === "42501" || (orders.data ?? []).length === 0).toBe(true);
    const customers = await c.from("customers").select("id").limit(1);
    expect(customers.error?.code === "42501" || (customers.data ?? []).length === 0).toBe(true);
    const upd = await c.from("products").update({ price: 1 }).eq("slug", "caja-degustacion-de-galletas").select("id");
    expect(upd.error || (upd.data ?? []).length === 0).toBeTruthy();
    const { data: p } = await db().from("products").select("price").eq("slug", "caja-degustacion-de-galletas").single();
    expect(p!.price).toBe(42000);
    const drafts = await c.from("page_sections").select("draft_content").limit(1);
    expect(drafts.error).toBeTruthy(); // columnas de borrador no expuestas al público
    const rpc = await c.rpc("create_order", { p: {} });
    expect(rpc.error).toBeTruthy(); // solo el servidor puede crear pedidos
    const coupons = await c.from("coupons").select("code");
    expect(coupons.error?.code === "42501" || (coupons.data ?? []).length === 0).toBe(true);
    const ref = await c.storage.from("order-references").list("pendientes");
    expect((ref.data ?? []).length).toBe(0);
  });

  test("el panel administrativo exige autenticación y rol", async ({ page, request }) => {
    await page.goto("/admin");
    await page.waitForURL("**/admin/acceso");
    await page.goto("/admin/productos");
    await page.waitForURL("**/admin/acceso");
    // Contraseña incorrecta
    await page.getByLabel("Correo").fill("admin@galletasdetabo.local");
    await page.getByLabel("Contraseña").fill("incorrecta-123");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();

    // Un cliente registrado no accede al CRM
    const email = `cliente.rol.${Date.now()}@example.com`;
    await page.goto("/cuenta");
    await page.getByRole("tab", { name: "Crear cuenta" }).click();
    await page.getByLabel("Nombre completo").fill("Cliente Prueba");
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel(/Contraseña/).fill("ClaveSegura-2026");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByText("Mis pedidos")).toBeVisible();
    await page.goto("/admin");
    await page.waitForURL(/\/admin\/acceso\?error=sin-permiso/);
    const res = await request.get("/admin/pedidos", { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(res.status());
    // Simulador accesible solo en pruebas
    expect((await request.get(`${SIM}/__sim/log`)).ok()).toBe(true);
  });

  test("subida de referencias valida el contenido real del archivo", async ({ request }) => {
    const fake = await request.post("/api/uploads/referencia", { multipart: { file: { name: "foto.png", mimeType: "image/png", buffer: Buffer.from("<script>alert(1)</script>") } } });
    expect(fake.status()).toBe(415);
  });

  test("cabeceras de seguridad", async ({ request }) => {
    const r = await request.get("/");
    expect(r.headers()["x-content-type-options"]).toBe("nosniff");
    expect(r.headers()["x-frame-options"]).toBe("DENY");
    expect(r.headers()["x-powered-by"]).toBeUndefined();
  });
});

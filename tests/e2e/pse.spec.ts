import { expect, test, type Page } from "@playwright/test";
import { SIM, db, futureDate } from "./helpers";

/**
 * Flujo PSE contra el SIMULADOR local de Mercado Pago (scripts/mp-simulator.mjs).
 * Requiere iniciar la app con MERCADOPAGO_API_BASE apuntando al simulador.
 */
async function checkoutWithPse(page: Page, email: string) {
  await page.goto("/producto/alfajores-de-maicena-con-dulce-de-leche");
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await page.goto("/checkout");
  await page.getByLabel("Nombre completo").fill("Carlos Gómez Ruiz");
  await page.getByLabel("Teléfono / WhatsApp").fill("3105556677");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByRole("radio", { name: /PSE · Mercado Pago/ }).check();
  await page.getByRole("radio", { name: /Domicilio/ }).check();
  await page.getByLabel("Dirección de entrega").fill("Carrera 7 # 45-10");
  await page.getByLabel("Ciudad").fill("Bogotá");
  await page.getByLabel("Barrio").fill("Chapinero");
  await page.getByLabel("Fecha deseada de entrega").fill(futureDate(6));
  await page.getByLabel("Número de documento").fill("1020304050");
  await expect(page.getByLabel("Banco", { exact: true }).locator("option", { hasText: "Banco de prueba (simulador)" })).toHaveCount(1);
  await page.getByLabel("Banco", { exact: true }).selectOption("1051");
  await page.getByRole("checkbox", { name: /Autorizo/ }).check();
  await page.getByRole("button", { name: "Pagar con PSE" }).click();
  await page.waitForURL(`${SIM}/banco/**`);
}

test.describe("Pagos PSE (Mercado Pago, simulador)", () => {
  test("pago aprobado: webhook firmado confirma el pedido", async ({ page }) => {
    const email = `pse.ok.${Date.now()}@example.com`;
    await checkoutWithPse(page, email);
    // Antes de pagar, el pedido está pendiente (regresar no basta para marcarlo pagado)
    const { data: before } = await db().from("orders").select("id, payment_status, status").eq("customer_email", email).single();
    expect(before!.payment_status).toBe("pendiente");
    await page.getByRole("button", { name: "Aprobar pago", exact: true }).click();
    await page.waitForURL(/\/pedido\/.+\?pago=retorno/);
    await expect(page.getByText("¡Pago confirmado!")).toBeVisible();
    await expect(page.getByText("Pago aprobado").first()).toBeVisible();
    const { data: after } = await db().from("orders").select("payment_status, status, payments(status, provider_status, provider_order_id)").eq("id", before!.id).single();
    expect(after!.payment_status).toBe("aprobado");
    expect(after!.status).toBe("confirmado");
    expect(after!.payments[0].status).toBe("aprobado");
    const { data: events } = await db().from("webhook_events").select("status, signature_valid").eq("resource_id", after!.payments[0].provider_order_id);
    expect(events!.some((e) => e.status === "processed" && e.signature_valid)).toBe(true);
  });

  test("pago rechazado: el pedido no se marca pagado y permite reintentar", async ({ page }) => {
    const email = `pse.rej.${Date.now()}@example.com`;
    await checkoutWithPse(page, email);
    await page.getByRole("button", { name: "Rechazar pago" }).click();
    await page.waitForURL(/\/pedido\/.+\?pago=retorno/);
    await expect(page.getByText("Pago rechazado").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Reintentar pago con PSE" })).toBeVisible();
    const { data } = await db().from("orders").select("payment_status, status").eq("customer_email", email).single();
    expect(data!.payment_status).toBe("rechazado");
    expect(data!.status).toBe("pendiente");

    // Reintento: nueva orden en MP, ahora aprobada
    await page.getByRole("button", { name: "Reintentar pago con PSE" }).click();
    await page.getByLabel("Número de documento").fill("1020304050");
    await page.getByLabel("Banco", { exact: true }).selectOption("1051");
    await page.getByRole("button", { name: "Pagar con PSE" }).click();
    await page.waitForURL(`${SIM}/banco/**`);
    await page.getByRole("button", { name: "Aprobar pago", exact: true }).click();
    await page.waitForURL(/\/pedido\/.+\?pago=retorno/);
    await expect(page.getByText("Pago aprobado").first()).toBeVisible();
    const { data: final } = await db().from("orders").select("payment_status, payments(status)").eq("customer_email", email).single();
    expect(final!.payment_status).toBe("aprobado");
    expect(final!.payments).toHaveLength(2);
  });

  test("sin webhook: la página de retorno verifica el estado con la API (servidor)", async ({ page }) => {
    const email = `pse.nowh.${Date.now()}@example.com`;
    await checkoutWithPse(page, email);
    await page.getByRole("button", { name: "Aprobar sin enviar webhook" }).click();
    await page.waitForURL(/\/pedido\/.+\?pago=retorno/);
    await expect(page.getByText("Pago aprobado").first()).toBeVisible();
    const { data } = await db().from("orders").select("payment_status").eq("customer_email", email).single();
    expect(data!.payment_status).toBe("aprobado");
  });
});

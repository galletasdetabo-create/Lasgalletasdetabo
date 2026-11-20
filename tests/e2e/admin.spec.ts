import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { ADMIN_STATE, collectErrors, db, ensureAdminState } from "./helpers";

test.describe("Panel administrativo (CRM)", () => {
  test.describe.configure({ timeout: 180_000 });
  test.beforeAll(async ({ browser }) => ensureAdminState(browser));
  test.use({ storageState: ADMIN_STATE });
  test.beforeEach(async ({ page }) => { await page.goto("/admin"); });

  test("panel con indicadores, pedidos y pendientes de configuración", async ({ page }) => {
    const errors = collectErrors(page);
    await expect(page.getByText("Ventas pagadas")).toBeVisible();
    await expect(page.getByText("Conversión")).toBeVisible();
    await expect(page.getByText(/Pendientes de configuración/)).toBeVisible();
    await expect(page.getByText("Configurar el número de WhatsApp")).toBeVisible();
    for (const path of ["/admin/pedidos", "/admin/productos", "/admin/categorias", "/admin/clientes", "/admin/cupones", "/admin/entregas", "/admin/pagos", "/admin/contenido", "/admin/medios", "/admin/identidad", "/admin/ajustes", "/admin/mensajes", "/admin/usuarios", "/admin/actividad"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test("editar el precio de un producto se refleja en la tienda", async ({ page }) => {
    await page.goto("/admin/productos");
    await page.getByRole("link", { name: "Caja degustación de galletas" }).first().click();
    await page.getByLabel("Precio base (COP)").fill("43500");
    await page.getByRole("button", { name: "Guardar" }).first().click();
    await expect(page.getByText("Producto guardado y publicado en la tienda.")).toBeVisible({ timeout: 60_000 });
    await page.goto("/producto/caja-degustacion-de-galletas");
    await expect(page.getByText("$ 43.500").first()).toBeVisible();
    // restaurar
    await db().from("products").update({ price: 42000 }).eq("slug", "caja-degustacion-de-galletas");
    await page.goto("/admin/productos");
    await page.getByRole("link", { name: "Caja degustación de galletas" }).first().click();
    await page.getByLabel("Precio base (COP)").fill("42000");
    await page.getByRole("button", { name: "Guardar" }).first().click();
    await expect(page.getByText("Producto guardado y publicado en la tienda.")).toBeVisible({ timeout: 60_000 });
  });

  test("CMS: borrador → vista previa → publicar", async ({ page, context }) => {
    const nuevo = `Nuestra historia ${Date.now() % 1000}`;
    await page.goto("/admin/contenido/home");
    await page.getByRole("button", { name: "Editar" }).nth(1).click();
    await page.getByLabel("Título", { exact: true }).fill(nuevo);
    await page.getByRole("button", { name: "Guardar borrador" }).click();
    await expect(page.getByText(/Borrador guardado/)).toBeVisible();

    // El público todavía ve la versión publicada
    const pub = await context.newPage();
    await pub.goto("/");
    await expect(pub.getByRole("heading", { level: 2, name: "Nuestra historia" })).toBeVisible();
    // La vista previa muestra el borrador
    await pub.goto("/admin/vista-previa/home");
    await expect(pub.getByText(/Vista previa de «Inicio»/)).toBeVisible();
    await expect(pub.getByRole("heading", { level: 2, name: nuevo })).toBeVisible();

    await page.getByRole("button", { name: "Publicar cambios" }).click();
    await expect(page.getByText(/Publicado/)).toBeVisible();
    await pub.goto("/");
    await expect(pub.getByRole("heading", { level: 2, name: nuevo })).toBeVisible();

    // Restaurar el texto original
    await page.reload();
    await page.getByRole("button", { name: "Editar" }).nth(1).click();
    await page.getByLabel("Título", { exact: true }).fill("Nuestra historia");
    await page.getByRole("button", { name: "Guardar borrador" }).click();
    await expect(page.getByText(/Borrador guardado/)).toBeVisible();
    await page.getByRole("button", { name: "Publicar cambios" }).click();
    await expect(page.getByText(/Publicado/)).toBeVisible();
  });

  test("ajustes: configurar WhatsApp activa los llamados a la acción", async ({ page }) => {
    await page.goto("/admin/ajustes?tab=whatsapp");
    await page.getByLabel("Número de WhatsApp").fill("300 000 0000");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText(/Guardado/)).toBeVisible();
    // La invalidación es inmediata; se recarga por si una regeneración previa (de otra prueba) terminó justo después.
    await expect(async () => {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Escríbenos por WhatsApp" })).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 90_000 });
    await expect(page.getByRole("link", { name: "Pedir por WhatsApp" }).first()).toHaveAttribute("href", /wa\.me\/573000000000/);
    // Restaurar (sin número no se muestra nada de WhatsApp)
    await page.goto("/admin/ajustes?tab=whatsapp");
    await page.getByLabel("Número de WhatsApp").fill("");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText(/Guardado/)).toBeVisible();
    await expect(async () => {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Escríbenos por WhatsApp" })).toHaveCount(0, { timeout: 3_000 });
    }).toPass({ timeout: 90_000 });
  });

  test("gestión de pedidos: cambiar estado con nota", async ({ page }) => {
    const { data: order } = await db().from("orders").select("id, number").eq("status", "pendiente").neq("payment_status", "aprobado").order("created_at", { ascending: false }).limit(1).single();
    test.skip(!order, "Se necesita un pedido (ejecuta purchase.spec.ts primero)");
    await page.goto(`/admin/pedidos/${order!.id}`);
    await expect(page.getByRole("heading", { name: `Pedido ${order!.number}` })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Productos y personalización" })).toBeVisible();
    await page.getByLabel("Estado").selectOption("en_preparacion");
    await page.getByLabel(/Nota para el historial/).fill("Confirmado por teléfono");
    await page.getByRole("button", { name: "Actualizar" }).click();
    await expect(page.getByText("Estado actualizado.")).toBeVisible();
    const { data } = await db().from("orders").select("status").eq("id", order!.id).single();
    expect(data!.status).toBe("en_preparacion");
    const { data: log } = await db().from("activity_log").select("action").eq("entity_id", order!.id);
    expect(log!.some((l) => l.action === "cambió estado de pedido")).toBe(true);
  });

  test("biblioteca de medios: subir, editar texto alternativo y eliminar", async ({ page }) => {
    await page.goto("/admin/medios");
    const png = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#eba9a8" } }).png().toBuffer();
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="file"]').first().setInputFiles({ name: "prueba-e2e.png", mimeType: "image/png", buffer: png });
    await expect(page.getByText("1 imagen(es) subida(s).")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: /prueba e2e/ }).first().click();
    await page.getByLabel(/Texto alternativo/).fill("Imagen de prueba automatizada");
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.getByText("Cambios guardados.")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Eliminar imagen" }).click();
    await expect(page.getByText("Imagen eliminada.")).toBeVisible({ timeout: 60_000 });
    const { count } = await db().from("media").select("id", { count: "exact", head: true }).eq("alt", "Imagen de prueba automatizada");
    expect(count).toBe(0);
  });

  test("no permite eliminar imágenes en uso", async ({ page }) => {
    await page.goto("/admin/medios?carpeta=stock");
    await page.locator("button", { hasText: "En uso" }).first().click();
    await expect(page.getByRole("button", { name: "En uso: no se puede eliminar" })).toBeDisabled();
  });
});

import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { collectErrors, db, futureDate } from "./helpers";

test.describe("Compra completa (transferencia)", () => {
  test("personalizar, subir referencia, editar carrito y confirmar pedido", async ({ page }) => {
    const errors = collectErrors(page);
    const email = `cliente.${Date.now()}@example.com`;

    // 1) Galletas personalizadas con imagen de referencia
    await page.goto("/producto/galletas-personalizadas-a-tu-gusto");
    await page.getByRole("button", { name: "Mediana · 8 cm" }).click();
    await page.getByLabel(/Tipo de ocasión/).selectOption("Cumpleaños");
    await page.getByLabel(/Diseño solicitado/).fill("Corazones rosados con el nombre en dorado");
    await page.getByLabel(/Texto que debe llevar la galleta/).fill("Feliz día, Sofi");
    await page.getByLabel(/Colores preferidos/).fill("Rosa pastel y dorado");
    await page.getByLabel(/Fecha en que las necesitas/).fill(futureDate(12));
    const png = await sharp({ create: { width: 300, height: 300, channels: 3, background: "#f8d8d7" } }).png().toBuffer();
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="file"]').setInputFiles({ name: "referencia.png", mimeType: "image/png", buffer: png });
    await expect(page.getByText("referencia.png")).toBeVisible();
    await page.getByRole("button", { name: "Aumentar cantidad" }).click(); // 7
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    const drawer = page.getByRole("dialog", { name: "Carrito de compras" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("Galletas personalizadas a tu gusto")).toBeVisible();
    await drawer.getByRole("button", { name: "Cerrar carrito" }).click();

    // 2) Alfajores con variantes de sabor y presentación
    await page.goto("/producto/alfajores-de-maicena-con-dulce-de-leche");
    await page.getByRole("button", { name: "Arequipe y coco" }).click();
    await page.getByRole("button", { name: "Caja x12" }).click();
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await expect(page.getByRole("dialog", { name: "Carrito de compras" })).toBeVisible();

    // 3) Carrito: persiste al recargar, se modifican cantidades y se elimina
    await page.goto("/carrito");
    await page.reload();
    await expect(page.getByRole("link", { name: "Galletas personalizadas a tu gusto" }).last()).toBeVisible();
    await expect(page.getByRole("link", { name: "Alfajores de maicena con dulce de leche" }).last()).toBeVisible();
    // Subtotal servidor: 7 × 6.000 + 56.000 = 98.000
    await expect(page.getByText("$ 98.000").filter({ visible: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Aumentar cantidad" }).first().click(); // 8 galletas
    await expect(page.getByText("$ 104.000").filter({ visible: true }).first()).toBeVisible();
    // Manipular el precio en localStorage no cambia el total del servidor
    await page.evaluate(() => {
      const c = JSON.parse(localStorage.getItem("lgt-cart-v1")!);
      c.items[0].unitPrice = 1;
      localStorage.setItem("lgt-cart-v1", JSON.stringify(c));
    });
    await page.reload();
    await expect(page.getByText("$ 104.000").filter({ visible: true }).first()).toBeVisible();

    // Agregar y eliminar un tercer producto
    await page.goto("/producto/caja-degustacion-de-galletas");
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await page.goto("/carrito");
    await page.getByRole("button", { name: "Eliminar Caja degustación de galletas del carrito" }).click();
    await expect(page.getByRole("link", { name: "Caja degustación de galletas" })).toHaveCount(0);

    // 4) Checkout
    await page.getByRole("link", { name: /Finalizar compra/ }).click();
    await page.waitForURL("**/checkout");
    await page.getByLabel("Nombre completo").fill("Ana María Pérez");
    await page.getByLabel("Teléfono / WhatsApp").fill("300 123 4567");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByRole("radio", { name: /Domicilio/ }).check();
    await page.getByLabel("Dirección de entrega").fill("Calle 10 # 20-30 apto 401");
    await page.getByLabel("Ciudad").fill("Medellín");
    await page.getByLabel("Barrio").fill("Laureles");
    await expect(page.getByLabel("Fecha deseada de entrega")).toHaveValue(futureDate(12)); // tomada del producto
    await page.getByLabel(/Observaciones del pedido/).fill("Entregar en portería");
    await page.getByRole("radio", { name: /Transferencia o pago coordinado/ }).check();
    await expect(page.getByText("$ 104.000").filter({ visible: true }).last()).toBeVisible();
    await page.getByRole("button", { name: "Confirmar pedido" }).click();
    await expect(page.getByText("Debes aceptar para continuar")).toBeVisible();
    await page.getByRole("checkbox", { name: /Autorizo el tratamiento/ }).check();
    await page.getByRole("button", { name: "Confirmar pedido" }).click();

    // 5) Confirmación
    await page.waitForURL(/\/pedido\/[0-9a-f-]{36}/);
    await expect(page.getByRole("heading", { level: 1, name: /Pedido GT-\d+/ })).toBeVisible();
    await expect(page.getByText("Pendiente").first()).toBeVisible();
    await expect(page.getByText("$ 104.000").filter({ visible: true }).last()).toBeVisible();
    const cart = await page.evaluate(() => JSON.parse(localStorage.getItem("lgt-cart-v1") ?? "{}").items?.length ?? 0);
    expect(cart).toBe(0);

    // 6) Persistencia en base de datos
    const { data: order } = await db().from("orders").select("*, items:order_items(*)").eq("customer_email", email).single();
    expect(order.total).toBe(104000);
    expect(order.subtotal).toBe(104000);
    expect(order.status).toBe("pendiente");
    expect(order.payment_method).toBe("transferencia");
    expect(order.neighborhood).toBe("Laureles");
    expect(order.desired_date).toBe(futureDate(12));
    expect(order.items).toHaveLength(2);
    const cookie = order.items.find((i: { product_name: string }) => i.product_name.startsWith("Galletas"));
    expect(cookie.quantity).toBe(8);
    expect(cookie.unit_price).toBe(6000);
    expect(cookie.variant_name).toBe("Mediana · 8 cm");
    expect(cookie.customization.texto).toBe("Feliz día, Sofi");
    expect(cookie.reference_image_path).toMatch(/^pendientes\/\d{4}-\d{2}\/.+\.webp$/);
    const { data: file } = await db().storage.from("order-references").download(cookie.reference_image_path);
    expect(file?.size).toBeGreaterThan(100);
    const { data: customer } = await db().from("customers").select("full_name").eq("email", email).single();
    expect(customer?.full_name).toBe("Ana María Pérez");
    expect(errors).toEqual([]);
  });

  test("la fecha de entrega no puede violar el tiempo de preparación", async ({ page }) => {
    await page.goto("/producto/caja-degustacion-de-galletas");
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await page.goto("/checkout");
    await page.getByLabel("Nombre completo").fill("Prueba Fecha");
    await page.getByLabel("Teléfono / WhatsApp").fill("3001112233");
    await page.getByLabel("Correo electrónico").fill(`fecha.${Date.now()}@example.com`);
    await page.getByRole("radio", { name: /Recoger el pedido/ }).check();
    await page.getByLabel("Fecha deseada de entrega").fill(futureDate(0));
    await page.getByRole("radio", { name: /Transferencia/ }).check();
    await page.getByRole("checkbox", { name: /Autorizo/ }).check();
    await page.getByRole("button", { name: "Confirmar pedido" }).click();
    await expect(page.getByText(/La fecha más cercana posible es/).first()).toBeVisible();
    await page.evaluate(() => localStorage.removeItem("lgt-cart-v1"));
  });
});

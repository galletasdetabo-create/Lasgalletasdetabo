import { expect, test } from "@playwright/test";
import { collectErrors } from "./helpers";

test.describe("Móvil", () => {
  for (const path of ["/", "/tienda", "/producto/galletas-personalizadas-a-tu-gusto", "/carrito", "/checkout", "/nosotros", "/contacto", "/preguntas-frecuentes", "/cuenta"]) {
    test(`sin desbordamiento horizontal: ${path}`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      // Si algún elemento desborda, Chrome móvil "aleja" la página y innerWidth crece: se comparan ambos con el ancho real del dispositivo.
      const vw = page.viewportSize()!.width;
      const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
      expect(m.inner).toBe(vw);
      expect(m.scroll).toBeLessThanOrEqual(vw + 1);
      expect(errors).toEqual([]);
    });
  }

  test("menú móvil y carrito táctil", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir menú" }).tap();
    const menu = page.getByRole("navigation", { name: "Menú móvil" });
    await expect(menu).toBeVisible();
    await menu.getByRole("button", { name: "Ver categorías de Tienda" }).tap();
    await menu.getByRole("link", { name: "Alfajores artesanales" }).tap();
    await page.waitForURL("**/tienda/alfajores-artesanales");
    await page.getByRole("link", { name: /Alfajores de maicena con dulce de leche/ }).first().tap();
    await page.getByRole("button", { name: "Agregar al carrito" }).tap();
    const drawer = page.getByRole("dialog", { name: "Carrito de compras" });
    await expect(drawer).toBeVisible();
    const box = await drawer.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    await drawer.getByRole("link", { name: "Pagar" }).tap();
    await page.waitForURL("**/checkout");
    await expect(page.getByLabel("Nombre completo")).toBeVisible();
    // Campos con tamaño táctil y fuente de 16px (evita zoom en iOS)
    const fs = await page.getByLabel("Nombre completo").evaluate((el) => getComputedStyle(el).fontSize);
    expect(parseFloat(fs)).toBeGreaterThanOrEqual(16);
    await page.evaluate(() => localStorage.removeItem("lgt-cart-v1"));
  });
});

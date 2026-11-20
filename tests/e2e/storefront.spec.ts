import { expect, test } from "@playwright/test";
import { collectErrors } from "./helpers";

test.describe("Tienda pública", () => {
  test("la página de inicio muestra todas las secciones sin errores", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Galletas" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Haz tu pedido" })).toBeVisible();
    for (const h of ["Nuestra historia", "Dos dulces", "Productos destacados", "Galería", "Cómo pedir", "Alfajores artesanales", "Galletas personalizadas"]) {
      await expect(page.getByRole("heading", { name: h }).first()).toBeAttached();
    }
    // Las imágenes cargan (ninguna rota)
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    });
    await page.waitForLoadState("networkidle");
    const broken = await page.$$eval("img", (imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== "lazy").map((i) => i.src));
    expect(broken).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("SEO técnico: metadatos, datos estructurados, robots y sitemap", async ({ page, request }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Las Galletas de Tabo/);
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(/^http:\/\/localhost:3000\/?$/);
    expect(await page.locator('meta[property="og:title"]').getAttribute("content")).toBeTruthy();
    expect(await page.locator("html").getAttribute("lang")).toBe("es-CO");
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.join(" ")).toContain('"Bakery"');

    await page.goto("/producto/alfajores-de-maicena-con-dulce-de-leche");
    const pld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(" ");
    expect(pld).toContain('"Product"');
    expect(pld).toContain('"priceCurrency":"COP"');
    expect(pld).toContain('"BreadcrumbList"');

    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Sitemap:");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/producto/galletas-personalizadas-a-tu-gusto");
    expect(sitemap).toContain("/tienda/alfajores-artesanales");
  });

  test("catálogo: categorías, búsqueda y orden", async ({ page }) => {
    await page.goto("/tienda");
    await expect(page.getByRole("heading", { level: 1, name: "Tienda" })).toBeVisible();
    await page.getByRole("navigation", { name: "Categorías" }).getByRole("link", { name: /Alfajores artesanales/ }).click();
    await page.waitForURL("**/tienda/alfajores-artesanales");
    await expect(page.getByRole("heading", { level: 1, name: "Alfajores artesanales" })).toBeVisible();
    // Next conserva la página anterior oculta (Activity): se cuentan solo los elementos visibles.
    await expect(page.locator("p[aria-live=polite]:visible")).toContainText("Mostrando 3 resultados");

    await page.goto("/tienda");
    await page.locator("#buscar-q").fill("chocolate");
    await page.locator("#buscar-q").press("Enter");
    await expect(page.getByRole("heading", { name: "Alfajores cubiertos de chocolate" })).toBeVisible();
    await expect(page.locator("p[aria-live=polite]:visible")).toContainText("Mostrando 1 resultado");

    await page.goto("/tienda?orden=precio-asc");
    const prices = (await page.locator("article:visible p.it").allTextContents()).filter((t) => t.includes("$"));
    const nums = prices.map((p) => Number(p.replace(/\D/g, "")));
    expect(nums).toEqual([...nums].sort((a, b) => a - b));
  });

  test("ficha de producto: variantes, personalización y productos relacionados", async ({ page }) => {
    await page.goto("/producto/galletas-personalizadas-a-tu-gusto");
    await expect(page.getByRole("heading", { level: 1, name: "Galletas personalizadas a tu gusto" })).toBeVisible();
    await expect(page.getByText("Preparación:").first()).toBeVisible();
    for (const label of ["Tipo de ocasión", "Diseño solicitado", "Texto que debe llevar la galleta", "Colores preferidos", "Fecha en que las necesitas", "Imagen de referencia", "Observaciones"]) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
    }
    // Precio por tamaño
    await page.getByRole("button", { name: "Grande · 10 cm" }).click();
    await expect(page.getByText("$ 48.000")).toBeVisible(); // 6 × 8.000
    // Validación de campos obligatorios
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await expect(page.getByText("Este campo es obligatorio.").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Productos relacionados" })).toBeVisible();
  });
});

// Captura de una zona de la página tras desplazarse hasta ella y esperar a que carguen las imágenes.
// Uso: node scripts/shot-view.mjs <salida.jpg> <ancho> <ruta> <selector|"top"> [alto]
import { chromium, devices } from "@playwright/test";

const [out, width, route, target, height = "900"] = process.argv.slice(2);
const w = Number(width);
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await browser.newContext(w < 600 ? { ...devices["Pixel 7"] } : { viewport: { width: w, height: Number(height) } });
const page = await ctx.newPage();
await page.goto("http://localhost:3000" + route, { waitUntil: "networkidle" });
if (target !== "top") await page.locator(target).first().scrollIntoViewIfNeeded();
await page.waitForTimeout(2500);
await page.waitForLoadState("networkidle");
const pending = await page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).length);
console.log("imágenes sin cargar en la página:", pending);
await page.screenshot({ path: out, type: "jpeg", quality: 60 });
await browser.close();

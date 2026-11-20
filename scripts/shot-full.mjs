// Captura de página completa (tras el preloader y recorriendo la página para activar las animaciones).
import { chromium, devices } from "@playwright/test";
const [out, width, ...routes] = process.argv.slice(2);
const w = Number(width);
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await b.newContext(w < 600 ? { ...devices["Pixel 7"] } : { viewport: { width: w, height: 900 } });
for (const r of routes) {
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000" + r, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 500) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(140); }
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(700);
  const name = (r.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home") + "-" + w;
  await page.screenshot({ path: `${out}/f-${name}.jpg`, type: "jpeg", quality: 55, fullPage: true });
  console.log(r, h + "px");
  await page.close();
}
await b.close();

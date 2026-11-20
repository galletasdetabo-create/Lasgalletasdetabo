// Capturas de verificación visual y errores de consola.
// Uso: node scripts/shot.mjs <salida> <ancho> <ruta1> [ruta2 ...]
import { chromium } from "@playwright/test";

const [out, width, ...paths] = process.argv.slice(2);
const base = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const w = Number(width);
const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, isMobile: w < 600, hasTouch: w < 600, deviceScaleFactor: 1 });
for (const p of paths) {
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && errors.push(`${m.type()}: ${m.text().slice(0, 300)}`));
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 300)));
  const res = await page.goto(base + p, { waitUntil: "networkidle", timeout: 120000 });
  // recorre la página para disparar los reveals
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 600) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(120); }
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const name = p.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home";
  await page.screenshot({ path: `${out}/${name}-${w}.jpg`, type: "jpeg", quality: 55, fullPage: true });
  console.log(`${res?.status()} ${p} → ${name}-${w}.jpg${errors.length ? "\n  " + errors.join("\n  ") : ""}`);
  await page.close();
}
await browser.close();

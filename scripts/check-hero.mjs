// Captura las diapositivas de la portada y comprueba que la cabecera sigue visible al hacer scroll.
// Uso: node scripts/check-hero.mjs <carpeta> [ancho] [alto]
import { chromium, devices } from "@playwright/test";

const out = process.argv[2] ?? ".";
const w = Number(process.argv[3] ?? 1440);
const h = Number(process.argv[4] ?? 900);
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await b.newContext(w < 600 ? { ...devices["Pixel 7"] } : { viewport: { width: w, height: h } });
const p = await ctx.newPage();
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
const dots = p.locator(".hero-bullet");
for (let i = 0; i < (await dots.count()); i++) {
  await dots.nth(i).click();
  await p.waitForTimeout(2600);
  await p.screenshot({ path: `${out}/hero-${w}-${i + 1}.jpg`, type: "jpeg", quality: 70 });
}
// Cabecera: arriba transparente, tras el scroll visible y blanca; al subir y bajar no desaparece
const hdr = () => p.evaluate(() => { const e = document.querySelector(".header-main"); const r = e.getBoundingClientRect(); return { top: Math.round(r.top), h: Math.round(r.height), bg: getComputedStyle(e).backgroundColor, scrolled: e.dataset.scrolled }; });
console.log("arriba:", JSON.stringify(await hdr()));
for (const y of [400, 1500, 900, 3000]) {
  await p.evaluate((v) => window.scrollTo(0, v), y);
  await p.waitForTimeout(600);
  console.log("scroll", y, JSON.stringify(await hdr()));
}
await p.screenshot({ path: `${out}/scroll-${w}.jpg`, type: "jpeg", quality: 65 });
await b.close();

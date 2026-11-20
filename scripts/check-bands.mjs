// Verifica "Nuestra historia" (línea animada) y la frase con parallax. Uso: node scripts/check-bands.mjs <carpeta de salida> [ancho]
import { chromium } from "@playwright/test";

const out = process.argv[2] ?? ".";
const width = Number(process.argv[3] ?? 1440);
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await browser.newPage({ viewport: { width, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const story = page.locator("section.story-band");
const quote = page.locator("section.parallax-band").first();
const menu = page.locator("section.parallax-band").nth(1);
const geo = (loc) => loc.evaluate((e) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return { top: Math.round(r.top + scrollY), h: Math.round(r.height), bg: c.backgroundImage.slice(0, 60), size: c.backgroundSize, pos: c.backgroundPosition, att: c.backgroundAttachment }; });
console.log("historia", JSON.stringify(await geo(story)));
console.log("frase", JSON.stringify(await geo(quote)));

// Línea animada
const sepState = () => page.evaluate(() => {
  const sep = document.querySelector("section.story-band .sep");
  const b = getComputedStyle(sep, "::before");
  const r = sep.getBoundingClientRect();
  return { revealed: sep.hasAttribute("data-revealed"), line: b.transform, w: r.width, h: r.height };
});
const storyTop = (await geo(story)).top;
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
console.log("línea antes de llegar:", JSON.stringify(await sepState()));
await page.evaluate((y) => window.scrollTo(0, y), storyTop - 100);
for (const t of [60, 200, 400, 700, 1300]) {
  await page.waitForTimeout(t === 60 ? 60 : 150);
  console.log("línea +" + t + "ms:", JSON.stringify(await sepState()));
}
await page.evaluate((y) => window.scrollTo(0, y), storyTop);
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/historia.jpg`, type: "jpeg", quality: 70 });

// Parallax: la posición vertical debe ser 0,4 × distancia de la franja al borde superior
const quoteTop = (await geo(quote)).top;
for (const off of [600, 300, 0, -300]) {
  await page.evaluate((y) => window.scrollTo(0, y), quoteTop - off);
  await page.waitForTimeout(400);
  const s = await page.evaluate(() => { const e = document.querySelector("section.parallax-band"); const c = getComputedStyle(e); return { rowTop: Math.round(e.getBoundingClientRect().top), pos: c.backgroundPosition, size: c.backgroundSize, att: c.backgroundAttachment }; });
  console.log("parallax", off, JSON.stringify(s));
  await page.screenshot({ path: `${out}/frase-${off}.jpg`, type: "jpeg", quality: 70 });
}
// Segunda franja con parallax (alfajores, velocidad 1,1: 0,44 × distancia)
const menuTop = (await geo(menu)).top;
console.log("alfajores", JSON.stringify(await geo(menu)));
for (const off of [700, 350, 0]) {
  await page.evaluate((y) => window.scrollTo(0, y), menuTop - off);
  await page.waitForTimeout(400);
  const m = await menu.evaluate((e) => { const c = getComputedStyle(e); return { rowTop: Math.round(e.getBoundingClientRect().top), pos: c.backgroundPosition, size: c.backgroundSize }; });
  console.log("alfajores", off, JSON.stringify(m));
  await page.screenshot({ path: `${out}/alfajores-${off}.jpg`, type: "jpeg", quality: 70 });
}
await browser.close();

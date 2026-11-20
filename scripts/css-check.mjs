import { chromium } from "@playwright/test";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto("http://localhost:3000/", { waitUntil: "load" });
await page.waitForTimeout(2500);
console.log(JSON.stringify(await page.evaluate(() => {
  const g = (sel, props) => { const e = document.querySelector(sel); if (!e) return null; const s = getComputedStyle(e); return Object.fromEntries(props.map((p) => [p, s.getPropertyValue(p)])); };
  return {
    header: g(".header-main", ["background-color", "position"]),
    hero: g(".hero", ["margin-top", "height"]),
    media: g(".hero-media", ["mask-image", "-webkit-mask-image", "inset", "width"]),
    has: CSS.supports("selector(:has(*))"),
    root: document.querySelector(".site-root")?.className,
    hasMatch: !!document.querySelector(".site-root:has(.hero)"),
  };
}), null, 1));
// ¿existe la regla en las hojas de estilo?
const found = await page.evaluate(() => { const out = []; const walk = (rules) => { for (const r of rules) { if (r.cssRules) walk(r.cssRules); if (r.cssText && /hero-media|header-main/.test(r.cssText)) out.push(r.cssText.slice(0, 260)); } }; for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch {} } return out.slice(0, 8); });
console.log(found.join("\n---\n"));
await b.close();

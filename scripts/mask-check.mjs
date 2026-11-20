import { chromium } from "@playwright/test";
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto("http://localhost:7000/", { waitUntil: "load" });
await page.waitForTimeout(3500);
const info = await page.evaluate(() => { const e = document.querySelector(".hero-slide.is-active .hero-media"); const s = getComputedStyle(e); return { mask: s.maskImage, comp: s.maskComposite, wk: s.webkitMaskComposite, rect: JSON.stringify(e.getBoundingClientRect()), imgStyle: e.querySelector("img").getAttribute("style") }; });
console.log(JSON.stringify(info, null, 1));
for (const [name, css] of [["lineal-simple", ".hero-media{mask-image:linear-gradient(90deg,#000 0%,#000 50%,transparent 100%)!important;-webkit-mask-image:linear-gradient(90deg,#000 0%,#000 50%,transparent 100%)!important;mask-composite:add!important;-webkit-mask-composite:source-over!important}"]]) {
  await page.addStyleTag({ content: css });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `C:/Users/karni/AppData/Local/Temp/claude/84fc0d9249d7e2fa/87ccf718-c14b-49ae-8170-b133113b21da/scratchpad/shots/mask-${name}.jpg`, type: "jpeg", quality: 55 });
}
await b.close();

// Captura de la portada tras el preloader y la animación de entrada.
import { chromium } from "@playwright/test";
const [out, width = "1440", route = "/"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await (await b.newContext({ viewport: { width: Number(width), height: Number(width) < 600 ? 844 : 900 } })).newPage();
await page.goto("http://localhost:3000" + route, { waitUntil: "load" });
await page.waitForTimeout(3800);
await page.screenshot({ path: out, type: "jpeg", quality: 70 });
await b.close();

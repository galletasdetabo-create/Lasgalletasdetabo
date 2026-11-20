import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {}

const chrome = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    locale: "es-CO",
    timezoneId: "America/Bogota",
    trace: "retain-on-failure",
    launchOptions: { executablePath: chrome },
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /responsive.spec.ts/ },
    { name: "movil", use: { ...devices["Pixel 7"], launchOptions: { executablePath: chrome } }, testMatch: /responsive\.spec\.ts/ },
  ],
});

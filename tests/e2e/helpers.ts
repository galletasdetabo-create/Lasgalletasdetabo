import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

export const db = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

export const anon = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });

export function adminCredentials() {
  const txt = readFileSync("admin-credentials.local.txt", "utf8");
  return { email: txt.match(/Correo: (.+)/)![1].trim(), password: txt.match(/Contrasena: (.+)/)![1].trim() };
}

/** Inicia sesión una sola vez y reutiliza la sesión (el login tiene límite de intentos por IP). */
export const ADMIN_STATE = ".auth/admin.json";
export async function ensureAdminState(browser: import("@playwright/test").Browser) {
  const { existsSync, mkdirSync } = await import("node:fs");
  if (existsSync(ADMIN_STATE)) return;
  mkdirSync(".auth", { recursive: true });
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  await loginAdmin(page);
  await ctx.storageState({ path: ADMIN_STATE });
  await ctx.close();
}

export async function loginAdmin(page: Page) {
  const { email, password } = adminCredentials();
  await page.goto("/admin/acceso");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL("**/admin");
}

/** Fecha en Bogotá dentro de n días (YYYY-MM-DD). */
export function futureDate(days: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date(Date.now() + days * 86_400_000));
}

export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    // Recursos externos opcionales que no dependen de la app
    if (/favicon|Failed to load resource: net::ERR_ABORTED/.test(t)) return;
    errors.push(t);
  });
  return errors;
}

export const SIM = process.env.SIM_URL ?? "http://127.0.0.1:4599";

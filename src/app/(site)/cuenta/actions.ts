"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/env";

export type AuthState = { error?: string; info?: string } | null;

export async function customerLoginAction(_: AuthState, form: FormData): Promise<AuthState> {
  if (!rateLimit(`clogin:${clientIp(await headers())}`, 10, 15 * 60_000).ok) return { error: "Demasiados intentos. Espera unos minutos." };
  const p = z.object({ email: z.email(), password: z.string().min(1).max(200) }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: "Ingresa tu correo y contraseña." };
  const { error } = await (await createSessionClient()).auth.signInWithPassword(p.data);
  if (error) return { error: "Correo o contraseña incorrectos." };
  redirect("/cuenta");
}

export async function customerRegisterAction(_: AuthState, form: FormData): Promise<AuthState> {
  if (!rateLimit(`creg:${clientIp(await headers())}`, 5, 30 * 60_000).ok) return { error: "Demasiados intentos. Espera unos minutos." };
  const p = z
    .object({ full_name: z.string().trim().min(2).max(120), email: z.email(), password: z.string().min(10, "La contraseña debe tener al menos 10 caracteres").max(72) })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0].message };
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signUp({
    email: p.data.email,
    password: p.data.password,
    options: { data: { full_name: p.data.full_name }, emailRedirectTo: `${SITE_URL}/cuenta` },
  });
  if (error) return { error: error.message.includes("registered") ? "Ya existe una cuenta con ese correo." : "No pudimos crear la cuenta." };
  if (!data.session) return { info: "Te enviamos un correo para confirmar tu cuenta." };
  redirect("/cuenta");
}

export async function customerLogoutAction() {
  await (await createSessionClient()).auth.signOut();
  redirect("/cuenta");
}

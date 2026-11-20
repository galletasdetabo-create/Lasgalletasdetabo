"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { logActivity } from "@/lib/auth";

const Schema = z.object({ email: z.email(), password: z.string().min(1).max(200) });

export async function loginAction(_: unknown, form: FormData): Promise<{ error: string } | null> {
  const ip = clientIp(await headers());
  if (!rateLimit(`login:${ip}`, 8, 15 * 60_000).ok) return { error: "Demasiados intentos. Espera 15 minutos." };
  const parsed = Schema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Ingresa un correo y una contraseña válidos." };
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "Correo o contraseña incorrectos." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  if (!profile || !["admin", "editor"].includes(profile.role)) {
    await supabase.auth.signOut();
    return { error: "Tu cuenta no tiene acceso al panel administrativo." };
  }
  await logActivity({ id: data.user.id, email: data.user.email ?? "" }, "login", "sesion");
  redirect("/admin");
}

export async function logoutAction() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/acceso");
}

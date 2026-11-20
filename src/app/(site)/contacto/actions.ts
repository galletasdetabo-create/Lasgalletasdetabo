"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const Schema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre").max(120),
  email: z.email("Correo inválido").max(200),
  phone: z.string().trim().max(40).default(""),
  message: z.string().trim().min(5, "Escribe tu mensaje").max(4000),
  website: z.string().max(0).optional(), // trampa anti-spam: debe venir vacía
});

export type ContactState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  const ip = clientIp(await headers());
  if (!rateLimit(`contact:${ip}`, 5, 15 * 60_000).ok) return { ok: false, message: "Has enviado varios mensajes seguidos. Intenta más tarde." };
  const parsed = Schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (errors[String(i.path[0])] ??= i.message));
    return { ok: false, message: "Revisa los campos marcados.", errors };
  }
  const data = { name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone, message: parsed.data.message };
  const { error } = await createServiceClient().from("contact_messages").insert(data);
  if (error) return { ok: false, message: "No pudimos enviar tu mensaje. Intenta de nuevo." };
  return { ok: true, message: "¡Gracias! Recibimos tu mensaje y te responderemos pronto." };
}

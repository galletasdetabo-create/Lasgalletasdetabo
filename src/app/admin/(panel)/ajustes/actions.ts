"use server";
import { z } from "zod";
import { logActivity, requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { refreshPublic } from "@/lib/admin/revalidate";
import { ADMIN_ONLY_KEYS, type SettingsKey } from "@/lib/cms/settings";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido (usa #RRGGBB)");
const id = z.uuid().nullable();
const s = (max: number) => z.string().trim().max(max);
const optionalUrlOrHandle = s(200).refine((v) => !v || !/^\s*javascript:/i.test(v), "Valor inválido");

const SCHEMAS: Record<SettingsKey, z.ZodType> = {
  brand: z.object({
    name: s(80).min(2), slogan: s(120), logo_id: id, logo_alt_id: id, favicon_id: id,
    colors: z.object({ cream: hex, blush: hex, rose: hex, rose_deep: hex, chocolate: hex, gold: hex }),
    font_pair: z.enum(["moderna", "clasica"]),
  }),
  contact: z.object({ phone: s(40), email: z.union([z.email(), z.literal("")]), city: s(80), address: s(200), show_address: z.boolean(), hours: s(160), service_area: s(200) }),
  social: z.object({ instagram: optionalUrlOrHandle, facebook: optionalUrlOrHandle, tiktok: optionalUrlOrHandle }),
  whatsapp: z.object({ enabled: z.boolean(), number: s(20).regex(/^[+\d\s()-]*$/, "Solo números"), default_message: s(500) }),
  seo: z.object({ title: s(70).min(10), description: s(170).min(50, "La descripción debe tener al menos 50 caracteres"), keywords: s(300), og_image_id: id }),
  footer: z.object({ text: s(400), copyright: s(120) }),
  legal: z.object({ terms: s(30000), privacy: s(30000), shipping: s(30000), returns: s(30000) }),
  commerce: z.object({ transfer_instructions: s(3000), checkout_note: s(600), notice_enabled: z.boolean(), notice_text: s(200) }),
  payments: z.object({ pse_enabled: z.boolean() }),
};

export async function saveSettingsAction(key: SettingsKey, value: unknown) {
  const user = await requireStaff();
  const schema = SCHEMAS[key];
  if (!schema) return { ok: false, error: "Ajuste desconocido." };
  if (ADMIN_ONLY_KEYS.includes(key) || key === "whatsapp") {
    if (user.role !== "admin") return { ok: false, error: "Solo un administrador puede cambiar este ajuste." };
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `${i.path.join(" › ") || key}: ${i.message}` };
  }
  const db = await createSessionClient();
  const { data, error } = await db.from("site_settings").update({ value: parsed.data, updated_by: user.id }).eq("key", key).select("key");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) {
    const ins = await db.from("site_settings").insert({ key, value: parsed.data, updated_by: user.id, admin_only: ADMIN_ONLY_KEYS.includes(key) || key === "whatsapp" });
    if (ins.error) return { ok: false, error: "No tienes permisos para crear este ajuste." };
  }
  await logActivity(user, "actualizó ajustes", "ajustes", key);
  refreshPublic("settings");
  return { ok: true };
}

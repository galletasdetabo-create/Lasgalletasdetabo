"use server";
import { z } from "zod";
import { logActivity, requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { refreshPublic } from "@/lib/admin/revalidate";
import { CMS_PAGES, SECTION_BY_TYPE, type FieldDef } from "@/lib/cms/sections";

const pageKey = z.string().refine((p) => CMS_PAGES.some((x) => x.key === p), "Página inválida");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Conserva solo los campos definidos para el tipo de sección y normaliza sus valores. */
function sanitize(fields: FieldDef[], input: unknown): Record<string, unknown> {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = src[f.name];
    switch (f.kind) {
      case "text":
      case "url":
        out[f.name] = typeof v === "string" ? v.slice(0, f.kind === "url" ? 500 : 300) : "";
        if (f.kind === "url" && typeof out[f.name] === "string" && /^\s*javascript:/i.test(out[f.name] as string)) out[f.name] = "";
        break;
      case "textarea":
      case "richtext":
        out[f.name] = typeof v === "string" ? v.slice(0, 6000) : "";
        break;
      case "image":
        out[f.name] = typeof v === "string" && UUID.test(v) ? v : null;
        break;
      case "number":
        out[f.name] = Number.isFinite(Number(v)) ? Math.max(0, Math.min(1000, Number(v))) : null;
        break;
      case "boolean":
        out[f.name] = !!v;
        break;
      case "select":
        out[f.name] = f.options?.some((o) => o.value === v) ? v : f.options?.[0]?.value ?? "";
        break;
      case "list":
        out[f.name] = Array.isArray(v) ? v.slice(0, f.maxItems ?? 20).map((item) => sanitize(f.fields ?? [], item)) : [];
        break;
    }
  }
  return out;
}

const DraftSchema = z.object({
  id: z.uuid(),
  label: z.string().trim().max(120),
  variant: z.string().max(40),
  enabled: z.boolean(),
  content: z.record(z.string(), z.unknown()),
});

export async function saveSectionDraftAction(input: unknown) {
  const user = await requireStaff();
  const p = DraftSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Datos inválidos." };
  const db = await createSessionClient();
  const { data: s } = await db.from("page_sections").select("type").eq("id", p.data.id).single();
  const def = s ? SECTION_BY_TYPE[s.type] : null;
  if (!def) return { ok: false, error: "Tipo de sección desconocido." };
  const variant = def.variants.some((v) => v.value === p.data.variant) ? p.data.variant : def.variants[0].value;
  const { error } = await db
    .from("page_sections")
    .update({ label: p.data.label, draft_variant: variant, draft_enabled: p.data.enabled, draft_content: sanitize(def.fields, p.data.content), updated_by: user.id })
    .eq("id", p.data.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function reorderSectionsAction(page: string, ids: string[]) {
  await requireStaff();
  if (!pageKey.safeParse(page).success || !z.array(z.uuid()).max(50).safeParse(ids).success) return { ok: false, error: "Datos inválidos." };
  const db = await createSessionClient();
  for (const [i, id] of ids.entries()) await db.from("page_sections").update({ draft_sort: i }).eq("id", id).eq("page", page);
  return { ok: true };
}

export async function addSectionAction(page: string, type: string) {
  const user = await requireStaff();
  const def = SECTION_BY_TYPE[type];
  if (!pageKey.safeParse(page).success || !def) return { ok: false, error: "Datos inválidos." };
  const db = await createSessionClient();
  const { count } = await db.from("page_sections").select("id", { count: "exact", head: true }).eq("page", page);
  const { data, error } = await db
    .from("page_sections")
    .insert({ page, type, label: def.label, variant: def.variants[0].value, sort: count ?? 0, is_enabled: false, content: {}, draft_sort: count ?? 0, draft_enabled: true, draft_content: sanitize(def.fields, {}), updated_by: user.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  await logActivity(user, "agregó sección", "contenido", data.id, { pagina: page, tipo: type });
  return { ok: true, id: data.id };
}

export async function deleteSectionAction(id: string) {
  const user = await requireStaff();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Id inválido." };
  const { error } = await (await createSessionClient()).from("page_sections").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(user, "eliminó sección", "contenido", id);
  refreshPublic("sections");
  return { ok: true };
}

export async function discardDraftsAction(page: string) {
  const user = await requireStaff();
  if (!pageKey.safeParse(page).success) return { ok: false, error: "Página inválida." };
  const { error } = await (await createSessionClient()).from("page_sections").update({ draft_content: null, draft_variant: null, draft_sort: null, draft_enabled: null }).eq("page", page);
  if (error) return { ok: false, error: error.message };
  await logActivity(user, "descartó borradores", "contenido", page);
  return { ok: true };
}

export async function publishPageAction(page: string) {
  const user = await requireStaff();
  if (!pageKey.safeParse(page).success) return { ok: false, error: "Página inválida." };
  const { data, error } = await (await createSessionClient()).rpc("publish_page", { p_page: page });
  if (error) return { ok: false, error: error.message };
  await logActivity(user, "publicó cambios", "contenido", page, { secciones: data });
  refreshPublic("sections");
  return { ok: true, count: data as number };
}

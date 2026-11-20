"use server";
import { z } from "zod";
import { logActivity, requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { refreshPublic } from "@/lib/admin/revalidate";
import { slugify } from "@/lib/format";

const Schema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500),
  image_id: z.uuid().nullable(),
  sort: z.number().int().min(0).max(1000),
  is_active: z.boolean(),
  seo_title: z.string().trim().max(70).nullable(),
  seo_description: z.string().trim().max(170).nullable(),
});

export async function saveCategoryAction(input: unknown) {
  const user = await requireStaff();
  const p = Schema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const { id, slug: s, ...rest } = p.data;
  const slug = slugify(s || rest.name);
  const db = await createSessionClient();
  const { data: clash } = await db.from("categories").select("id").eq("slug", slug).maybeSingle();
  if (clash && clash.id !== id) return { ok: false, error: "Ya existe una categoría con esa URL." };
  const row = { ...rest, slug, seo_title: rest.seo_title || null, seo_description: rest.seo_description || null };
  const { error } = id ? await db.from("categories").update(row).eq("id", id) : await db.from("categories").insert(row);
  if (error) return { ok: false, error: error.message };
  await logActivity(user, id ? "editó categoría" : "creó categoría", "categoría", id ?? null, { nombre: rest.name });
  refreshPublic("catalog");
  return { ok: true };
}

export async function deleteCategoryAction(id: string) {
  const user = await requireStaff();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Id inválido" };
  const db = await createSessionClient();
  const { count } = await db.from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (count) return { ok: false, error: `Tiene ${count} producto(s). Muévelos a otra categoría antes de eliminarla.` };
  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(user, "eliminó categoría", "categoría", id);
  refreshPublic("catalog");
  return { ok: true };
}

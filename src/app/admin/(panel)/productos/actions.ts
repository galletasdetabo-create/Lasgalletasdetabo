"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity, requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { refreshPublic } from "@/lib/admin/revalidate";
import { slugify } from "@/lib/format";

const Field = z.object({
  key: z.string().trim().regex(/^[a-z0-9_]{1,40}$/, "Clave inválida (usa minúsculas, números y _)"),
  label: z.string().trim().min(1).max(80),
  type: z.enum(["text", "textarea", "select", "color", "date", "number", "image"]),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  placeholder: z.string().max(120).optional(),
  help: z.string().max(200).optional(),
  maxLength: z.number().int().min(1).max(2000).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

const Variant = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(120),
  options: z.record(z.string().max(40), z.string().max(80)),
  price: z.number().int().min(0).max(100_000_000),
  compare_at_price: z.number().int().min(0).nullable(),
  sku: z.string().max(60).nullable(),
  is_active: z.boolean(),
  stock_quantity: z.number().int().min(0).nullable(),
});

const ProductSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(2, "Escribe el nombre").max(140),
    slug: z.string().trim().max(80).optional(),
    short_description: z.string().trim().max(300),
    description: z.string().trim().max(8000),
    category_id: z.uuid().nullable(),
    kind: z.enum(["galleta_personalizada", "alfajor", "caja", "estandar"]),
    price: z.number().int().min(0).max(100_000_000),
    compare_at_price: z.number().int().min(0).nullable(),
    is_active: z.boolean(),
    is_featured: z.boolean(),
    is_sample: z.boolean(),
    stock_status: z.enum(["disponible", "agotado", "bajo_pedido"]),
    track_inventory: z.boolean(),
    stock_quantity: z.number().int().min(0).nullable(),
    min_quantity: z.number().int().min(1).max(10000),
    max_quantity: z.number().int().min(1).max(10000),
    quantity_step: z.number().int().min(1).max(1000),
    quantity_label: z.string().trim().min(1).max(30),
    prep_days_min: z.number().int().min(0).max(120),
    prep_days_max: z.number().int().min(0).max(120),
    prep_time_text: z.string().trim().max(200),
    customization_fields: z.array(Field).max(20),
    tags: z.array(z.string().trim().min(1).max(40)).max(20),
    seo_title: z.string().trim().max(70).nullable(),
    seo_description: z.string().trim().max(170).nullable(),
    images: z.array(z.uuid()).max(12),
    variants: z.array(Variant).max(60),
  })
  .superRefine((p, ctx) => {
    if (p.max_quantity < p.min_quantity) ctx.addIssue({ code: "custom", path: ["max_quantity"], message: "El máximo debe ser mayor o igual al mínimo" });
    const keys = p.customization_fields.map((f) => f.key);
    if (new Set(keys).size !== keys.length) ctx.addIssue({ code: "custom", path: ["customization_fields"], message: "Las claves de los campos deben ser únicas" });
    p.customization_fields.forEach((f, i) => {
      if (f.type === "select" && !f.options?.length) ctx.addIssue({ code: "custom", path: ["customization_fields", i], message: `«${f.label}» necesita opciones` });
    });
  });

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveProductAction(input: unknown): Promise<SaveResult> {
  const user = await requireStaff();
  const parsed = ProductSchema.safeParse(input);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `${i.path.join(" › ")}: ${i.message}` };
  }
  const { id, images, variants, slug: rawSlug, ...data } = parsed.data;
  const slug = slugify(rawSlug || data.name);
  if (!slug) return { ok: false, error: "No se pudo generar la URL del producto." };
  const db = await createSessionClient();

  const { data: clash } = await db.from("products").select("id").eq("slug", slug).maybeSingle();
  if (clash && clash.id !== id) return { ok: false, error: "Ya existe otro producto con esa URL (slug)." };

  const row = { ...data, slug, seo_title: data.seo_title || null, seo_description: data.seo_description || null };
  let productId = id;
  if (id) {
    const { error } = await db.from("products").update(row).eq("id", id);
    if (error) return { ok: false, error: "No se pudo guardar: " + error.message };
  } else {
    const { data: created, error } = await db.from("products").insert(row).select("id").single();
    if (error) return { ok: false, error: "No se pudo crear: " + error.message };
    productId = created.id;
  }

  // Imágenes (orden = galería)
  await db.from("product_images").delete().eq("product_id", productId!);
  if (images.length) {
    const { error } = await db.from("product_images").insert(images.map((media_id, sort) => ({ product_id: productId, media_id, sort })));
    if (error) return { ok: false, error: "Producto guardado, pero falló la galería: " + error.message };
  }

  // Variantes: actualiza, crea y elimina las que se quitaron
  const { data: existing } = await db.from("product_variants").select("id").eq("product_id", productId!);
  const keep = new Set(variants.filter((v) => v.id).map((v) => v.id));
  const remove = (existing ?? []).filter((v) => !keep.has(v.id)).map((v) => v.id);
  if (remove.length) await db.from("product_variants").delete().in("id", remove);
  for (const [sort, v] of variants.entries()) {
    const vrow = { product_id: productId, name: v.name, options: v.options, price: v.price, compare_at_price: v.compare_at_price, sku: v.sku || null, is_active: v.is_active, stock_quantity: v.stock_quantity, sort };
    const { error } = v.id ? await db.from("product_variants").update(vrow).eq("id", v.id) : await db.from("product_variants").insert(vrow);
    if (error) return { ok: false, error: "Error en la variante «" + v.name + "»: " + error.message };
  }

  await logActivity(user, id ? "editó producto" : "creó producto", "producto", productId, { nombre: data.name });
  refreshPublic("catalog");
  return { ok: true, id: productId! };
}

export async function duplicateProductAction(id: string) {
  const user = await requireStaff();
  if (!z.uuid().safeParse(id).success) return;
  const db = await createSessionClient();
  const { data: p } = await db.from("products").select("*").eq("id", id).single();
  if (!p) return;
  const rest = { ...p };
  delete rest.id;
  delete rest.created_at;
  delete rest.updated_at;
  const slug = `${p.slug}-copia-${crypto.randomUUID().slice(0, 4)}`;
  const { data: copy, error } = await db.from("products").insert({ ...rest, slug, name: `${p.name} (copia)`, is_active: false, is_featured: false }).select("id").single();
  if (error || !copy) return;
  const [{ data: imgs }, { data: vars }] = await Promise.all([
    db.from("product_images").select("media_id, sort").eq("product_id", id),
    db.from("product_variants").select("name, options, price, compare_at_price, sku, is_active, stock_quantity, sort").eq("product_id", id),
  ]);
  if (imgs?.length) await db.from("product_images").insert(imgs.map((i) => ({ ...i, product_id: copy.id })));
  if (vars?.length) await db.from("product_variants").insert(vars.map((v) => ({ ...v, product_id: copy.id })));
  await logActivity(user, "duplicó producto", "producto", copy.id, { origen: p.name });
  refreshPublic("catalog");
  redirect(`/admin/productos/${copy.id}`);
}

export async function deleteProductAction(id: string) {
  const user = await requireStaff();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Id inválido" };
  const db = await createSessionClient();
  const { data: p } = await db.from("products").select("name").eq("id", id).single();
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar: " + error.message };
  await logActivity(user, "eliminó producto", "producto", id, { nombre: p?.name });
  refreshPublic("catalog");
  redirect("/admin/productos");
}

const QuickSchema = z.object({
  id: z.uuid(),
  is_active: z.boolean().optional(),
  stock_status: z.enum(["disponible", "agotado", "bajo_pedido"]).optional(),
  stock_quantity: z.number().int().min(0).nullable().optional(),
  is_featured: z.boolean().optional(),
});

/** Cambios rápidos desde el listado (disponibilidad, inventario, visibilidad). */
export async function quickUpdateProductAction(input: unknown) {
  const user = await requireStaff();
  const p = QuickSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Datos inválidos" };
  const { id, ...patch } = p.data;
  const { error } = await (await createSessionClient()).from("products").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(user, "actualizó inventario/visibilidad", "producto", id, patch);
  refreshPublic("catalog");
  return { ok: true };
}

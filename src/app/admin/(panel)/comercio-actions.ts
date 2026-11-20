"use server";
import { z } from "zod";
import { logActivity, requireAdmin } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { refreshPublic } from "@/lib/admin/revalidate";

const Delivery = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300),
  price: z.number().int().min(0).max(10_000_000),
  price_note: z.string().trim().max(80),
  requires_address: z.boolean(),
  is_active: z.boolean(),
  is_sample: z.boolean(),
  sort: z.number().int().min(0).max(100),
});

export async function saveDeliveryAction(input: unknown) {
  const user = await requireAdmin();
  const p = Delivery.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const { id, ...row } = p.data;
  const db = await createSessionClient();
  const { error } = id ? await db.from("delivery_methods").update(row).eq("id", id) : await db.from("delivery_methods").insert(row);
  if (error) return { ok: false, error: error.message };
  await logActivity(user, id ? "editó método de entrega" : "creó método de entrega", "entrega", id ?? null, { nombre: row.name });
  refreshPublic("catalog");
  return { ok: true };
}

export async function deleteDeliveryAction(id: string) {
  const user = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Id inválido" };
  const { error } = await (await createSessionClient()).from("delivery_methods").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(user, "eliminó método de entrega", "entrega", id);
  refreshPublic("catalog");
  return { ok: true };
}

const Coupon = z
  .object({
    id: z.uuid().optional(),
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/, "Código: 3 a 32 letras, números, - o _"),
    description: z.string().trim().max(200),
    discount_type: z.enum(["percent", "fixed"]),
    value: z.number().int().min(1),
    min_subtotal: z.number().int().min(0),
    max_uses: z.number().int().min(1).nullable(),
    starts_at: z.string().nullable(),
    ends_at: z.string().nullable(),
    is_active: z.boolean(),
  })
  .refine((c) => c.discount_type !== "percent" || c.value <= 100, { message: "El porcentaje no puede superar 100", path: ["value"] });

export async function saveCouponAction(input: unknown) {
  const user = await requireAdmin();
  const p = Coupon.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const { id, ...row } = p.data;
  const toTs = (d: string | null, end = false) => (d ? new Date(`${d}T${end ? "23:59:59" : "00:00:00"}-05:00`).toISOString() : null);
  const data = { ...row, starts_at: toTs(row.starts_at), ends_at: toTs(row.ends_at, true) };
  const db = await createSessionClient();
  const { error } = id ? await db.from("coupons").update(data).eq("id", id) : await db.from("coupons").insert(data);
  if (error) return { ok: false, error: error.code === "23505" ? "Ya existe un cupón con ese código." : error.message };
  await logActivity(user, id ? "editó cupón" : "creó cupón", "cupón", id ?? null, { codigo: row.code });
  return { ok: true };
}

export async function deleteCouponAction(id: string) {
  const user = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Id inválido" };
  const { error } = await (await createSessionClient()).from("coupons").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(user, "eliminó cupón", "cupón", id);
  return { ok: true };
}

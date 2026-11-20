"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity, requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";

const StatusInput = z.object({
  id: z.uuid(),
  status: z.enum(["pendiente", "confirmado", "en_preparacion", "listo", "enviado", "entregado", "cancelado"]),
  note: z.string().trim().max(500).default(""),
});

export async function updateOrderStatus(input: unknown) {
  const user = await requireStaff();
  const parsed = StatusInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const db = await createSessionClient();
  const { data: before } = await db.from("orders").select("status, number").eq("id", parsed.data.id).single();
  if (!before) return { ok: false, error: "Pedido no encontrado." };
  if (before.status === "cancelado" && parsed.data.status !== "cancelado") return { ok: false, error: "Un pedido cancelado no se puede reactivar. Crea un pedido nuevo." };
  const { error } = await db.from("orders").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) return { ok: false, error: "No se pudo actualizar el estado." };
  if (parsed.data.note) await db.from("order_status_history").insert({ order_id: parsed.data.id, kind: "note", note: parsed.data.note, changed_by: user.id });
  await logActivity(user, "cambió estado de pedido", "pedido", parsed.data.id, { numero: before.number, de: before.status, a: parsed.data.status });
  revalidatePath(`/admin/pedidos/${parsed.data.id}`);
  return { ok: true };
}

export async function saveOrderNotes(input: unknown) {
  const user = await requireStaff();
  const parsed = z.object({ id: z.uuid(), notes: z.string().max(4000) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const db = await createSessionClient();
  const { error } = await db.from("orders").update({ admin_notes: parsed.data.notes }).eq("id", parsed.data.id);
  if (error) return { ok: false, error: "No se pudieron guardar las notas." };
  await logActivity(user, "editó notas internas", "pedido", parsed.data.id);
  return { ok: true };
}

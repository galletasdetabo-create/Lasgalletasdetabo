"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity, requireAdmin, requireStaff } from "@/lib/auth";
import { createServiceClient, createSessionClient } from "@/lib/supabase/server";
import { refreshPublic } from "@/lib/admin/revalidate";

export async function saveCustomerNotesAction(id: string, notes: string) {
  const user = await requireStaff();
  if (!z.uuid().safeParse(id).success || notes.length > 4000) return { ok: false, error: "Datos inválidos" };
  const { error } = await (await createSessionClient()).from("customers").update({ notes }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(user, "editó notas de cliente", "cliente", id);
  return { ok: true };
}

export async function markMessageAction(id: string, isRead: boolean) {
  await requireStaff();
  if (!z.uuid().safeParse(id).success) return;
  await (await createSessionClient()).from("contact_messages").update({ is_read: isRead }).eq("id", id);
  revalidatePath("/admin/mensajes");
}

export async function deleteMessageAction(id: string) {
  const user = await requireStaff();
  if (!z.uuid().safeParse(id).success) return;
  await (await createSessionClient()).from("contact_messages").delete().eq("id", id);
  await logActivity(user, "eliminó mensaje", "mensaje", id);
  revalidatePath("/admin/mensajes");
}

export async function setPseEnabledAction(enabled: boolean) {
  const user = await requireAdmin();
  const { error } = await (await createSessionClient()).from("site_settings").update({ value: { pse_enabled: enabled } }).eq("key", "payments");
  if (error) return { ok: false, error: error.message };
  await logActivity(user, enabled ? "activó PSE" : "desactivó PSE", "pagos");
  refreshPublic("settings");
  revalidatePath("/admin/pagos");
  return { ok: true };
}

const RoleInput = z.object({ id: z.uuid(), role: z.enum(["admin", "editor", "customer"]) });

/** Cambia el rol de un usuario (solo administradores). Evita dejar la tienda sin administradores. */
export async function setRoleAction(input: unknown) {
  const user = await requireAdmin();
  const p = RoleInput.safeParse(input);
  if (!p.success) return { ok: false, error: "Datos inválidos" };
  const db = createServiceClient();
  if (p.data.role !== "admin") {
    const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").neq("id", p.data.id);
    if (!count) return { ok: false, error: "Debe existir al menos un administrador." };
  }
  const { error } = await db.from("profiles").update({ role: p.data.role }).eq("id", p.data.id);
  if (error) return { ok: false, error: error.message };
  await logActivity(user, "cambió rol", "usuario", p.data.id, { rol: p.data.role });
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

const NewUser = z.object({
  email: z.email(),
  full_name: z.string().trim().min(2).max(120),
  password: z.string().min(12, "La contraseña debe tener al menos 12 caracteres").max(72),
  role: z.enum(["admin", "editor"]),
});

export async function createStaffAction(input: unknown) {
  const user = await requireAdmin();
  const p = NewUser.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const db = createServiceClient();
  const { data, error } = await db.auth.admin.createUser({ email: p.data.email, password: p.data.password, email_confirm: true, user_metadata: { full_name: p.data.full_name } });
  if (error || !data.user) return { ok: false, error: error?.message.includes("already") ? "Ya existe un usuario con ese correo." : "No se pudo crear el usuario." };
  await db.from("profiles").update({ role: p.data.role, full_name: p.data.full_name }).eq("id", data.user.id);
  await logActivity(user, "creó usuario del equipo", "usuario", data.user.id, { email: p.data.email, rol: p.data.role });
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

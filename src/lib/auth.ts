import "server-only";
import { redirect } from "next/navigation";
import { createSessionClient, createServiceClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types";

export interface SessionUser {
  id: string;
  email: string;
  role: AppRole;
  fullName: string;
}

/** Usuario actual verificado contra Supabase Auth (no confía solo en la cookie). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", data.user.id)
    .maybeSingle();
  return {
    id: data.user.id,
    email: data.user.email ?? profile?.email ?? "",
    role: (profile?.role as AppRole) ?? "customer",
    fullName: profile?.full_name ?? "",
  };
}

export const isStaffRole = (r: AppRole) => r === "admin" || r === "editor";

/** Para páginas y acciones del CRM. Redirige al acceso si no hay permisos. */
export async function requireStaff() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/acceso");
  if (!isStaffRole(user.role)) redirect("/admin/acceso?error=sin-permiso");
  return user;
}

export async function requireAdmin() {
  const user = await requireStaff();
  if (user.role !== "admin") redirect("/admin?error=solo-administradores");
  return user;
}

/** Registro de actividad del CRM (auditoría). Nunca bloquea la operación principal. */
export async function logActivity(
  actor: Pick<SessionUser, "id" | "email"> | null,
  action: string,
  entity: string,
  entityId?: string | null,
  details: Record<string, unknown> = {},
) {
  try {
    await createServiceClient().from("activity_log").insert({
      actor_id: actor?.id ?? null,
      actor_email: actor?.email ?? null,
      action,
      entity,
      entity_id: entityId ?? null,
      details,
    });
  } catch (e) {
    console.error("[activity_log]", e);
  }
}

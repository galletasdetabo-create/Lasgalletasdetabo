import { Card, PageHeader } from "@/components/admin/ui";
import { UsersManager } from "@/components/admin/UsersManager";
import { requireAdmin } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";

export default async function UsersPage() {
  const me = await requireAdmin();
  const { data } = await (await createSessionClient()).from("profiles").select("id, email, full_name, role, created_at").order("created_at");
  return (
    <>
      <PageHeader title="Usuarios y roles" description="Administrador: acceso total, incluidos pagos, WhatsApp, cupones y usuarios. Editor: productos, pedidos, contenido y medios. Cliente: solo su cuenta en la tienda." />
      <Card><UsersManager users={data ?? []} meId={me.id} /></Card>
    </>
  );
}

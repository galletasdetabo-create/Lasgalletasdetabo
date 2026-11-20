import { PageHeader } from "@/components/admin/ui";
import { DeliveryManager } from "@/components/admin/DeliveryManager";
import { requireAdmin } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import type { DeliveryMethod } from "@/lib/types";

export default async function DeliveryPage() {
  await requireAdmin();
  const { data } = await (await createSessionClient()).from("delivery_methods").select("*").order("sort");
  return (
    <>
      <PageHeader title="Métodos de entrega" description="Opciones que el cliente elige en el checkout. Indica la tarifa real y la cobertura cuando estén definidas." />
      <DeliveryManager records={(data ?? []) as DeliveryMethod[]} />
    </>
  );
}

import { PageHeader } from "@/components/admin/ui";
import { CouponManager, type CouponRow } from "@/components/admin/CouponManager";
import { requireAdmin } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";

export default async function CouponsPage() {
  await requireAdmin();
  const { data } = await (await createSessionClient()).from("coupons").select("*").order("created_at", { ascending: false });
  const rows: CouponRow[] = (data ?? []).map((c) => ({ ...c, starts_at: c.starts_at ? c.starts_at.slice(0, 10) : null, ends_at: c.ends_at ? new Date(c.ends_at).toLocaleDateString("en-CA", { timeZone: "America/Bogota" }) : null }));
  return (
    <>
      <PageHeader title="Cupones y descuentos" description="Códigos de descuento por porcentaje o valor fijo, con vigencia, mínimo de compra y límite de usos. El descuento se valida siempre en el servidor." />
      <CouponManager records={rows} />
    </>
  );
}

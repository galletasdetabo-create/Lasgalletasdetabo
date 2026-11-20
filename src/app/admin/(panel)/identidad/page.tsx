import { Card, PageHeader } from "@/components/admin/ui";
import { BrandForm } from "@/components/admin/BrandForm";
import { requireStaff } from "@/lib/auth";
import { getAdminSettings } from "@/lib/admin/settings";

export default async function IdentityPage() {
  await requireStaff();
  const s = await getAdminSettings();
  return (
    <>
      <PageHeader title="Identidad visual" description="Logotipo, favicon, eslogan, colores de marca y tipografías. Los colores se aplican como tokens en todo el sitio." />
      <Card><BrandForm initial={s.brand} /></Card>
    </>
  );
}

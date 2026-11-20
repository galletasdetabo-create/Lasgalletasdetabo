import { PageHeader } from "@/components/admin/ui";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";

export default async function NewProductPage() {
  await requireStaff();
  const { data: cats } = await (await createSessionClient()).from("categories").select("id, name").order("sort");
  return (
    <>
      <PageHeader back={{ href: "/admin/productos", label: "Productos" }} title="Nuevo producto" />
      <ProductEditor product={null} categories={cats ?? []} imageIds={[]} />
    </>
  );
}

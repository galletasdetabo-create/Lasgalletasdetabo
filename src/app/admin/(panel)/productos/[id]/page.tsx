import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader, SampleBadge } from "@/components/admin/ui";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import type { Product, Variant } from "@/lib/types";

export default async function EditProductPage(props: PageProps<"/admin/productos/[id]">) {
  await requireStaff();
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = await createSessionClient();
  const [{ data: product }, { data: cats }, { data: imgs }, { data: variants }] = await Promise.all([
    db.from("products").select("*").eq("id", id).maybeSingle<Product>(),
    db.from("categories").select("id, name").order("sort"),
    db.from("product_images").select("media_id").eq("product_id", id).order("sort"),
    db.from("product_variants").select("*").eq("product_id", id).order("sort"),
  ]);
  if (!product) notFound();
  return (
    <>
      <PageHeader back={{ href: "/admin/productos", label: "Productos" }} title={product.name} actions={product.is_sample ? <SampleBadge /> : null} />
      <ProductEditor key={product.id} product={{ ...product, variants: (variants ?? []) as Variant[] }} categories={cats ?? []} imageIds={(imgs ?? []).map((i) => i.media_id)} />
    </>
  );
}

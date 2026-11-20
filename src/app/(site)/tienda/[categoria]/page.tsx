import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ShopView } from "@/components/shop/ShopView";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { getCatalog, getCategoryBySlug } from "@/lib/data/public";

export async function generateStaticParams() {
  const { categories } = await getCatalog();
  return categories.map((c) => ({ categoria: c.slug }));
}

export async function generateMetadata(props: PageProps<"/tienda/[categoria]">): Promise<Metadata> {
  const { categoria } = await props.params;
  const c = await getCategoryBySlug(categoria);
  if (!c) return { title: "Categoría no encontrada", robots: { index: false } };
  return {
    title: c.seo_title || c.name,
    description: c.seo_description || c.description,
    alternates: { canonical: `/tienda/${c.slug}` },
    openGraph: c.image ? { images: [{ url: c.image.url, width: c.image.width, height: c.image.height, alt: c.image.alt }] } : undefined,
  };
}

async function CategoryContent({ params, searchParams }: PageProps<"/tienda/[categoria]">) {
  const { categoria } = await params;
  const category = await getCategoryBySlug(categoria);
  if (!category) notFound();
  return (
    <>
      <ShopView searchParams={searchParams} category={category} />
      <BreadcrumbJsonLd items={[{ name: "Inicio", path: "/" }, { name: "Tienda", path: "/tienda" }, { name: category.name, path: `/tienda/${category.slug}` }]} />
    </>
  );
}

export default function CategoryPage(props: PageProps<"/tienda/[categoria]">) {
  return (
    <Suspense fallback={<div className="container-site pt-16" aria-hidden="true"><div className="skeleton mx-auto h-14 w-80 rounded" /><div className="skeleton mt-14 h-96 rounded-[24px]" /></div>}>
      <CategoryContent {...props} />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { ShopView } from "@/components/shop/ShopView";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Tienda de galletas personalizadas y alfajores",
  description: "Compra en línea galletas decoradas y personalizadas para cumpleaños, aniversarios y eventos, alfajores artesanales y cajas de regalo.",
  alternates: { canonical: "/tienda" },
};

export default function ShopPage(props: PageProps<"/tienda">) {
  return (
    <>
      <ShopView searchParams={props.searchParams} category={null} />
      <BreadcrumbJsonLd items={[{ name: "Inicio", path: "/" }, { name: "Tienda", path: "/tienda" }]} />
    </>
  );
}

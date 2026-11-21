import type { Metadata } from "next";
import { ShopView } from "@/components/shop/ShopView";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Tienda de galletas personalizadas y alfajores",
  description: "Encuentra el detalle ideal para celebrar: letras con frutas, galletas personalizadas, alfajores artesanales y cajas de regalo para cumpleaños, aniversarios y fechas especiales.",
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

import type { Metadata } from "next";
import { CmsPage } from "@/components/sections/CmsPage";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Nosotros",
  description: "Conoce Las Galletas de Tabo: una cocina de casa donde cada cumpleaños, aniversario y momento especial se convierte en un detalle dulce hecho a mano.",
  alternates: { canonical: "/nosotros" },
};

export default function AboutPage() {
  return (
    <>
      <CmsPage page="nosotros" fallbackTitle="Nosotros" />
      <BreadcrumbJsonLd items={[{ name: "Inicio", path: "/" }, { name: "Nosotros", path: "/nosotros" }]} />
    </>
  );
}

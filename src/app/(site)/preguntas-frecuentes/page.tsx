import type { Metadata } from "next";
import { CmsPage } from "@/components/sections/CmsPage";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Resolvemos tus dudas sobre pedidos, tiempos de preparación, personalización, pagos y entregas de Las Galletas de Tabo.",
  alternates: { canonical: "/preguntas-frecuentes" },
};

export default function FaqPage() {
  return (
    <>
      <CmsPage page="preguntas-frecuentes" fallbackTitle="Preguntas frecuentes" />
      <BreadcrumbJsonLd items={[{ name: "Inicio", path: "/" }, { name: "Preguntas frecuentes", path: "/preguntas-frecuentes" }]} />
    </>
  );
}

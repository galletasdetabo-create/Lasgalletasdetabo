import type { Metadata } from "next";
import { CmsPage } from "@/components/sections/CmsPage";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Resolvemos tus dudas para que tu celebración salga perfecta: pedidos, tiempos de preparación, personalización, pagos y entregas.",
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

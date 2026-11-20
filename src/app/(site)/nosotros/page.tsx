import type { Metadata } from "next";
import { CmsPage } from "@/components/sections/CmsPage";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Nosotros",
  description: "Conoce Las Galletas de Tabo: repostería artesanal hecha en casa, galletas personalizadas y alfajores preparados por encargo.",
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

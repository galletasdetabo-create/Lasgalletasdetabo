import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { getImage, getSettings } from "@/lib/data/public";
import { SITE_URL } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const [favicon, og] = await Promise.all([getImage(s.brand.favicon_id), getImage(s.seo.og_image_id)]);
  const icon = favicon?.url ?? "/brand/icono-512.png";
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: s.seo.title, template: `%s · ${s.brand.name}` },
    description: s.seo.description,
    keywords: s.seo.keywords.split(",").map((k) => k.trim()).filter(Boolean),
    applicationName: s.brand.name,
    alternates: { canonical: "/" },
    icons: { icon: [{ url: icon, type: "image/png" }], apple: [{ url: icon }] },
    openGraph: {
      type: "website",
      locale: "es_CO",
      siteName: s.brand.name,
      title: s.seo.title,
      description: s.seo.description,
      url: SITE_URL,
      images: og ? [{ url: og.url, width: og.width, height: og.height, alt: og.alt }] : undefined,
    },
    twitter: { card: "summary_large_image", title: s.seo.title, description: s.seo.description, images: og ? [og.url] : undefined },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const c = s.brand.colors;
  // Valores validados como hex (#RRGGBB) en mergeSettings: seguro inyectarlos.
  const brandVars = `:root{--brand-cream:${c.cream};--brand-blush:${c.blush};--brand-rose:${c.rose};--brand-rose-deep:${c.rose_deep};--brand-chocolate:${c.chocolate};--brand-gold:${c.gold}}`;
  return (
    <html lang="es-CO" data-fonts={s.brand.font_pair} className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <style dangerouslySetInnerHTML={{ __html: brandVars }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

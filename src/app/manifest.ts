import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/data/public";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  return {
    name: s.brand.name,
    short_name: "Galletas de Tabo",
    description: s.seo.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "es-CO",
    icons: [
      { src: "/brand/icono-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}

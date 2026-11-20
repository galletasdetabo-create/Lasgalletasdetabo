import type { MetadataRoute } from "next";
import { getCatalog, getSettings } from "@/lib/data/public";
import { SITE_URL } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ categories, products }, s] = await Promise.all([getCatalog(), getSettings()]);
  const latest = products.reduce((d, p) => (p.updated_at > d ? p.updated_at : d), "2026-11-19T00:00:00Z");
  const fixed: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1, lastModified: latest },
    { url: `${SITE_URL}/tienda`, changeFrequency: "daily", priority: 0.9, lastModified: latest },
    { url: `${SITE_URL}/nosotros`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/preguntas-frecuentes`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contacto`, changeFrequency: "monthly", priority: 0.5 },
  ];
  const legal = (
    [
      ["terminos", s.legal.terms],
      ["privacidad", s.legal.privacy],
      ["envios", s.legal.shipping],
      ["cambios", s.legal.returns],
    ] as const
  )
    .filter(([, t]) => t.trim())
    .map(([slug]) => ({ url: `${SITE_URL}/legal/${slug}`, changeFrequency: "yearly" as const, priority: 0.2 }));
  return [
    ...fixed,
    ...categories.map((c) => ({ url: `${SITE_URL}/tienda/${c.slug}`, lastModified: latest, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((p) => ({
      url: `${SITE_URL}/producto/${p.slug}`,
      lastModified: p.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: (p.images ?? []).slice(0, 3).map((i) => i.url),
    })),
    ...legal,
  ];
}

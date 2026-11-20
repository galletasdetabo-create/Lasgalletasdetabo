import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";
import { mergeSettings, type SiteSettings } from "@/lib/cms/settings";
import { toImageRef } from "@/lib/media";
import type { Category, DeliveryMethod, ImageRef, Media, Product, Section, Variant } from "@/lib/types";

export const TAGS = {
  settings: "settings",
  media: "media",
  catalog: "catalog",
  sections: "sections",
} as const;

export async function getSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag(TAGS.settings);
  cacheLife("max");
  const { data, error } = await createPublicClient().from("site_settings").select("key, value");
  if (error) throw new Error("No se pudieron cargar los ajustes: " + error.message);
  return mergeSettings(data ?? []);
}

/** Toda la biblioteca de medios indexada por id (la biblioteca es pequeña). */
export async function getMediaIndex(): Promise<Record<string, ImageRef>> {
  "use cache";
  cacheTag(TAGS.media);
  cacheLife("max");
  const { data, error } = await createPublicClient().from("media").select("*");
  if (error) throw new Error("No se pudo cargar la biblioteca de medios: " + error.message);
  const index: Record<string, ImageRef> = {};
  for (const m of (data ?? []) as Media[]) {
    const ref = toImageRef(m);
    if (ref) index[m.id] = ref;
  }
  return index;
}

export async function getImage(id: string | null | undefined): Promise<ImageRef | null> {
  if (!id) return null;
  const index = await getMediaIndex();
  return index[id] ?? null;
}

export interface Catalog {
  categories: Category[];
  products: Product[];
}

export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag(TAGS.catalog, TAGS.media);
  cacheLife("max");
  const supabase = createPublicClient();
  const [cats, prods, imgs, vars, media] = await Promise.all([
    supabase.from("categories").select("*").eq("is_active", true).order("sort"),
    supabase.from("products").select("*").eq("is_active", true).order("sort").order("created_at"),
    supabase.from("product_images").select("product_id, media_id, sort").order("sort"),
    supabase.from("product_variants").select("*").eq("is_active", true).order("sort"),
    getMediaIndex(),
  ]);
  for (const r of [cats, prods, imgs, vars]) if (r.error) throw new Error("Error cargando el catálogo: " + r.error.message);

  const categories = (cats.data ?? []) as Category[];
  const catById = new Map(categories.map((c) => [c.id, c]));
  const imagesBy = new Map<string, ImageRef[]>();
  for (const pi of imgs.data ?? []) {
    const ref = media[pi.media_id as string];
    if (!ref) continue;
    const list = imagesBy.get(pi.product_id as string) ?? [];
    list.push(ref);
    imagesBy.set(pi.product_id as string, list);
  }
  const variantsBy = new Map<string, Variant[]>();
  for (const v of (vars.data ?? []) as Variant[]) {
    const list = variantsBy.get(v.product_id) ?? [];
    list.push(v);
    variantsBy.set(v.product_id, list);
  }
  const products = ((prods.data ?? []) as Product[]).map((p) => {
    const c = p.category_id ? catById.get(p.category_id) : null;
    return {
      ...p,
      category: c ? { id: c.id, slug: c.slug, name: c.name } : null,
      images: imagesBy.get(p.id) ?? [],
      variants: variantsBy.get(p.id) ?? [],
    };
  });
  const counts = new Map<string, number>();
  products.forEach((p) => p.category_id && counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1));
  return {
    categories: categories.map((c) => ({ ...c, image: c.image_id ? media[c.image_id] ?? null : null, product_count: counts.get(c.id) ?? 0 })),
    products,
  };
}

export async function getProductBySlug(slug: string) {
  const { products } = await getCatalog();
  return products.find((p) => p.slug === slug) ?? null;
}

export async function getCategoryBySlug(slug: string) {
  const { categories } = await getCatalog();
  return categories.find((c) => c.slug === slug) ?? null;
}

export async function getDeliveryMethods(): Promise<DeliveryMethod[]> {
  "use cache";
  cacheTag(TAGS.catalog);
  cacheLife("max");
  const { data, error } = await createPublicClient().from("delivery_methods").select("*").eq("is_active", true).order("sort");
  if (error) throw new Error(error.message);
  return (data ?? []) as DeliveryMethod[];
}

export async function getSections(page: string): Promise<Section[]> {
  "use cache";
  cacheTag(TAGS.sections, `sections:${page}`);
  cacheLife("max");
  const { data, error } = await createPublicClient()
    .from("page_sections")
    .select("id, page, type, label, variant, sort, is_enabled, content")
    .eq("page", page)
    .eq("is_enabled", true)
    .order("sort");
  if (error) throw new Error(error.message);
  return (data ?? []) as Section[];
}

/** Precio mínimo mostrado ("desde"), considerando variantes activas. */
export function priceFrom(p: Product) {
  const vs = p.variants ?? [];
  if (!vs.length) return { price: p.price, compare: p.compare_at_price, from: false };
  const min = vs.reduce((a, b) => (b.price < a.price ? b : a));
  return { price: min.price, compare: min.compare_at_price, from: vs.length > 1 && vs.some((v) => v.price !== min.price) };
}

/** Fotografía para las bandas de título de página (tienda, carrito…): una imagen clara sobre mármol. */
export async function getBandImage(): Promise<ImageRef | null> {
  const index = await getMediaIndex();
  const refs = Object.values(index);
  return refs.find((r) => r.url.includes("galletas-chispas-marmol")) ?? refs.find((r) => r.isStock) ?? null;
}

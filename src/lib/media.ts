import { SUPABASE_URL } from "@/lib/env";
import type { ImageRef, Media } from "@/lib/types";

export function publicMediaUrl(bucket: string, path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function toImageRef(m: Media | null | undefined, altOverride?: string): ImageRef | null {
  if (!m) return null;
  return {
    id: m.id,
    url: publicMediaUrl(m.bucket, m.path),
    alt: altOverride || m.alt || "",
    width: m.width ?? 1200,
    height: m.height ?? 800,
    blur: m.blur_data,
    isStock: m.is_stock,
  };
}

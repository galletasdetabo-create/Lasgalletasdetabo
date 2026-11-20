import "server-only";
import { revalidatePath, updateTag } from "next/cache";

/** Invalida inmediatamente el contenido público afectado (lectura tras escritura). */
export function refreshPublic(...tags: ("settings" | "media" | "catalog" | "sections" | "orders")[]) {
  for (const t of new Set(tags)) updateTag(t);
  // Además se descarta el HTML prerenderizado de las páginas públicas, para que el cambio se vea de inmediato.
  revalidatePath("/", "layout");
}

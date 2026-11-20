// Reemplaza las secciones de la página de inicio por el contenido inicial (descarta lo editado en esa página).
// Uso: node --env-file=.env.local scripts/reseed-home.mjs
import { createClient } from "@supabase/supabase-js";
import { homeSections } from "./home-content.mjs";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const must = (r, w) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data; };

const media = must(await db.from("media").select("id, path"), "media");
const ids = {};
for (const m of media) {
  const base = m.path.split("/").pop().replace(/\.(webp|png|jpg)$/i, "").replace(/-[0-9a-f]{8}$/, "");
  ids[base] = m.id;
}
must(await db.from("page_sections").delete().eq("page", "home"), "delete");
const sections = homeSections(ids);
must(await db.from("page_sections").insert(sections.map((s, sort) => ({
  page: "home", type: s.type, label: s.label, variant: s.variant, sort, is_enabled: s.enabled ?? true, content: s.content, published_at: new Date().toISOString(),
}))), "insert");
console.log(`✓ Inicio actualizado: ${sections.length} secciones`);

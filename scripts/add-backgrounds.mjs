// Registra en la biblioteca de medios los fondos de "Nuestra historia" y de la frase con parallax.
// Es idempotente. Uso: node --env-file=.env.local scripts/add-backgrounds.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import sharp from "sharp";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const items = [
  { file: "fondo-historia", alt: "Ingredientes de repostería: cacao, vainilla, huevo y chocolate sobre fondo blanco" },
  { file: "fondo-frase", alt: "Marco de frutas, granola y menta sobre mármol blanco" },
  { file: "fondo-menu-marmol", alt: "Mármol blanco con ramas de gypsophila en la esquina" },
  { file: "plato-corazon", alt: "Tarta en forma de corazón con fresas, kiwi, mango y macarons sobre un plato blanco" },
  { file: "fondo-tradicion", alt: "Fondo de Tradición: vainilla, alfajores, galleta de corazón, cortador y rodillo, con línea de tiempo" },
];
items.push(
  { dir: "hero", file: "hero-fondo-1", alt: "Fondo crema con ramas secas de gypsophila y arándanos" },
  { dir: "hero", file: "hero-fondo-2", alt: "Fondo blanco liso para la portada" },
  { dir: "hero", file: "hero-fondo-3", alt: "Fondo de mármol claro con sombras de hojas" },
  { dir: "hero", file: "hero-producto-1", alt: "Siete cajas de alfajores con ventana y lazos de colores, con el sello de Las Galletas de Tabo" },
  { dir: "hero", file: "hero-producto-2", alt: "Tarta en forma de corazón con fresas, kiwi y mango y un globo rojo de Feliz Aniversario" },
  { dir: "hero", file: "hero-producto-3", alt: "Bandeja de cumpleaños con globos transparentes, bebidas, frutas y masa en letras" },
  { dir: "recortes", file: "alfajor-recorte", alt: "Alfajor de maicena relleno de dulce de leche, recortado sin fondo", from: "alfajor-dulce-de-leche-corte.webp" },
  { dir: "recortes", file: "galleta-recorte", alt: "Galleta de corazón glaseada en rosa, recortada sin fondo", from: "corazones-de-azucar.webp" },
);
const credits = ["credits.json", "credits-alf.json"].flatMap((n) => { try { return JSON.parse(readFileSync(`supabase/seed-media/${n}`, "utf8")); } catch { return []; } });
for (const it of items) {
  const dir = it.dir ?? "fondos";
  const storagePath = `${dir}/${it.file}.webp`;
  if (it.from) {
    const c = credits.find((x) => x.file === it.from);
    if (c) it.credit = { is_stock: true, source_name: c.source_name, source_url: c.source_url, author: c.author, license: `${c.license} — ${c.license_url} (recortada sin fondo)` };
  }
  const { data: ex } = await db.from("media").select("id").eq("path", storagePath).maybeSingle();
  if (ex) { console.log("ya existe", it.file); continue; }
  const buffer = readFileSync(`supabase/seed-media/${dir}/${it.file}.webp`);
  const meta = await sharp(buffer).metadata();
  const blur = `data:image/webp;base64,${(await sharp(buffer).resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer()).toString("base64")}`;
  const up = await db.storage.from("media").upload(storagePath, buffer, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
  if (up.error) throw new Error(up.error.message);
  const { error } = await db.from("media").insert({
    path: storagePath, alt: it.alt, folder: dir, width: meta.width, height: meta.height, mime: "image/webp", size_bytes: buffer.length, blur_data: blur,
    is_stock: false, source_name: "Proporcionada por el cliente", license: "Pendiente de confirmar por la marca", ...(it.credit ?? {}),
  });
  if (error) throw new Error(error.message);
  console.log("✓", it.file);
}

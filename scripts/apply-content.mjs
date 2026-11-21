// Aplica fotos propias, textos pensados para SEO y la nueva portada. Es idempotente.
// Uso: node scripts/apply-content.mjs   (con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY del entorno de destino)
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import sharp from "sharp";
import { homeSections } from "./home-content.mjs";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const must = (r, w) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data; };
console.log("Destino:", process.env.NEXT_PUBLIC_SUPABASE_URL);

// ---------------------------------------------------------------- Fotos propias
const PHOTOS = {
  "letra-fruta-tablero-plateado": "Letra de galleta con crema, fresas, kiwi y mango sobre tablero plateado",
  "dia-de-la-madre-rosas-letra": "Detalle del Día de la Madre con globo, rosas, letra de galleta con frutas y tartaletas",
  "rosas-letra-galleta-frutas": "Ramo de rosas rojas junto a una letra de galleta con fresas, kiwi y mango",
  "letra-v-globo-cumpleanos-tartaletas": "Letra V de galleta con frutas, globo de cumpleaños, tartaletas y galletas empacadas",
  "letra-v-globo-rosado": "Letra V de galleta con fresas, kiwi y mango con globo rosado de cumpleaños",
  "letra-globo-negro-feliz-cumpleanos": "Letra de galleta con frutas y globo negro de Feliz cumpleaños sobre tablero dorado",
  "letra-m-globo-fucsia": "Letra M de galleta con frutas y globo fucsia de Feliz cumpleaños",
  "numero-50-cumpleanos": "Número 50 de galleta con frutas y globo azul de Feliz cumpleaños",
  "letra-r-globo-estrellas": "Letra R de galleta con frutas y globo de estrellas sobre tablero plateado",
  "cajas-alfajores-lazos-azul-plata": "Cajas de alfajores con ventana, lazos azules y plateados y el sello de Las Galletas de Tabo",
  "cajas-alfajores-surtidas": "Cajas de alfajores surtidos en varios tamaños con lazos",
  "alfajores-colores-capacillos": "Alfajores blancos, verdes y rojos con azúcar en polvo en capacillos",
};
for (const [slug, alt] of Object.entries(PHOTOS)) {
  const path = `fotos/${slug}.webp`;
  const ex = must(await db.from("media").select("id").eq("path", path).maybeSingle(), "media");
  if (ex) continue;
  const file = `supabase/seed-media/fotos/${slug}.webp`;
  if (!existsSync(file)) throw new Error("Falta " + file);
  const buffer = readFileSync(file);
  const meta = await sharp(buffer).metadata();
  const blur = `data:image/webp;base64,${(await sharp(buffer).resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer()).toString("base64")}`;
  const up = await db.storage.from("media").upload(path, buffer, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
  if (up.error) throw new Error(up.error.message);
  must(await db.from("media").insert({ path, alt, folder: "fotos", width: meta.width, height: meta.height, mime: "image/webp", size_bytes: buffer.length, blur_data: blur, is_stock: false, source_name: "Fotografía propia de Las Galletas de Tabo", license: "Uso autorizado por la marca" }), "media insert");
  console.log("✓ foto", slug);
}
const media = must(await db.from("media").select("id, path"), "media list");
const ids = {};
for (const m of media) ids[m.path.split("/").pop().replace(/\.(webp|png|jpg)$/i, "").replace(/-[0-9a-f]{8}$/, "")] = m.id;

// ---------------------------------------------------------------- Ajustes de SEO y pie de página
const mergeSetting = async (key, patch) => {
  const row = must(await db.from("site_settings").select("value").eq("key", key).maybeSingle(), key);
  must(await db.from("site_settings").upsert({ key, value: { ...(row?.value ?? {}), ...patch } }, { onConflict: "key" }), "upsert " + key);
};
await mergeSetting("seo", {
  title: "Las Galletas de Tabo · Detalles dulces para celebrar tus momentos especiales",
  description: "Cumpleaños, aniversarios, Día de la Madre y eventos con detalles dulces hechos a mano: letras con frutas, galletas personalizadas y alfajores artesanales. Pide en línea y celebra a tu manera.",
  keywords: "detalles para cumpleaños, sorpresas de aniversario, letras de galleta con frutas, galletas personalizadas, alfajores artesanales, regalos dulces, regalo día de la madre, repostería artesanal",
});
await mergeSetting("footer", { text: "Detalles dulces hechos a mano para celebrar tus momentos especiales." });

// ---------------------------------------------------------------- Categorías
const CATS = {
  "galletas-personalizadas": ["Galletas decoradas a mano con tu nombre, tu mensaje y tus colores para que cada celebración tenga un detalle único.", null],
  "galletas-cumpleanos": ["Letras, números y galletas para que el cumpleañero se sienta el centro de la fiesta.", "numero-50-cumpleanos"],
  "galletas-aniversarios": ["Detalles románticos para celebrar el amor y las fechas que quieren recordar.", null],
  "galletas-eventos": ["Recuerdos dulces para bodas, bautizos, grados y reuniones que vale la pena celebrar.", null],
  "ocasiones-especiales": ["Sorpresas para el Día de la Madre, grados y todo lo que merece una celebración.", "dia-de-la-madre-rosas-letra"],
  "alfajores-artesanales": ["Alfajores suaves para regalar, compartir y acompañar el café de la tarde.", "cajas-alfajores-lazos-azul-plata"],
  "cajas-regalo": ["Cajas de presentación con galletas y alfajores, listas para sorprender.", "cajas-alfajores-surtidas"],
};
for (const [slug, [description, photo]] of Object.entries(CATS)) {
  const patch = { description };
  if (photo && ids[photo]) patch.image_id = ids[photo];
  must(await db.from("categories").update(patch).eq("slug", slug), "cat " + slug);
}
const catId = Object.fromEntries(must(await db.from("categories").select("id, slug"), "cats").map((c) => [c.slug, c.id]));

// ---------------------------------------------------------------- Productos: textos y fotos
const COPY = {
  "galletas-personalizadas-a-tu-gusto": ["Galletas decoradas a mano con tu nombre, tu mensaje y los colores de tu celebración.", "Convierte una fecha especial en un recuerdo dulce. Cuéntanos la ocasión, el nombre y los colores, y decoramos cada galleta a mano con glaseado para sorprender a quien más quieres. Ideales para cumpleaños, aniversarios, baby showers y reuniones en familia."],
  "set-cumpleanos-con-nombre-y-edad": ["El detalle perfecto para celebrar un cumpleaños: nombre, edad y la temática que más ilusión haga.", "Haz que el cumpleañero se sienta el centro de la fiesta. Preparamos un set decorado con su nombre, su edad y la temática que elijas, para compartir, regalar o lucir en la mesa principal."],
  "corazones-de-aniversario-con-iniciales": ["Corazones decorados con sus iniciales y la fecha que quieren recordar.", "Una forma tierna de decir te quiero. Corazones de galleta con las iniciales de la pareja y la fecha del aniversario, listos para una sorpresa romántica o una cena especial."],
  "recuerdos-para-eventos": ["Recuerdos individuales para que tus invitados se lleven un pedacito de la celebración.", "Bodas, bautizos, primeras comuniones y reuniones de empresa: galletas decoradas e individuales, empacadas con cuidado para que cada invitado guarde un recuerdo dulce de tu evento."],
  "galletas-para-ocasiones-especiales": ["Galletas decoradas para el Día de la Madre, grados, nuevos comienzos y todo lo que vale la pena celebrar.", "Cada fecha especial tiene su sabor. Diseñamos galletas para el Día de la Madre, grados, ascensos, nacimientos y cualquier motivo para sonreír, con el mensaje y los colores que quieras."],
  "alfajores-de-maicena-con-dulce-de-leche": ["Alfajores suaves de maicena rellenos de dulce de leche, para compartir en familia.", "El sabor de la tarde en casa. Tapas suaves de maicena rellenas de dulce de leche y bordeadas con coco rallado, preparados en pequeños lotes para regalar o disfrutar con un buen café."],
  "alfajores-cubiertos-de-chocolate": ["Alfajores rellenos de dulce de leche con un baño de chocolate, un antojo para consentir.", "Para quienes aman el chocolate: alfajores rellenos de dulce de leche y cubiertos con un baño de chocolate, perfectos para endulzar una sorpresa o acompañar una reunión."],
  "mini-alfajores-surtidos": ["Mini alfajores de varios sabores, ideales para mesas de postres y encuentros.", "Pequeños bocados para compartir. Mini alfajores en sabores surtidos que hacen lucir cualquier mesa de postres, reunión de oficina o celebración familiar."],
  "caja-regalo-galletas-y-alfajores": ["Una caja para sorprender: galletas decoradas y alfajores con tarjeta y cinta a tu elección.", "Regalar nunca fue tan fácil. Reunimos galletas decoradas y alfajores en una caja de presentación con tarjeta y cinta del color que elijas, lista para llegar a las manos de quien quieres sorprender."],
  "caja-degustacion-de-galletas": ["Una caja para probar y compartir nuestros sabores en cualquier momento del día.", "Una selección de galletas para descubrir sabores y texturas, ideal para un detalle sin ocasión, una visita o una tarde de antojo."],
};
for (const [slug, [short, desc]] of Object.entries(COPY)) {
  must(await db.from("products").update({ short_description: short, description: desc, seo_description: short.slice(0, 155) }).eq("slug", slug), "copy " + slug);
}

// Productos nuevos (se clonan de uno existente para heredar campos de personalización y reglas)
const NUEVOS = [
  { from: "set-cumpleanos-con-nombre-y-edad", slug: "letra-o-numero-con-crema-y-frutas", name: "Letra o número con crema y frutas", cat: "galletas-cumpleanos", price: 65000, sort: -3,
    short: "La letra o el número de tu celebración, cubierto de crema, fresas, kiwi y mango, para sorprender y compartir.",
    desc: "Un centro de mesa que también es postre. Elaboramos la letra o el número que elijas con capas de galleta, crema y frutas frescas como fresa, kiwi y mango, decorado con detalles de galleta y listo para acompañar globos y regalos. Cuéntanos el nombre, la edad y los colores." },
  { from: "galletas-para-ocasiones-especiales", slug: "detalle-dia-de-la-madre-con-rosas", name: "Detalle de Día de la Madre con rosas", cat: "ocasiones-especiales", price: 95000, sort: -2,
    short: "Letra con frutas, rosas, globo y tartaletas para sorprender a mamá.",
    desc: "Una mañana inolvidable para mamá. Armamos un detalle con la letra de su nombre decorada con crema y frutas, rosas rojas, globo personalizado, tartaletas individuales y galletas empacadas con un mensaje de Feliz Día de la Madre." },
  { from: "caja-regalo-galletas-y-alfajores", slug: "cajas-de-alfajores-con-lazo", name: "Cajas de alfajores con lazo", cat: "cajas-regalo", price: 24000, sort: -1,
    short: "Alfajores en cajas con ventana, lazo a tu elección y el sello de Las Galletas de Tabo, listos para regalar.",
    desc: "Un detalle que se luce desde que se ve. Alfajores de colores y azúcar en polvo en cajas con ventana, cerrados con un lazo del color que prefieras y con nuestro sello, para obsequiar a clientes, amigos o familia." },
];
for (const n of NUEVOS) {
  const exists = must(await db.from("products").select("id").eq("slug", n.slug).maybeSingle(), "exists " + n.slug);
  if (exists) continue;
  const base = must(await db.from("products").select("*").eq("slug", n.from).single(), "base " + n.from);
  const row = { ...base };
  for (const k of ["id", "created_at", "updated_at", "search", "fts"]) delete row[k];
  Object.assign(row, { slug: n.slug, name: n.name, category_id: catId[n.cat], price: n.price, sort: n.sort, short_description: n.short, description: n.desc, seo_description: n.short.slice(0, 155), is_featured: true, is_sample: true });
  must(await db.from("products").insert(row), "insert " + n.slug);
  console.log("✓ producto nuevo", n.slug);
}

// Fotos por producto: las nuevas van primero y se conservan las anteriores detrás (salvo "replace")
const PROD_IMAGES = {
  "letra-o-numero-con-crema-y-frutas": { photos: ["letra-fruta-tablero-plateado", "letra-m-globo-fucsia", "letra-r-globo-estrellas", "letra-globo-negro-feliz-cumpleanos"], replace: true },
  "detalle-dia-de-la-madre-con-rosas": { photos: ["dia-de-la-madre-rosas-letra", "rosas-letra-galleta-frutas", "letra-v-globo-cumpleanos-tartaletas"], replace: true },
  "cajas-de-alfajores-con-lazo": { photos: ["cajas-alfajores-lazos-azul-plata", "cajas-alfajores-surtidas"], replace: true },
  "set-cumpleanos-con-nombre-y-edad": { photos: ["numero-50-cumpleanos", "letra-v-globo-rosado"] },
  "alfajores-de-maicena-con-dulce-de-leche": { photos: ["alfajores-colores-capacillos"] },
};
for (const [slug, cfg] of Object.entries(PROD_IMAGES)) {
  const p = must(await db.from("products").select("id").eq("slug", slug).single(), "prod " + slug);
  const cur = must(await db.from("product_images").select("media_id, sort").eq("product_id", p.id).order("sort"), "pi");
  const nuevas = cfg.photos.map((s) => ids[s]).filter(Boolean);
  const resto = cfg.replace ? [] : cur.map((c) => c.media_id).filter((m) => !nuevas.includes(m));
  const orden = [...nuevas, ...resto];
  must(await db.from("product_images").delete().eq("product_id", p.id), "pi del");
  must(await db.from("product_images").insert(orden.map((media_id, sort) => ({ product_id: p.id, media_id, sort }))), "pi ins");
}

// ---------------------------------------------------------------- Inicio
must(await db.from("page_sections").delete().eq("page", "home"), "home del");
const sections = homeSections(ids);
must(await db.from("page_sections").insert(sections.map((s, sort) => ({
  page: "home", type: s.type, label: s.label, variant: s.variant, sort, is_enabled: s.enabled ?? true, content: s.content, published_at: new Date().toISOString(),
}))), "home ins");
console.log(`✓ Contenido aplicado (${sections.length} secciones en inicio)`);

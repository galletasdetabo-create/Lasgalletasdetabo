// Siembra datos iniciales: medios con licencias, identidad, catálogo de PRUEBA y contenido del CMS.
// Es idempotente: no sobrescribe lo que ya se haya editado en el CRM (solo crea lo que falta).
//
// Uso:   node --env-file=.env.local scripts/seed.mjs
// Admin: ADMIN_EMAIL=... ADMIN_PASSWORD=... node --env-file=.env.local scripts/seed.mjs
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { homeSections } from "./home-content.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY");
const db = createClient(url, key, { auth: { persistSession: false } });
const MEDIA_DIR = path.resolve("supabase/seed-media");

const must = (r, what) => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
};

// ---------------------------------------------------------------- Medios
async function blurOf(buf) {
  const b = await sharp(buf).resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${b.toString("base64")}`;
}

async function upsertMedia({ file, storagePath, folder, alt, credit, isStock, transform }) {
  const existing = must(await db.from("media").select("id").eq("path", storagePath).maybeSingle(), "media lookup");
  if (existing) return existing.id;
  const src = readFileSync(file);
  const { buffer, mime } = transform ? await transform(src) : { buffer: src, mime: "image/webp" };
  const meta = await sharp(buffer).metadata();
  const up = await db.storage.from("media").upload(storagePath, buffer, { contentType: mime, upsert: true, cacheControl: "31536000" });
  if (up.error) throw new Error("upload " + storagePath + ": " + up.error.message);
  const row = must(
    await db.from("media").insert({
      path: storagePath,
      alt,
      folder,
      width: meta.width,
      height: meta.height,
      mime,
      size_bytes: buffer.length,
      blur_data: mime === "image/png" && folder === "marca" ? null : await blurOf(buffer),
      is_stock: isStock,
      source_name: credit?.source_name ?? null,
      source_url: credit?.source_url ?? null,
      author: credit?.author || null,
      license: credit?.license ? `${credit.license}${credit.license_url ? " — " + credit.license_url : ""}` : null,
    }).select("id").single(),
    "media insert",
  );
  return row.id;
}

async function seedMedia() {
  const ids = {};
  const credits = [
    ...(existsSync(path.join(MEDIA_DIR, "credits.json")) ? JSON.parse(readFileSync(path.join(MEDIA_DIR, "credits.json"), "utf8")) : []),
    ...(existsSync(path.join(MEDIA_DIR, "credits-alf.json")) ? JSON.parse(readFileSync(path.join(MEDIA_DIR, "credits-alf.json"), "utf8")) : []),
  ];
  for (const c of credits) {
    const file = path.join(MEDIA_DIR, c.file);
    if (!existsSync(file)) continue;
    const slug = c.file.replace(/\.webp$/, "");
    ids[slug] = await upsertMedia({ file, storagePath: `stock/${c.file}`, folder: c.folder, alt: c.alt, credit: c, isStock: true });
  }
  // Fondos entregados por la marca (Nuestra historia y frase con parallax)
  for (const [slug, alt] of [["fondo-historia", "Ingredientes de repostería: cacao, vainilla, huevo y chocolate sobre fondo blanco"], ["fondo-frase", "Marco de frutas, granola y menta sobre mármol blanco"]]) {
    ids[slug] = await upsertMedia({
      file: path.join(MEDIA_DIR, `fondos/${slug}.webp`), storagePath: `fondos/${slug}.webp`, folder: "fondos", alt, isStock: false,
      credit: { source_name: "Proporcionada por el cliente", license: "Pendiente de confirmar por la marca" },
    });
  }
  // Fondos de "Una verdadera delicia" (parallax) y "Tradición" (cronología), entregados por la marca
  for (const [slug, alt] of [["fondo-menu-marmol", "Mármol blanco con ramas de gypsophila en la esquina"], ["plato-corazon", "Tarta en forma de corazón con fresas, kiwi, mango y macarons sobre un plato blanco"], ["fondo-tradicion", "Fondo de Tradición: vainilla, alfajores, galleta de corazón, cortador y rodillo, con línea de tiempo"]]) {
    ids[slug] = await upsertMedia({
      file: path.join(MEDIA_DIR, `fondos/${slug}.webp`), storagePath: `fondos/${slug}.webp`, folder: "fondos", alt, isStock: false,
      credit: { source_name: "Proporcionada por el cliente", license: "Pendiente de confirmar por la marca" },
    });
  }
  // Recortes sin fondo para "Dos dulces" (scripts/cutout.py sobre fotos de stock)
  for (const [slug, alt, from] of [["alfajor-recorte", "Alfajor de maicena relleno de dulce de leche, recortado sin fondo", "alfajor-dulce-de-leche-corte.webp"], ["galleta-recorte", "Galleta de corazón glaseada en rosa, recortada sin fondo", "corazones-de-azucar.webp"]]) {
    const c = credits.find((x) => x.file === from);
    ids[slug] = await upsertMedia({
      file: path.join(MEDIA_DIR, `recortes/${slug}.webp`), storagePath: `recortes/${slug}.webp`, folder: "recortes", alt, isStock: true,
      credit: c ? { ...c, license: `${c.license} (recortada sin fondo)` } : undefined,
    });
  }
  // Portada: fondos y productos recortados entregados por la marca
  for (const [slug, alt] of [["hero-fondo-1", "Fondo crema con ramas secas de gypsophila y arándanos"], ["hero-fondo-2", "Fondo blanco liso para la portada"], ["hero-fondo-3", "Fondo de mármol claro con sombras de hojas"], ["hero-producto-1", "Siete cajas de alfajores con ventana y lazos de colores, con el sello de Las Galletas de Tabo"], ["hero-producto-2", "Tarta en forma de corazón con fresas, kiwi y mango y un globo rojo de Feliz Aniversario"], ["hero-producto-3", "Bandeja de cumpleaños con globos transparentes, bebidas, frutas y masa en letras"]]) {
    ids[slug] = await upsertMedia({
      file: path.join(MEDIA_DIR, `hero/${slug}.webp`), storagePath: `hero/${slug}.webp`, folder: "hero", alt, isStock: false,
      credit: { source_name: "Proporcionada por el cliente", license: "Pendiente de confirmar por la marca" },
    });
  }
  // Identidad (archivos entregados por la marca)
  ids.logo = await upsertMedia({
    file: path.join(MEDIA_DIR, "brand/logo.png"), storagePath: "marca/logo-las-galletas-de-tabo.webp", folder: "marca",
    alt: "Las Galletas de Tabo — Horneando con amor", isStock: false,
    transform: async (b) => ({ buffer: await sharp(b).resize({ width: 720 }).webp({ quality: 90, alphaQuality: 100 }).toBuffer(), mime: "image/webp" }),
  });
  ids.icon = await upsertMedia({
    file: path.join(MEDIA_DIR, "brand/favicon.png"), storagePath: "marca/icono-las-galletas-de-tabo.png", folder: "marca",
    alt: "Icono de Las Galletas de Tabo", isStock: false,
    transform: async (b) => ({ buffer: await sharp(b).trim({ threshold: 5 }).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, palette: true }).toBuffer(), mime: "image/png" }),
  });
  return ids;
}

const firstAvailable = (ids, ...slugs) => slugs.map((s) => ids[s]).filter(Boolean);

// ---------------------------------------------------------------- Ajustes
async function seedSettings(ids) {
  const rows = [
    { key: "brand", is_public: true, admin_only: false, value: {
      name: "Las Galletas de Tabo", slogan: "Horneando con amor", logo_id: ids.logo ?? null, logo_alt_id: ids.icon ?? null, favicon_id: ids.icon ?? null,
      colors: { cream: "#FFF5ED", blush: "#F8D8D7", rose: "#EBA9A8", rose_deep: "#C97D78", chocolate: "#6A4437", gold: "#D9B477" }, font_pair: "moderna" } },
    { key: "contact", is_public: true, admin_only: false, value: { phone: "", email: "", city: "", address: "", show_address: false, hours: "", service_area: "" } },
    { key: "social", is_public: true, admin_only: false, value: { instagram: "", facebook: "", tiktok: "" } },
    { key: "whatsapp", is_public: true, admin_only: true, value: { enabled: true, number: "", default_message: "¡Hola! Quiero hacer un pedido en Las Galletas de Tabo." } },
    { key: "seo", is_public: true, admin_only: false, value: {
      title: "Las Galletas de Tabo · Galletas personalizadas y alfajores artesanales",
      description: "Galletas decoradas y personalizadas para cumpleaños, aniversarios y eventos, y alfajores artesanales hechos en casa. Haz tu pedido en línea.",
      keywords: "galletas personalizadas, galletas decoradas, alfajores artesanales, galletas para cumpleaños, galletas para eventos, regalos dulces",
      og_image_id: ids["galletas-corazon-glaseado-rosa"] ?? null } },
    { key: "footer", is_public: true, admin_only: false, value: { text: "Repostería artesanal hecha en casa: galletas personalizadas y alfajores para tus momentos especiales.", copyright: "" } },
    { key: "legal", is_public: true, admin_only: false, value: { terms: "", privacy: "", shipping: "", returns: "" } },
    { key: "commerce", is_public: true, admin_only: false, value: {
      transfer_instructions: "", checkout_note: "",
      notice_enabled: true, notice_text: "Tienda en configuración: precios y fotografías son de referencia (datos de prueba)." } },
    { key: "payments", is_public: true, admin_only: true, value: { pse_enabled: true } },
  ];
  for (const r of rows) must(await db.from("site_settings").upsert(r, { onConflict: "key", ignoreDuplicates: true }), "settings " + r.key);
}

// ---------------------------------------------------------------- Catálogo de PRUEBA
const CATEGORIES = [
  ["galletas-personalizadas", "Galletas personalizadas", "Diseños únicos a tu medida: nombres, mensajes, colores y temas para cualquier celebración.", "galletas-corazon-glaseado-rosa"],
  ["galletas-cumpleanos", "Galletas para cumpleaños", "Sets decorados con el nombre, la edad y el tema del cumpleaños.", "decorando-con-chispas"],
  ["galletas-aniversarios", "Galletas para aniversarios", "Corazones, iniciales y fechas especiales para celebrar el amor.", "galletas-corazon-horneadas"],
  ["galletas-eventos", "Galletas para eventos", "Recuerdos para bodas, bautizos, baby showers y eventos empresariales.", "galletas-glaseadas-plato"],
  ["ocasiones-especiales", "Galletas para ocasiones especiales", "Grados, Día de la Madre, Amor y Amistad, Navidad y más.", "galletas-estrella-glaseadas"],
  ["alfajores-artesanales", "Alfajores artesanales", "Alfajores suaves rellenos de dulce de leche, horneados en pequeños lotes.", "alfajores-coco-bandeja"],
  ["cajas-regalo", "Cajas y presentaciones especiales", "Cajas de regalo con galletas y alfajores, listas para sorprender.", "caja-regalo-flores"],
];

const F = {
  ocasion: (opts) => ({ key: "ocasion", label: "Tipo de ocasión", type: "select", required: true, options: opts }),
  diseno: { key: "diseno", label: "Diseño solicitado", type: "textarea", required: true, placeholder: "Describe la temática, figuras o estilo que imaginas", maxLength: 600 },
  texto: { key: "texto", label: "Texto que debe llevar la galleta", type: "text", required: false, placeholder: "Ej. Feliz cumpleaños, Sofi", maxLength: 40, help: "Máximo 40 caracteres." },
  colores: { key: "colores", label: "Colores preferidos", type: "text", required: false, placeholder: "Ej. rosa pastel, dorado y blanco", maxLength: 120 },
  fecha: { key: "fecha", label: "Fecha en que las necesitas", type: "date", required: true },
  imagen: { key: "referencia", label: "Imagen de referencia", type: "image", required: false, help: "JPG, PNG o WebP de hasta 5 MB." },
  obs: { key: "observaciones", label: "Observaciones", type: "textarea", required: false, maxLength: 600 },
  tarjeta: { key: "mensaje_tarjeta", label: "Mensaje para la tarjeta", type: "text", required: false, maxLength: 120 },
};
const OCASIONES = ["Cumpleaños", "Aniversario", "Boda", "Bautizo", "Baby shower", "Grado", "Día de la Madre", "Amor y Amistad", "Navidad", "Empresarial", "Otra"];

const PRODUCTS = [
  {
    slug: "galletas-personalizadas-a-tu-gusto", name: "Galletas personalizadas a tu gusto", cat: "galletas-personalizadas", kind: "galleta_personalizada", featured: true,
    short: "Galletas de mantequilla decoradas a mano con glaseado real, con el diseño, los colores y el mensaje que imagines.",
    desc: "Creamos cada diseño desde cero a partir de tu idea: personajes, flores, iniciales, logotipos o mensajes especiales.\n\nCuéntanos la ocasión, los colores y el texto que quieres, y si tienes una imagen de referencia, súbela. Te contactaremos para confirmar los detalles antes de hornear.",
    price: 6000, min: 6, max: 200, label: "galletas", prep: [4, 6], prepText: "Entre 4 y 6 días según la complejidad del diseño.",
    variants: [["Pequeña · 6 cm", { "Tamaño": "Pequeña · 6 cm" }, 4500], ["Mediana · 8 cm", { "Tamaño": "Mediana · 8 cm" }, 6000], ["Grande · 10 cm", { "Tamaño": "Grande · 10 cm" }, 8000]],
    fields: [F.ocasion(OCASIONES), F.diseno, F.texto, F.colores, F.fecha, F.imagen, F.obs],
    images: ["galletas-corazon-glaseado-rosa", "decorando-galletas-corazon", "masa-y-cortadores-corazon"], tags: ["personalizadas", "glaseado real"],
  },
  {
    slug: "set-cumpleanos-con-nombre-y-edad", name: "Set de cumpleaños con nombre y edad", cat: "galletas-cumpleanos", kind: "galleta_personalizada", featured: true,
    short: "Un set decorado con el nombre, la edad y la temática del cumpleaños, ideal para la mesa de postres o como recuerdo.",
    desc: "Cada set combina galletas con el nombre del cumpleañero, el número de años y figuras de la temática elegida.\n\nPerfecto para mesas dulces, sorpresas en la oficina o para regalar a los invitados.",
    price: 52000, min: 1, max: 30, label: "sets", prep: [4, 6], prepText: "Entre 4 y 6 días.",
    variants: [["Set x6", { "Presentación": "Set x6" }, 32000], ["Set x12", { "Presentación": "Set x12" }, 52000], ["Set x24", { "Presentación": "Set x24" }, 95000]],
    fields: [
      { key: "nombre", label: "Nombre del cumpleañero", type: "text", required: true, maxLength: 30 },
      { key: "edad", label: "Edad que cumple", type: "number", required: false, min: 1, max: 120 },
      { key: "tema", label: "Temática", type: "text", required: true, placeholder: "Ej. unicornios, fútbol, princesas", maxLength: 80 },
      F.colores, F.fecha, F.imagen, F.obs,
    ],
    images: ["galletas-glaseadas-plato", "corazones-de-azucar", "decorando-con-chispas"], tags: ["cumpleaños", "infantil"],
  },
  {
    slug: "corazones-de-aniversario-con-iniciales", name: "Corazones de aniversario con iniciales", cat: "galletas-aniversarios", kind: "galleta_personalizada", featured: true,
    short: "Galletas en forma de corazón con iniciales, fecha especial o un mensaje para celebrar juntos.",
    desc: "Un detalle romántico para aniversarios, pedidas de mano o Amor y Amistad. Decoramos cada corazón con las iniciales, la fecha que quieres recordar o una frase corta.",
    price: 38000, min: 1, max: 20, label: "cajas", prep: [3, 5], prepText: "Entre 3 y 5 días.",
    variants: [["Caja x6", { "Presentación": "Caja x6" }, 38000], ["Caja x12", { "Presentación": "Caja x12" }, 68000]],
    fields: [
      { key: "iniciales", label: "Iniciales", type: "text", required: true, placeholder: "Ej. A & J", maxLength: 12 },
      { key: "fecha_especial", label: "Fecha especial a decorar (opcional)", type: "text", required: false, placeholder: "Ej. 14.02.2020", maxLength: 20 },
      F.texto, F.colores, F.fecha, F.obs,
    ],
    images: ["corazones-de-azucar", "galletas-corazon-glaseado-rosa", "cortador-corazon-en-mano"], tags: ["aniversario", "amor"],
  },
  {
    slug: "recuerdos-para-eventos", name: "Recuerdos para eventos", cat: "galletas-eventos", kind: "galleta_personalizada", featured: false,
    short: "Galletas individuales decoradas para bodas, bautizos, baby showers y eventos empresariales.",
    desc: "Galletas con empaque individual, pensadas como recuerdo para tus invitados. Podemos incluir el logo de tu empresa, los nombres de los novios o la fecha del evento.\n\nPara pedidos grandes te recomendamos reservar con anticipación.",
    price: 6500, min: 24, max: 500, label: "galletas", prep: [7, 10], prepText: "Entre 7 y 10 días según la cantidad.",
    variants: [["Con empaque individual", { "Empaque": "Individual con cinta" }, 6500], ["Sin empaque individual", { "Empaque": "Sin empaque" }, 5500]],
    fields: [F.ocasion(["Boda", "Bautizo", "Primera comunión", "Baby shower", "Empresarial", "Otro"]), F.diseno, F.texto, F.colores, F.fecha, F.imagen, F.obs],
    images: ["galletas-decoradas-estrellas", "galletas-estrella-glaseadas", "galletas-glaseadas-plato"], tags: ["eventos", "recuerdos"],
  },
  {
    slug: "galletas-para-ocasiones-especiales", name: "Galletas para ocasiones especiales", cat: "ocasiones-especiales", kind: "galleta_personalizada", featured: false,
    short: "Grados, Día de la Madre, Amor y Amistad o Navidad: diseños de temporada para regalar.",
    desc: "Elige la ocasión y cuéntanos qué quieres decir. Diseñamos galletas de temporada con mensajes y colores acordes a la celebración.",
    price: 34000, min: 1, max: 30, label: "cajas", prep: [3, 5], prepText: "Entre 3 y 5 días.",
    variants: [["Caja x6", { "Presentación": "Caja x6" }, 34000], ["Caja x12", { "Presentación": "Caja x12" }, 62000]],
    fields: [F.ocasion(["Grado", "Día de la Madre", "Día del Padre", "Amor y Amistad", "Halloween", "Navidad", "Otra"]), F.texto, F.colores, F.fecha, F.imagen, F.obs],
    images: ["galletas-estrella-glaseadas", "galletas-decoradas-estrellas", "galletas-glaseadas-plato"], tags: ["temporada"],
  },
  {
    slug: "alfajores-de-maicena-con-dulce-de-leche", name: "Alfajores de maicena con dulce de leche", cat: "alfajores-artesanales", kind: "alfajor", featured: true,
    short: "Tapas suaves de maicena rellenas de dulce de leche y bordeadas con coco rallado.",
    desc: "Nuestros alfajores se hornean en pequeños lotes para que lleguen frescos y suaves. Elige el sabor del relleno y la presentación que prefieras.",
    price: 28000, min: 1, max: 40, label: "cajas", prep: [2, 3], prepText: "Entre 2 y 3 días.",
    variants: [
      ["Dulce de leche · Caja x6", { "Sabor": "Dulce de leche", "Presentación": "Caja x6" }, 28000],
      ["Dulce de leche · Caja x12", { "Sabor": "Dulce de leche", "Presentación": "Caja x12" }, 52000],
      ["Arequipe y coco · Caja x6", { "Sabor": "Arequipe y coco", "Presentación": "Caja x6" }, 30000],
      ["Arequipe y coco · Caja x12", { "Sabor": "Arequipe y coco", "Presentación": "Caja x12" }, 56000],
    ],
    fields: [F.tarjeta, F.obs],
    images: ["alfajor-dulce-de-leche-corte", "alfajor-dulce-de-leche-relleno", "alfajores-coco-bandeja"], tags: ["alfajores", "dulce de leche"],
  },
  {
    slug: "alfajores-cubiertos-de-chocolate", name: "Alfajores cubiertos de chocolate", cat: "alfajores-artesanales", kind: "alfajor", featured: true,
    short: "Alfajores rellenos de dulce de leche con un baño de chocolate.",
    desc: "Una versión más intensa de nuestro alfajor clásico, con cobertura de chocolate. Ideales para regalar o para acompañar el café.",
    price: 32000, min: 1, max: 40, label: "cajas", prep: [2, 3], prepText: "Entre 2 y 3 días.",
    variants: [
      ["Chocolate de leche · Caja x6", { "Cobertura": "Chocolate de leche", "Presentación": "Caja x6" }, 32000],
      ["Chocolate de leche · Caja x12", { "Cobertura": "Chocolate de leche", "Presentación": "Caja x12" }, 60000],
      ["Chocolate blanco · Caja x6", { "Cobertura": "Chocolate blanco", "Presentación": "Caja x6" }, 33000],
      ["Chocolate blanco · Caja x12", { "Cobertura": "Chocolate blanco", "Presentación": "Caja x12" }, 62000],
    ],
    fields: [F.tarjeta, F.obs],
    images: ["alfajores-chocolate-corte", "alfajores-dulce-de-leche-pila"], tags: ["alfajores", "chocolate"],
  },
  {
    slug: "mini-alfajores-surtidos", name: "Mini alfajores surtidos", cat: "alfajores-artesanales", kind: "alfajor", featured: false,
    short: "Alfajores de bocado en sabores surtidos, perfectos para mesas de postres.",
    desc: "Pequeños alfajores para compartir en reuniones, mesas dulces o eventos. Indícanos si quieres algún sabor en mayor proporción.",
    price: 45000, min: 1, max: 30, label: "cajas", prep: [2, 4], prepText: "Entre 2 y 4 días.",
    variants: [["Caja x20", { "Presentación": "Caja x20" }, 45000], ["Caja x40", { "Presentación": "Caja x40" }, 85000]],
    fields: [F.obs],
    images: ["alfajores-coco-bandeja", "alfajores-dulce-de-leche-pila"], tags: ["alfajores", "mesa de postres"],
  },
  {
    slug: "caja-regalo-galletas-y-alfajores", name: "Caja de regalo galletas y alfajores", cat: "cajas-regalo", kind: "caja", featured: true,
    short: "Una caja para sorprender: galletas decoradas y alfajores, con tarjeta y cinta del color que elijas.",
    desc: "Combinamos galletas decoradas con alfajores en una presentación lista para regalar. Incluye tarjeta con tu mensaje.",
    price: 75000, min: 1, max: 20, label: "cajas", prep: [3, 5], prepText: "Entre 3 y 5 días.",
    variants: [["Caja pequeña", { "Tamaño": "Pequeña" }, 55000], ["Caja mediana", { "Tamaño": "Mediana" }, 75000], ["Caja grande", { "Tamaño": "Grande" }, 110000]],
    fields: [F.tarjeta, { key: "color_cinta", label: "Color de la cinta", type: "select", required: false, options: ["Rosa", "Dorado", "Blanco", "Chocolate"] }, F.fecha, F.obs],
    images: ["caja-regalo-flores", "galletas-corazon-glaseado-rosa", "alfajor-dulce-de-leche-corte"], tags: ["regalo"],
  },
  {
    slug: "caja-degustacion-de-galletas", name: "Caja degustación de galletas", cat: "cajas-regalo", kind: "caja", featured: false,
    short: "Una selección de galletas decoradas de la casa en una caja lista para compartir.",
    desc: "Ideal para quienes quieren conocer nuestro trabajo: una selección de diseños de la casa, sin personalización.",
    price: 42000, min: 1, max: 20, label: "cajas", prep: [2, 3], prepText: "Entre 2 y 3 días.",
    variants: [],
    fields: [F.tarjeta, F.obs],
    images: ["galletas-chispas-marmol", "galletas-fondo-blanco", "galletas-corazon-chispas"], tags: ["degustación"],
  },
];

async function seedCatalog(ids) {
  const catIds = {};
  for (const [i, [slug, name, description, img]] of CATEGORIES.entries()) {
    const found = must(await db.from("categories").select("id").eq("slug", slug).maybeSingle(), "cat lookup");
    if (found) { catIds[slug] = found.id; continue; }
    const row = must(await db.from("categories").insert({ slug, name, description, sort: i, image_id: ids[img] ?? null }).select("id").single(), "cat insert");
    catIds[slug] = row.id;
  }
  for (const [i, p] of PRODUCTS.entries()) {
    const found = must(await db.from("products").select("id").eq("slug", p.slug).maybeSingle(), "product lookup");
    if (found) continue;
    const row = must(await db.from("products").insert({
      slug: p.slug, name: p.name, short_description: p.short, description: p.desc, category_id: catIds[p.cat], kind: p.kind,
      price: p.price, is_featured: p.featured, stock_status: "bajo_pedido", min_quantity: p.min, max_quantity: p.max,
      quantity_label: p.label, prep_days_min: p.prep[0], prep_days_max: p.prep[1], prep_time_text: p.prepText,
      customization_fields: p.fields, tags: p.tags, is_sample: true, sort: i,
      seo_description: p.short.slice(0, 155),
    }).select("id").single(), "product insert " + p.slug);
    const imgs = firstAvailable(ids, ...p.images);
    if (imgs.length) must(await db.from("product_images").insert(imgs.map((media_id, sort) => ({ product_id: row.id, media_id, sort }))), "images");
    if (p.variants.length) must(await db.from("product_variants").insert(p.variants.map(([name, options, price], sort) => ({ product_id: row.id, name, options, price, sort }))), "variants");
  }
  const dm = must(await db.from("delivery_methods").select("id").limit(1), "dm");
  if (!dm.length) {
    must(await db.from("delivery_methods").insert([
      { name: "Domicilio", description: "Entrega en la dirección que indiques. Confirmaremos la cobertura y la tarifa al revisar tu pedido.", price: 0, price_note: "Tarifa por confirmar", requires_address: true, is_sample: true, sort: 0 },
      { name: "Recoger el pedido", description: "Coordinaremos contigo el lugar y la hora de entrega.", price: 0, price_note: "Sin costo", requires_address: false, is_sample: true, sort: 1 },
    ]), "dm insert");
  }
}

// ---------------------------------------------------------------- Contenido del CMS
function aboutSections(ids) {
  const img = (s) => ids[s] ?? null;
  return [
    { type: "story", label: "Historia (texto provisional)", variant: "default", content: {
      eyebrow: "Quiénes somos", title: "Una cocina de casa, mucho cariño",
      text: "Las Galletas de Tabo es un emprendimiento de repostería artesanal que funciona desde casa y recibe pedidos por internet.\n\nNos especializamos en galletas decoradas y personalizadas y en alfajores rellenos de dulce de leche. Cada pedido se prepara por encargo y se decora a mano.",
      quote: "Horneando con amor", image: img("harina-y-huevo") } },
    { type: "feature_split", label: "Nuestro proceso", variant: "image-right", content: {
      eyebrow: "Paso a paso", title: "Cómo trabajamos",
      text: "Escuchamos tu idea, proponemos el diseño y horneamos cada lote pensando en tu fecha de entrega.",
      bullets: [{ text: "Preparación por encargo" }, { text: "Decoración a mano" }, { text: "Confirmación de detalles antes de hornear" }],
      image: img("galletas-en-bandeja"), image_secondary: img("ingredientes-reposteria"), cta_label: "Ver la tienda", cta_href: "/tienda" } },
    { type: "gallery", label: "Galería", variant: "strip", content: { eyebrow: "Momentos", title: "Del taller", images: ["masa-y-cortadores-corazon", "cortador-y-rodillo", "harina-mantequilla", "decorando-galletas-corazon", "galletas-en-bandeja"].map(img).filter(Boolean).map((image) => ({ image })) } },
  ];
}

function faqSections() {
  return [
    { type: "faq", label: "Preguntas frecuentes", variant: "default", content: {
      eyebrow: "Resolvemos tus dudas", title: "Preguntas frecuentes",
      items: [
        { question: "¿Con cuánta anticipación debo hacer mi pedido?", answer: "Cada producto indica su tiempo de preparación en la ficha. Al elegir la fecha de entrega, la tienda solo permite fechas que respetan ese tiempo." },
        { question: "¿Puedo enviar una imagen de referencia para mis galletas?", answer: "Sí. En las galletas personalizadas puedes subir una imagen de referencia (JPG, PNG o WebP de hasta 5 MB) al agregarlas al carrito." },
        { question: "¿Qué medios de pago aceptan?", answer: "Los medios disponibles se muestran al finalizar la compra: PSE a través de Mercado Pago (cuando esté activo), transferencia o pago coordinado, y pedido por WhatsApp." },
        { question: "¿Hacen entregas a domicilio?", answer: "Las opciones de entrega disponibles se muestran en el checkout. Si tu zona requiere confirmación, te contactaremos antes de preparar el pedido." },
        { question: "¿Cómo sé en qué estado está mi pedido?", answer: "Al confirmar tu compra recibes un enlace con el número de pedido donde puedes consultar su estado en cualquier momento." },
      ] } },
  ];
}

function contactSections() {
  return [
    { type: "rich_text", label: "Introducción", variant: "default", content: { eyebrow: "Hablemos", title: "Contacto", body: "¿Tienes una idea para tu celebración o una pregunta sobre un pedido? Escríbenos y te responderemos lo antes posible." } },
  ];
}

async function seedSections(ids) {
  const pages = { home: homeSections(ids), nosotros: aboutSections(ids), "preguntas-frecuentes": faqSections(), contacto: contactSections() };
  for (const [page, sections] of Object.entries(pages)) {
    const existing = must(await db.from("page_sections").select("id").eq("page", page).limit(1), "sections lookup");
    if (existing.length) continue;
    must(await db.from("page_sections").insert(sections.map((s, sort) => ({
      page, type: s.type, label: s.label, variant: s.variant, sort, is_enabled: s.enabled ?? true, content: s.content, published_at: new Date().toISOString(),
    }))), "sections insert " + page);
  }
}

// ---------------------------------------------------------------- Admin
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return console.log("· ADMIN_EMAIL/ADMIN_PASSWORD no definidos: no se crea administrador.");
  const list = must(await db.auth.admin.listUsers({ perPage: 1000 }), "list users");
  let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    user = must(await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "Administrador" } }), "create admin").user;
  }
  must(await db.from("profiles").update({ role: "admin" }).eq("id", user.id), "promote admin");
  console.log("· Administrador listo:", email);
}

const ids = await seedMedia();
console.log("· Medios:", Object.keys(ids).length);
await seedSettings(ids);
await seedCatalog(ids);
await seedSections(ids);
await seedAdmin();
console.log("✓ Semilla completada");

/**
 * Definición de los bloques de contenido. El editor del CRM genera sus formularios
 * a partir de estas definiciones y el frontend renderiza cada tipo con su componente.
 */

export type FieldKind = "text" | "textarea" | "richtext" | "image" | "url" | "select" | "boolean" | "number" | "list";

export interface FieldDef {
  name: string;
  label: string;
  kind: FieldKind;
  help?: string;
  options?: { value: string; label: string }[];
  fields?: FieldDef[]; // para "list"
  maxItems?: number;
  placeholder?: string;
}

export interface SectionDef {
  type: string;
  label: string;
  description: string;
  variants: { value: string; label: string }[];
  fields: FieldDef[];
}

const heading: FieldDef[] = [
  { name: "eyebrow", label: "Antetítulo (caligráfico)", kind: "text" },
  { name: "title", label: "Título", kind: "text" },
];
const cta = (prefix = "cta"): FieldDef[] => [
  { name: `${prefix}_label`, label: "Texto del botón", kind: "text" },
  { name: `${prefix}_href`, label: "Enlace del botón", kind: "url", help: "Ruta interna (/tienda) o URL completa. Usa whatsapp: para abrir el chat configurado." },
];

export const SECTION_DEFS: SectionDef[] = [
  {
    type: "hero",
    label: "Portada (hero)",
    description: "Portada a pantalla completa con diapositivas. Cada diapositiva tiene su propio texto, botones e imagen.",
    variants: [{ value: "slider", label: "Carrusel a pantalla completa" }],
    fields: [
      { name: "slides", label: "Diapositivas", kind: "list", maxItems: 5, fields: [
        { name: "image", label: "Imagen (se ve mejor con la parte izquierda llamativa)", kind: "image" },
        { name: "eyebrow", label: "Subtítulo caligráfico", kind: "text" },
        { name: "title", label: "Título (una o dos palabras)", kind: "text" },
        { name: "text", label: "Texto", kind: "textarea" },
        { name: "cta_primary_label", label: "Botón principal", kind: "text" },
        { name: "cta_primary_href", label: "Enlace del botón principal", kind: "url" },
        { name: "cta_secondary_label", label: "Botón secundario", kind: "text" },
        { name: "cta_secondary_href", label: "Enlace del botón secundario", kind: "url" },
      ] },
    ],
  },
  {
    type: "categories",
    label: "Categorías destacadas",
    description: "Presentación de las líneas principales con imagen y enlace.",
    variants: [{ value: "default", label: "Tarjetas" }],
    fields: [
      ...heading,
      { name: "intro", label: "Introducción", kind: "textarea" },
      { name: "items", label: "Tarjetas", kind: "list", maxItems: 4, fields: [
        { name: "title", label: "Título", kind: "text" },
        { name: "text", label: "Descripción", kind: "textarea" },
        { name: "image", label: "Imagen", kind: "image" },
        { name: "href", label: "Enlace", kind: "url" },
        { name: "link_label", label: "Texto del enlace", kind: "text" },
      ] },
    ],
  },
  {
    type: "featured_products",
    label: "Productos destacados",
    description: "Grilla de productos marcados como destacados en el catálogo.",
    variants: [
      { value: "grid", label: "Grilla" },
      { value: "carousel", label: "Carrusel deslizable" },
    ],
    fields: [
      ...heading,
      { name: "intro", label: "Introducción", kind: "textarea" },
      { name: "source", label: "Productos a mostrar", kind: "select", options: [
        { value: "featured", label: "Solo destacados" },
        { value: "latest", label: "Más recientes" },
        { value: "galletas", label: "Solo galletas" },
        { value: "alfajores", label: "Solo alfajores" },
      ] },
      { name: "limit", label: "Cantidad máxima", kind: "number" },
      ...cta(),
    ],
  },
  {
    type: "feature_split",
    label: "Bloque editorial (imagen + texto)",
    description: "Ideal para galletas personalizadas, alfajores o cualquier línea de producto.",
    variants: [
      { value: "image-left", label: "Imagen a la izquierda" },
      { value: "image-right", label: "Imagen a la derecha" },
    ],
    fields: [
      ...heading,
      { name: "text", label: "Texto", kind: "richtext" },
      { name: "bullets", label: "Puntos destacados", kind: "list", maxItems: 6, fields: [{ name: "text", label: "Texto", kind: "text" }] },
      { name: "image", label: "Imagen principal", kind: "image" },
      { name: "image_secondary", label: "Imagen secundaria (opcional)", kind: "image" },
      ...cta(),
    ],
  },
  {
    type: "story",
    label: "Historia de la marca",
    description: "Texto centrado de la historia sobre una imagen de fondo, con firma caligráfica.",
    variants: [{ value: "default", label: "Estándar" }],
    fields: [
      ...heading,
      { name: "text", label: "Historia", kind: "richtext" },
      { name: "quote", label: "Firma caligráfica (texto tenue bajo la historia)", kind: "text" },
      { name: "image", label: "Imagen de fondo (se muestra a tamaño natural, centrada)", kind: "image" },
      ...cta(),
    ],
  },
  {
    type: "quote",
    label: "Frase sobre imagen",
    description: "Frase grande en letra caligráfica sobre una imagen de fondo.",
    variants: [{ value: "default", label: "Centrada" }],
    fields: [{ name: "text", label: "Frase", kind: "textarea" }, { name: "image", label: "Imagen de fondo (parallax en escritorio; mínimo 2000 × 770 px)", kind: "image" }],
  },
  {
    type: "menu_list",
    label: "Lista de productos con precios",
    description: "Lista elegante de productos del catálogo con su precio (por ejemplo, los alfajores), junto a una fotografía.",
    variants: [
      { value: "image-right", label: "Imagen a la derecha" },
      { value: "image-left", label: "Imagen a la izquierda" },
    ],
    fields: [
      { name: "title", label: "Título", kind: "text" },
      { name: "source", label: "Productos a mostrar", kind: "select", options: [
        { value: "dulces", label: "Galletas y alfajores" },
        { value: "alfajores", label: "Alfajores" },
        { value: "galletas", label: "Galletas personalizadas" },
        { value: "cajas", label: "Cajas y presentaciones" },
        { value: "featured", label: "Destacados" },
      ] },
      { name: "limit", label: "Cantidad máxima", kind: "number" },
      { name: "image", label: "Imagen de fondo (parallax, mínimo 1900 × 820 px)", kind: "image" },
      { name: "plate", label: "Imagen del plato (recortada, sin fondo; se coloca a la derecha)", kind: "image" },
      ...cta(),
    ],
  },
  {
    type: "timeline",
    label: "Cronología (Tradición)",
    description: "Título, introducción y hasta 5 hitos con año. El fondo ya trae dibujados la línea, los puntos y la imagen central (1920 × 819 px).",
    variants: [{ value: "default", label: "Horizontal" }],
    fields: [
      ...heading,
      { name: "intro", label: "Introducción", kind: "textarea" },
      { name: "image", label: "Imagen de fondo con la línea de tiempo", kind: "image" },
      { name: "items", label: "Hitos (máximo 5)", kind: "list", maxItems: 5, fields: [
        { name: "year", label: "Año", kind: "text" },
        { name: "label", label: "Texto bajo el punto", kind: "text" },
        { name: "title", label: "Título del detalle", kind: "text" },
        { name: "text", label: "Texto del detalle", kind: "textarea" },
      ] },
    ],
  },
  {
    type: "gallery",
    label: "Galería fotográfica",
    description: "Mosaico de fotografías.",
    variants: [
      { value: "mosaic", label: "Mosaico" },
      { value: "strip", label: "Tira deslizable" },
    ],
    fields: [
      ...heading,
      { name: "images", label: "Imágenes", kind: "list", maxItems: 12, fields: [{ name: "image", label: "Imagen", kind: "image" }] },
    ],
  },
  {
    type: "steps",
    label: "Cómo hacer un pedido",
    description: "Pasos numerados del proceso de compra.",
    variants: [{ value: "default", label: "Pasos" }],
    fields: [
      ...heading,
      { name: "intro", label: "Introducción", kind: "textarea" },
      { name: "items", label: "Pasos", kind: "list", maxItems: 6, fields: [{ name: "title", label: "Título", kind: "text" }, { name: "text", label: "Descripción", kind: "textarea" }] },
      ...cta(),
    ],
  },
  {
    type: "testimonials",
    label: "Testimonios",
    description: "Opiniones de clientes. Publica únicamente testimonios reales y autorizados.",
    variants: [{ value: "default", label: "Carrusel" }],
    fields: [
      ...heading,
      { name: "items", label: "Testimonios", kind: "list", maxItems: 10, fields: [
        { name: "quote", label: "Testimonio", kind: "textarea" },
        { name: "author", label: "Nombre", kind: "text" },
        { name: "detail", label: "Detalle (ej. pedido de cumpleaños)", kind: "text" },
      ] },
    ],
  },
  {
    type: "instagram",
    label: "Instagram",
    description: "Invitación a seguir la cuenta de Instagram configurada en Redes sociales.",
    variants: [{ value: "default", label: "Mosaico" }],
    fields: [
      ...heading,
      { name: "text", label: "Texto", kind: "textarea" },
      { name: "images", label: "Imágenes", kind: "list", maxItems: 6, fields: [{ name: "image", label: "Imagen", kind: "image" }] },
    ],
  },
  {
    type: "whatsapp_cta",
    label: "Llamado a WhatsApp",
    description: "Invitación a pedir por WhatsApp. Solo se muestra si el número está configurado.",
    variants: [{ value: "default", label: "Banda" }],
    fields: [
      ...heading,
      { name: "text", label: "Texto", kind: "textarea" },
      { name: "button_label", label: "Texto del botón", kind: "text" },
      { name: "message", label: "Mensaje prellenado", kind: "textarea" },
      { name: "image", label: "Imagen (opcional)", kind: "image" },
    ],
  },
  {
    type: "faq",
    label: "Preguntas frecuentes",
    description: "Acordeón de preguntas y respuestas (genera datos estructurados FAQ).",
    variants: [{ value: "default", label: "Acordeón" }],
    fields: [
      ...heading,
      { name: "items", label: "Preguntas", kind: "list", maxItems: 20, fields: [{ name: "question", label: "Pregunta", kind: "text" }, { name: "answer", label: "Respuesta", kind: "textarea" }] },
    ],
  },
  {
    type: "banner",
    label: "Banner",
    description: "Franja con imagen de fondo, texto y botón.",
    variants: [
      { value: "left", label: "Texto a la izquierda" },
      { value: "center", label: "Texto centrado" },
    ],
    fields: [...heading, { name: "text", label: "Texto", kind: "textarea" }, { name: "image", label: "Imagen de fondo", kind: "image" }, ...cta()],
  },
  {
    type: "rich_text",
    label: "Texto libre",
    description: "Bloque de texto con títulos y párrafos.",
    variants: [{ value: "default", label: "Centrado" }],
    fields: [...heading, { name: "body", label: "Contenido", kind: "richtext", help: "Usa ## para subtítulos y - para listas." }],
  },
];

export const SECTION_BY_TYPE = Object.fromEntries(SECTION_DEFS.map((d) => [d.type, d])) as Record<string, SectionDef>;

export const CMS_PAGES: { key: string; label: string; path: string }[] = [
  { key: "home", label: "Inicio", path: "/" },
  { key: "nosotros", label: "Nosotros", path: "/nosotros" },
  { key: "preguntas-frecuentes", label: "Preguntas frecuentes", path: "/preguntas-frecuentes" },
  { key: "contacto", label: "Contacto", path: "/contacto" },
];

/** Recoge recursivamente los IDs de medios usados en el contenido de una sección. */
export function collectMediaIds(content: unknown, def?: FieldDef[] , acc = new Set<string>()): Set<string> {
  if (!content || typeof content !== "object") return acc;
  const fields = def ?? [];
  for (const f of fields) {
    const v = (content as Record<string, unknown>)[f.name];
    if (f.kind === "image" && typeof v === "string" && v) acc.add(v);
    if (f.kind === "list" && Array.isArray(v)) v.forEach((item) => collectMediaIds(item, f.fields, acc));
  }
  return acc;
}

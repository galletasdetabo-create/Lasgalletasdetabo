/**
 * Ajustes del sitio editables desde el CRM. Cada clave es una fila en `site_settings`.
 * Los valores por defecto evitan errores si una fila falta, pero nunca inventan
 * datos comerciales: los campos desconocidos quedan vacíos y el sitio los oculta.
 */

export interface BrandSettings {
  name: string;
  slogan: string;
  logo_id: string | null;
  logo_alt_id: string | null;
  favicon_id: string | null;
  colors: {
    cream: string;
    blush: string;
    rose: string;
    rose_deep: string;
    chocolate: string;
    gold: string;
  };
  font_pair: "moderna" | "clasica";
}

export interface ContactSettings {
  phone: string;
  email: string;
  city: string;
  address: string;
  show_address: boolean;
  hours: string;
  service_area: string;
}

export interface SocialSettings {
  instagram: string;
  facebook: string;
  tiktok: string;
}

export interface WhatsAppSettings {
  enabled: boolean;
  number: string;
  default_message: string;
}

export interface SeoSettings {
  title: string;
  description: string;
  keywords: string;
  og_image_id: string | null;
}

export interface FooterSettings {
  text: string;
  copyright: string;
}

export interface LegalSettings {
  terms: string;
  privacy: string;
  shipping: string;
  returns: string;
}

export interface CommerceSettings {
  transfer_instructions: string;
  checkout_note: string;
  notice_enabled: boolean;
  notice_text: string;
}

export interface PaymentsSettings {
  pse_enabled: boolean;
}

export interface SiteSettings {
  brand: BrandSettings;
  contact: ContactSettings;
  social: SocialSettings;
  whatsapp: WhatsAppSettings;
  seo: SeoSettings;
  footer: FooterSettings;
  legal: LegalSettings;
  commerce: CommerceSettings;
  payments: PaymentsSettings;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  brand: {
    name: "Las Galletas de Tabo",
    slogan: "Horneando con amor",
    logo_id: null,
    logo_alt_id: null,
    favicon_id: null,
    colors: {
      cream: "#FFF5ED",
      blush: "#F8D8D7",
      rose: "#EBA9A8",
      rose_deep: "#C97D78",
      chocolate: "#6A4437",
      gold: "#D9B477",
    },
    font_pair: "moderna",
  },
  contact: { phone: "", email: "", city: "", address: "", show_address: false, hours: "", service_area: "" },
  social: { instagram: "", facebook: "", tiktok: "" },
  whatsapp: { enabled: true, number: "", default_message: "¡Hola! Quiero hacer un pedido en Las Galletas de Tabo." },
  seo: {
    title: "Las Galletas de Tabo · Galletas personalizadas y alfajores artesanales",
    description:
      "Galletas decoradas y personalizadas para cumpleaños, aniversarios y eventos, y alfajores artesanales. Pedidos en línea. Horneando con amor.",
    keywords: "galletas personalizadas, galletas decoradas, alfajores artesanales, galletas para cumpleaños, regalos dulces",
    og_image_id: null,
  },
  footer: { text: "Repostería artesanal hecha en casa, con ingredientes cuidados y mucho cariño.", copyright: "" },
  legal: { terms: "", privacy: "", shipping: "", returns: "" },
  commerce: {
    transfer_instructions: "",
    checkout_note: "",
    notice_enabled: true,
    notice_text: "Tienda en configuración: precios, fotografías y textos son de referencia.",
  },
  payments: { pse_enabled: true },
};

export type SettingsKey = keyof SiteSettings;
export const PUBLIC_SETTING_KEYS: SettingsKey[] = ["brand", "contact", "social", "whatsapp", "seo", "footer", "legal", "commerce"];
export const ADMIN_ONLY_KEYS: SettingsKey[] = ["payments"];

const HEX = /^#[0-9a-fA-F]{6}$/;

export function mergeSettings(rows: { key: string; value: unknown }[]): SiteSettings {
  const s = structuredClone(DEFAULT_SETTINGS);
  const target = s as unknown as Record<string, Record<string, unknown>>;
  for (const row of rows) {
    if (!(row.key in target) || typeof row.value !== "object" || row.value === null) continue;
    const value = row.value as Record<string, unknown>;
    for (const k of Object.keys(target[row.key])) {
      if (k in value && value[k] !== undefined) target[row.key][k] = value[k];
    }
  }
  s.brand.colors = { ...DEFAULT_SETTINGS.brand.colors, ...(s.brand.colors ?? {}) };
  for (const [k, v] of Object.entries(s.brand.colors)) {
    if (!HEX.test(v)) s.brand.colors[k as keyof BrandSettings["colors"]] = DEFAULT_SETTINGS.brand.colors[k as keyof BrandSettings["colors"]];
  }
  return s;
}

/** Normaliza un número colombiano para enlaces de WhatsApp (solo dígitos, con indicativo 57). */
export function normalizeWhatsApp(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 && digits.startsWith("3")) return "57" + digits;
  return digits;
}

export function whatsappLink(number: string, message: string) {
  const n = normalizeWhatsApp(number);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}

export function instagramUrl(handle: string) {
  const h = (handle || "").trim();
  if (!h) return null;
  if (/^https?:\/\//.test(h)) return h;
  return `https://www.instagram.com/${h.replace(/^@/, "")}/`;
}

export function socialUrl(value: string, base: string) {
  const v = (value || "").trim();
  if (!v) return null;
  if (/^https?:\/\//.test(v)) return v;
  return base + v.replace(/^@/, "");
}

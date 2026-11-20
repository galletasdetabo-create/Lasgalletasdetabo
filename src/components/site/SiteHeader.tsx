import { getCatalog, getImage, getSettings } from "@/lib/data/public";
import { instagramUrl, socialUrl, whatsappLink } from "@/lib/cms/settings";
import { HeaderClient, type NavItem, type SideInfo } from "./HeaderClient";

export async function SiteHeader() {
  const [s, catalog] = await Promise.all([getSettings(), getCatalog()]);
  const logo = await getImage(s.brand.logo_id);
  const nav: NavItem[] = [
    { label: "Inicio", href: "/" },
    {
      label: "Tienda",
      href: "/tienda",
      children: [{ label: "Toda la tienda", href: "/tienda" }, ...catalog.categories.map((c) => ({ label: c.name, href: `/tienda/${c.slug}` }))],
    },
    { label: "Personalizadas", href: "/tienda/galletas-personalizadas" },
    { label: "Alfajores", href: "/tienda/alfajores-artesanales" },
    { label: "Nosotros", href: "/nosotros" },
    { label: "Contacto", href: "/contacto" },
  ];
  const wa = s.whatsapp.enabled ? whatsappLink(s.whatsapp.number, s.whatsapp.default_message) : null;
  const side: SideInfo = {
    text: s.footer.text,
    lines: [
      ...(s.contact.phone ? [{ icon: "phone" as const, text: s.contact.phone, href: `tel:${s.contact.phone.replace(/\s/g, "")}` }] : []),
      ...(s.contact.email ? [{ icon: "mail" as const, text: s.contact.email, href: `mailto:${s.contact.email}` }] : []),
      ...(s.contact.city ? [{ icon: "pin" as const, text: s.contact.service_area || s.contact.city }] : []),
      ...(s.contact.hours ? [{ icon: "clock" as const, text: s.contact.hours }] : []),
    ],
    socials: [
      { icon: "instagram" as const, label: "Instagram", href: instagramUrl(s.social.instagram) },
      { icon: "facebook" as const, label: "Facebook", href: socialUrl(s.social.facebook, "https://www.facebook.com/") },
      { icon: "tiktok" as const, label: "TikTok", href: socialUrl(s.social.tiktok, "https://www.tiktok.com/@") },
      { icon: "whatsapp" as const, label: "WhatsApp", href: wa },
    ].filter((x): x is { icon: "instagram" | "facebook" | "tiktok" | "whatsapp"; label: string; href: string } => !!x.href),
  };
  return (
    <HeaderClient
      nav={nav}
      brandName={s.brand.name}
      slogan={s.brand.slogan}
      logo={logo ? { url: logo.url, width: logo.width, height: logo.height } : { url: "/brand/logo.webp", width: 720, height: 548 }}
      notice={s.commerce.notice_enabled ? s.commerce.notice_text : ""}
      side={side}
    />
  );
}

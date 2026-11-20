import type { Metadata } from "next";
import { CmsPage } from "@/components/sections/CmsPage";
import { ContactForm } from "@/components/site/ContactForm";
import { Icon } from "@/components/ui/Icon";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { getSettings } from "@/lib/data/public";
import { instagramUrl, whatsappLink } from "@/lib/cms/settings";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escríbenos para pedidos especiales de galletas personalizadas y alfajores artesanales.",
  alternates: { canonical: "/contacto" },
};

export default async function ContactPage() {
  const s = await getSettings();
  const wa = s.whatsapp.enabled ? whatsappLink(s.whatsapp.number, s.whatsapp.default_message) : null;
  const ig = instagramUrl(s.social.instagram);
  const channels = [
    wa && { icon: "whatsapp" as const, label: "WhatsApp", value: "Escríbenos", href: wa },
    s.contact.phone && { icon: "phone" as const, label: "Teléfono", value: s.contact.phone, href: `tel:${s.contact.phone.replace(/\s/g, "")}` },
    s.contact.email && { icon: "mail" as const, label: "Correo", value: s.contact.email, href: `mailto:${s.contact.email}` },
    ig && { icon: "instagram" as const, label: "Instagram", value: s.social.instagram, href: ig },
    s.contact.hours && { icon: "clock" as const, label: "Horario de atención", value: s.contact.hours, href: null },
    s.contact.city && { icon: "pin" as const, label: "Ciudad", value: s.contact.service_area || s.contact.city, href: null },
  ].filter(Boolean) as { icon: "whatsapp" | "phone" | "mail" | "instagram" | "clock" | "pin"; label: string; value: string; href: string | null }[];

  return (
    <>
      <CmsPage page="contacto" fallbackTitle="Contacto" />
      <section className="container-site pb-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-4" data-reveal>
            {channels.length ? channels.map((c) => (
              <div key={c.label} className="flex items-center gap-4 rounded-[22px] bg-white/85 p-5 ring-1 ring-line">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blush text-rose-deep"><Icon name={c.icon} /></span>
                <div>
                  <p className="overline">{c.label}</p>
                  {c.href ? <a href={c.href} className="text-ink hover:text-rose-deep" {...(c.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{c.value}</a> : <p>{c.value}</p>}
                </div>
              </div>
            )) : (
              <div className="rounded-[22px] bg-white/85 p-6 text-ink-soft ring-1 ring-line">Usa el formulario y te responderemos lo antes posible.</div>
            )}
          </div>
          <div className="rounded-[28px] bg-white/90 p-6 ring-1 ring-line sm:p-10" data-reveal>
            <h2 className="text-2xl">Envíanos un mensaje</h2>
            <div className="mt-6"><ContactForm /></div>
          </div>
        </div>
      </section>
      <BreadcrumbJsonLd items={[{ name: "Inicio", path: "/" }, { name: "Contacto", path: "/contacto" }]} />
    </>
  );
}

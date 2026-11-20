import Image from "next/image";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { Icon, type IconName } from "@/components/ui/Icon";
import { getCatalog, getImage, getSettings } from "@/lib/data/public";
import { instagramUrl, socialUrl, whatsappLink } from "@/lib/cms/settings";

export async function SiteFooter() {
  "use cache";
  cacheTag("settings", "catalog", "media");
  cacheLife("days");
  const [s, catalog] = await Promise.all([getSettings(), getCatalog()]);
  const logo = await getImage(s.brand.logo_id);
  const wa = s.whatsapp.enabled ? whatsappLink(s.whatsapp.number, s.whatsapp.default_message) : null;
  const socials = [
    { name: "instagram" as IconName, label: "Instagram", href: instagramUrl(s.social.instagram) },
    { name: "facebook" as IconName, label: "Facebook", href: socialUrl(s.social.facebook, "https://www.facebook.com/") },
    { name: "tiktok" as IconName, label: "TikTok", href: socialUrl(s.social.tiktok, "https://www.tiktok.com/@") },
    { name: "whatsapp" as IconName, label: "WhatsApp", href: wa },
  ].filter((x) => x.href);
  const legal = [
    { href: "/legal/terminos", label: "Términos y condiciones", has: !!s.legal.terms.trim() },
    { href: "/legal/privacidad", label: "Política de privacidad", has: !!s.legal.privacy.trim() },
    { href: "/legal/envios", label: "Envíos y entregas", has: !!s.legal.shipping.trim() },
    { href: "/legal/cambios", label: "Cambios y devoluciones", has: !!s.legal.returns.trim() },
  ].filter((l) => l.has);
  const year = new Date().getFullYear();
  const lw = logo ? Math.round((logo.width / logo.height) * 90) : 118;
  const contact = [
    wa ? { icon: "whatsapp" as IconName, text: "Escríbenos por WhatsApp", href: wa } : null,
    s.contact.phone ? { icon: "phone" as IconName, text: s.contact.phone, href: `tel:${s.contact.phone.replace(/\s/g, "")}` } : null,
    s.contact.email ? { icon: "mail" as IconName, text: s.contact.email, href: `mailto:${s.contact.email}` } : null,
    s.contact.city ? { icon: "pin" as IconName, text: `${s.contact.show_address && s.contact.address ? `${s.contact.address}, ` : ""}${s.contact.city}`, href: undefined } : null,
    s.contact.hours ? { icon: "clock" as IconName, text: s.contact.hours, href: undefined } : null,
  ].filter(Boolean) as { icon: IconName; text: string; href?: string }[];

  return (
    <footer className="marble-soft relative mt-24 border-t border-line">
      <div className="container-site grid gap-14 py-20 md:grid-cols-[1fr_1.15fr_1fr] md:gap-10">
        <div className="order-2 md:order-1">
          <p className="overline !text-[15px]">Pedidos</p>
          <ul className="it mt-5 space-y-1.5">
            {contact.map((c) => (
              <li key={c.text}>{c.href ? <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="transition-colors hover:text-gold-ink">{c.text}</a> : c.text}</li>
            ))}
            <li><Link href="/tienda" className="transition-colors hover:text-gold-ink">Pedidos en línea</Link></li>
          </ul>
        </div>

        <div className="order-1 text-center md:order-2">
          <Link href="/" aria-label={`${s.brand.name} — inicio`} className="inline-block">
            <Image src={logo?.url ?? "/brand/logo.webp"} alt={s.brand.name} width={lw} height={90} className="h-[90px] w-auto" sizes="130px" />
          </Link>
          <p className="eyebrow mt-3">{s.brand.slogan}</p>
          <p className="mt-2 font-sans text-[24px] font-semibold uppercase tracking-[0.07em] text-ink">{s.brand.name}</p>
          <span className="sep mt-5" aria-hidden="true" />
          {s.footer.text ? <p className="it mx-auto mt-6 max-w-[420px]">{s.footer.text}</p> : null}
          {socials.length ? (
            <ul className="mt-8 flex justify-center gap-4">
              {socials.map((x) => (
                <li key={x.label}>
                  <a href={x.href!} target="_blank" rel="noopener noreferrer" aria-label={x.label} className="flex h-10 w-10 rotate-45 items-center justify-center border border-gold text-gold-ink transition-colors duration-300 hover:bg-gold hover:text-white">
                    <Icon name={x.name} size={15} className="-rotate-45" strokeWidth={1.4} />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="order-3 md:text-right">
          <p className="overline !text-[15px]">Información</p>
          <ul className="it mt-5 space-y-1.5">
            {catalog.categories.slice(0, 4).map((c) => (
              <li key={c.id}><Link href={`/tienda/${c.slug}`} className="transition-colors hover:text-gold-ink">{c.name}</Link></li>
            ))}
            <li><Link href="/nosotros" className="transition-colors hover:text-gold-ink">Nosotros</Link></li>
            <li><Link href="/preguntas-frecuentes" className="transition-colors hover:text-gold-ink">Preguntas frecuentes</Link></li>
            <li><Link href="/contacto" className="transition-colors hover:text-gold-ink">Contacto</Link></li>
            {legal.map((l) => (
              <li key={l.href}><Link href={l.href} className="transition-colors hover:text-gold-ink">{l.label}</Link></li>
            ))}
            <li><Link href="/creditos-imagenes" className="transition-colors hover:text-gold-ink">Créditos de imágenes</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="it py-6 text-center !text-[17px]">© {year} {s.footer.copyright || s.brand.name}. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}

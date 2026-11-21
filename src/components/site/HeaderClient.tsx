"use client";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { PathnameSync } from "./PathnameSync";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cart, useCart } from "@/lib/cart/store";

const CartDrawer = dynamic(() => import("./CartDrawer"), { ssr: false });

export interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

export interface SideInfo {
  text: string;
  lines: { icon: IconName; text: string; href?: string }[];
  socials: { icon: IconName; label: string; href: string }[];
}

interface Props {
  nav: NavItem[];
  brandName: string;
  slogan: string;
  logo: { url: string; width: number; height: number };
  notice: string;
  side: SideInfo;
}

function BurgerIcon({ open }: { open?: boolean }) {
  return (
    <span className="relative block h-[22px] w-[34px]" aria-hidden="true">
      <span className={`absolute left-0 top-[4px] block h-px w-full bg-current transition-transform duration-300 ${open ? "translate-y-[6px] rotate-45" : ""}`} />
      <span className={`absolute left-0 top-[10px] block h-px w-full bg-current transition-opacity duration-200 ${open ? "opacity-0" : ""}`} />
      <span className={`absolute left-0 top-[16px] block h-px w-full bg-current transition-transform duration-300 ${open ? "-translate-y-[6px] -rotate-45" : ""}`} />
    </span>
  );
}

export function HeaderClient({ nav, brandName, slogan, logo, notice, side }: Props) {
  const { items, everOpened } = useCart();
  const [pathname, setPathname] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  // Al cambiar de ruta se cierran los paneles y el mini-carrito.
  const onPath = useCallback((p: string) => {
    setPathname(p);
    setMenuOpen(false);
    setSideOpen(false);
    setSearchOpen(false);
    cart.close();
  }, []);

  // Cabecera siempre visible: transparente sobre la portada y blanca en cuanto se hace scroll.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > 24));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const lock = sideOpen || searchOpen;
    document.documentElement.style.overflow = lock ? "hidden" : "";
    if (!lock) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSideOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sideOpen, searchOpen]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));
  const count = items.length;
  const logoH = 72;

  const renderLogo = (h: number, priority: boolean) => (
    <Link href="/" className="relative z-10 flex shrink-0 items-center" aria-label={`${brandName} — inicio`}>
      <Image src={logo.url} alt={brandName} width={Math.round((logo.width / logo.height) * h)} height={h} preload={priority} className="w-auto" style={{ height: h }} sizes="100px" quality={85} />
    </Link>
  );

  const menu = (
    <nav aria-label="Principal" className="hidden h-full lg:block">
      <ul className="flex h-full items-center">
        {nav.map((item) => (
          <li key={item.href} className="nav-item relative h-full">
            <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className="nav-link">
              {item.label}
            </Link>
            {item.children ? (
              <div className="nav-dropdown">
                {item.children.map((c) => (
                  <Link key={c.href} href={c.href}>{c.label}</Link>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </nav>
  );

  const tools = (
    <div className="flex items-center gap-1 text-gold-ink">
      <button type="button" onClick={() => { setSearchOpen(true); window.setTimeout(() => searchInput.current?.focus(), 150); }} className="hidden h-11 w-11 items-center justify-center transition-colors hover:text-ink sm:flex" aria-label="Buscar productos">
        <Icon name="search" size={22} strokeWidth={1.2} />
      </button>
      <button type="button" onClick={() => cart.open()} className="relative flex h-11 w-12 items-center justify-center transition-colors hover:text-ink" aria-label={`Abrir carrito (${count} ${count === 1 ? "producto" : "productos"})`}>
        <Icon name="bag" size={24} strokeWidth={1.2} />
        <span className="absolute bottom-1 right-1 font-serif text-[15px] italic leading-none" aria-hidden="true">{count}</span>
      </button>
      <button type="button" onClick={() => setSideOpen(true)} className="hidden h-11 w-14 items-center justify-center transition-colors hover:text-ink lg:flex" aria-label="Abrir panel de información" aria-expanded={sideOpen}>
        <BurgerIcon />
      </button>
      <button type="button" onClick={() => setMenuOpen((v) => !v)} className="flex h-11 w-14 items-center justify-center transition-colors hover:text-ink lg:hidden" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} aria-controls="menu-movil">
        <BurgerIcon open={menuOpen} />
      </button>
    </div>
  );

  return (
    <>
      {notice ? (
        <div className="relative z-[65] bg-cream px-4 py-2 text-center font-sans text-[0.72rem] font-medium tracking-wide text-ink-soft">{notice}</div>
      ) : null}

      <header className="header-main" data-scrolled={scrolled}>
        <div className="flex h-full items-center justify-between" style={{ paddingInline: "var(--gutter)" }}>
          <span className="hidden lg:block">{renderLogo(logoH, true)}</span>
          <span className="lg:hidden">{renderLogo(46, false)}</span>
          <div className="flex h-full items-center gap-2 lg:gap-6">
            {menu}
            {tools}
          </div>
        </div>
      </header>

      {/* Menú móvil: acordeón bajo la cabecera */}
      <div id="menu-movil" className={`grid border-b border-[#ebebeb] bg-white transition-[grid-template-rows] duration-500 ease-[var(--ease-out-quart)] lg:hidden ${menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`} inert={!menuOpen}>
        <nav aria-label="Menú móvil" className="overflow-hidden">
          <ul className="px-5 pb-2 pt-1">
            {nav.map((item) => (
              <li key={item.href} className="border-b border-[#ebebeb] last:border-b-0">
                <div className="flex items-center justify-between">
                  <Link href={item.href} className={`block flex-1 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.19em] ${isActive(item.href) ? "text-gold-ink" : "text-ink"}`}>
                    {item.label}
                  </Link>
                  {item.children ? (
                    <button type="button" className="flex h-11 w-11 items-center justify-center text-ink" aria-label={`Ver categorías de ${item.label}`} aria-expanded={expanded === item.href} onClick={() => setExpanded((v) => (v === item.href ? null : item.href))}>
                      <Icon name="chevronRight" size={16} className={`transition-transform duration-300 ${expanded === item.href ? "rotate-90" : ""}`} />
                    </button>
                  ) : null}
                </div>
                {item.children ? (
                  <div className={`grid transition-[grid-template-rows] duration-400 ease-[var(--ease-out-quart)] ${expanded === item.href ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <ul className="overflow-hidden">
                      {item.children.map((c) => (
                        <li key={c.href}><Link href={c.href} className="block py-2 pl-4 font-serif text-[20px] italic text-ink">{c.label}</Link></li>
                      ))}
                      <li className="h-2" />
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Panel lateral (burger de escritorio) */}
      <div className={`fixed inset-0 z-[90] ${sideOpen ? "" : "pointer-events-none"}`} aria-hidden={!sideOpen}>
        <div className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${sideOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setSideOpen(false)} />
        <aside className={`side-panel absolute inset-y-0 right-0 w-full max-w-[480px] overflow-y-auto bg-white px-10 py-12 ${sideOpen ? "translate-x-0" : "translate-x-full"}`} inert={!sideOpen} aria-label="Información">
          <button type="button" onClick={() => setSideOpen(false)} className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center text-gold-ink hover:text-ink" aria-label="Cerrar panel"><Icon name="close" size={22} strokeWidth={1.2} /></button>
          <div className="text-center">
            <Image src={logo.url} alt={brandName} width={Math.round((logo.width / logo.height) * 110)} height={110} className="mx-auto h-[110px] w-auto" sizes="150px" />
            <p className="eyebrow mt-4">{slogan}</p>
            <p className="mt-2 font-sans text-[24px] font-semibold uppercase tracking-[0.07em]">{brandName}</p>
            <span className="sep mt-5" aria-hidden="true" />
            {side.text ? <p className="it mt-6">{side.text}</p> : null}
          </div>
          {side.lines.length ? (
            <ul className="mt-8 space-y-3 border-t border-line pt-8">
              {side.lines.map((l) => (
                <li key={l.text} className="it flex items-start gap-3"><Icon name={l.icon} size={18} className="mt-1.5 shrink-0 text-gold-ink" />{l.href ? <a href={l.href} className="hover:text-gold-ink">{l.text}</a> : <span>{l.text}</span>}</li>
              ))}
            </ul>
          ) : null}
          {side.socials.length ? (
            <ul className="mt-10 flex justify-center gap-4">
              {side.socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="flex h-11 w-11 rotate-45 items-center justify-center border border-gold text-gold-ink transition-colors duration-300 hover:bg-gold hover:text-white">
                    <Icon name={s.icon} size={16} className="-rotate-45" strokeWidth={1.4} />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </aside>
      </div>

      {/* Buscador a pantalla completa */}
      <div className={`fixed inset-0 z-[95] flex items-center justify-center bg-white transition-[opacity,visibility] duration-300 ${searchOpen ? "visible opacity-100" : "invisible opacity-0"}`} role="dialog" aria-modal="true" aria-label="Buscar" aria-hidden={!searchOpen} inert={!searchOpen}>
        <button type="button" onClick={() => setSearchOpen(false)} className="absolute right-6 top-6 flex h-12 w-12 items-center justify-center text-gold-ink hover:text-ink" aria-label="Cerrar buscador"><Icon name="close" size={26} strokeWidth={1.2} /></button>
        <form action="/tienda" method="get" role="search" className="w-full max-w-3xl px-6">
          <label htmlFor="busqueda-global" className="sr-only">Buscar productos</label>
          <input ref={searchInput} id="busqueda-global" name="q" type="search" autoComplete="off" maxLength={60} placeholder="Busca galletas, alfajores, ocasiones…" className="w-full border-0 border-b border-gold bg-transparent py-4 text-center font-serif text-[32px] italic text-ink outline-none placeholder:text-ink-muted md:text-[44px]" />
          <p className="it mt-5 text-center text-ink-muted">Presiona Enter para buscar</p>
        </form>
      </div>

      <Suspense fallback={null}><PathnameSync onChange={onPath} /></Suspense>
      {everOpened ? <CartDrawer /> : null}
    </>
  );
}

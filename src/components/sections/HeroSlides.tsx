"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ImageRef } from "@/lib/types";

export interface HeroSlide {
  image: ImageRef | null;
  eyebrow: string;
  title: string;
  text: string;
  ctas: { label: string; href: string; kind: "solid" | "outline" }[];
}

function CtaLink({ label, href, kind }: HeroSlide["ctas"][number]) {
  const cls = kind === "solid" ? "btn" : "btn btn-outline";
  return /^https?:\/\//.test(href) ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a>
  ) : (
    <Link href={href} className={cls}>{label}</Link>
  );
}

/**
 * Portada a pantalla completa. Cada capa entra con la animación medida en la referencia
 * (subtítulo desde la izquierda, título desde la derecha, línea que escala, párrafo y botones en fundido).
 */
export function HeroSlides({ slides, interval = 7000 }: { slides: HeroSlide[]; interval?: number }) {
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (count < 2 || hover || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % count), interval);
    return () => window.clearInterval(id);
  }, [count, hover, interval, active]);

  const go = (i: number) => setActive((i + count) % count);

  return (
    <section className="hero" aria-roledescription="carrusel" aria-label="Portada" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {slides.map((s, i) => {
        const Title = i === 0 ? "h1" : "p";
        const on = i === active;
        return (
          <div key={i} className={`hero-slide ${on ? "is-active" : ""}`} aria-hidden={!on} inert={!on} role="group" aria-label={`Diapositiva ${i + 1} de ${count}`}>
            {s.image ? (
              <div className="hero-media">
                <Image
                  src={s.image.url}
                  alt={i === 0 ? s.image.alt : ""}
                  fill
                  sizes="(min-width:1025px) 100vw, 100vw"
                  preload={i === 0}
                  fetchPriority={i === 0 ? "high" : "low"}
                  loading={i === 0 ? "eager" : "lazy"}
                  quality={i === 0 ? 78 : 70}
                  placeholder={s.image.blur ? "blur" : "empty"}
                  blurDataURL={s.image.blur ?? undefined}
                  className="object-cover object-left"
                />
              </div>
            ) : null}
            <div className="hero-content">
              {s.eyebrow ? <p className="hero-sub hl hl-sub">{s.eyebrow}</p> : null}
              <Title className="hero-title hl hl-title" {...(Title === "p" ? { role: "heading", "aria-level": 2 } : {})}>{s.title}</Title>
              <span className="sep hero-sep hl hl-sep" aria-hidden="true" />
              {s.text ? <p className="hero-text hl hl-text">{s.text}</p> : null}
              {s.ctas.length ? (
                <div className="hero-btns hl hl-btns">
                  {s.ctas.map((c) => <CtaLink key={c.label} {...c} />)}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}

      {count > 1 ? (
        <>
          <button type="button" className="hero-arrow prev" aria-label="Diapositiva anterior" onClick={() => go(active - 1)}>
            <svg viewBox="0 0 32 62" width="32" height="62" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><path d="M31 1 1 31l30 30" /></svg>
          </button>
          <button type="button" className="hero-arrow next" aria-label="Diapositiva siguiente" onClick={() => go(active + 1)}>
            <svg viewBox="0 0 32 62" width="32" height="62" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><path d="m1 1 30 30L1 61" /></svg>
          </button>
          <div className="hero-bullets" role="tablist" aria-label="Seleccionar diapositiva">
            {slides.map((_, i) => (
              <button key={i} type="button" role="tab" className="hero-bullet" aria-selected={i === active} aria-label={`Ir a la diapositiva ${i + 1}`} onClick={() => setActive(i)}>
                <i />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

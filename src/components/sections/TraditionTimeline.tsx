"use client";
import { useId, useState } from "react";

export interface TimelineItem {
  year: string;
  label: string;
  title: string;
  text: string;
}

interface Props {
  /** Imagen de fondo ya optimizada (1920 × 819). Contiene la línea y los puntos de la cronología. */
  bg: string | null;
  eyebrow: string;
  title: string;
  intro: string;
  items: TimelineItem[];
}

/**
 * Cronología horizontal de la referencia. La imagen de fondo ya trae dibujados la línea, los cinco puntos,
 * las flechas y la imagen central; los textos y los botones se colocan encima, en porcentajes del lienzo de 1920 × 819.
 * Al elegir un año cambia el texto de la derecha (altura y opacidad en 0,4 s) y el año activo se pinta de dorado (0,2 s).
 */
export function TraditionTimeline({ bg, eyebrow, title, intro, items }: Props) {
  const [active, setActive] = useState(0);
  const id = useId();
  if (!items.length) return null;
  const n = items.length;
  const go = (i: number) => setActive((i + n) % n);
  const cur = items[active];
  return (
    <section className="tl-section" aria-labelledby={`${id}-t`}>
      <div className="tl-stage" style={bg ? ({ ["--tl-bg" as string]: `url("${bg}")` } as React.CSSProperties) : undefined}>
        <header className="tl-head">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2 id={`${id}-t`}>{title}</h2>
          <span className="sep" aria-hidden="true" />
          {intro ? <p className="it-lg tl-intro">{intro}</p> : null}
        </header>

        <div className="tl-detail" aria-live="polite">
          <div key={active} className="tl-detail-in">
            <h3>{cur.title}</h3>
            <p className="it-lg">{cur.text}</p>
          </div>
        </div>

        <div className="tl-track" role="tablist" aria-label={title}>
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`tl-item${i === active ? " is-active" : ""}`}
              style={{ ["--tl-x" as string]: `${[26.6, 38.3, 50, 61.7, 73.4][i] ?? 50}%` }}
              onClick={() => setActive(i)}
            >
              <span className="tl-year">{it.year}</span>
              <span className="tl-label">{it.label}</span>
            </button>
          ))}
        </div>
        <button type="button" className="tl-arrow tl-prev" aria-label="Anterior" onClick={() => go(active - 1)} />
        <button type="button" className="tl-arrow tl-next" aria-label="Siguiente" onClick={() => go(active + 1)} />
      </div>
    </section>
  );
}

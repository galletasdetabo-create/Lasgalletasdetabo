"use client";
import { useState } from "react";

export interface QuoteItem { quote: string; author: string; detail: string }

/** Testimonios de uno en uno, con rombos de paginación (como la referencia). */
export function QuoteSlider({ items }: { items: QuoteItem[] }) {
  const [i, setI] = useState(0);
  const cur = items[i] ?? items[0];
  if (!cur) return null;
  return (
    <div className="mx-auto max-w-[820px] text-center">
      <blockquote key={i} className="it anim-fade-up !text-[22px]">{cur.quote}</blockquote>
      <p className="mt-6 font-sans text-[13px] font-semibold uppercase tracking-[0.12em]">{cur.author}</p>
      {cur.detail ? <p className="it !text-[18px] text-ink-muted">{cur.detail}</p> : null}
      {items.length > 1 ? (
        <div className="mt-6 flex justify-center" role="tablist" aria-label="Elegir testimonio">
          {items.map((_, n) => (
            <button key={n} type="button" role="tab" aria-selected={n === i} aria-label={`Testimonio ${n + 1}`} onClick={() => setI(n)} className="flex h-6 w-6 items-center justify-center">
              <i className={`block h-[9px] w-[9px] rotate-45 border border-gold transition-colors duration-300 ${n === i ? "bg-gold" : ""}`} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

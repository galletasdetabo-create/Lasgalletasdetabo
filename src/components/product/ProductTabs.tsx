"use client";
import { useState, type ReactNode } from "react";

/** Pestañas de la referencia: títulos pequeños en mayúsculas con subrayado dorado en la activa. */
export function ProductTabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div>
      <div role="tablist" aria-label="Información del producto" className="flex flex-wrap gap-x-10 border-b border-line">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={t.id === active} aria-controls={`panel-${t.id}`} onClick={() => setActive(t.id)} className={`relative pb-4 font-sans text-[12px] font-semibold uppercase tracking-[0.19em] transition-colors ${t.id === active ? "text-ink" : "text-ink-muted hover:text-ink"}`}>
            {t.label}
            <span className={`absolute inset-x-0 -bottom-px h-px bg-gold transition-transform duration-300 ${t.id === active ? "scale-x-100" : "scale-x-0"}`} />
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={t.id !== active} className="pt-8">
          {t.content}
        </div>
      ))}
    </div>
  );
}

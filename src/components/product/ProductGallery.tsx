"use client";
import Image from "next/image";
import { useState } from "react";
import type { ImageRef } from "@/lib/types";

/** Galería de la referencia: miniaturas verticales a la izquierda y fotografía principal; en móvil, miniaturas en dos columnas bajo la imagen. */
export function ProductGallery({ images, name }: { images: ImageRef[]; name: string }) {
  const [active, setActive] = useState(0);

  if (!images.length) {
    return <div className="aspect-[5/4] bg-gradient-to-br from-cream to-blush/60" aria-hidden="true" />;
  }
  const cur = images[active] ?? images[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[84px_1fr]">
      <div className="order-2 grid grid-cols-2 gap-4 lg:order-1 lg:flex lg:flex-col" role="tablist" aria-label="Miniaturas">
        {images.map((im, i) => (
          <button
            key={im.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={`Ver imagen ${i + 1} de ${images.length}`}
            onClick={() => setActive(i)}
            className={`relative aspect-[5/4] overflow-hidden bg-surface-soft transition-opacity duration-300 lg:aspect-square ${i === active ? "opacity-100 ring-1 ring-gold" : "opacity-75 hover:opacity-100"}`}
          >
            <Image src={im.url} alt="" fill sizes="(min-width:1024px) 84px, 45vw" className="object-cover" quality={60} />
          </button>
        ))}
      </div>
      <div className="order-1 lg:order-2">
        <div className="relative aspect-[5/4] overflow-hidden bg-surface-soft">
          <Image
            key={cur.id}
            src={cur.url}
            alt={cur.alt || `${name} — imagen ${active + 1}`}
            fill
            sizes="(min-width:1024px) 640px, 100vw"
            preload={active === 0}
            loading={active === 0 ? "eager" : "lazy"}
            placeholder={cur.blur ? "blur" : "empty"}
            blurDataURL={cur.blur ?? undefined}
            className="anim-fade-up object-cover"
            style={{ ["--d" as string]: 0 }}
          />
        </div>
        {images.some((i) => i.isStock) ? (
          <p className="it mt-3 !text-[16px] text-ink-muted">Fotografías de referencia. El producto final se elabora según tu pedido.</p>
        ) : null}
      </div>
    </div>
  );
}

"use client";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { cart, cartSubtotal, useCart } from "@/lib/cart/store";
import { formatCOP } from "@/lib/format";

const ease = [0.165, 0.84, 0.44, 1] as const;

export default function CartDrawer() {
  const { items, open } = useCart();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    document.documentElement.style.overflow = "hidden";
    const t = setTimeout(() => panel.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cart.close();
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>("a,button,input,[tabindex]:not([tabindex='-1'])");
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open]);

  const subtotal = cartSubtotal(items);

  return (
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-[60]" key="cart">
            <m.div
              className="absolute inset-0 bg-chocolate/25 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease }}
              onClick={() => cart.close()}
            />
            <m.div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label="Carrito de compras"
              tabIndex={-1}
              className="marble-soft absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col shadow-[-30px_0_80px_-40px_rgba(106,68,55,0.5)] outline-none"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.6, ease: [0.77, 0, 0.175, 1] }}
            >
              <div className="flex items-center justify-between border-b border-line px-6 py-5">
                <div>
                  <p className="eyebrow text-[1.4rem]">Tu pedido</p>
                  <h2 className="font-serif text-2xl">Carrito</h2>
                </div>
                <button type="button" onClick={() => cart.close()} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-cream" aria-label="Cerrar carrito">
                  <Icon name="close" />
                </button>
              </div>

              {items.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream text-rose-deep"><Icon name="bag" size={26} /></span>
                  <p className="font-serif text-xl">Tu carrito está vacío</p>
                  <p className="text-sm text-ink-muted">Explora nuestras galletas y alfajores hechos por encargo.</p>
                  <Link href="/tienda" className="btn mt-2" onClick={() => cart.close()}>Ir a la tienda</Link>
                </div>
              ) : (
                <>
                  <ul className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
                    {items.map((it, i) => (
                      <m.li
                        key={it.id}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 30 }}
                        transition={{ duration: 0.5, ease, delay: 0.15 + i * 0.05 }}
                        className="flex gap-4"
                      >
                        <Link href={`/producto/${it.slug}`} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-mist" onClick={() => cart.close()}>
                          {it.image ? <Image src={it.image} alt={it.name} fill sizes="80px" className="object-cover" /> : null}
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <Link href={`/producto/${it.slug}`} onClick={() => cart.close()} className="font-serif text-[1.05rem] leading-snug hover:text-rose-deep">{it.name}</Link>
                            <button type="button" onClick={() => cart.remove(it.id)} className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-cream hover:text-rose-deep" aria-label={`Eliminar ${it.name}`}>
                              <Icon name="trash" size={16} />
                            </button>
                          </div>
                          {it.variantName ? <p className="text-xs text-ink-muted">{it.variantName}</p> : null}
                          {it.details.length ? <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{it.details.map((d) => d.value).join(" · ")}</p> : null}
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <QuantityStepper
                              size="sm"
                              value={it.quantity}
                              min={it.minQuantity}
                              max={it.maxQuantity}
                              step={it.quantityStep}
                              label={it.name}
                              onChange={(q) => cart.setQuantity(it.id, q)}
                            />
                            <span className="text-sm font-semibold">{formatCOP(it.unitPrice * it.quantity)}</span>
                          </div>
                        </div>
                      </m.li>
                    ))}
                  </ul>
                  <div className="border-t border-line bg-white/80 px-6 py-5 backdrop-blur">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-soft">Subtotal estimado</span>
                      <span className="text-lg font-semibold">{formatCOP(subtotal)}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">El total final, la entrega y los descuentos se calculan al confirmar.</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Link href="/carrito" className="btn btn-outline" onClick={() => cart.close()}>Ver carrito</Link>
                      <Link href="/checkout" className="btn" onClick={() => cart.close()}>Pagar</Link>
                    </div>
                  </div>
                </>
              )}
            </m.div>
          </div>
        ) : null}
      </AnimatePresence>
    </LazyMotion>
  );
}

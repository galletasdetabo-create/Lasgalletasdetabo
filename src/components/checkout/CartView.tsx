"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { cart, useCart } from "@/lib/cart/store";
import { formatCOP } from "@/lib/format";
import { useQuote } from "./useQuote";

export function CartView() {
  const { items, coupon } = useCart();
  const [code, setCode] = useState(coupon);
  const { quote, loading } = useQuote(items, coupon, null);

  if (!items.length) {
    return (
      <div className="mx-auto max-w-lg rounded-[28px] bg-white/85 p-12 text-center ring-1 ring-line">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cream text-rose-deep"><Icon name="bag" size={26} /></span>
        <h2 className="mt-5 text-2xl">Tu carrito está vacío</h2>
        <p className="mt-2 text-ink-soft">Descubre nuestras galletas personalizadas y alfajores artesanales.</p>
        <Link href="/tienda" className="btn mt-7">Ir a la tienda</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div>
        <ul className="divide-y divide-line rounded-[26px] bg-white/85 px-5 ring-1 ring-line sm:px-8">
          {items.map((it, idx) => {
            const line = quote?.lines[idx];
            return (
              <li key={it.id} className="flex gap-4 py-6 sm:gap-6">
                <Link href={`/producto/${it.slug}`} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-mist sm:h-32 sm:w-28">
                  {it.image ? <Image src={it.image} alt={it.name} fill sizes="112px" className="object-cover" /> : null}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/producto/${it.slug}`} className="font-serif text-lg hover:text-rose-deep">{it.name}</Link>
                      {it.variantName ? <p className="text-sm text-ink-muted">{it.variantName}</p> : null}
                    </div>
                    <button type="button" onClick={() => cart.remove(it.id)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-cream hover:text-rose-deep" aria-label={`Eliminar ${it.name} del carrito`}>
                      <Icon name="trash" size={17} />
                    </button>
                  </div>
                  {it.details.length ? (
                    <dl className="mt-2 grid gap-x-3 gap-y-0.5 text-xs text-ink-soft sm:grid-cols-[auto_1fr]">
                      {it.details.map((d) => (
                        <div key={d.key} className="contents"><dt className="text-ink-muted">{d.label}:</dt><dd className="break-words">{d.value}</dd></div>
                      ))}
                    </dl>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <QuantityStepper size="sm" value={it.quantity} min={it.minQuantity} max={it.maxQuantity} step={it.quantityStep} label={it.name} onChange={(q) => cart.setQuantity(it.id, q)} />
                    <p className="text-sm">
                      <span className="text-ink-muted">{formatCOP(it.unitPrice)} × {it.quantity} = </span>
                      <span className="font-semibold">{formatCOP(it.unitPrice * it.quantity)}</span>
                    </p>
                  </div>
                  {line?.error ? <p className="field-error" role="alert">{line.error}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
        <Link href="/tienda" className="link-underline mt-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-rose-deep"><Icon name="arrowLeft" size={16} /> Seguir comprando</Link>
      </div>

      <aside className="h-fit rounded-[26px] bg-white/90 p-7 ring-1 ring-line lg:sticky lg:top-[calc(var(--header-h)+20px)]" aria-labelledby="resumen">
        <h2 id="resumen" className="text-2xl">Resumen</h2>
        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            cart.setCoupon(code);
          }}
        >
          <label htmlFor="cupon" className="sr-only">Código de cupón</label>
          <input id="cupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Código de cupón" className="field !min-h-11 uppercase" maxLength={32} />
          <button type="submit" className="btn btn-outline !min-h-11 !px-5">Aplicar</button>
        </form>
        {quote?.couponError ? <p className="field-error" role="alert">{quote.couponError}</p> : null}
        {quote?.couponApplied ? <p className="mt-2 flex items-center gap-1 text-xs text-emerald-700"><Icon name="check" size={14} /> Cupón {quote.couponApplied} aplicado <button type="button" className="ml-2 underline" onClick={() => { setCode(""); cart.setCoupon(""); }}>Quitar</button></p> : null}
        <dl className="mt-6 space-y-3 text-sm" aria-busy={loading}>
          <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd className="font-medium">{quote ? formatCOP(quote.subtotal) : "…"}</dd></div>
          {quote?.discount ? <div className="flex justify-between text-emerald-700"><dt>Descuento</dt><dd>− {formatCOP(quote.discount)}</dd></div> : null}
          <div className="flex justify-between"><dt className="text-ink-soft">Entrega</dt><dd className="text-ink-muted">Se calcula en el checkout</dd></div>
          <div className="flex justify-between border-t border-line pt-4 text-base"><dt className="font-semibold">Total estimado</dt><dd className="text-xl font-semibold">{quote ? formatCOP(quote.subtotal - quote.discount) : "…"}</dd></div>
        </dl>
        <Link href="/checkout" className={`btn mt-7 w-full ${quote?.hasErrors ? "pointer-events-none opacity-50" : ""}`} aria-disabled={quote?.hasErrors || undefined}>
          Finalizar compra <Icon name="arrowRight" size={16} />
        </Link>
        {quote?.hasErrors ? <p className="mt-3 text-xs text-rose-deep">Corrige los productos marcados para continuar.</p> : null}
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-muted"><Icon name="lock" size={14} /> Precios verificados por la tienda</p>
      </aside>
    </div>
  );
}

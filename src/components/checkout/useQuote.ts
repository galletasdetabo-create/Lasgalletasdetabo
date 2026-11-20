"use client";
import { useEffect, useMemo, useState } from "react";
import { quoteAction } from "@/app/(site)/checkout/actions";
import type { Quote } from "@/lib/checkout/quote";
import { cart, type CartItem } from "@/lib/cart/store";

export function toInputItems(items: CartItem[]) {
  return items.map((i) => ({
    product_id: i.productId,
    variant_id: i.variantId,
    quantity: i.quantity,
    customization: i.customization,
    reference_image_path: i.referenceImagePath,
  }));
}

/** Pide al servidor la cotización real (precios, errores, cupón, entrega). */
export function useQuote(items: CartItem[], coupon: string, deliveryMethodId: string | null) {
  const key = useMemo(() => JSON.stringify([toInputItems(items), coupon, deliveryMethodId]), [items, coupon, deliveryMethodId]);
  // Última respuesta del servidor junto con la clave del carrito que la produjo.
  const [result, setResult] = useState<{ key: string; quote: Quote | null; error: string | null } | null>(null);

  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      const res = await quoteAction({ items: toInputItems(items), coupon, deliveryMethodId });
      if (cancelled) return;
      if (!res.ok) return setResult((r) => ({ key, quote: r?.quote ?? null, error: res.error }));
      setResult({ key, quote: res.quote, error: null });
      // Sincroniza los precios mostrados con los del servidor.
      const updates = res.quote.lines
        .map((l) => ({ id: items[l.index]?.id, unitPrice: l.unitPrice, name: items[l.index]?.name ?? l.name }))
        .filter((u) => u.id && items.find((i) => i.id === u.id)?.unitPrice !== u.unitPrice) as { id: string; unitPrice: number; name: string }[];
      if (updates.length) cart.sync(updates);
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!items.length) return { quote: null, loading: false, error: null };
  return { quote: result?.quote ?? null, loading: result?.key !== key, error: result?.error ?? null };
}

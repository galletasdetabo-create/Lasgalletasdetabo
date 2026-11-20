"use client";
import { useSyncExternalStore } from "react";

export interface CartDetail {
  key: string;
  label: string;
  value: string;
}

export interface CartItem {
  id: string; // clave única de la línea
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  variantId: string | null;
  variantName: string | null;
  unitPrice: number; // solo para mostrar: el servidor recalcula siempre
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  quantityStep: number;
  quantityLabel: string;
  customization: Record<string, string>;
  details: CartDetail[];
  referenceImagePath: string | null;
  referenceImageName: string | null;
  neededBy: string | null; // fecha requerida (YYYY-MM-DD) si el producto la pide
}

interface CartState {
  items: CartItem[];
  coupon: string;
  open: boolean;
  /** Se vuelve true la primera vez que se abre el mini-carrito (para cargarlo de forma diferida). */
  everOpened: boolean;
}

const KEY = "lgt-cart-v1";
const EMPTY: CartState = { items: [], coupon: "", open: false, everOpened: false };
let state: CartState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function load() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.items)) state = { items: parsed.items, coupon: parsed.coupon ?? "", open: false, everOpened: false };
    }
  } catch {
    // almacenamiento no disponible (modo privado): el carrito funciona en memoria
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    try {
      const parsed = e.newValue ? JSON.parse(e.newValue) : EMPTY;
      state = { ...state, items: parsed.items ?? [], coupon: parsed.coupon ?? "" };
      emit();
    } catch {}
  });
}

function emit() {
  listeners.forEach((l) => l());
}

function set(next: Partial<CartState>, persist = true) {
  state = { ...state, ...next };
  if (persist) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ items: state.items, coupon: state.coupon }));
    } catch {}
  }
  emit();
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
}

const getSnapshot = () => {
  load();
  return state;
};
const getServerSnapshot = () => EMPTY;

export function useCart() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function lineId(productId: string, variantId: string | null, customization: Record<string, string>, ref: string | null) {
  const raw = JSON.stringify([productId, variantId, Object.entries(customization).sort(), ref]);
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  return `${productId.slice(0, 8)}-${(h >>> 0).toString(36)}`;
}

export const cart = {
  add(item: Omit<CartItem, "id">) {
    const id = lineId(item.productId, item.variantId, item.customization, item.referenceImagePath);
    const existing = state.items.find((i) => i.id === id);
    const items = existing
      ? state.items.map((i) => (i.id === id ? { ...i, quantity: Math.min(i.maxQuantity, i.quantity + item.quantity) } : i))
      : [...state.items, { ...item, id }];
    set({ items, open: true, everOpened: true });
  },
  setQuantity(id: string, quantity: number) {
    set({
      items: state.items.map((i) => {
        if (i.id !== id) return i;
        const q = Math.max(i.minQuantity, Math.min(i.maxQuantity, Math.round(quantity)));
        const stepped = i.minQuantity + Math.round((q - i.minQuantity) / i.quantityStep) * i.quantityStep;
        return { ...i, quantity: Math.min(i.maxQuantity, stepped) };
      }),
    });
  },
  remove(id: string) {
    set({ items: state.items.filter((i) => i.id !== id) });
  },
  clear() {
    set({ items: [], coupon: "" });
  },
  setCoupon(coupon: string) {
    set({ coupon: coupon.trim().toUpperCase() });
  },
  open() {
    set({ open: true, everOpened: true }, false);
  },
  close() {
    set({ open: false }, false);
  },
  /** Reemplaza precios/nombres con los datos autoritativos del servidor. */
  sync(updates: { id: string; unitPrice: number; name: string }[]) {
    const map = new Map(updates.map((u) => [u.id, u]));
    set({ items: state.items.map((i) => (map.has(i.id) ? { ...i, unitPrice: map.get(i.id)!.unitPrice, name: map.get(i.id)!.name } : i)) });
  },
};

export function cartCount(items: CartItem[]) {
  return items.length;
}
export function cartSubtotal(items: CartItem[]) {
  return items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
}

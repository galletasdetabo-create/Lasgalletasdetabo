"use client";
import { useRef } from "react";

const SORTS = [
  { value: "destacados", label: "Orden predeterminado" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
  { value: "nombre", label: "Nombre (A–Z)" },
  { value: "recientes", label: "Más recientes" },
];

/** Selector de orden que aplica el cambio al instante (conserva la búsqueda y los filtros). */
export function SortSelect({ action, current, hidden }: { action: string; current: string; hidden: Record<string, string> }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={action} method="get">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label htmlFor="orden" className="sr-only">Ordenar por</label>
      <select id="orden" name="orden" defaultValue={current} onChange={() => form.current?.requestSubmit()} className="field sm:w-[250px]">
        {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <noscript><button type="submit" className="btn btn-outline mt-2">Aplicar</button></noscript>
    </form>
  );
}

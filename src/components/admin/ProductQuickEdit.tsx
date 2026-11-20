"use client";
import { useState, useTransition } from "react";
import { quickUpdateProductAction } from "@/app/admin/(panel)/productos/actions";
import type { StockStatus } from "@/lib/types";

export function ProductQuickEdit({ id, isActive, stockStatus, stockQuantity, track }: { id: string; isActive: boolean; stockStatus: StockStatus; stockQuantity: number | null; track: boolean }) {
  const [active, setActive] = useState(isActive);
  const [status, setStatus] = useState(stockStatus);
  const [qty, setQty] = useState(stockQuantity?.toString() ?? "");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const save = (patch: Record<string, unknown>) =>
    start(async () => {
      const r = await quickUpdateProductAction({ id, ...patch });
      setMsg(r.ok ? "Guardado" : r.error ?? "Error");
      setTimeout(() => setMsg(""), 1800);
    });
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select aria-label="Disponibilidad" className="field !min-h-9 !w-40 !py-1 text-sm" value={status} disabled={pending} onChange={(e) => { setStatus(e.target.value as StockStatus); save({ stock_status: e.target.value }); }}>
        <option value="disponible">Disponible</option>
        <option value="bajo_pedido">Bajo pedido</option>
        <option value="agotado">Agotado</option>
      </select>
      {track ? (
        <input aria-label="Inventario" type="number" min={0} className="field !min-h-9 !w-24 !py-1 text-sm" value={qty} onChange={(e) => setQty(e.target.value)} onBlur={() => save({ stock_quantity: qty === "" ? null : Number(qty) })} />
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} disabled={pending} onChange={(e) => { setActive(e.target.checked); save({ is_active: e.target.checked }); }} className="h-4 w-4 accent-[var(--brand-chocolate)]" />
        Visible
      </label>
      {msg ? <span className="text-xs text-emerald-700" role="status">{msg}</span> : null}
    </div>
  );
}

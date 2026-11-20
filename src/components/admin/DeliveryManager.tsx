"use client";
import { RecordManager } from "./RecordManager";
import { SampleBadge } from "./ui";
import { deleteDeliveryAction, saveDeliveryAction } from "@/app/admin/(panel)/comercio-actions";
import { formatCOP } from "@/lib/format";
import type { DeliveryMethod } from "@/lib/types";

const empty = { name: "", description: "", price: 0, price_note: "", requires_address: true, is_active: true, is_sample: false, sort: 0 } as DeliveryMethod;

export function DeliveryManager({ records }: { records: DeliveryMethod[] }) {
  return (
    <RecordManager
      records={records}
      empty={{ ...empty, sort: records.length }}
      newLabel="Nuevo método de entrega"
      title={(r) => <span className="flex items-center gap-2">{r.name} {r.is_sample ? <SampleBadge /> : null}</span>}
      summary={(r) => `${r.price ? formatCOP(r.price) : r.price_note || "Sin costo"} · ${r.requires_address ? "Requiere dirección" : "Sin dirección"} · ${r.is_active ? "Activo" : "Inactivo"}`}
      onSave={(v) => saveDeliveryAction(v)}
      onDelete={(id) => deleteDeliveryAction(id)}
      form={(v, set) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="field-label">Nombre</span><input className="field" value={v.name} onChange={(e) => set({ name: e.target.value })} /></label>
          <label><span className="field-label">Tarifa (COP)</span><input type="number" min={0} className="field" value={v.price} onChange={(e) => set({ price: Math.round(Number(e.target.value) || 0) })} /></label>
          <label className="sm:col-span-2"><span className="field-label">Descripción</span><textarea className="field" rows={2} value={v.description} onChange={(e) => set({ description: e.target.value })} /></label>
          <label><span className="field-label">Texto cuando la tarifa es 0</span><input className="field" value={v.price_note} onChange={(e) => set({ price_note: e.target.value })} placeholder="Ej. Tarifa por confirmar" /></label>
          <label><span className="field-label">Orden</span><input type="number" className="field" value={v.sort} onChange={(e) => set({ sort: Number(e.target.value) || 0 })} /></label>
          <div className="flex flex-wrap gap-5 text-sm sm:col-span-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={v.requires_address} onChange={(e) => set({ requires_address: e.target.checked })} className="accent-[var(--brand-chocolate)]" /> Requiere dirección</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={v.is_active} onChange={(e) => set({ is_active: e.target.checked })} className="accent-[var(--brand-chocolate)]" /> Activo</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={v.is_sample} onChange={(e) => set({ is_sample: e.target.checked })} className="accent-[var(--brand-chocolate)]" /> Dato de prueba</label>
          </div>
        </div>
      )}
    />
  );
}

"use client";
import { RecordManager } from "./RecordManager";
import { Badge } from "./ui";
import { deleteCouponAction, saveCouponAction } from "@/app/admin/(panel)/comercio-actions";
import { formatCOP } from "@/lib/format";

export interface CouponRow {
  id?: string;
  code: string;
  description: string;
  discount_type: "percent" | "fixed";
  value: number;
  min_subtotal: number;
  max_uses: number | null;
  used_count?: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

const empty: CouponRow = { code: "", description: "", discount_type: "percent", value: 10, min_subtotal: 0, max_uses: null, starts_at: null, ends_at: null, is_active: true };

export function CouponManager({ records }: { records: CouponRow[] }) {
  return (
    <RecordManager
      records={records}
      empty={empty}
      newLabel="Nuevo cupón"
      title={(r) => <span className="flex items-center gap-2 font-mono">{r.code} {!r.is_active ? <Badge>Inactivo</Badge> : null}</span>}
      summary={(r) => `${r.discount_type === "percent" ? `${r.value} %` : formatCOP(r.value)} · usado ${r.used_count ?? 0}${r.max_uses ? `/${r.max_uses}` : ""} · mínimo ${formatCOP(r.min_subtotal)}${r.ends_at ? ` · vence ${r.ends_at}` : ""}`}
      onSave={(v) => saveCouponAction({ id: v.id, code: v.code, description: v.description, discount_type: v.discount_type, value: v.value, min_subtotal: v.min_subtotal, max_uses: v.max_uses, starts_at: v.starts_at, ends_at: v.ends_at, is_active: v.is_active })}
      onDelete={(id) => deleteCouponAction(id)}
      form={(v, set) => (
        <div className="grid gap-4 sm:grid-cols-3">
          <label><span className="field-label">Código</span><input className="field font-mono uppercase" value={v.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} /></label>
          <label><span className="field-label">Tipo</span><select className="field" value={v.discount_type} onChange={(e) => set({ discount_type: e.target.value as CouponRow["discount_type"] })}><option value="percent">Porcentaje</option><option value="fixed">Valor fijo (COP)</option></select></label>
          <label><span className="field-label">Valor</span><input type="number" min={1} className="field" value={v.value} onChange={(e) => set({ value: Math.round(Number(e.target.value) || 0) })} /></label>
          <label className="sm:col-span-3"><span className="field-label">Descripción interna</span><input className="field" value={v.description} onChange={(e) => set({ description: e.target.value })} /></label>
          <label><span className="field-label">Compra mínima (COP)</span><input type="number" min={0} className="field" value={v.min_subtotal} onChange={(e) => set({ min_subtotal: Math.round(Number(e.target.value) || 0) })} /></label>
          <label><span className="field-label">Usos máximos</span><input type="number" min={1} className="field" value={v.max_uses ?? ""} onChange={(e) => set({ max_uses: e.target.value ? Number(e.target.value) : null })} placeholder="Ilimitado" /></label>
          <label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" checked={v.is_active} onChange={(e) => set({ is_active: e.target.checked })} className="accent-[var(--brand-chocolate)]" /> Activo</label>
          <label><span className="field-label">Desde</span><input type="date" className="field" value={v.starts_at ?? ""} onChange={(e) => set({ starts_at: e.target.value || null })} /></label>
          <label><span className="field-label">Hasta</span><input type="date" className="field" value={v.ends_at ?? ""} onChange={(e) => set({ ends_at: e.target.value || null })} /></label>
        </div>
      )}
    />
  );
}

"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCategoryAction, saveCategoryAction } from "@/app/admin/(panel)/categorias/actions";
import { MediaField } from "./MediaPicker";
import { Badge, Card, adminBtn, adminBtnOutline } from "./ui";
import type { Category } from "@/lib/types";

const empty = { name: "", slug: "", description: "", image_id: null as string | null, sort: 0, is_active: true, seo_title: "", seo_description: "" };

export function CategoryManager({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  return (
    <div className="space-y-3">
      {categories.map((c) => (
        <div key={c.id} className="rounded-2xl bg-white ring-1 ring-line">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{c.name} <span className="font-normal text-ink-muted">/tienda/{c.slug}</span></p>
              <p className="text-xs text-ink-muted">{counts[c.id] ?? 0} productos · orden {c.sort}</p>
            </div>
            <div className="flex items-center gap-2">
              {!c.is_active ? <Badge>Oculta</Badge> : null}
              <button type="button" className={adminBtnOutline} onClick={() => setEditing(editing === c.id ? null : c.id)}>{editing === c.id ? "Cerrar" : "Editar"}</button>
            </div>
          </div>
          {editing === c.id ? <div className="border-t border-line p-4"><CategoryForm initial={{ ...empty, ...c, seo_title: c.seo_title ?? "", seo_description: c.seo_description ?? "" }} id={c.id} onDone={() => setEditing(null)} /></div> : null}
        </div>
      ))}
      {editing === "new" ? (
        <Card title="Nueva categoría"><CategoryForm initial={{ ...empty, sort: categories.length }} onDone={() => setEditing(null)} /></Card>
      ) : (
        <button type="button" className={adminBtn} onClick={() => setEditing("new")}>Nueva categoría</button>
      )}
    </div>
  );
}

function CategoryForm({ initial, id, onDone }: { initial: typeof empty; id?: string; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label><span className="field-label">Nombre</span><input className="field" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></label>
      <label><span className="field-label">URL (slug)</span><input className="field" value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} placeholder="se genera del nombre" /></label>
      <label className="sm:col-span-2"><span className="field-label">Descripción</span><textarea className="field" rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></label>
      <MediaField label="Imagen" value={v.image_id} onChange={(image_id) => setV({ ...v, image_id })} folder="categorias" />
      <div className="grid gap-3">
        <label><span className="field-label">Orden</span><input type="number" className="field" value={v.sort} onChange={(e) => setV({ ...v, sort: Number(e.target.value) || 0 })} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.is_active} onChange={(e) => setV({ ...v, is_active: e.target.checked })} className="accent-[var(--brand-chocolate)]" /> Visible</label>
      </div>
      <label><span className="field-label">Título SEO</span><input className="field" maxLength={70} value={v.seo_title} onChange={(e) => setV({ ...v, seo_title: e.target.value })} /></label>
      <label><span className="field-label">Descripción SEO</span><input className="field" maxLength={170} value={v.seo_description} onChange={(e) => setV({ ...v, seo_description: e.target.value })} /></label>
      {err ? <p className="text-sm text-rose-700 sm:col-span-2" role="alert">{err}</p> : null}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="button" className={adminBtn} disabled={pending} onClick={() => start(async () => {
          const r = await saveCategoryAction({ id, ...v, seo_title: v.seo_title || null, seo_description: v.seo_description || null });
          if (!r.ok) return setErr(r.error ?? "Error");
          onDone();
          router.refresh();
        })}>Guardar</button>
        {id ? <button type="button" className="text-sm text-rose-700 underline" disabled={pending} onClick={() => start(async () => {
          const r = await deleteCategoryAction(id);
          if (!r.ok) return setErr(r.error ?? "Error");
          router.refresh();
        })}>Eliminar</button> : null}
      </div>
    </div>
  );
}

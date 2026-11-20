"use client";
import Image from "next/image";
import { useMemo, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { deleteMediaAction, mediaUsageAction, replaceMediaAction, updateMediaAction, uploadMediaAction, type MediaItem } from "@/app/admin/(panel)/medios/actions";
import { useMediaList } from "./MediaPicker";
import { Badge, StockPhotoBadge, adminBtn, adminBtnDanger, adminBtnOutline } from "./ui";

const kb = (n: number | null) => (n ? (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`) : "—");

export function MediaLibrary({ initialFolder }: { initialFolder: string }) {
  const { items, reload } = useMediaList();
  const [folder, setFolder] = useState(initialFolder === "stock" ? "" : initialFolder);
  const [onlyStock, setOnlyStock] = useState(initialFolder === "stock");
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [uploadFolder, setUploadFolder] = useState("general");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const folders = useMemo(() => [...new Set((items ?? []).map((m) => m.folder))].sort(), [items]);
  const list = (items ?? []).filter((m) => (!folder || m.folder === folder) && (!onlyStock || m.is_stock));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setFolder("")} className={`rounded-full px-4 py-2 text-sm ${!folder ? "bg-chocolate text-white" : "bg-white ring-1 ring-line"}`}>Todas ({items?.length ?? 0})</button>
          {folders.map((f) => (
            <button key={f} type="button" onClick={() => setFolder(f)} className={`rounded-full px-4 py-2 text-sm ${folder === f ? "bg-chocolate text-white" : "bg-white ring-1 ring-line"}`}>{f}</button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyStock} onChange={(e) => setOnlyStock(e.target.checked)} className="accent-[var(--brand-chocolate)]" /> Solo fotos de stock</label>
        </div>
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
          <label htmlFor="up-folder" className="text-sm font-medium">Subir a la carpeta</label>
          <input id="up-folder" list="folders" className="field !min-h-10 w-44" value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)} />
          <datalist id="folders">{folders.map((f) => <option key={f} value={f} />)}</datalist>
          <button type="button" className={adminBtn} disabled={pending} onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} /> {pending ? "Procesando…" : "Subir imágenes"}</button>
          <p className="w-full text-xs text-ink-muted">JPG, PNG, WebP o AVIF hasta 10 MB. Se optimizan automáticamente (WebP, máx. 2400 px) y se eliminan los metadatos.</p>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={(e) => {
              const files = e.target.files;
              if (!files?.length) return;
              const fd = new FormData();
              [...files].forEach((f) => fd.append("files", f));
              fd.append("folder", uploadFolder);
              start(async () => {
                const r = await uploadMediaAction(fd);
                setMsg(r.ok ? { ok: true, text: `${r.ids?.length} imagen(es) subida(s).` } : { ok: false, text: r.error ?? "Error" });
                await reload();
              });
              e.target.value = "";
            }}
          />
        </div>
        {msg ? <p className={`mb-4 text-sm ${msg.ok ? "text-emerald-700" : "text-rose-700"}`} role="status">{msg.text}</p> : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {items === null ? <p className="text-sm text-ink-muted">Cargando…</p> : null}
          {list.map((m) => (
            <button key={m.id} type="button" onClick={() => setSelected(m)} className={`group overflow-hidden rounded-2xl bg-white text-left ring-1 transition-shadow ${selected?.id === m.id ? "ring-2 ring-rose-deep" : "ring-line hover:shadow-md"}`}>
              <div className="relative aspect-square bg-mist"><Image src={m.url} alt={m.alt} fill sizes="220px" className="object-cover" quality={60} /></div>
              <div className="p-2.5 text-xs">
                <p className="truncate font-medium">{m.alt || "Sin texto alternativo"}</p>
                <p className="mt-0.5 text-ink-muted">{m.width}×{m.height} · {kb(m.size_bytes)}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {m.uses ? <Badge tone="bg-emerald-50 text-emerald-800 ring-emerald-200">En uso ({m.uses})</Badge> : <Badge>Sin uso</Badge>}
                  {m.is_stock ? <StockPhotoBadge /> : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <aside className="xl:sticky xl:top-6 xl:self-start">
        {selected ? <MediaDetail key={selected.id} m={selected} onDone={async (text, ok = true) => { setMsg({ ok, text }); await reload(); if (ok && text.includes("eliminada")) setSelected(null); }} /> : <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-ink-muted">Selecciona una imagen para ver sus detalles.</div>}
      </aside>
    </div>
  );
}

function MediaDetail({ m, onDone }: { m: MediaItem; onDone: (text: string, ok?: boolean) => void }) {
  const [v, setV] = useState({ alt: m.alt, folder: m.folder, is_stock: m.is_stock, source_name: m.source_name ?? "", source_url: m.source_url ?? "", author: m.author ?? "", license: m.license ?? "" });
  const [usage, setUsage] = useState<{ kind: string; label: string }[] | null>(null);
  const [pending, start] = useTransition();
  const replaceRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-line">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-mist"><Image src={m.url} alt={m.alt} fill sizes="360px" className="object-contain" /></div>
      <p className="mt-3 break-all text-xs text-ink-muted">{m.path} · {m.mime} · {m.width}×{m.height} · {kb(m.size_bytes)}</p>
      <div className="mt-4 space-y-3">
        <div><label className="field-label" htmlFor="m-alt">Texto alternativo (accesibilidad y SEO)</label><input id="m-alt" className="field" value={v.alt} onChange={(e) => setV({ ...v, alt: e.target.value })} /></div>
        <div><label className="field-label" htmlFor="m-folder">Carpeta</label><input id="m-folder" className="field" value={v.folder} onChange={(e) => setV({ ...v, folder: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.is_stock} onChange={(e) => setV({ ...v, is_stock: e.target.checked })} className="accent-[var(--brand-chocolate)]" /> Es una fotografía de stock (provisional)</label>
        {v.is_stock ? (
          <div className="space-y-3 rounded-xl bg-cream/50 p-3">
            <input className="field" placeholder="Fuente (ej. StockSnap.io)" value={v.source_name} onChange={(e) => setV({ ...v, source_name: e.target.value })} aria-label="Fuente" />
            <input className="field" placeholder="URL de la fuente" value={v.source_url} onChange={(e) => setV({ ...v, source_url: e.target.value })} aria-label="URL de la fuente" />
            <input className="field" placeholder="Autor" value={v.author} onChange={(e) => setV({ ...v, author: e.target.value })} aria-label="Autor" />
            <input className="field" placeholder="Licencia" value={v.license} onChange={(e) => setV({ ...v, license: e.target.value })} aria-label="Licencia" />
          </div>
        ) : null}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className={adminBtn} disabled={pending} onClick={() => start(async () => {
          const r = await updateMediaAction({ id: m.id, ...v, source_name: v.source_name || null, source_url: v.source_url || null, author: v.author || null, license: v.license || null });
          onDone(r.ok ? "Cambios guardados." : r.error ?? "Error", r.ok);
        })}>Guardar</button>
        <button type="button" className={adminBtnOutline} disabled={pending} onClick={() => replaceRef.current?.click()}>Sustituir archivo</button>
        <input ref={replaceRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const fd = new FormData();
          fd.append("id", m.id);
          fd.append("file", f);
          start(async () => { const r = await replaceMediaAction(fd); onDone(r.ok ? "Imagen sustituida en todo el sitio." : r.error ?? "Error", r.ok); });
        }} />
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <button type="button" className="text-sm text-rose-deep underline" onClick={() => start(async () => setUsage(await mediaUsageAction(m.id)))}>¿Dónde se usa?</button>
        {usage ? (usage.length ? <ul className="mt-2 list-disc pl-5 text-sm">{usage.map((u, i) => <li key={i}>{u.kind}: {u.label}</li>)}</ul> : <p className="mt-2 text-sm text-ink-muted">No se usa en ninguna parte.</p>) : null}
        <button type="button" className={`${adminBtnDanger} mt-4 w-full`} disabled={pending || m.uses > 0} onClick={() => start(async () => { const r = await deleteMediaAction(m.id); onDone(r.ok ? "Imagen eliminada." : r.error ?? "Error", r.ok); })}>
          {m.uses > 0 ? "En uso: no se puede eliminar" : "Eliminar imagen"}
        </button>
      </div>
    </div>
  );
}

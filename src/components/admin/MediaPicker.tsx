"use client";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { listMediaAction, uploadMediaAction, type MediaItem } from "@/app/admin/(panel)/medios/actions";
import { adminBtn, adminBtnOutline } from "./ui";

// Lista compartida por todos los selectores de la página (una sola carga).
let cache: MediaItem[] | null = null;
let loading: Promise<void> | null = null;
const subscribers = new Set<() => void>();

async function reloadMedia() {
  cache = await listMediaAction();
  subscribers.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  subscribers.add(fn);
  if (!cache && !loading) loading = reloadMedia().finally(() => (loading = null));
  return () => subscribers.delete(fn);
}

export function useMediaList() {
  const items = useSyncExternalStore(subscribe, () => cache, () => null);
  return { items, reload: reloadMedia };
}

type PickerProps = { open: boolean; onClose: () => void; onSelect: (ids: string[]) => void; multiple?: boolean; folder?: string };

/** Modal para elegir imagen(es) de la biblioteca o subir nuevas. Su estado se reinicia cada vez que se abre. */
export function MediaPickerModal(props: PickerProps) {
  return props.open ? <PickerDialog {...props} /> : null;
}

function PickerDialog({ onClose, onSelect, multiple = false, folder = "general" }: PickerProps) {
  const { items, reload } = useMediaList();
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => (items ?? []).filter((m) => !q || (m.alt + m.folder + m.path).toLowerCase().includes(q.toLowerCase())), [items, q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-chocolate/30 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Biblioteca de medios">
      <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <h2 className="font-serif text-xl">Elegir imagen</h2>
          <input className="field !min-h-10 flex-1" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar imágenes" />
          <button type="button" className={adminBtnOutline} onClick={() => fileRef.current?.click()} disabled={pending}><Icon name="upload" size={16} /> Subir</button>
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
              fd.append("folder", folder);
              setError(null);
              start(async () => {
                const r = await uploadMediaAction(fd);
                if (!r.ok) setError(r.error ?? "Error al subir");
                await reload();
                if (r.ids?.length) setSelected(multiple ? r.ids : [r.ids[0]]);
              });
              e.target.value = "";
            }}
          />
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-cream" aria-label="Cerrar"><Icon name="close" /></button>
        </div>
        {error ? <p className="bg-rose-50 px-4 py-2 text-sm text-rose-800">{error}</p> : null}
        <div className="grid flex-1 grid-cols-3 gap-3 overflow-y-auto p-4 sm:grid-cols-5">
          {items === null ? <p className="col-span-full text-sm text-ink-muted">Cargando…</p> : null}
          {filtered.map((m) => {
            const on = selected.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={on}
                onClick={() => setSelected((s) => (multiple ? (on ? s.filter((x) => x !== m.id) : [...s, m.id]) : [m.id]))}
                className={`group relative aspect-square overflow-hidden rounded-xl bg-mist ring-offset-2 ${on ? "ring-2 ring-rose-deep" : "hover:ring-1 hover:ring-line"}`}
                title={m.alt}
              >
                <Image src={m.url} alt={m.alt} fill sizes="160px" className="object-cover" quality={60} />
                {on ? <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-rose-deep text-white"><Icon name="check" size={14} /></span> : null}
                {m.is_stock ? <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[0.6rem] font-semibold text-sky-800">stock</span> : null}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line p-4">
          <p className="text-sm text-ink-muted">{selected.length ? `${selected.length} seleccionada(s)` : "Ninguna seleccionada"}</p>
          <button type="button" className={adminBtn} disabled={!selected.length} onClick={() => { onSelect(selected); onClose(); }}>Usar imagen{multiple ? "es" : ""}</button>
        </div>
      </div>
    </div>
  );
}

/** Campo de formulario para una sola imagen. */
export function MediaField({ value, onChange, label, folder }: { value: string | null; onChange: (id: string | null) => void; label: string; folder?: string }) {
  const { items } = useMediaList();
  const [open, setOpen] = useState(false);
  const m = items?.find((x) => x.id === value);
  return (
    <div>
      <p className="field-label">{label}</p>
      <div className="flex items-center gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-mist ring-1 ring-line">
          {m ? <Image src={m.url} alt={m.alt} fill sizes="80px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-ink-muted"><Icon name="image" /></span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={adminBtnOutline} onClick={() => setOpen(true)}>{value ? "Cambiar" : "Elegir"}</button>
          {value ? <button type="button" className="text-sm text-rose-700 underline" onClick={() => onChange(null)}>Quitar</button> : null}
        </div>
      </div>
      <MediaPickerModal open={open} onClose={() => setOpen(false)} onSelect={(ids) => onChange(ids[0] ?? null)} folder={folder} />
    </div>
  );
}

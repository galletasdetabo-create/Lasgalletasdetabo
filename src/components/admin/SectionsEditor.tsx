"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { addSectionAction, deleteSectionAction, discardDraftsAction, publishPageAction, reorderSectionsAction, saveSectionDraftAction } from "@/app/admin/(panel)/contenido/actions";
import { SECTION_BY_TYPE, SECTION_DEFS, type FieldDef } from "@/lib/cms/sections";
import { MediaField } from "./MediaPicker";
import { Badge, adminBtn, adminBtnOutline } from "./ui";

export interface EditableSection {
  id: string;
  type: string;
  label: string;
  variant: string;
  enabled: boolean;
  sort: number;
  content: Record<string, unknown>;
  hasDraft: boolean;
  published: boolean;
}

export function SectionsEditor({ page, publicPath, initial }: { page: string; publicPath: string; initial: EditableSection[] }) {
  const router = useRouter();
  const [sections, setSections] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const drafts = sections.some((s) => s.hasDraft);

  const move = (i: number, d: -1 | 1) => {
    const next = [...sections];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setSections(next.map((s) => ({ ...s, hasDraft: true })));
    start(async () => {
      await reorderSectionsAction(page, next.map((s) => s.id));
    });
  };

  return (
    <div>
      <div className="sticky top-14 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-2 border-b border-line bg-[#faf8f7]/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-4 lg:top-2">
        {drafts ? <Badge tone="bg-amber-50 text-amber-800 ring-amber-200">Cambios sin publicar</Badge> : <Badge tone="bg-emerald-50 text-emerald-800 ring-emerald-200">Todo publicado</Badge>}
        <div className="ml-auto flex flex-wrap gap-2">
          <a href={`/admin/vista-previa/${page}`} target="_blank" className={adminBtnOutline}><Icon name="eye" size={16} /> Vista previa</a>
          <a href={publicPath} target="_blank" className={adminBtnOutline}><Icon name="external" size={16} /> Ver publicada</a>
          {drafts ? <button type="button" className={adminBtnOutline} disabled={pending} onClick={() => start(async () => { await discardDraftsAction(page); router.refresh(); setMsg({ ok: true, text: "Borradores descartados." }); })}>Descartar</button> : null}
          <button type="button" className={adminBtn} disabled={pending || !drafts} onClick={() => start(async () => {
            const r = await publishPageAction(page);
            setMsg(r.ok ? { ok: true, text: `Publicado (${r.count} sección(es) actualizadas).` } : { ok: false, text: r.error ?? "Error" });
            router.refresh();
            setSections((s) => s.map((x) => ({ ...x, hasDraft: false, published: x.enabled })));
          })}>Publicar cambios</button>
        </div>
      </div>
      {msg ? <p className={`mb-4 rounded-xl p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`} role="status">{msg.text}</p> : null}

      <ol className="space-y-3">
        {sections.map((s, i) => {
          const def = SECTION_BY_TYPE[s.type];
          return (
            <li key={s.id} className="rounded-2xl bg-white ring-1 ring-line">
              <div className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex flex-col">
                  <button type="button" aria-label="Subir sección" className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-cream disabled:opacity-30" disabled={i === 0 || pending} onClick={() => move(i, -1)}><Icon name="arrowUp" size={15} /></button>
                  <button type="button" aria-label="Bajar sección" className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-cream disabled:opacity-30" disabled={i === sections.length - 1 || pending} onClick={() => move(i, 1)}><Icon name="arrowDown" size={15} /></button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.label || def?.label}</p>
                  <p className="text-xs text-ink-muted">{def?.label} · {def?.variants.find((v) => v.value === s.variant)?.label}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!s.enabled ? <Badge>Oculta</Badge> : null}
                  {s.hasDraft ? <Badge tone="bg-amber-50 text-amber-800 ring-amber-200">Borrador</Badge> : null}
                  <button type="button" className={adminBtnOutline} onClick={() => setOpen(open === s.id ? null : s.id)}>{open === s.id ? "Cerrar" : "Editar"}</button>
                </div>
              </div>
              {open === s.id && def ? (
                <SectionForm
                  section={s}
                  onSaved={(updated) => { setSections((all) => all.map((x) => (x.id === s.id ? { ...updated, hasDraft: true } : x))); setMsg({ ok: true, text: "Borrador guardado. Revisa la vista previa y publica." }); }}
                  onDeleted={() => { setSections((all) => all.filter((x) => x.id !== s.id)); setOpen(null); setMsg({ ok: true, text: "Sección eliminada." }); }}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-6">
        {adding ? (
          <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <p className="mb-3 font-semibold">Agregar sección</p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {SECTION_DEFS.map((d) => (
                <button key={d.type} type="button" disabled={pending} className="rounded-xl p-3 text-left ring-1 ring-line hover:bg-cream" onClick={() => start(async () => {
                  const r = await addSectionAction(page, d.type);
                  if (r.ok) { setAdding(false); router.refresh(); location.reload(); } else setMsg({ ok: false, text: r.error ?? "Error" });
                })}>
                  <p className="font-medium">{d.label}</p>
                  <p className="text-xs text-ink-muted">{d.description}</p>
                </button>
              ))}
            </div>
            <button type="button" className="mt-3 text-sm underline" onClick={() => setAdding(false)}>Cancelar</button>
          </div>
        ) : (
          <button type="button" className={adminBtnOutline} onClick={() => setAdding(true)}><Icon name="plus" size={16} /> Agregar sección</button>
        )}
      </div>
    </div>
  );
}

function SectionForm({ section, onSaved, onDeleted }: { section: EditableSection; onSaved: (s: EditableSection) => void; onDeleted: () => void }) {
  const def = SECTION_BY_TYPE[section.type];
  const [label, setLabel] = useState(section.label);
  const [variant, setVariant] = useState(section.variant);
  const [enabled, setEnabled] = useState(section.enabled);
  const [content, setContent] = useState<Record<string, unknown>>(section.content ?? {});
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="border-t border-line p-4 sm:p-6">
      <p className="mb-4 text-sm text-ink-muted">{def.description}</p>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <label><span className="field-label">Nombre interno</span><input className="field" value={label} onChange={(e) => setLabel(e.target.value)} /></label>
        <label><span className="field-label">Presentación</span><select className="field" value={variant} onChange={(e) => setVariant(e.target.value)}>{def.variants.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}</select></label>
        <label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-[var(--brand-chocolate)]" /> Mostrar esta sección</label>
      </div>
      <FieldsEditor fields={def.fields} value={content} onChange={setContent} />
      {err ? <p className="mt-4 text-sm text-rose-700" role="alert">{err}</p> : null}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" className={adminBtn} disabled={pending} onClick={() => start(async () => {
          const r = await saveSectionDraftAction({ id: section.id, label, variant, enabled, content });
          if (!r.ok) return setErr(r.error ?? "Error");
          onSaved({ ...section, label, variant, enabled, content });
        })}>{pending ? "Guardando…" : "Guardar borrador"}</button>
        {confirmDel ? (
          <span className="flex items-center gap-2 text-sm">
            ¿Eliminar la sección (se quita de inmediato)?
            <button type="button" className="font-semibold text-rose-700 underline" onClick={() => start(async () => { const r = await deleteSectionAction(section.id); if (r.ok) onDeleted(); else setErr(r.error ?? "Error"); })}>Sí, eliminar</button>
            <button type="button" className="underline" onClick={() => setConfirmDel(false)}>No</button>
          </span>
        ) : <button type="button" className="text-sm text-rose-700 underline" onClick={() => setConfirmDel(true)}>Eliminar sección</button>}
      </div>
    </div>
  );
}

function FieldsEditor({ fields, value, onChange }: { fields: FieldDef[]; value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const v = value[f.name];
        const wide = ["textarea", "richtext", "list"].includes(f.kind);
        return (
          <div key={f.name} className={wide ? "sm:col-span-2" : ""}>
            {f.kind === "image" ? (
              <MediaField label={f.label} value={typeof v === "string" ? v : null} onChange={(id) => set(f.name, id)} folder="contenido" />
            ) : f.kind === "list" ? (
              <ListEditor def={f} items={Array.isArray(v) ? (v as Record<string, unknown>[]) : []} onChange={(items) => set(f.name, items)} />
            ) : (
              <label className="block">
                <span className="field-label">{f.label}</span>
                {f.kind === "textarea" || f.kind === "richtext" ? (
                  <textarea className="field" rows={f.kind === "richtext" ? 6 : 3} value={typeof v === "string" ? v : ""} onChange={(e) => set(f.name, e.target.value)} />
                ) : f.kind === "select" ? (
                  <select className="field" value={typeof v === "string" ? v : ""} onChange={(e) => set(f.name, e.target.value)}>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                ) : f.kind === "number" ? (
                  <input type="number" className="field" value={typeof v === "number" ? v : ""} onChange={(e) => set(f.name, e.target.value ? Number(e.target.value) : null)} />
                ) : f.kind === "boolean" ? (
                  <input type="checkbox" checked={!!v} onChange={(e) => set(f.name, e.target.checked)} />
                ) : (
                  <input className="field" value={typeof v === "string" ? v : ""} onChange={(e) => set(f.name, e.target.value)} placeholder={f.kind === "url" ? "/tienda o https://…" : f.placeholder} />
                )}
                {f.help ? <span className="field-help block">{f.help}</span> : f.kind === "richtext" ? <span className="field-help block">Separa párrafos con una línea en blanco. **negrita**, ## subtítulo, - lista.</span> : null}
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ListEditor({ def, items, onChange }: { def: FieldDef; items: Record<string, unknown>[]; onChange: (items: Record<string, unknown>[]) => void }) {
  const max = def.maxItems ?? 20;
  return (
    <fieldset className="rounded-xl bg-[#fcfbfa] p-4 ring-1 ring-line">
      <legend className="px-1 text-sm font-semibold">{def.label} <span className="font-normal text-ink-muted">({items.length}/{max})</span></legend>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl bg-white p-3 ring-1 ring-line">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Elemento {i + 1}</span>
              <div className="flex gap-1">
                <button type="button" aria-label="Subir" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-cream disabled:opacity-30" disabled={i === 0} onClick={() => { const n = [...items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }}><Icon name="arrowUp" size={14} /></button>
                <button type="button" aria-label="Bajar" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-cream disabled:opacity-30" disabled={i === items.length - 1} onClick={() => { const n = [...items]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; onChange(n); }}><Icon name="arrowDown" size={14} /></button>
                <button type="button" aria-label="Quitar" className="flex h-8 w-8 items-center justify-center rounded-full text-rose-700 hover:bg-rose-50" onClick={() => onChange(items.filter((_, j) => j !== i))}><Icon name="trash" size={14} /></button>
              </div>
            </div>
            <FieldsEditor fields={def.fields ?? []} value={item} onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))} />
          </div>
        ))}
      </div>
      {items.length < max ? <button type="button" className={`${adminBtnOutline} mt-3`} onClick={() => onChange([...items, {}])}><Icon name="plus" size={15} /> Agregar</button> : null}
    </fieldset>
  );
}

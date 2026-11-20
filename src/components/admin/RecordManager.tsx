"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Card, adminBtn, adminBtnOutline } from "./ui";

/** Lista editable genérica: cada registro se abre en un formulario en línea. */
export function RecordManager<T extends { id?: string }>({
  records,
  empty,
  title,
  summary,
  form,
  onSave,
  onDelete,
  newLabel,
}: {
  records: T[];
  empty: T;
  title: (r: T) => ReactNode;
  summary: (r: T) => ReactNode;
  form: (v: T, set: (patch: Partial<T>) => void) => ReactNode;
  onSave: (v: T) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string }>;
  newLabel: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {records.map((r) => (
        <div key={r.id} className="rounded-2xl bg-white ring-1 ring-line">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div><div className="font-semibold">{title(r)}</div><div className="text-sm text-ink-muted">{summary(r)}</div></div>
            <button type="button" className={adminBtnOutline} onClick={() => setEditing(editing === r.id ? null : r.id!)}>{editing === r.id ? "Cerrar" : "Editar"}</button>
          </div>
          {editing === r.id ? <div className="border-t border-line p-4"><Editor initial={r} form={form} onSave={onSave} onDelete={onDelete} done={() => setEditing(null)} /></div> : null}
        </div>
      ))}
      {editing === "new" ? <Card title={newLabel}><Editor initial={empty} form={form} onSave={onSave} done={() => setEditing(null)} /></Card> : <button type="button" className={adminBtn} onClick={() => setEditing("new")}>{newLabel}</button>}
    </div>
  );
}

function Editor<T extends { id?: string }>({ initial, form, onSave, onDelete, done }: { initial: T; form: (v: T, set: (p: Partial<T>) => void) => ReactNode; onSave: (v: T) => Promise<{ ok: boolean; error?: string }>; onDelete?: (id: string) => Promise<{ ok: boolean; error?: string }>; done: () => void }) {
  const router = useRouter();
  const [v, setV] = useState<T>(initial);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div>
      {form(v, (p) => setV((x) => ({ ...x, ...p })))}
      {err ? <p className="mt-3 text-sm text-rose-700" role="alert">{err}</p> : null}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className={adminBtn} disabled={pending} onClick={() => start(async () => { const r = await onSave(v); if (!r.ok) return setErr(r.error ?? "Error"); done(); router.refresh(); })}>Guardar</button>
        {onDelete && initial.id ? (
          confirm ? (
            <span className="text-sm">¿Eliminar? <button type="button" className="font-semibold text-rose-700 underline" onClick={() => start(async () => { const r = await onDelete(initial.id!); if (!r.ok) return setErr(r.error ?? "Error"); router.refresh(); })}>Sí</button> <button type="button" className="underline" onClick={() => setConfirm(false)}>No</button></span>
          ) : <button type="button" className="text-sm text-rose-700 underline" onClick={() => setConfirm(true)}>Eliminar</button>
        ) : null}
      </div>
    </div>
  );
}

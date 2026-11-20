"use client";
import { useState, useTransition, type ReactNode } from "react";
import { saveSettingsAction } from "@/app/admin/(panel)/ajustes/actions";
import type { SettingsKey } from "@/lib/cms/settings";
import { adminBtn } from "./ui";

/** Formulario genérico para un grupo de ajustes. */
export function SettingsForm<T extends object>({ settingKey, initial, children, disabled }: { settingKey: SettingsKey; initial: T; disabled?: boolean; children: (v: T, set: <K extends keyof T>(k: K, val: T[K]) => void) => ReactNode }) {
  const [v, setV] = useState<T>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof T>(k: K, val: T[K]) => setV((x) => ({ ...x, [k]: val }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveSettingsAction(settingKey, v);
          setMsg(r.ok ? { ok: true, text: "Guardado. Los cambios ya se ven en el sitio." } : { ok: false, text: r.error ?? "Error" });
        });
      }}
      className="space-y-5"
    >
      <fieldset disabled={disabled || pending} className="space-y-5">{children(v, set)}</fieldset>
      {msg ? <p className={`rounded-xl p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`} role="status">{msg.text}</p> : null}
      {!disabled ? <button type="submit" className={adminBtn} disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button> : <p className="text-sm text-ink-muted">Solo un administrador puede modificar estos datos.</p>}
    </form>
  );
}

export function TextField({ label, value, onChange, help, type = "text", textarea, rows = 3, max }: { label: string; value: string; onChange: (v: string) => void; help?: string; type?: string; textarea?: boolean; rows?: number; max?: number }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {textarea ? <textarea className="field" rows={rows} value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} /> : <input type={type} className="field" value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} />}
      {help ? <span className="field-help block">{help}</span> : null}
      {max && textarea ? <span className="field-help block text-right">{value.length}/{max}</span> : null}
    </label>
  );
}

export function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--brand-chocolate)]" /> {label}</label>;
}

"use client";
import { useState, useTransition } from "react";
import { setPseEnabledAction } from "@/app/admin/(panel)/otros-actions";

export function PseToggle({ enabled, configured }: { enabled: boolean; configured: boolean }) {
  const [on, setOn] = useState(enabled);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <div>
      <label className="flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" className="h-5 w-5 accent-[var(--brand-chocolate)]" checked={on} disabled={pending} onChange={(e) => {
          const v = e.target.checked;
          setOn(v);
          start(async () => { const r = await setPseEnabledAction(v); setMsg(r.ok ? "Guardado" : r.error ?? "Error"); });
        }} />
        Ofrecer PSE en el checkout
      </label>
      <p className="mt-1 text-xs text-ink-muted">{configured ? "Si lo desactivas, los clientes solo verán transferencia y WhatsApp." : "Aunque esté activado, PSE solo aparece cuando las credenciales están configuradas."}</p>
      {msg ? <p className="mt-2 text-xs text-emerald-700" role="status">{msg}</p> : null}
    </div>
  );
}

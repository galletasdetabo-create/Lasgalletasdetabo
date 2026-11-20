"use client";
import { useState, useTransition } from "react";
import { saveCustomerNotesAction } from "@/app/admin/(panel)/otros-actions";
import { Card, adminBtnOutline } from "./ui";

export function CustomerNotes({ id, notes }: { id: string; notes: string }) {
  const [v, setV] = useState(notes);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card title="Notas internas">
      <textarea className="field" rows={4} value={v} onChange={(e) => setV(e.target.value)} maxLength={4000} aria-label="Notas internas del cliente" />
      <div className="mt-3 flex items-center gap-3">
        <button type="button" className={adminBtnOutline} disabled={pending} onClick={() => start(async () => { const r = await saveCustomerNotesAction(id, v); setMsg(r.ok ? "Guardado" : r.error ?? "Error"); })}>Guardar</button>
        {msg ? <span className="text-sm text-emerald-700" role="status">{msg}</span> : null}
      </div>
    </Card>
  );
}

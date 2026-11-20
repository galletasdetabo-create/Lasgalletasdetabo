"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveOrderNotes, updateOrderStatus } from "@/app/admin/(panel)/pedidos/actions";
import { ORDER_STATUS, ORDER_STATUS_FLOW } from "@/lib/labels";
import type { OrderStatus } from "@/lib/types";
import { Card, adminBtn, adminBtnOutline } from "./ui";

export function OrderControls({ id, status, notes }: { id: string; status: OrderStatus; notes: string }) {
  const router = useRouter();
  const [next, setNext] = useState<OrderStatus>(status);
  const [note, setNote] = useState("");
  const [internal, setInternal] = useState(notes);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card title="Gestión del pedido">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await updateOrderStatus({ id, status: next, note });
            setMsg(r.ok ? { ok: true, text: "Estado actualizado." } : { ok: false, text: r.error ?? "Error" });
            if (r.ok) { setNote(""); router.refresh(); }
          });
        }}
        className="space-y-3"
      >
        <label htmlFor="estado" className="field-label">Estado</label>
        <select id="estado" className="field" value={next} onChange={(e) => setNext(e.target.value as OrderStatus)} disabled={status === "cancelado"}>
          {ORDER_STATUS_FLOW.map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
        </select>
        <label htmlFor="nota" className="field-label">Nota para el historial (opcional)</label>
        <input id="nota" className="field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Ej. Confirmado por WhatsApp" />
        {next === "cancelado" && status !== "cancelado" ? <p className="text-xs text-rose-700">Cancelar devuelve el inventario reservado y no se puede deshacer.</p> : null}
        <button type="submit" className={adminBtn} disabled={pending || (next === status && !note)}>Actualizar</button>
      </form>
      <div className="mt-6 border-t border-line pt-5">
        <label htmlFor="internas" className="field-label">Notas internas</label>
        <textarea id="internas" className="field" rows={4} value={internal} onChange={(e) => setInternal(e.target.value)} maxLength={4000} />
        <button
          type="button"
          className={`${adminBtnOutline} mt-3`}
          disabled={pending}
          onClick={() => start(async () => {
            const r = await saveOrderNotes({ id, notes: internal });
            setMsg(r.ok ? { ok: true, text: "Notas guardadas." } : { ok: false, text: r.error ?? "Error" });
          })}
        >
          Guardar notas
        </button>
      </div>
      {msg ? <p className={`mt-4 text-sm ${msg.ok ? "text-emerald-700" : "text-rose-700"}`} role="status">{msg.text}</p> : null}
    </Card>
  );
}

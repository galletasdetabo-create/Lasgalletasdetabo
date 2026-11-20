"use client";
import { useEffect, useState, useTransition } from "react";
import { pseBanksAction, retryPseAction } from "@/app/(site)/checkout/actions";

export function RetryPse({ token }: { token: string; needsAddress?: boolean }) {
  const [open, setOpen] = useState(false);
  const [banks, setBanks] = useState<{ id: string; description: string }[]>([]);
  const [v, setV] = useState({ entityType: "individual", idType: "CC", idNumber: "", bank: "", zipCode: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open && !banks.length) pseBanksAction().then((r) => r.ok && setBanks(r.banks));
  }, [open, banks.length]);

  if (!open) return <button type="button" className="btn mt-5 w-full" onClick={() => setOpen(true)}>Reintentar pago con PSE</button>;

  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await retryPseAction({ token, pse: v });
          if (!r.ok) return setError(r.error);
          window.location.assign(r.redirectUrl);
        });
      }}
    >
      <select aria-label="Tipo de persona" className="field" value={v.entityType} onChange={(e) => setV({ ...v, entityType: e.target.value })}>
        <option value="individual">Persona natural</option>
        <option value="association">Persona jurídica</option>
      </select>
      <div className="grid grid-cols-[110px_1fr] gap-2">
        <select aria-label="Tipo de documento" className="field" value={v.idType} onChange={(e) => setV({ ...v, idType: e.target.value })}>
          {["CC", "CE", "NIT", "TI", "PAS"].map((t) => <option key={t}>{t}</option>)}
        </select>
        <input aria-label="Número de documento" className="field" inputMode="numeric" placeholder="Número de documento" value={v.idNumber} onChange={(e) => setV({ ...v, idNumber: e.target.value })} required />
      </div>
      <select aria-label="Banco" className="field" value={v.bank} onChange={(e) => setV({ ...v, bank: e.target.value })} required>
        <option value="">{banks.length ? "Selecciona tu banco" : "Cargando bancos…"}</option>
        {banks.map((b) => <option key={b.id} value={b.id}>{b.description}</option>)}
      </select>
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      <button type="submit" className="btn w-full" disabled={pending}>{pending ? "Conectando con tu banco…" : "Pagar con PSE"}</button>
    </form>
  );
}

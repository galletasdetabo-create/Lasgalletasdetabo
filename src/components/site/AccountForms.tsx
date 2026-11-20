"use client";
import { useActionState, useState } from "react";
import { customerLoginAction, customerRegisterAction, type AuthState } from "@/app/(site)/cuenta/actions";

export function AccountForms() {
  const [tab, setTab] = useState<"login" | "registro">("login");
  const [login, loginAction, l] = useActionState<AuthState, FormData>(customerLoginAction, null);
  const [reg, regAction, r] = useActionState<AuthState, FormData>(customerRegisterAction, null);
  return (
    <div className="mx-auto max-w-md rounded-[28px] bg-white/90 p-7 ring-1 ring-line sm:p-9">
      <div className="mb-6 grid grid-cols-2 rounded-full bg-mist p-1 text-sm font-semibold" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "login"} onClick={() => setTab("login")} className={`rounded-full py-2.5 transition-colors ${tab === "login" ? "bg-white shadow-sm" : "text-ink-muted"}`}>Ingresar</button>
        <button type="button" role="tab" aria-selected={tab === "registro"} onClick={() => setTab("registro")} className={`rounded-full py-2.5 transition-colors ${tab === "registro" ? "bg-white shadow-sm" : "text-ink-muted"}`}>Crear cuenta</button>
      </div>
      {tab === "login" ? (
        <form action={loginAction} className="space-y-4">
          {login?.error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900" role="alert">{login.error}</p> : null}
          <label className="block"><span className="field-label">Correo</span><input name="email" type="email" autoComplete="email" required className="field" /></label>
          <label className="block"><span className="field-label">Contraseña</span><input name="password" type="password" autoComplete="current-password" required className="field" /></label>
          <button className="btn w-full" disabled={l}>{l ? "Ingresando…" : "Ingresar"}</button>
        </form>
      ) : (
        <form action={regAction} className="space-y-4">
          {reg?.error ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900" role="alert">{reg.error}</p> : null}
          {reg?.info ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{reg.info}</p> : null}
          <label className="block"><span className="field-label">Nombre completo</span><input name="full_name" autoComplete="name" required className="field" /></label>
          <label className="block"><span className="field-label">Correo</span><input name="email" type="email" autoComplete="email" required className="field" /></label>
          <label className="block"><span className="field-label">Contraseña (mín. 10 caracteres)</span><input name="password" type="password" autoComplete="new-password" minLength={10} required className="field" /></label>
          <button className="btn w-full" disabled={r}>{r ? "Creando…" : "Crear cuenta"}</button>
        </form>
      )}
      <p className="mt-6 text-center text-xs text-ink-muted">No necesitas una cuenta para comprar. Con ella puedes ver el historial de tus pedidos.</p>
    </div>
  );
}

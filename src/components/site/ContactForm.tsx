"use client";
import { useActionState } from "react";
import { sendContact, type ContactState } from "@/app/(site)/contacto/actions";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, null);
  const e = state?.errors ?? {};
  if (state?.ok) {
    return <div className="rounded-[24px] bg-cream p-8 text-center" role="status"><p className="font-serif text-2xl">Mensaje enviado</p><p className="mt-2 text-ink-soft">{state.message}</p></div>;
  }
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2" noValidate>
      {state && !state.ok ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900 sm:col-span-2" role="alert">{state.message}</p> : null}
      <div>
        <label htmlFor="c-name" className="field-label">Nombre</label>
        <input id="c-name" name="name" className="field" autoComplete="name" required aria-invalid={e.name ? true : undefined} />
        {e.name ? <p className="field-error">{e.name}</p> : null}
      </div>
      <div>
        <label htmlFor="c-email" className="field-label">Correo electrónico</label>
        <input id="c-email" name="email" type="email" className="field" autoComplete="email" required aria-invalid={e.email ? true : undefined} />
        {e.email ? <p className="field-error">{e.email}</p> : null}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="c-phone" className="field-label">Teléfono <span className="font-normal text-ink-muted">(opcional)</span></label>
        <input id="c-phone" name="phone" type="tel" className="field" autoComplete="tel" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="c-msg" className="field-label">Mensaje</label>
        <textarea id="c-msg" name="message" rows={5} className="field" required aria-invalid={e.message ? true : undefined} />
        {e.message ? <p className="field-error">{e.message}</p> : null}
      </div>
      <div className="hidden" aria-hidden="true"><label>No llenar <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="sm:col-span-2"><button type="submit" className="btn" disabled={pending}>{pending ? "Enviando…" : "Enviar mensaje"}</button></div>
    </form>
  );
}

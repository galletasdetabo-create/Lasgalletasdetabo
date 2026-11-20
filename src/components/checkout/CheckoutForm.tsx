"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { placeOrderAction, pseBanksAction } from "@/app/(site)/checkout/actions";
import { cart, useCart } from "@/lib/cart/store";
import { track } from "@/lib/analytics";
import { bogotaDate, formatCOP } from "@/lib/format";
import { toInputItems, useQuote } from "./useQuote";
import type { DeliveryMethod, PaymentMethod } from "@/lib/types";
import type { PaymentOptions } from "@/lib/checkout/options";

interface Props {
  methods: DeliveryMethod[];
  payments: PaymentOptions;
  note: string;
  hasPrivacy: boolean;
}

const noopSubscribe = () => () => {};

const ID_TYPES = [
  ["CC", "Cédula de ciudadanía"],
  ["CE", "Cédula de extranjería"],
  ["NIT", "NIT"],
  ["TI", "Tarjeta de identidad"],
  ["PAS", "Pasaporte"],
];

export function CheckoutForm({ methods, payments, note, hasPrivacy }: Props) {
  const router = useRouter();
  const { items, coupon } = useCart();
  const [deliveryId, setDeliveryId] = useState<string | null>(methods[0]?.id ?? null);
  const [method, setMethod] = useState<PaymentMethod>(payments.pse ? "mercadopago_pse" : "transferencia");
  const [v, setV] = useState<Record<string, string>>({ entityType: "individual", idType: "CC" });
  const [accept, setAccept] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [banks, setBanks] = useState<{ id: string; description: string }[] | null>(null);
  const [banksError, setBanksError] = useState(false);
  const [pending, startTransition] = useTransition();
  const tracked = useRef(false);
  const { quote, loading } = useQuote(items, coupon, deliveryId);
  const delivery = methods.find((m) => m.id === deliveryId);

  // Fecha actual solo en el navegador (vacía durante el prerender).
  const today = useSyncExternalStore(noopSubscribe, () => bogotaDate(0), () => "");
  useEffect(() => {
    if (items.length && !tracked.current) {
      tracked.current = true;
      track("checkout_start");
    }
  }, [items.length]);

  const minDate = useMemo(() => (today ? bogotaDate(quote?.minDate ?? 0) : ""), [today, quote?.minDate]);
  // Fecha sugerida: la más temprana pedida en los productos (si cumple el mínimo).
  const suggested = useMemo(() => (minDate ? items.map((i) => i.neededBy).filter((d): d is string => !!d && d >= minDate).sort()[0] ?? "" : ""), [items, minDate]);
  const desiredDate = v.desired_date ?? suggested;

  useEffect(() => {
    if (method !== "mercadopago_pse" || banks || banksError) return;
    pseBanksAction().then((r) => (r.ok && r.banks.length ? setBanks(r.banks) : setBanksError(true)));
  }, [method, banks, banksError]);

  const set = (k: string, val: string) => {
    setV((x) => ({ ...x, [k]: val }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };
  const err = (k: string) => errors[k] || null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const errs: Record<string, string> = {};
    if (!v.name?.trim() || v.name.trim().length < 3) errs["customer.name"] = "Escribe tu nombre completo";
    if (!/^\S+@\S+\.\S+$/.test(v.email ?? "")) errs["customer.email"] = "Correo electrónico inválido";
    if (!/^[+\d\s()-]{7,20}$/.test(v.phone ?? "")) errs["customer.phone"] = "Ingresa un teléfono válido";
    if (!deliveryId) errs.delivery_method_id = "Elige un método de entrega";
    if (delivery?.requires_address) {
      if (!v.address?.trim()) errs.address = "Indica la dirección";
      if (!v.city?.trim()) errs.city = "Indica la ciudad";
      if (!v.neighborhood?.trim()) errs.neighborhood = "Indica el barrio";
    }
    if (!desiredDate) errs.desired_date = "Elige la fecha de entrega";
    else if (minDate && desiredDate < minDate) errs.desired_date = `La fecha más cercana posible es ${minDate}`;
    if (method === "mercadopago_pse") {
      if (!v.idNumber?.trim()) errs["pse.idNumber"] = "Ingresa tu número de documento";
      if (!v.bank) errs["pse.bank"] = "Elige tu banco";
      if (!v.address?.trim()) errs.address = "PSE requiere una dirección";
      if (!v.city?.trim()) errs.city = "PSE requiere la ciudad";
    }
    if (!accept) errs.accept_terms = "Debes aceptar para continuar";
    setErrors(errs);
    if (Object.keys(errs).length) {
      setFormError("Revisa los campos marcados.");
      document.querySelector<HTMLElement>(`[data-err="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }

    startTransition(async () => {
      const res = await placeOrderAction({
        customer: { name: v.name, email: v.email, phone: v.phone },
        address: v.address ?? "",
        city: v.city ?? "",
        neighborhood: v.neighborhood ?? "",
        zip_code: v.zip_code ?? "",
        desired_date: desiredDate,
        delivery_method_id: deliveryId,
        notes: v.notes ?? "",
        payment_method: method,
        coupon_code: coupon,
        accept_terms: accept,
        pse: method === "mercadopago_pse" ? { entityType: v.entityType, idType: v.idType, idNumber: v.idNumber, bank: v.bank } : undefined,
        items: toInputItems(items),
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      track("order_created");
      cart.clear();
      if (res.redirectUrl) {
        window.location.assign(res.redirectUrl);
        return;
      }
      router.push(res.orderUrl + (res.paymentError ? "?pago=error" : res.whatsappUrl ? "?wa=1" : ""));
    });
  }

  if (!items.length) {
    return (
      <div className="mx-auto max-w-lg rounded-[28px] bg-white/85 p-12 text-center ring-1 ring-line">
        <h2 className="text-2xl">No hay productos en tu carrito</h2>
        <p className="mt-2 text-ink-soft">Agrega productos para continuar con tu compra.</p>
        <Link href="/tienda" className="btn mt-7">Ir a la tienda</Link>
      </div>
    );
  }

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <div>
      <label htmlFor={name} className="field-label">{label}</label>
      <input
        id={name}
        data-err={name}
        className="field"
        value={name === "desired_date" ? desiredDate : v[name.replace(/^customer\.|^pse\./, "")] ?? ""}
        onChange={(e) => set(name.replace(/^customer\.|^pse\./, ""), e.target.value)}
        aria-invalid={err(name) ? true : undefined}
        aria-describedby={err(name) ? `${name}-e` : undefined}
        {...props}
      />
      {hint ? <p className="field-help">{hint}</p> : null}
      {err(name) ? <p id={`${name}-e`} className="field-error" role="alert">{err(name)}</p> : null}
    </div>
  );

  const payOption = (id: PaymentMethod, title: string, desc: string, icon: Parameters<typeof Icon>[0]["name"], disabled = false, reason?: string | null) => (
    <label className={`flex cursor-pointer gap-4 rounded-2xl border p-4 transition-all duration-300 ${disabled ? "cursor-not-allowed border-dashed border-line bg-mist/60 opacity-70" : method === id ? "border-chocolate bg-cream/70 shadow-sm" : "border-line bg-white hover:border-rose"}`}>
      <input type="radio" name="payment" value={id} checked={method === id} disabled={disabled} onChange={() => setMethod(id)} className="mt-1 h-4 w-4 accent-[var(--brand-chocolate)]" />
      <span className="flex-1">
        <span className="flex items-center gap-2 font-semibold"><Icon name={icon} size={18} className="text-rose-deep" />{title}</span>
        <span className="mt-1 block text-sm text-ink-soft">{disabled && reason ? reason : desc}</span>
      </span>
    </label>
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[1fr_400px]">
      <div className="space-y-8">
        {formError ? <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900 ring-1 ring-rose-200" role="alert">{formError}</div> : null}

        <fieldset className="rounded-[26px] bg-white/85 p-6 ring-1 ring-line sm:p-8">
          <legend className="sr-only">Tus datos</legend>
          <h2 className="flex items-center gap-3 text-[1.5rem]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-chocolate text-sm text-white">1</span> Tus datos</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">{field("customer.name", "Nombre completo", { autoComplete: "name", required: true })}</div>
            {field("customer.phone", "Teléfono / WhatsApp", { type: "tel", autoComplete: "tel", inputMode: "tel", required: true })}
            {field("customer.email", "Correo electrónico", { type: "email", autoComplete: "email", required: true })}
          </div>
        </fieldset>

        <fieldset className="rounded-[26px] bg-white/85 p-6 ring-1 ring-line sm:p-8">
          <legend className="sr-only">Entrega</legend>
          <h2 className="flex items-center gap-3 text-[1.5rem]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-chocolate text-sm text-white">2</span> Entrega</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Método de entrega">
            {methods.map((m) => (
              <label key={m.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition-all duration-300 ${deliveryId === m.id ? "border-chocolate bg-cream/70" : "border-line bg-white hover:border-rose"}`}>
                <input type="radio" name="delivery" value={m.id} checked={deliveryId === m.id} onChange={() => setDeliveryId(m.id)} className="mt-1 h-4 w-4 accent-[var(--brand-chocolate)]" data-err="delivery_method_id" />
                <span className="flex-1">
                  <span className="flex items-center justify-between gap-2 font-semibold">{m.name}<span className="text-sm font-normal text-ink-soft">{m.price ? formatCOP(m.price) : m.price_note || "Sin costo"}</span></span>
                  {m.description ? <span className="mt-1 block text-sm text-ink-soft">{m.description}</span> : null}
                </span>
              </label>
            ))}
          </div>
          {err("delivery_method_id") ? <p className="field-error">{err("delivery_method_id")}</p> : null}
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {delivery?.requires_address || method === "mercadopago_pse" ? (
              <>
                <div className="sm:col-span-2">{field("address", "Dirección de entrega", { autoComplete: "street-address" })}</div>
                {field("city", "Ciudad", { autoComplete: "address-level2" })}
                {field("neighborhood", "Barrio", {})}
                {method === "mercadopago_pse" ? field("zip_code", "Código postal (opcional)", { inputMode: "numeric", autoComplete: "postal-code", maxLength: 10 }) : null}
              </>
            ) : null}
            {field("desired_date", "Fecha deseada de entrega", { type: "date", min: minDate || undefined }, minDate ? `La fecha más cercana disponible es ${minDate}, según el tiempo de preparación de tus productos.` : undefined)}
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="field-label">Observaciones del pedido <span className="font-normal text-ink-muted">(opcional)</span></label>
              <textarea id="notes" className="field" rows={3} maxLength={1000} value={v.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Indicaciones de entrega, horario preferido, etc." />
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-[26px] bg-white/85 p-6 ring-1 ring-line sm:p-8">
          <legend className="sr-only">Pago</legend>
          <h2 className="flex items-center gap-3 text-[1.5rem]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-chocolate text-sm text-white">3</span> Pago</h2>
          <div className="mt-6 space-y-3" role="radiogroup" aria-label="Método de pago">
            {payOption("mercadopago_pse", "PSE · Mercado Pago", "Paga desde tu banco de forma segura. Te llevaremos a tu banco para autorizar el pago.", "lock", !payments.pse, payments.pseReason)}
            {payOption("transferencia", "Transferencia o pago coordinado", payments.transferInstructions ? "Verás los datos para transferir al confirmar tu pedido." : "Registramos tu pedido y te enviamos los datos de pago para confirmarlo.", "card")}
            {payments.whatsapp ? payOption("whatsapp", "Pedido por WhatsApp", "Registramos tu pedido y lo confirmamos contigo por WhatsApp.", "whatsapp") : null}
          </div>

          {method === "mercadopago_pse" ? (
            <div className="mt-6 grid gap-5 rounded-2xl bg-cream/50 p-5 sm:grid-cols-2">
              <div>
                <label htmlFor="entityType" className="field-label">Tipo de persona</label>
                <select id="entityType" className="field" value={v.entityType} onChange={(e) => set("entityType", e.target.value)}>
                  <option value="individual">Natural</option>
                  <option value="association">Jurídica</option>
                </select>
              </div>
              <div>
                <label htmlFor="idType" className="field-label">Tipo de documento</label>
                <select id="idType" className="field" value={v.idType} onChange={(e) => set("idType", e.target.value)}>
                  {ID_TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </div>
              {field("pse.idNumber", "Número de documento", { inputMode: "numeric", autoComplete: "off", maxLength: 20 })}
              <div>
                <label htmlFor="pse.bank" className="field-label">Banco</label>
                <select id="pse.bank" data-err="pse.bank" className="field" value={v.bank ?? ""} onChange={(e) => set("bank", e.target.value)} aria-invalid={err("pse.bank") ? true : undefined} disabled={!banks}>
                  <option value="">{banks ? "Selecciona tu banco" : banksError ? "No se pudo cargar la lista" : "Cargando bancos…"}</option>
                  {(banks ?? []).map((b) => <option key={b.id} value={b.id}>{b.description}</option>)}
                </select>
                {err("pse.bank") ? <p className="field-error">{err("pse.bank")}</p> : null}
              </div>
            </div>
          ) : null}
          {note ? <p className="mt-5 text-sm text-ink-soft">{note}</p> : null}
        </fieldset>
      </div>

      <aside className="h-fit space-y-5 lg:sticky lg:top-[calc(var(--header-h)+20px)]" aria-labelledby="resumen-pedido">
        <div className="rounded-[26px] bg-white/90 p-6 ring-1 ring-line sm:p-7">
          <h2 id="resumen-pedido" className="text-2xl">Tu pedido</h2>
          <ul className="mt-5 space-y-4">
            {items.map((it, idx) => {
              const line = quote?.lines[idx];
              return (
                <li key={it.id} className="flex gap-3">
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-mist">
                    {it.image ? <Image src={it.image} alt="" fill sizes="56px" className="object-cover" /> : null}
                    <span className="absolute -right-0 -top-0 flex h-5 min-w-5 items-center justify-center rounded-bl-lg bg-chocolate px-1 text-[0.65rem] font-bold text-white">{it.quantity}</span>
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium leading-snug">{it.name}</p>
                    {it.variantName ? <p className="text-xs text-ink-muted">{it.variantName}</p> : null}
                    {line?.error ? <p className="text-xs text-rose-deep">{line.error}</p> : null}
                  </div>
                  <p className="text-sm font-semibold">{formatCOP(line ? line.lineTotal : it.unitPrice * it.quantity)}</p>
                </li>
              );
            })}
          </ul>
          <dl className="mt-6 space-y-2.5 border-t border-line pt-5 text-sm" aria-busy={loading}>
            <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{quote ? formatCOP(quote.subtotal) : "…"}</dd></div>
            {quote?.discount ? <div className="flex justify-between text-emerald-700"><dt>Descuento ({quote.couponApplied})</dt><dd>− {formatCOP(quote.discount)}</dd></div> : null}
            {quote?.couponError ? <p className="text-xs text-rose-deep">{quote.couponError}</p> : null}
            <div className="flex justify-between"><dt className="text-ink-soft">Entrega</dt><dd>{delivery ? (delivery.price ? formatCOP(delivery.price) : delivery.price_note || "Sin costo") : "—"}</dd></div>
            <div className="flex justify-between border-t border-line pt-4 text-base"><dt className="font-semibold">Total</dt><dd className="text-2xl font-semibold">{quote ? formatCOP(quote.total) : "…"}</dd></div>
          </dl>
          <label className="mt-6 flex gap-3 text-sm text-ink-soft">
            <input type="checkbox" checked={accept} onChange={(e) => { setAccept(e.target.checked); setErrors((x) => ({ ...x, accept_terms: "" })); }} className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand-chocolate)]" data-err="accept_terms" />
            <span>
              Autorizo el tratamiento de mis datos personales para gestionar este pedido
              {hasPrivacy ? <> según la <Link href="/legal/privacidad" className="text-rose-deep underline" target="_blank">política de privacidad</Link></> : null}.
            </span>
          </label>
          {err("accept_terms") ? <p className="field-error">{err("accept_terms")}</p> : null}
          <button type="submit" className="btn mt-6 w-full" disabled={pending || loading || !quote || quote.hasErrors}>
            {pending ? "Procesando…" : method === "mercadopago_pse" ? "Pagar con PSE" : "Confirmar pedido"}
          </button>
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-ink-muted"><Icon name="lock" size={14} /> Total verificado por la tienda al confirmar</p>
        </div>
      </aside>
    </form>
  );
}

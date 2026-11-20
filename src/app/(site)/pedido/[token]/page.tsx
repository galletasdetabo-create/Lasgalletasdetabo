import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { Icon } from "@/components/ui/Icon";
import { RichText } from "@/components/ui/RichText";
import { RetryPse } from "@/components/checkout/RetryPse";
import { createServiceClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data/public";
import { refreshOrderPayment } from "@/lib/payments/service";
import { getPaymentOptions } from "@/lib/checkout/options";
import { whatsappLink } from "@/lib/cms/settings";
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/labels";
import { formatCOP, formatDate, formatDateTime } from "@/lib/format";
import type { Order, OrderItem } from "@/lib/types";

export const metadata: Metadata = { title: "Estado de tu pedido", robots: { index: false, follow: false } };

const STEPS = ["pendiente", "confirmado", "en_preparacion", "listo", "enviado", "entregado"] as const;

async function OrderDetail({ params, searchParams }: PageProps<"/pedido/[token]">) {
  const { token } = await params;
  const sp = await searchParams;
  if (!z.uuid().safeParse(token).success) notFound();
  const db = createServiceClient();
  const { data: base } = await db.from("orders").select("id").eq("public_token", token).maybeSingle();
  if (!base) notFound();

  // Al volver del banco se verifica el estado REAL con Mercado Pago (no se confía en la URL).
  if (sp.pago === "retorno") await refreshOrderPayment(base.id);

  const { data: order } = await db.from("orders").select("*, items:order_items(*)").eq("id", base.id).single<Order & { items: OrderItem[] }>();
  if (!order) notFound();
  const [s, options] = await Promise.all([getSettings(), getPaymentOptions()]);
  const wa = s.whatsapp.enabled
    ? whatsappLink(s.whatsapp.number, `¡Hola! Te escribo por mi pedido ${order.number} (${formatCOP(order.total)}) a nombre de ${order.customer_name}.`)
    : null;
  const cancelled = order.status === "cancelado";
  const stepIndex = STEPS.indexOf(order.status as (typeof STEPS)[number]);
  const paid = order.payment_status === "aprobado";
  const canRetry = options.pse && !cancelled && ["rechazado", "cancelado", "expirado"].includes(order.payment_status);
  const pendingPse = order.payment_method === "mercadopago_pse" && ["pendiente", "en_proceso"].includes(order.payment_status);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="text-center">
        <span className="anim-fade-up mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blush text-rose-deep"><Icon name={paid ? "check" : "heart"} size={28} /></span>
        <p className="eyebrow anim-fade-up mt-5">{paid ? "¡Pago confirmado!" : "¡Gracias por tu pedido!"}</p>
        <h1 className="anim-fade-up mt-2 text-[2.2rem] sm:text-[2.8rem]" style={{ ["--d" as string]: 100 }}>Pedido {order.number}</h1>
        <p className="anim-fade-up mt-3 text-ink-soft" style={{ ["--d" as string]: 180 }}>Realizado el {formatDateTime(order.created_at)}. Guarda esta página para consultar el estado.</p>
        <div className="anim-fade-up mt-5 flex flex-wrap justify-center gap-2" style={{ ["--d" as string]: 240 }}>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${ORDER_STATUS[order.status].tone}`}>{ORDER_STATUS[order.status].label}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${PAYMENT_STATUS[order.payment_status].tone}`}>{PAYMENT_STATUS[order.payment_status].label}</span>
        </div>
      </header>

      {sp.pago === "error" ? (
        <div className="mt-8 rounded-2xl bg-amber-50 p-5 text-sm text-amber-900 ring-1 ring-amber-200" role="status">Tu pedido quedó registrado, pero no pudimos iniciar el pago con PSE. Puedes reintentarlo abajo o elegir otro medio de pago contactándonos.</div>
      ) : null}
      {sp.pago === "retorno" && pendingPse ? (
        <div className="mt-8 rounded-2xl bg-sky-50 p-5 text-sm text-sky-900 ring-1 ring-sky-200" role="status">Estamos esperando la confirmación de tu banco. El estado se actualiza automáticamente cuando Mercado Pago nos notifica; puedes recargar esta página en unos minutos.</div>
      ) : null}

      {!cancelled ? (
        <ol className="mt-10 grid grid-cols-3 gap-y-6 sm:grid-cols-6" aria-label="Progreso del pedido">
          {STEPS.map((st, i) => (
            <li key={st} className="relative flex flex-col items-center text-center">
              <span className={`z-10 flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors ${i <= stepIndex ? "bg-chocolate text-white" : "bg-white text-ink-muted ring-1 ring-line"}`}>{i < stepIndex ? <Icon name="check" size={16} /> : i + 1}</span>
              <span className={`mt-2 text-[0.7rem] font-semibold uppercase tracking-wider ${i <= stepIndex ? "text-ink" : "text-ink-muted"}`}>{ORDER_STATUS[st].label}</span>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-[26px] bg-white/90 p-6 ring-1 ring-line sm:p-8" aria-labelledby="productos">
          <h2 id="productos" className="text-2xl">Productos</h2>
          <ul className="mt-5 divide-y divide-line">
            {order.items.map((it) => (
              <li key={it.id} className="py-4">
                <div className="flex justify-between gap-4">
                  <p className="font-medium">{it.quantity} × {it.product_name}{it.variant_name ? <span className="text-ink-muted"> · {it.variant_name}</span> : null}</p>
                  <p className="font-semibold">{formatCOP(it.line_total)}</p>
                </div>
                {Object.keys(it.customization ?? {}).length ? (
                  <p className="mt-1 text-xs text-ink-muted">{Object.values(it.customization).join(" · ")}</p>
                ) : null}
                {it.reference_image_path ? <p className="mt-1 text-xs text-ink-muted">Incluye imagen de referencia</p> : null}
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{formatCOP(order.subtotal)}</dd></div>
            {order.discount ? <div className="flex justify-between text-emerald-700"><dt>Descuento {order.coupon_code ? `(${order.coupon_code})` : ""}</dt><dd>− {formatCOP(order.discount)}</dd></div> : null}
            <div className="flex justify-between"><dt className="text-ink-soft">Entrega · {order.delivery_method_name}</dt><dd>{order.delivery_fee ? formatCOP(order.delivery_fee) : "Por confirmar / sin costo"}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd>{formatCOP(order.total)}</dd></div>
          </dl>
        </section>

        <div className="space-y-6">
          <section className="rounded-[26px] bg-white/90 p-6 ring-1 ring-line" aria-labelledby="pago">
            <h2 id="pago" className="text-xl">Pago</h2>
            <p className="mt-2 text-sm text-ink-soft">{PAYMENT_METHOD[order.payment_method]}</p>
            {order.payment_method === "transferencia" && !paid ? (
              s.commerce.transfer_instructions ? (
                <div className="mt-4 rounded-2xl bg-cream/60 p-4 text-sm"><RichText text={s.commerce.transfer_instructions} className="prose-brand text-sm" /><p className="mt-2 text-xs text-ink-muted">Usa el número de pedido {order.number} como referencia.</p></div>
              ) : (
                <p className="mt-4 rounded-2xl bg-cream/60 p-4 text-sm text-ink-soft">Te contactaremos para confirmar tu pedido y compartirte los datos de pago.</p>
              )
            ) : null}
            {wa && (order.payment_method === "whatsapp" || sp.wa === "1") ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn mt-5 w-full"><Icon name="whatsapp" size={18} /> Enviar pedido por WhatsApp</a>
            ) : null}
            {canRetry ? <RetryPse token={token} needsAddress={!order.address} /> : null}
          </section>

          <section className="rounded-[26px] bg-white/90 p-6 ring-1 ring-line text-sm" aria-labelledby="entrega">
            <h2 id="entrega" className="text-xl">Entrega</h2>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-ink-muted">Fecha deseada</dt><dd>{formatDate(order.desired_date)}</dd>
              <dt className="text-ink-muted">Método</dt><dd>{order.delivery_method_name}</dd>
              {order.address ? (<><dt className="text-ink-muted">Dirección</dt><dd>{order.address}{order.neighborhood ? `, ${order.neighborhood}` : ""}{order.city ? `, ${order.city}` : ""}</dd></>) : null}
              <dt className="text-ink-muted">A nombre de</dt><dd>{order.customer_name}</dd>
            </dl>
          </section>
          {wa && order.payment_method !== "whatsapp" && sp.wa !== "1" ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline w-full"><Icon name="whatsapp" size={18} /> ¿Dudas? Escríbenos</a>
          ) : null}
        </div>
      </div>
      <div className="mt-12 text-center"><Link href="/tienda" className="link-underline text-sm text-ink-soft hover:text-rose-deep">Seguir comprando</Link></div>
    </div>
  );
}

export default function OrderPage(props: PageProps<"/pedido/[token]">) {
  return (
    <div className="container-site pb-10 pt-10">
      <Suspense fallback={<div className="mx-auto max-w-4xl"><div className="skeleton mx-auto h-16 w-16 rounded-full" /><div className="skeleton mx-auto mt-6 h-10 w-80 rounded" /><div className="skeleton mt-12 h-72 rounded-[26px]" /></div>}>
        <OrderDetail {...props} />
      </Suspense>
    </div>
  );
}

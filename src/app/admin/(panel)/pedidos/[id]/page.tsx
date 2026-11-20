import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { OrderControls } from "@/components/admin/OrderControls";
import { requireStaff } from "@/lib/auth";
import { createServiceClient, createSessionClient } from "@/lib/supabase/server";
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/labels";
import { formatCOP, formatDate, formatDateTime } from "@/lib/format";
import { SITE_URL } from "@/lib/env";
import type { Order, OrderItem } from "@/lib/types";

export default async function OrderDetailPage(props: PageProps<"/admin/pedidos/[id]">) {
  await requireStaff();
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = await createSessionClient();
  const [{ data: order }, { data: history }, { data: payments }] = await Promise.all([
    db.from("orders").select("*, items:order_items(*)").eq("id", id).maybeSingle<Order & { items: OrderItem[] }>(),
    db.from("order_status_history").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    db.from("payments").select("id, environment, provider_order_id, status, provider_status, provider_status_detail, amount, created_at").eq("order_id", id).order("created_at", { ascending: false }),
  ]);
  if (!order) notFound();

  // Enlaces temporales (10 min) a las imágenes de referencia privadas.
  const refs = order.items.map((i) => i.reference_image_path).filter((p): p is string => !!p);
  const signed: Record<string, string> = {};
  if (refs.length) {
    const { data } = await createServiceClient().storage.from("order-references").createSignedUrls(refs, 600);
    data?.forEach((d) => d.signedUrl && d.path && (signed[d.path] = d.signedUrl));
  }
  const { data: productFields } = await db.from("products").select("id, customization_fields").in("id", order.items.map((i) => i.product_id).filter(Boolean) as string[]);
  const labelOf = (productId: string | null, key: string) =>
    (productFields?.find((p) => p.id === productId)?.customization_fields as { key: string; label: string }[] | undefined)?.find((f) => f.key === key)?.label ?? key;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/pedidos", label: "Pedidos" }}
        title={`Pedido ${order.number}`}
        description={`Creado el ${formatDateTime(order.created_at)}`}
        actions={<a href={`${SITE_URL}/pedido/${order.public_token}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-full border border-line bg-white px-5 text-sm font-semibold hover:border-rose-deep">Ver como cliente</a>}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone={ORDER_STATUS[order.status].tone}>{ORDER_STATUS[order.status].label}</Badge>
        <Badge tone={PAYMENT_STATUS[order.payment_status].tone}>{PAYMENT_STATUS[order.payment_status].label}</Badge>
        <Badge>{PAYMENT_METHOD[order.payment_method]}</Badge>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card title="Productos y personalización">
            <ul className="divide-y divide-line">
              {order.items.map((it) => (
                <li key={it.id} className="py-4 first:pt-0">
                  <div className="flex justify-between gap-4">
                    <p className="font-semibold">{it.quantity} × {it.product_name}{it.variant_name ? <span className="font-normal text-ink-muted"> · {it.variant_name}</span> : null}</p>
                    <p className="whitespace-nowrap">{formatCOP(it.unit_price)} c/u · <strong>{formatCOP(it.line_total)}</strong></p>
                  </div>
                  {Object.keys(it.customization ?? {}).length ? (
                    <dl className="mt-2 grid gap-x-4 gap-y-1 rounded-xl bg-cream/50 p-3 text-sm sm:grid-cols-[180px_1fr]">
                      {Object.entries(it.customization).map(([k, v]) => (
                        <div key={k} className="contents"><dt className="text-ink-muted">{labelOf(it.product_id, k)}</dt><dd className="whitespace-pre-wrap break-words">{v}</dd></div>
                      ))}
                    </dl>
                  ) : null}
                  {it.reference_image_path && signed[it.reference_image_path] ? (
                    <a href={signed[it.reference_image_path]} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-3 text-sm text-rose-deep underline">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={signed[it.reference_image_path]} alt="Imagen de referencia enviada por el cliente" className="h-16 w-16 rounded-lg object-cover" />
                      Ver imagen de referencia (enlace temporal)
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-ink-muted">Subtotal</dt><dd>{formatCOP(order.subtotal)}</dd></div>
              {order.discount ? <div className="flex justify-between"><dt className="text-ink-muted">Descuento {order.coupon_code}</dt><dd>− {formatCOP(order.discount)}</dd></div> : null}
              <div className="flex justify-between"><dt className="text-ink-muted">Entrega ({order.delivery_method_name})</dt><dd>{formatCOP(order.delivery_fee)}</dd></div>
              <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{formatCOP(order.total)}</dd></div>
            </dl>
          </Card>
          <Card title="Pagos">
            {payments?.length ? (
              <ul className="divide-y divide-line text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span>Mercado Pago · {p.environment === "production" ? "producción" : "pruebas"} · {p.provider_order_id ?? "sin orden"}</span>
                    <span className="flex items-center gap-2"><Badge tone={PAYMENT_STATUS[p.status as keyof typeof PAYMENT_STATUS].tone}>{PAYMENT_STATUS[p.status as keyof typeof PAYMENT_STATUS].label}</Badge><span className="text-xs text-ink-muted">{p.provider_status}{p.provider_status_detail ? ` / ${p.provider_status_detail}` : ""} · {formatDateTime(p.created_at)}</span></span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-muted">Sin pagos en línea. {order.payment_method !== "mercadopago_pse" ? "El pago se coordina por transferencia o WhatsApp." : ""}</p>}
          </Card>
          <Card title="Historial">
            <ol className="space-y-3 text-sm">
              {(history ?? []).map((h) => (
                <li key={h.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose" />
                  <div>
                    <p>
                      {h.kind === "note" ? h.note : h.kind === "payment" ? `Pago: ${h.from_value ?? "—"} → ${h.to_value}` : h.from_value ? `Estado: ${ORDER_STATUS[h.from_value as keyof typeof ORDER_STATUS]?.label} → ${ORDER_STATUS[h.to_value as keyof typeof ORDER_STATUS]?.label}` : h.note}
                    </p>
                    <p className="text-xs text-ink-muted">{formatDateTime(h.created_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="space-y-6">
          <OrderControls id={order.id} status={order.status} notes={order.admin_notes} />
          <Card title="Cliente">
            <dl className="space-y-2 text-sm">
              <div><dt className="text-ink-muted">Nombre</dt><dd className="font-medium">{order.customer_name}</dd></div>
              <div><dt className="text-ink-muted">Correo</dt><dd><a className="text-rose-deep underline" href={`mailto:${order.customer_email}`}>{order.customer_email}</a></dd></div>
              <div><dt className="text-ink-muted">Teléfono</dt><dd><a className="text-rose-deep underline" href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></dd></div>
              {order.customer_id ? <Link href={`/admin/clientes/${order.customer_id}`} className="inline-block pt-1 text-xs text-rose-deep underline">Ver ficha del cliente</Link> : null}
            </dl>
          </Card>
          <Card title="Entrega">
            <dl className="space-y-2 text-sm">
              <div><dt className="text-ink-muted">Método</dt><dd>{order.delivery_method_name}</dd></div>
              <div><dt className="text-ink-muted">Fecha deseada</dt><dd className="font-medium">{formatDate(order.desired_date)}</dd></div>
              {order.address ? <div><dt className="text-ink-muted">Dirección</dt><dd>{order.address}<br />{order.neighborhood}, {order.city}</dd></div> : null}
              {order.notes ? <div><dt className="text-ink-muted">Observaciones del cliente</dt><dd className="whitespace-pre-wrap">{order.notes}</dd></div> : null}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}

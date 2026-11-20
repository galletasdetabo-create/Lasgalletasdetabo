import Link from "next/link";
import { Badge, Card, PageHeader, Stat, Table } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { getMpStatus } from "@/lib/admin/mp-status";
import { mergeSettings } from "@/lib/cms/settings";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/labels";
import { formatCOP, formatDateTime, formatShortDate } from "@/lib/format";
import type { Order } from "@/lib/types";

interface Stats {
  sales_paid: number; sales_all: number; orders_count: number; orders_pending: number; orders_in_progress: number; avg_ticket: number;
  products_active: number; products_sold_out: number; customers: number; customers_new: number;
  sessions: number; product_views: number; add_to_cart: number; checkout_starts: number; orders_from_sessions: number;
  sales_by_day: { day: string; total: number; orders: number }[];
  top_products: { name: string; qty: number; total: number }[];
}

export default async function Dashboard() {
  const user = await requireStaff();
  const db = await createSessionClient();
  const [statsR, ordersR, activityR, settingsR, sampleR, stockR, sectionsR, mp] = await Promise.all([
    db.rpc("dashboard_stats", { p_days: 30 }),
    db.from("orders").select("id, number, customer_name, total, status, payment_status, created_at").order("created_at", { ascending: false }).limit(8),
    db.from("activity_log").select("id, actor_email, action, entity, created_at").order("created_at", { ascending: false }).limit(8),
    db.from("site_settings").select("key, value"),
    db.from("products").select("id", { count: "exact", head: true }).eq("is_sample", true),
    db.from("media").select("id", { count: "exact", head: true }).eq("is_stock", true),
    db.from("page_sections").select("type, is_enabled, content").eq("page", "home"),
    user.role === "admin" ? getMpStatus(true) : getMpStatus(false),
  ]);
  const s = (statsR.data ?? {}) as Stats;
  const orders = (ordersR.data ?? []) as Order[];
  const settings = mergeSettings(settingsR.data ?? []);
  const conv = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)} %` : "—");
  const max = Math.max(1, ...(s.sales_by_day ?? []).map((d) => d.total));
  const testimonials = (sectionsR.data ?? []).find((x) => x.type === "testimonials");

  const checklist = [
    { done: mp.state === "produccion", label: "Conectar Mercado Pago (PSE) en producción", href: "/admin/pagos" },
    { done: !!settings.whatsapp.number, label: "Configurar el número de WhatsApp", href: "/admin/ajustes?tab=whatsapp" },
    { done: !!settings.contact.email || !!settings.contact.phone, label: "Agregar correo o teléfono de contacto", href: "/admin/ajustes?tab=contacto" },
    { done: !!settings.social.instagram, label: "Agregar la cuenta de Instagram", href: "/admin/ajustes?tab=redes" },
    { done: !!settings.legal.privacy && !!settings.legal.terms, label: "Publicar política de privacidad y términos", href: "/admin/ajustes?tab=legal" },
    { done: !!settings.commerce.transfer_instructions, label: "Escribir los datos para transferencias", href: "/admin/ajustes?tab=comercio" },
    { done: (sampleR.count ?? 0) === 0, label: `Reemplazar precios de prueba (${sampleR.count ?? 0} productos)`, href: "/admin/productos?muestra=1" },
    { done: (stockR.count ?? 0) === 0, label: `Reemplazar fotografías de stock (${stockR.count ?? 0})`, href: "/admin/medios?carpeta=stock" },
    { done: !!testimonials?.is_enabled && Array.isArray((testimonials.content as { items?: unknown[] }).items) && ((testimonials.content as { items: unknown[] }).items.length > 0), label: "Agregar testimonios reales y activar la sección", href: "/admin/contenido/home" },
  ];
  const pending = checklist.filter((c) => !c.done);

  return (
    <>
      <PageHeader title={`Hola${user.fullName ? ", " + user.fullName.split(" ")[0] : ""}`} description="Resumen de los últimos 30 días." actions={<Link href="/admin/pedidos" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-chocolate px-5 text-sm font-semibold text-white hover:bg-rose-deep"><Icon name="bag" size={16} /> Ver pedidos</Link>} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Ventas pagadas" value={formatCOP(s.sales_paid)} hint={`Pedidos no cancelados: ${formatCOP(s.sales_all)}`} icon="dollar" />
        <Stat label="Pedidos" value={s.orders_count ?? 0} hint={`Ticket promedio ${formatCOP(s.avg_ticket)}`} icon="bag" />
        <Stat label="Pendientes" value={s.orders_pending ?? 0} hint={`${s.orders_in_progress ?? 0} en curso`} icon="clock" />
        <Stat label="Clientes" value={s.customers ?? 0} hint={`${s.customers_new ?? 0} nuevos`} icon="users" />
        <Stat label="Productos activos" value={s.products_active ?? 0} hint={`${s.products_sold_out ?? 0} agotados`} icon="box" />
        <Stat label="Sesiones" value={s.sessions ?? 0} hint={`${s.product_views ?? 0} vistas de producto`} icon="eye" />
        <Stat label="Agregar al carrito" value={s.add_to_cart ?? 0} hint={`Inicio de pago: ${s.checkout_starts ?? 0}`} icon="heart" />
        <Stat label="Conversión" value={conv(s.orders_from_sessions ?? 0, s.sessions ?? 0)} hint={`Checkout → pedido: ${conv(s.orders_from_sessions ?? 0, s.checkout_starts ?? 0)}`} icon="activity" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card title="Ventas por día (pedidos no cancelados)">
          {s.sales_by_day?.length ? (
            <div className="flex h-48 items-end gap-1.5" role="img" aria-label="Gráfico de ventas por día">
              {s.sales_by_day.map((d) => (
                <div key={d.day} className="group relative flex flex-1 flex-col items-center justify-end">
                  <div className="w-full rounded-t-md bg-rose transition-colors group-hover:bg-rose-deep" style={{ height: `${Math.max(4, (d.total / max) * 100)}%` }} />
                  <span className="pointer-events-none absolute -top-8 hidden whitespace-nowrap rounded bg-chocolate px-2 py-1 text-[0.65rem] text-white group-hover:block">{formatShortDate(d.day + "T12:00:00")} · {formatCOP(d.total)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-ink-muted">Aún no hay ventas en este periodo.</p>}
        </Card>
        <Card title="Mercado Pago" actions={user.role === "admin" ? <Link href="/admin/pagos" className="text-xs text-rose-deep underline">Configurar</Link> : null}>
          <Badge tone={mp.tone}>{mp.label}</Badge>
          <p className="mt-3 text-sm text-ink-soft">{mp.detail}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">Pedidos recientes</h2>
          {orders.length ? (
            <Table head={["Pedido", "Cliente", "Total", "Estado", "Pago", "Fecha"]}>
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-cream/40">
                  <td className="px-4 py-3"><Link href={`/admin/pedidos/${o.id}`} className="font-semibold text-rose-deep hover:underline">{o.number}</Link></td>
                  <td className="px-4 py-3">{o.customer_name}</td>
                  <td className="px-4 py-3">{formatCOP(o.total)}</td>
                  <td className="px-4 py-3"><Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge></td>
                  <td className="px-4 py-3"><Badge tone={PAYMENT_STATUS[o.payment_status].tone}>{PAYMENT_STATUS[o.payment_status].label}</Badge></td>
                  <td className="px-4 py-3 text-ink-muted">{formatDateTime(o.created_at)}</td>
                </tr>
              ))}
            </Table>
          ) : <Card><p className="text-sm text-ink-muted">Todavía no hay pedidos.</p></Card>}
          {s.top_products?.length ? (
            <Card title="Productos más vendidos" className="mt-6">
              <ul className="divide-y divide-line text-sm">
                {s.top_products.map((p) => <li key={p.name} className="flex justify-between py-2"><span>{p.name} <span className="text-ink-muted">× {p.qty}</span></span><span className="font-semibold">{formatCOP(p.total)}</span></li>)}
              </ul>
            </Card>
          ) : null}
        </div>
        <div className="space-y-6">
          <Card title={`Pendientes de configuración (${pending.length})`}>
            {pending.length ? (
              <ul className="space-y-2 text-sm">
                {pending.map((c) => (
                  <li key={c.label}><Link href={c.href} className="flex items-start gap-2 rounded-lg p-1.5 hover:bg-cream"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />{c.label}</Link></li>
                ))}
              </ul>
            ) : <p className="text-sm text-emerald-700">Todo listo para vender.</p>}
          </Card>
          <Card title="Actividad reciente" actions={<Link href="/admin/actividad" className="text-xs text-rose-deep underline">Ver todo</Link>}>
            <ul className="space-y-3 text-sm">
              {(activityR.data ?? []).map((a) => (
                <li key={a.id}><p><span className="font-medium">{a.actor_email ?? "Sistema"}</span> · {a.action} {a.entity}</p><p className="text-xs text-ink-muted">{formatDateTime(a.created_at)}</p></li>
              ))}
              {!activityR.data?.length ? <li className="text-ink-muted">Sin actividad todavía.</li> : null}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

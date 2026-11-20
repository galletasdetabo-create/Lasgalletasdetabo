import Link from "next/link";
import { Badge, EmptyState, PageHeader, Table } from "@/components/admin/ui";
import { createSessionClient } from "@/lib/supabase/server";
import { ORDER_STATUS, ORDER_STATUS_FLOW, PAYMENT_METHOD, PAYMENT_STATUS } from "@/lib/labels";
import { formatCOP, formatDate, formatDateTime } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";

const PAGE = 25;

export default async function OrdersPage(props: PageProps<"/admin/pedidos">) {
  const sp = await props.searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const status = one("estado") as OrderStatus | "";
  const q = one("q").trim().slice(0, 60);
  const page = Math.max(1, Number(one("pagina")) || 1);
  const db = await createSessionClient();
  let query = db.from("orders").select("id, number, customer_name, customer_email, total, status, payment_status, payment_method, desired_date, created_at", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (status && status in ORDER_STATUS) query = query.eq("status", status);
  if (q) query = query.or(`number.ilike.%${q.replace(/[%,()]/g, "")}%,customer_name.ilike.%${q.replace(/[%,()]/g, "")}%,customer_email.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data, count } = await query;
  const orders = (data ?? []) as Order[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const qs = (p: Record<string, string>) => "?" + new URLSearchParams({ ...(status ? { estado: status } : {}), ...(q ? { q } : {}), ...p }).toString();

  return (
    <>
      <PageHeader title="Pedidos" description="Consulta, filtra y actualiza el estado de los pedidos." />
      <form className="mb-5 flex flex-col gap-3 sm:flex-row" role="search">
        <input name="q" defaultValue={q} placeholder="Buscar por número, nombre o correo" className="field !min-h-11 sm:max-w-sm" aria-label="Buscar pedidos" />
        <select name="estado" defaultValue={status} className="field !min-h-11 sm:w-56" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {ORDER_STATUS_FLOW.map((s) => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
        </select>
        <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-chocolate px-6 text-sm font-semibold text-white">Filtrar</button>
      </form>
      {orders.length ? (
        <>
          <Table head={["Pedido", "Cliente", "Total", "Estado", "Pago", "Entrega", "Creado"]}>
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-cream/40">
                <td className="px-4 py-3"><Link href={`/admin/pedidos/${o.id}`} className="font-semibold text-rose-deep hover:underline">{o.number}</Link></td>
                <td className="px-4 py-3"><p>{o.customer_name}</p><p className="text-xs text-ink-muted">{o.customer_email}</p></td>
                <td className="px-4 py-3 font-medium">{formatCOP(o.total)}</td>
                <td className="px-4 py-3"><Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge></td>
                <td className="px-4 py-3"><Badge tone={PAYMENT_STATUS[o.payment_status].tone}>{PAYMENT_STATUS[o.payment_status].label}</Badge><p className="mt-1 text-xs text-ink-muted">{PAYMENT_METHOD[o.payment_method]}</p></td>
                <td className="px-4 py-3 text-ink-soft">{formatDate(o.desired_date)}</td>
                <td className="px-4 py-3 text-ink-muted">{formatDateTime(o.created_at)}</td>
              </tr>
            ))}
          </Table>
          {pages > 1 ? (
            <nav className="mt-5 flex items-center justify-between text-sm" aria-label="Paginación">
              <span className="text-ink-muted">Página {page} de {pages} · {count} pedidos</span>
              <div className="flex gap-2">
                {page > 1 ? <Link href={qs({ pagina: String(page - 1) })} className="rounded-full border border-line px-4 py-2 hover:border-rose-deep">Anterior</Link> : null}
                {page < pages ? <Link href={qs({ pagina: String(page + 1) })} className="rounded-full border border-line px-4 py-2 hover:border-rose-deep">Siguiente</Link> : null}
              </div>
            </nav>
          ) : null}
        </>
      ) : (
        <EmptyState title="No hay pedidos" text={q || status ? "Ningún pedido coincide con los filtros." : "Los pedidos de la tienda aparecerán aquí."} />
      )}
    </>
  );
}

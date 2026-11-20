import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Badge, Card, PageHeader, Table } from "@/components/admin/ui";
import { CustomerNotes } from "@/components/admin/CustomerNotes";
import { requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/labels";
import { formatCOP, formatDateTime } from "@/lib/format";
import type { Order } from "@/lib/types";

export default async function CustomerPage(props: PageProps<"/admin/clientes/[id]">) {
  await requireStaff();
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = await createSessionClient();
  const [{ data: c }, { data: orders }] = await Promise.all([
    db.from("customers").select("*").eq("id", id).maybeSingle(),
    db.from("orders").select("id, number, total, status, payment_status, created_at").eq("customer_id", id).order("created_at", { ascending: false }),
  ]);
  if (!c) notFound();
  const list = (orders ?? []) as Order[];
  const spent = list.filter((o) => o.status !== "cancelado").reduce((s, o) => s + o.total, 0);
  return (
    <>
      <PageHeader back={{ href: "/admin/clientes", label: "Clientes" }} title={c.full_name} description={`Cliente desde ${formatDateTime(c.created_at)}`} />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <div className="space-y-6">
          <Card title="Datos">
            <dl className="space-y-2 text-sm">
              <div><dt className="text-ink-muted">Correo</dt><dd><a href={`mailto:${c.email}`} className="text-rose-deep underline">{c.email}</a></dd></div>
              <div><dt className="text-ink-muted">Teléfono</dt><dd>{c.phone}</dd></div>
              <div><dt className="text-ink-muted">Cuenta registrada</dt><dd>{c.user_id ? "Sí" : "No (compra como invitado)"}</dd></div>
              <div><dt className="text-ink-muted">Total comprado</dt><dd className="font-semibold">{formatCOP(spent)} en {list.length} pedido(s)</dd></div>
            </dl>
          </Card>
          <CustomerNotes id={c.id} notes={c.notes} />
        </div>
        <Table head={["Pedido", "Total", "Estado", "Pago", "Fecha"]}>
          {list.map((o) => (
            <tr key={o.id}><td className="px-4 py-3"><Link href={`/admin/pedidos/${o.id}`} className="font-semibold text-rose-deep">{o.number}</Link></td><td className="px-4 py-3">{formatCOP(o.total)}</td><td className="px-4 py-3"><Badge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Badge></td><td className="px-4 py-3"><Badge tone={PAYMENT_STATUS[o.payment_status].tone}>{PAYMENT_STATUS[o.payment_status].label}</Badge></td><td className="px-4 py-3 text-ink-muted">{formatDateTime(o.created_at)}</td></tr>
          ))}
        </Table>
      </div>
    </>
  );
}

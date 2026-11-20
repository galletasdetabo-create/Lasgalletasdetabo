import Link from "next/link";
import { EmptyState, PageHeader, Table } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { formatCOP, formatDate } from "@/lib/format";

export default async function CustomersPage(props: PageProps<"/admin/clientes">) {
  await requireStaff();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60).replace(/[%,()]/g, "") : "";
  const db = await createSessionClient();
  let query = db.from("customers").select("id, full_name, email, phone, created_at, orders(total, status, created_at)").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data } = await query;
  type Row = { id: string; full_name: string; email: string; phone: string; created_at: string; orders: { total: number; status: string; created_at: string }[] };
  const rows = (data ?? []) as Row[];
  return (
    <>
      <PageHeader title="Clientes" description="Personas que han hecho pedidos. Se crean automáticamente con el primer pedido." />
      <form className="mb-5 flex gap-3"><input name="q" defaultValue={q} placeholder="Buscar por nombre, correo o teléfono" className="field !min-h-11 max-w-sm" aria-label="Buscar clientes" /><button className="rounded-full bg-chocolate px-6 text-sm font-semibold text-white">Buscar</button></form>
      {rows.length ? (
        <Table head={["Cliente", "Teléfono", "Pedidos", "Total comprado", "Último pedido"]}>
          {rows.map((c) => {
            const valid = c.orders.filter((o) => o.status !== "cancelado");
            const last = c.orders.map((o) => o.created_at).sort().at(-1);
            return (
              <tr key={c.id} className="hover:bg-cream/40">
                <td className="px-4 py-3"><Link href={`/admin/clientes/${c.id}`} className="font-semibold hover:text-rose-deep">{c.full_name}</Link><p className="text-xs text-ink-muted">{c.email}</p></td>
                <td className="px-4 py-3">{c.phone}</td>
                <td className="px-4 py-3">{c.orders.length}</td>
                <td className="px-4 py-3">{formatCOP(valid.reduce((s, o) => s + o.total, 0))}</td>
                <td className="px-4 py-3 text-ink-muted">{last ? formatDate(last) : "—"}</td>
              </tr>
            );
          })}
        </Table>
      ) : <EmptyState title="Sin clientes todavía" />}
    </>
  );
}

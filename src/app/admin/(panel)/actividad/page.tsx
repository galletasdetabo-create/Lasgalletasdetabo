import { PageHeader, Table } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";

export default async function ActivityPage() {
  await requireStaff();
  const { data } = await (await createSessionClient()).from("activity_log").select("*").order("created_at", { ascending: false }).limit(300);
  return (
    <>
      <PageHeader title="Registro de actividad" description="Auditoría de las acciones realizadas en el panel (últimas 300)." />
      <Table head={["Fecha", "Usuario", "Acción", "Elemento", "Detalle"]}>
        {(data ?? []).map((a) => (
          <tr key={a.id}>
            <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDateTime(a.created_at)}</td>
            <td className="px-4 py-3">{a.actor_email ?? "Sistema"}</td>
            <td className="px-4 py-3">{a.action}</td>
            <td className="px-4 py-3">{a.entity}{a.entity_id ? <span className="block font-mono text-[0.65rem] text-ink-muted">{String(a.entity_id).slice(0, 13)}</span> : null}</td>
            <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-ink-muted" title={JSON.stringify(a.details)}>{Object.keys(a.details ?? {}).length ? JSON.stringify(a.details) : ""}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}

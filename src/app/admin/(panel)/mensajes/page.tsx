import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { deleteMessageAction, markMessageAction } from "../otros-actions";
import { formatDateTime } from "@/lib/format";

export default async function MessagesPage() {
  await requireStaff();
  const { data } = await (await createSessionClient()).from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <PageHeader title="Mensajes" description="Mensajes enviados desde el formulario de contacto." />
      {data?.length ? (
        <ul className="space-y-3">
          {data.map((m) => (
            <li key={m.id} className={`rounded-2xl bg-white p-5 ring-1 ${m.is_read ? "ring-line" : "ring-rose"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{m.name} {!m.is_read ? <Badge tone="bg-rose-50 text-rose-800 ring-rose-200">Nuevo</Badge> : null}</p>
                <p className="text-xs text-ink-muted">{formatDateTime(m.created_at)}</p>
              </div>
              <p className="text-sm text-ink-soft"><a href={`mailto:${m.email}`} className="text-rose-deep underline">{m.email}</a>{m.phone ? ` · ${m.phone}` : ""}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm">{m.message}</p>
              <div className="mt-3 flex gap-4 text-sm">
                <form action={markMessageAction.bind(null, m.id, !m.is_read)}><button className="underline">{m.is_read ? "Marcar como no leído" : "Marcar como leído"}</button></form>
                <form action={deleteMessageAction.bind(null, m.id)}><button className="text-rose-700 underline">Eliminar</button></form>
              </div>
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No hay mensajes" />}
    </>
  );
}

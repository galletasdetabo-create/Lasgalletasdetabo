import { Badge, Card, PageHeader, Table } from "@/components/admin/ui";
import { PseToggle } from "@/components/admin/PseToggle";
import { requireAdmin } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { getMpStatus } from "@/lib/admin/mp-status";
import { getMpConfig } from "@/lib/payments/mercadopago/config";
import { getAdminSettings } from "@/lib/admin/settings";
import { PAYMENT_STATUS } from "@/lib/labels";
import { SITE_URL } from "@/lib/env";
import { formatCOP, formatDateTime } from "@/lib/format";

export default async function PaymentsPage() {
  await requireAdmin();
  const db = await createSessionClient();
  const [status, settings, { data: events }, { data: payments }] = await Promise.all([
    getMpStatus(true),
    getAdminSettings(),
    db.from("webhook_events").select("id, topic, action, resource_id, signature_valid, status, error, attempts, received_at").order("received_at", { ascending: false }).limit(20),
    db.from("payments").select("id, environment, provider_order_id, status, provider_status, amount, created_at, order:orders(number)").order("created_at", { ascending: false }).limit(20),
  ]);
  const cfg = getMpConfig();
  const env = [
    { name: "MERCADOPAGO_ACCESS_TOKEN", ok: cfg.configured, note: "Access Token (privado). Nunca se expone al navegador." },
    { name: "MERCADOPAGO_WEBHOOK_SECRET", ok: !!cfg.webhookSecret, note: "Clave secreta de la sección Webhooks para validar la firma." },
    { name: "MERCADOPAGO_ENVIRONMENT", ok: true, note: `Valor actual: ${cfg.environment === "production" ? "production" : "test"}.` },
    { name: "MERCADOPAGO_PUBLIC_KEY", ok: !!process.env.MERCADOPAGO_PUBLIC_KEY, note: "Opcional: solo necesaria para integrar tarjetas en el futuro." },
  ];
  return (
    <>
      <PageHeader title="Mercado Pago · PSE" description="Pagos con PSE mediante Checkout API (Orders). Las credenciales se configuran como variables de entorno del servidor, no en este panel." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Estado de la integración">
          <Badge tone={status.tone}>{status.label}</Badge>
          <p className="mt-3 text-sm text-ink-soft">{status.detail}</p>
          {status.simulator ? <p className="mt-2 rounded-xl bg-sky-50 p-3 text-xs text-sky-900">Está apuntando a un simulador local (MERCADOPAGO_API_BASE). Solo para pruebas automatizadas: no procesa dinero.</p> : null}
          <div className="mt-5 border-t border-line pt-5"><PseToggle enabled={settings.payments.pse_enabled} configured={cfg.configured} /></div>
        </Card>
        <Card title="Configuración necesaria">
          <ul className="space-y-3 text-sm">
            {env.map((e) => (
              <li key={e.name} className="flex gap-3">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${e.ok ? "bg-emerald-500" : "bg-amber-400"}`} />
                <span><code className="font-mono text-xs">{e.name}</code> — {e.ok ? "configurado" : "pendiente"}<br /><span className="text-ink-muted">{e.note}</span></span>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-xl bg-[#fcfbfa] p-4 text-sm ring-1 ring-line">
            <p className="font-semibold">URL de notificaciones (Webhooks, tópico «Order»)</p>
            <code className="mt-1 block break-all font-mono text-xs">{SITE_URL}/api/webhooks/mercadopago</code>
            <p className="mt-2 text-xs text-ink-muted">Regístrala en Mercado Pago › Tus integraciones › Webhooks, en modo pruebas y en modo productivo. Debe ser una URL pública con HTTPS.</p>
          </div>
        </Card>
      </div>
      <h2 className="mb-3 mt-8 text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">Intentos de pago recientes</h2>
      <Table head={["Pedido", "Orden MP", "Monto", "Estado", "Detalle MP", "Fecha"]}>
        {(payments ?? []).map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-3">{(p.order as unknown as { number: string } | null)?.number}</td>
            <td className="px-4 py-3 font-mono text-xs">{p.provider_order_id ?? "—"}</td>
            <td className="px-4 py-3">{formatCOP(p.amount)}</td>
            <td className="px-4 py-3"><Badge tone={PAYMENT_STATUS[p.status as keyof typeof PAYMENT_STATUS].tone}>{PAYMENT_STATUS[p.status as keyof typeof PAYMENT_STATUS].label}</Badge> <span className="text-xs text-ink-muted">{p.environment}</span></td>
            <td className="px-4 py-3 text-xs">{p.provider_status ?? "—"}</td>
            <td className="px-4 py-3 text-ink-muted">{formatDateTime(p.created_at)}</td>
          </tr>
        ))}
      </Table>
      <h2 className="mb-3 mt-8 text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">Notificaciones recibidas (webhooks)</h2>
      <Table head={["Recibida", "Tópico / acción", "Recurso", "Firma", "Estado", "Intentos"]}>
        {(events ?? []).map((e) => (
          <tr key={e.id}>
            <td className="px-4 py-3 text-ink-muted">{formatDateTime(e.received_at)}</td>
            <td className="px-4 py-3">{e.topic ?? "—"} {e.action ? <span className="text-xs text-ink-muted">· {e.action}</span> : null}</td>
            <td className="px-4 py-3 font-mono text-xs">{e.resource_id ?? "—"}</td>
            <td className="px-4 py-3">{e.signature_valid ? <Badge tone="bg-emerald-50 text-emerald-800 ring-emerald-200">Válida</Badge> : <Badge tone="bg-rose-50 text-rose-800 ring-rose-200">Inválida</Badge>}</td>
            <td className="px-4 py-3">{e.status}{e.error ? <p className="text-xs text-ink-muted">{e.error}</p> : null}</td>
            <td className="px-4 py-3">{e.attempts}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}

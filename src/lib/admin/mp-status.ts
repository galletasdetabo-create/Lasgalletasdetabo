import "server-only";
import { getMpConfig } from "@/lib/payments/mercadopago/config";
import { checkMpConnection } from "@/lib/payments/mercadopago/client";

export interface MpStatus {
  state: "sin_configurar" | "pruebas" | "produccion" | "error";
  label: string;
  detail: string;
  tone: string;
  webhookSecret: boolean;
  simulator: boolean;
}

/** Estado de Mercado Pago para el CRM (sin exponer credenciales). */
export async function getMpStatus(check = true): Promise<MpStatus> {
  const cfg = getMpConfig();
  if (!cfg.configured) {
    return { state: "sin_configurar", label: "Sin configurar", detail: "Falta MERCADOPAGO_ACCESS_TOKEN en el servidor. PSE no se ofrece a los clientes.", tone: "bg-stone-100 text-stone-700 ring-stone-200", webhookSecret: !!cfg.webhookSecret, simulator: false };
  }
  const conn = check ? await checkMpConnection() : { ok: true, message: "Sin verificar" };
  if (!conn.ok) return { state: "error", label: "Error de conexión", detail: conn.message, tone: "bg-rose-50 text-rose-800 ring-rose-200", webhookSecret: !!cfg.webhookSecret, simulator: cfg.simulator };
  return cfg.environment === "production"
    ? { state: "produccion", label: "Configurado en producción", detail: conn.message, tone: "bg-emerald-50 text-emerald-800 ring-emerald-200", webhookSecret: !!cfg.webhookSecret, simulator: false }
    : { state: "pruebas", label: cfg.simulator ? "Pruebas (simulador local)" : "Configurado en pruebas", detail: conn.message, tone: "bg-sky-50 text-sky-800 ring-sky-200", webhookSecret: !!cfg.webhookSecret, simulator: cfg.simulator };
}

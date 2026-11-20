import type { PaymentStatus } from "@/lib/types";

/**
 * Traducción de estados de una orden de Mercado Pago (Orders API) a los estados internos.
 * Fuente: "Estados de la transacción" — Checkout API vía Orders.
 */
export function mapMpOrderStatus(status: string | undefined, detail?: string | undefined): PaymentStatus {
  switch ((status ?? "").toLowerCase()) {
    case "processed":
      return detail === "refunded" ? "reembolsado" : "aprobado"; // accredited / partially_refunded
    case "action_required":
    case "created":
      return "pendiente"; // waiting_transfer, waiting_payment…
    case "processing":
    case "in_review":
      return "en_proceso";
    case "failed":
      return "rechazado";
    case "canceled":
    case "cancelled":
      return "cancelado";
    case "expired":
      return "expirado";
    case "refunded":
    case "charged_back":
      return "reembolsado";
    default:
      return "pendiente";
  }
}

/** Orden de precedencia: evita que una notificación tardía "retroceda" un pago. */
const RANK: Record<PaymentStatus, number> = {
  pendiente: 0,
  en_proceso: 1,
  rechazado: 2,
  cancelado: 2,
  expirado: 2,
  aprobado: 3,
  reembolsado: 4,
};

export function canTransition(from: PaymentStatus, to: PaymentStatus) {
  if (from === to) return false;
  if (from === "aprobado") return to === "reembolsado";
  if (from === "reembolsado") return false;
  if (RANK[from] === 2) return to === "aprobado" || to === "reembolsado"; // un final negativo solo cambia si MP lo aprueba
  return RANK[to] >= RANK[from];
}

export const FINAL_STATUSES: PaymentStatus[] = ["aprobado", "rechazado", "cancelado", "expirado", "reembolsado"];

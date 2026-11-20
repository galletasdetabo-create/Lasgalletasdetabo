import type { OrderStatus, PaymentMethod, PaymentStatus, ProductKind, StockStatus } from "./types";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  pendiente: { label: "Pendiente", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  confirmado: { label: "Confirmado", tone: "bg-sky-50 text-sky-800 ring-sky-200" },
  en_preparacion: { label: "En preparación", tone: "bg-violet-50 text-violet-800 ring-violet-200" },
  listo: { label: "Listo", tone: "bg-teal-50 text-teal-800 ring-teal-200" },
  enviado: { label: "Enviado", tone: "bg-indigo-50 text-indigo-800 ring-indigo-200" },
  entregado: { label: "Entregado", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  cancelado: { label: "Cancelado", tone: "bg-stone-100 text-stone-600 ring-stone-200" },
};
export const ORDER_STATUS_FLOW: OrderStatus[] = ["pendiente", "confirmado", "en_preparacion", "listo", "enviado", "entregado", "cancelado"];

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: string }> = {
  pendiente: { label: "Pago pendiente", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  en_proceso: { label: "Pago en proceso", tone: "bg-sky-50 text-sky-800 ring-sky-200" },
  aprobado: { label: "Pago aprobado", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  rechazado: { label: "Pago rechazado", tone: "bg-rose-50 text-rose-800 ring-rose-200" },
  cancelado: { label: "Pago cancelado", tone: "bg-stone-100 text-stone-600 ring-stone-200" },
  expirado: { label: "Pago expirado", tone: "bg-stone-100 text-stone-600 ring-stone-200" },
  reembolsado: { label: "Reembolsado", tone: "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200" },
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  mercadopago_pse: "PSE (Mercado Pago)",
  transferencia: "Transferencia / pago coordinado",
  whatsapp: "Pedido por WhatsApp",
};

export const STOCK_STATUS: Record<StockStatus, string> = {
  disponible: "Disponible",
  bajo_pedido: "Bajo pedido",
  agotado: "Agotado",
};

export const PRODUCT_KIND: Record<ProductKind, string> = {
  galleta_personalizada: "Galleta personalizada",
  alfajor: "Alfajor",
  caja: "Caja / presentación",
  estandar: "Producto estándar",
};

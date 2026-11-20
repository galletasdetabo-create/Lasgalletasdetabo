import "server-only";

/**
 * Configuración de Mercado Pago (Checkout API vía Orders, medio PSE).
 * Las credenciales viven SOLO en variables de entorno del servidor: nunca en la base
 * de datos, en el CRM ni en el navegador.
 */
export interface MpConfig {
  configured: boolean;
  environment: "test" | "production";
  accessToken: string;
  webhookSecret: string;
  apiBase: string;
  simulator: boolean;
}

export function getMpConfig(): MpConfig {
  const accessToken = (process.env.MERCADOPAGO_ACCESS_TOKEN ?? "").trim();
  const webhookSecret = (process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "").trim();
  const environment = process.env.MERCADOPAGO_ENVIRONMENT === "production" ? "production" : "test";
  // MERCADOPAGO_API_BASE solo se usa para apuntar a un simulador local en pruebas automatizadas.
  const override = (process.env.MERCADOPAGO_API_BASE ?? "").trim();
  const simulator = !!override && environment !== "production";
  return {
    configured: accessToken.length > 0,
    environment,
    accessToken,
    webhookSecret,
    apiBase: simulator ? override.replace(/\/$/, "") : "https://api.mercadopago.com",
    simulator,
  };
}

export type MpStatusLabel = "sin_configurar" | "pruebas" | "produccion" | "error";

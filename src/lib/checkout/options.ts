import "server-only";
import { getSettings } from "@/lib/data/public";
import { getMpConfig } from "@/lib/payments/mercadopago/config";
import { normalizeWhatsApp } from "@/lib/cms/settings";

export interface PaymentOptions {
  pse: boolean;
  pseReason: string | null;
  whatsapp: boolean;
  transfer: boolean;
  transferInstructions: string;
}

/** Medios de pago realmente disponibles (decidido en el servidor). */
export async function getPaymentOptions(): Promise<PaymentOptions> {
  const s = await getSettings();
  const mp = getMpConfig();
  const pseOn = s.payments.pse_enabled && mp.configured;
  return {
    pse: pseOn,
    pseReason: !mp.configured ? "PSE estará disponible cuando la tienda conecte su cuenta de Mercado Pago." : !s.payments.pse_enabled ? "PSE está desactivado temporalmente." : null,
    whatsapp: s.whatsapp.enabled && !!normalizeWhatsApp(s.whatsapp.number),
    transfer: true,
    transferInstructions: s.commerce.transfer_instructions,
  };
}

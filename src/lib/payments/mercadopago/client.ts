import "server-only";
import { getMpConfig } from "./config";

export class MpError extends Error {
  constructor(message: string, public status: number, public body?: unknown) {
    super(message);
  }
}

async function mpFetch<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const cfg = getMpConfig();
  if (!cfg.configured) throw new MpError("Mercado Pago no está configurado", 503);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${cfg.accessToken}`);
  headers.set("Content-Type", "application/json");
  if (init.idempotencyKey) headers.set("X-Idempotency-Key", init.idempotencyKey);
  const res = await fetch(cfg.apiBase + path, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg = (body as { message?: string })?.message ?? `HTTP ${res.status}`;
    throw new MpError(msg, res.status, body);
  }
  return body as T;
}

export interface PseBank {
  id: string;
  description: string;
}

interface PaymentMethod {
  id: string;
  status?: string;
  min_allowed_amount?: number;
  max_allowed_amount?: number;
  financial_institutions?: { id: string; description: string }[];
}

/** Bancos PSE disponibles y límites de monto según Mercado Pago. */
export async function getPseInfo() {
  const methods = await mpFetch<PaymentMethod[]>("/v1/payment_methods");
  const pse = methods.find((m) => m.id === "pse");
  if (!pse) return { available: false, banks: [] as PseBank[], min: null as number | null, max: null as number | null };
  return {
    available: pse.status ? pse.status === "active" : true,
    banks: (pse.financial_institutions ?? []).map((b) => ({ id: String(b.id), description: b.description })).sort((a, b) => a.description.localeCompare(b.description, "es")),
    min: pse.min_allowed_amount ?? null,
    max: pse.max_allowed_amount ?? null,
  };
}

export interface MpOrder {
  id: string;
  status: string;
  status_detail?: string;
  external_reference?: string;
  total_amount?: string;
  transactions?: {
    payments?: {
      id: string;
      status?: string;
      status_detail?: string;
      amount?: string;
      payment_method?: { id?: string; type?: string; redirect_url?: string; financial_institution?: string };
    }[];
  };
}

export interface PseOrderInput {
  externalReference: string;
  amount: number;
  idempotencyKey: string;
  callbackUrl: string;
  ip: string;
  bank: string;
  payer: {
    email: string;
    firstName: string;
    lastName: string;
    entityType: "individual" | "association";
    idType: string;
    idNumber: string;
    phone: string;
    zipCode: string;
    street: string;
    neighborhood: string;
    city: string;
  };
}

/** Crea una orden PSE en Mercado Pago (Checkout API vía Orders). */
export function createPseOrder(input: PseOrderInput) {
  const digits = input.payer.phone.replace(/\D/g, "").replace(/^57(?=3\d{9}$)/, "");
  const amount = String(Math.round(input.amount));
  const body = {
    type: "online",
    processing_mode: "automatic",
    external_reference: input.externalReference,
    total_amount: amount,
    payer: {
      email: input.payer.email,
      entity_type: input.payer.entityType,
      first_name: input.payer.firstName,
      last_name: input.payer.lastName,
      identification: { type: input.payer.idType, number: input.payer.idNumber },
      address: {
        zip_code: input.payer.zipCode || "000000",
        street_name: input.payer.street,
        street_number: "S/N",
        neighborhood: input.payer.neighborhood,
        city: input.payer.city,
      },
      phone: { area_code: digits.slice(0, 3), number: digits.slice(3) },
    },
    transactions: {
      payments: [
        {
          amount,
          payment_method: { id: "pse", type: "bank_transfer", financial_institution: input.bank },
        },
      ],
    },
    additional_info: { "payer.ip_address": input.ip },
    config: { online: { callback_url: input.callbackUrl } },
  };
  return mpFetch<MpOrder>("/v1/orders", { method: "POST", body: JSON.stringify(body), idempotencyKey: input.idempotencyKey });
}

export function getMpOrder(id: string) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new MpError("Identificador inválido", 400);
  return mpFetch<MpOrder>(`/v1/orders/${encodeURIComponent(id)}`);
}

/** Verifica que las credenciales funcionan (para el estado en el CRM). */
export async function checkMpConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const info = await getPseInfo();
    return { ok: true, message: info.available ? `PSE disponible · ${info.banks.length} bancos` : "Conectado, pero PSE no aparece como medio de pago activo." };
  } catch (e) {
    const err = e as MpError;
    if (err.status === 401 || err.status === 403) return { ok: false, message: "Credenciales rechazadas por Mercado Pago (401/403)." };
    return { ok: false, message: `No se pudo conectar con Mercado Pago: ${err.message}` };
  }
}

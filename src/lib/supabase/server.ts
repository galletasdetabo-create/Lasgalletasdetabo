import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, assertSupabaseEnv } from "@/lib/env";

/** Cliente con la sesión del usuario (lee cookies: solo en tiempo de petición). */
export async function createSessionClient() {
  assertSupabaseEnv();
  // Marca la lectura como de tiempo de petición: Supabase Auth usa la hora actual al validar la sesión.
  await connection();
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: el proxy se encarga de refrescar la sesión.
        }
      },
    },
  });
}

/** Cliente anónimo sin cookies: apto para funciones con 'use cache' (datos públicos con RLS). */
export function createPublicClient() {
  assertSupabaseEnv();
  return createPlainClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Cliente de servicio (omite RLS). Uso exclusivo en el servidor para operaciones
 * controladas: crear pedidos, webhooks, subidas privadas. Nunca exponer al cliente.
 */
export function createServiceClient() {
  assertSupabaseEnv();
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Falta SUPABASE_SECRET_KEY en el servidor.");
  return createPlainClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

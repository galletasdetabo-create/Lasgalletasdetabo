import "server-only";
import { createSessionClient } from "@/lib/supabase/server";
import { mergeSettings } from "@/lib/cms/settings";

/** Ajustes sin caché para el CRM (siempre lo último guardado). */
export async function getAdminSettings() {
  const { data } = await (await createSessionClient()).from("site_settings").select("key, value");
  return mergeSettings(data ?? []);
}

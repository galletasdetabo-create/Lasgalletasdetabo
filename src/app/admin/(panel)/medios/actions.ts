"use server";
import { inspectImage, stripJpegMetadata } from "@/lib/images";
import { z } from "zod";
import { logActivity, requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { publicMediaUrl } from "@/lib/media";
import { refreshPublic } from "@/lib/admin/revalidate";
import { slugify } from "@/lib/format";

const MAX = 10 * 1024 * 1024;

export interface MediaItem {
  id: string;
  url: string;
  path: string;
  alt: string;
  folder: string;
  width: number | null;
  height: number | null;
  mime: string | null;
  size_bytes: number | null;
  is_stock: boolean;
  source_name: string | null;
  source_url: string | null;
  author: string | null;
  license: string | null;
  created_at: string;
  uses: number;
}

export async function listMediaAction(): Promise<MediaItem[]> {
  await requireStaff();
  const db = await createSessionClient();
  const [{ data }, { data: usage }] = await Promise.all([
    db.from("media").select("*").order("created_at", { ascending: false }),
    db.rpc("media_usage_counts"),
  ]);
  const uses = new Map((usage ?? []).map((u: { media_id: string; uses: number }) => [u.media_id, Number(u.uses)]));
  return (data ?? []).map((m) => ({ ...m, url: publicMediaUrl(m.bucket, m.path), uses: uses.get(m.id) ?? 0 }));
}

export async function mediaUsageAction(id: string) {
  await requireStaff();
  if (!z.uuid().safeParse(id).success) return [];
  const { data } = await (await createSessionClient()).rpc("media_usage", { p_media_id: id });
  return (data ?? []) as { kind: string; ref_id: string; label: string }[];
}

async function processImage(file: File, _folder: string) {
  if (file.size > MAX) throw new Error(`«${file.name}» supera 10 MB.`);
  const input = new Uint8Array(await file.arrayBuffer());
  const info = inspectImage(input);
  if (!info) throw new Error(`«${file.name}»: formato no permitido (usa JPG, PNG, WebP o AVIF).`);
  // El tamaño de entrega lo ajusta el optimizador de imágenes; aquí solo se guarda el original sin metadatos.
  const buffer = info.format === "jpeg" ? stripJpegMetadata(input) : input;
  return { buffer, mime: info.mime, ext: info.ext, width: info.width, height: info.height, blur: null as string | null };
}

export async function uploadMediaAction(form: FormData): Promise<{ ok: boolean; error?: string; ids?: string[] }> {
  const user = await requireStaff();
  const folder = slugify(String(form.get("folder") || "general")) || "general";
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { ok: false, error: "Selecciona al menos una imagen." };
  if (files.length > 20) return { ok: false, error: "Sube máximo 20 imágenes a la vez." };
  const db = await createSessionClient();
  const ids: string[] = [];
  for (const file of files) {
    try {
      const img = await processImage(file, folder);
      const base = slugify(file.name.replace(/\.[a-z0-9]+$/i, "")) || "imagen";
      const path = `${folder}/${base}-${crypto.randomUUID().slice(0, 8)}.${img.ext}`;
      const up = await db.storage.from("media").upload(path, img.buffer, { contentType: img.mime, cacheControl: "31536000" });
      if (up.error) throw new Error(up.error.message);
      const { data, error } = await db.from("media").insert({
        path, folder, alt: String(form.get("alt") || base.replace(/-/g, " ")), width: img.width, height: img.height, mime: img.mime, size_bytes: img.buffer.length, blur_data: img.blur, created_by: user.id,
      }).select("id").single();
      if (error) throw new Error(error.message);
      ids.push(data.id);
    } catch (e) {
      return { ok: false, error: (e as Error).message, ids };
    }
  }
  await logActivity(user, "subió imágenes", "medios", null, { cantidad: ids.length, carpeta: folder });
  refreshPublic("media");
  return { ok: true, ids };
}

const UpdateSchema = z.object({
  id: z.uuid(),
  alt: z.string().trim().max(300),
  folder: z.string().trim().max(60),
  is_stock: z.boolean(),
  source_name: z.string().trim().max(120).nullable(),
  source_url: z.union([z.url().max(500), z.literal("")]).nullable(),
  author: z.string().trim().max(160).nullable(),
  license: z.string().trim().max(300).nullable(),
});

export async function updateMediaAction(input: unknown) {
  const user = await requireStaff();
  const p = UpdateSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Revisa los datos (la URL de la fuente debe ser válida)." };
  const { id, ...rest } = p.data;
  const { error } = await (await createSessionClient()).from("media").update({ ...rest, folder: slugify(rest.folder) || "general", source_url: rest.source_url || null }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo guardar." };
  await logActivity(user, "editó imagen", "medios", id);
  refreshPublic("media", "catalog", "sections", "settings");
  return { ok: true };
}

/** Sustituye el archivo conservando el mismo id: todas las secciones que lo usan se actualizan. */
export async function replaceMediaAction(form: FormData) {
  const user = await requireStaff();
  const id = String(form.get("id"));
  const file = form.get("file");
  if (!z.uuid().safeParse(id).success || !(file instanceof File)) return { ok: false, error: "Datos inválidos." };
  const db = await createSessionClient();
  const { data: m } = await db.from("media").select("path, folder").eq("id", id).single();
  if (!m) return { ok: false, error: "Imagen no encontrada." };
  try {
    const img = await processImage(file, m.folder);
    const path = `${m.folder}/${slugify(file.name.replace(/\.[a-z0-9]+$/i, "")) || "imagen"}-${crypto.randomUUID().slice(0, 8)}.${img.ext}`;
    const up = await db.storage.from("media").upload(path, img.buffer, { contentType: img.mime, cacheControl: "31536000" });
    if (up.error) throw new Error(up.error.message);
    const { error } = await db.from("media").update({ path, width: img.width, height: img.height, mime: img.mime, size_bytes: img.buffer.length, blur_data: img.blur, is_stock: false, source_name: null, source_url: null, author: null, license: null }).eq("id", id);
    if (error) throw new Error(error.message);
    await db.storage.from("media").remove([m.path]);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  await logActivity(user, "reemplazó imagen", "medios", id);
  refreshPublic("media", "catalog", "sections", "settings");
  return { ok: true };
}

export async function deleteMediaAction(id: string) {
  const user = await requireStaff();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Id inválido." };
  const db = await createSessionClient();
  const { data: usage } = await db.rpc("media_usage", { p_media_id: id });
  if (usage?.length) return { ok: false, error: `No se puede eliminar: se usa en ${usage.length} lugar(es).` };
  const { data: m } = await db.from("media").select("path").eq("id", id).single();
  if (!m) return { ok: false, error: "Imagen no encontrada." };
  const { error } = await db.from("media").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar (puede estar en uso)." };
  await db.storage.from("media").remove([m.path]);
  await logActivity(user, "eliminó imagen", "medios", id, { path: m.path });
  refreshPublic("media");
  return { ok: true };
}

import { inspectImage, stripJpegMetadata } from "@/lib/images";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const MAX = 5 * 1024 * 1024;
const ALLOWED = new Set(["jpeg", "png", "webp"]);

/** Sube una imagen de referencia del cliente a un bucket privado. */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`ref:${clientIp(req.headers)}`, 12, 10 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Demasiadas subidas. Intenta de nuevo en unos minutos." }, { status: 429 });

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    file = f instanceof File ? f : null;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "Selecciona una imagen." }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "La imagen debe pesar menos de 5 MB." }, { status: 413 });

  // Se valida el contenido real (no solo la extensión) y se eliminan los metadatos EXIF de los JPEG.
  const input = new Uint8Array(await file.arrayBuffer());
  const info = inspectImage(input);
  if (!info || !ALLOWED.has(info.format)) {
    return NextResponse.json({ error: "El archivo no es una imagen JPG, PNG o WebP válida." }, { status: 415 });
  }
  const output = info.format === "jpeg" ? stripJpegMetadata(input) : input;

  const month = new Date().toISOString().slice(0, 7);
  const path = `pendientes/${month}/${crypto.randomUUID()}.${info.ext}`;
  const { error } = await createServiceClient().storage.from("order-references").upload(path, output, { contentType: info.mime, upsert: false });
  if (error) {
    console.error("[upload referencia]", error.message);
    return NextResponse.json({ error: "No se pudo guardar la imagen. Intenta de nuevo." }, { status: 500 });
  }
  return NextResponse.json({ path });
}

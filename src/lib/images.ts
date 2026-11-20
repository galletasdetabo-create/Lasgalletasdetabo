/**
 * Validación de imágenes sin librerías nativas (compatible con Cloudflare Workers).
 * Se detecta el formato por los bytes reales del archivo, no por la extensión, y se leen las dimensiones de la cabecera.
 * En JPEG se eliminan los metadatos EXIF (ubicación GPS, cámara) antes de guardar.
 */
export type ImageFormat = "jpeg" | "png" | "webp" | "avif";

export interface ImageInfo {
  format: ImageFormat;
  mime: string;
  ext: string;
  width: number | null;
  height: number | null;
}

const MIME: Record<ImageFormat, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };
const EXT: Record<ImageFormat, string> = { jpeg: "jpg", png: "png", webp: "webp", avif: "avif" };

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
const u16 = (b: Uint8Array, o: number) => (b[o] << 8) | b[o + 1];
const u32 = (b: Uint8Array, o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const le24 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);

function jpegSize(b: Uint8Array): { width: number; height: number } | null {
  let o = 2;
  while (o + 9 < b.length) {
    if (b[o] !== 0xff) { o++; continue; }
    const marker = b[o + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { o += 2; continue; }
    const len = u16(b, o + 2);
    if ((marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: u16(b, o + 5), width: u16(b, o + 7) };
    }
    o += 2 + len;
  }
  return null;
}

function webpSize(b: Uint8Array): { width: number; height: number } | null {
  const kind = ascii(b, 12, 16);
  if (kind === "VP8X") return { width: le24(b, 24) + 1, height: le24(b, 27) + 1 };
  if (kind === "VP8 ") return { width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff };
  if (kind === "VP8L") {
    const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  return null;
}

/** Devuelve la información de la imagen o null si no es JPEG, PNG, WebP o AVIF válido. */
export function inspectImage(b: Uint8Array): ImageInfo | null {
  let format: ImageFormat | null = null;
  let size: { width: number; height: number } | null = null;
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    format = "jpeg";
    size = jpegSize(b);
  } else if (b.length > 24 && b[0] === 0x89 && ascii(b, 1, 4) === "PNG" && ascii(b, 12, 16) === "IHDR") {
    format = "png";
    size = { width: u32(b, 16), height: u32(b, 20) };
  } else if (b.length > 30 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") {
    format = "webp";
    size = webpSize(b);
  } else if (b.length > 16 && ascii(b, 4, 8) === "ftyp" && /^(avif|avis)/.test(ascii(b, 8, 12))) {
    format = "avif";
  }
  if (!format) return null;
  if (size && (size.width < 1 || size.height < 1 || size.width > 20000 || size.height > 20000)) return null;
  return { format, mime: MIME[format], ext: EXT[format], width: size?.width ?? null, height: size?.height ?? null };
}

/** Quita los segmentos APP1 (EXIF/XMP) y APP13 de un JPEG. Otros formatos se devuelven sin cambios. */
export function stripJpegMetadata(b: Uint8Array): Uint8Array {
  if (!(b[0] === 0xff && b[1] === 0xd8)) return b;
  const out: Uint8Array[] = [b.subarray(0, 2)];
  let o = 2;
  while (o + 4 <= b.length) {
    if (b[o] !== 0xff) break;
    const marker = b[o + 1];
    if (marker === 0xda) break; // inicio de los datos de imagen
    const len = u16(b, o + 2);
    const seg = b.subarray(o, o + 2 + len);
    if (marker !== 0xe1 && marker !== 0xed) out.push(seg);
    o += 2 + len;
  }
  out.push(b.subarray(o));
  const total = out.reduce((n, s) => n + s.length, 0);
  const res = new Uint8Array(total);
  let p = 0;
  for (const s of out) { res.set(s, p); p += s.length; }
  return res;
}

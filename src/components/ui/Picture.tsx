import Image from "next/image";
import type { ImageRef } from "@/lib/types";

interface Props {
  image: ImageRef | null | undefined;
  sizes: string;
  className?: string;
  fill?: boolean;
  preload?: boolean;
  quality?: number;
  alt?: string;
}

/** Imagen optimizada con placeholder difuminado. Nunca deja espacios rotos. */
export function Picture({ image, sizes, className, fill = true, preload = false, quality = 75, alt }: Props) {
  if (!image) {
    return <div className={`absolute inset-0 bg-gradient-to-br from-cream via-white to-blush/50 ${className ?? ""}`} aria-hidden="true" />;
  }
  const common = {
    src: image.url,
    alt: alt ?? image.alt,
    sizes,
    quality,
    className,
    preload,
    placeholder: image.blur ? ("blur" as const) : ("empty" as const),
    blurDataURL: image.blur ?? undefined,
  };
  return fill ? <Image {...common} alt={common.alt} fill /> : <Image {...common} alt={common.alt} width={image.width} height={image.height} />;
}

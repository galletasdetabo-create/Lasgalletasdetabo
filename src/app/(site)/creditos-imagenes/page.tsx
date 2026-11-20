import type { Metadata } from "next";
import Image from "next/image";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";
import { toImageRef } from "@/lib/media";
import type { Media } from "@/lib/types";

export const metadata: Metadata = {
  title: "Créditos de imágenes",
  description: "Fuentes, autores y licencias de las fotografías de referencia usadas en el sitio.",
  alternates: { canonical: "/creditos-imagenes" },
};

async function getStockMedia() {
  "use cache";
  cacheTag("media");
  cacheLife("max");
  const { data } = await createPublicClient().from("media").select("*").eq("is_stock", true).order("created_at");
  return (data ?? []) as Media[];
}

export default async function CreditsPage() {
  const media = await getStockMedia();
  return (
    <div className="container-site max-w-4xl py-16">
      <h1 className="text-center text-[2.2rem] sm:text-[2.8rem]">Créditos de imágenes</h1>
      <p className="mx-auto mt-4 max-w-2xl text-center text-ink-soft">
        Algunas fotografías del sitio son imágenes de referencia de bancos de imágenes con licencias que permiten su uso comercial. No muestran productos elaborados por la tienda y se reemplazarán por fotografías propias.
      </p>
      <ul className="mt-12 divide-y divide-line rounded-[26px] bg-white/90 px-6 ring-1 ring-line">
        {media.map((m) => {
          const ref = toImageRef(m)!;
          const [license, licenseUrl] = (m.license ?? "").split(" — ");
          return (
            <li key={m.id} className="flex gap-4 py-5">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-mist"><Image src={ref.url} alt={m.alt} fill sizes="64px" className="object-cover" quality={60} /></div>
              <div className="min-w-0 text-sm">
                <p className="font-medium">{m.alt}</p>
                <p className="text-ink-soft">
                  {m.author ? <>Autor: {m.author} · </> : null}
                  Fuente: {m.source_url ? <a href={m.source_url} target="_blank" rel="noopener noreferrer nofollow" className="text-rose-deep underline">{m.source_name}</a> : m.source_name}
                </p>
                <p className="text-ink-muted">
                  Licencia: {licenseUrl ? <a href={licenseUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">{license}</a> : license} · Cambios: redimensionada y convertida a WebP.
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

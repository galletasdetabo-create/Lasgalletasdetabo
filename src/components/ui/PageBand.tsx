import { Picture } from "@/components/ui/Picture";
import type { ImageRef } from "@/lib/types";

/** Banda de título de página (como "SHOP" en la referencia): título a la izquierda y fotografía que se funde por la derecha. */
export function PageBand({ title, image, as: Tag = "h1" }: { title: string; image?: ImageRef | null; as?: "h1" | "h2" }) {
  return (
    <section className="page-band" aria-label={title}>
      {image ? (
        <div className="absolute inset-y-0 right-0 w-[62%] lg:w-[48%]" style={{ maskImage: "linear-gradient(90deg, transparent 0%, #000 45%)", WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 45%)" }}>
          <Picture image={image} sizes="(min-width:1024px) 48vw, 62vw" quality={70} className="object-cover" />
        </div>
      ) : null}
      <div className="container-site relative">
        <Tag className="anim-fade-up">{title}</Tag>
      </div>
    </section>
  );
}

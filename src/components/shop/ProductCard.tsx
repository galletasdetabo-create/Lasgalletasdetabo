import Image from "next/image";
import Link from "next/link";
import { priceFrom } from "@/lib/data/public";
import { formatCOP } from "@/lib/format";
import type { Product } from "@/lib/types";

/**
 * Tarjeta de la referencia: imagen cuadrada sobre gris muy claro, nombre en Montserrat,
 * categorías y precio en cursiva. Al pasar el cursor aparece un velo blanco con un enlace dorado.
 */
export function ProductCard({ product, index = 0, sizes = "(min-width:1024px) 33vw, 50vw", eager = false }: { product: Product; index?: number; sizes?: string; eager?: boolean }) {
  const [main] = product.images ?? [];
  const { price, compare, from } = priceFrom(product);
  const soldOut = product.stock_status === "agotado";
  const onSale = compare != null && compare > price;
  return (
    <article className="pcard group relative" data-reveal style={{ ["--reveal-delay" as string]: (index % 3) * 100 }}>
      <Link href={`/producto/${product.slug}`} className="block" aria-label={`${product.name}, ${from ? "desde " : ""}${formatCOP(price)}`}>
        <div className="pcard-img">
          {main ? (
            <Image
              src={main.url}
              alt={main.alt || product.name}
              fill
              sizes={sizes}
              className="object-cover"
              loading={eager ? "eager" : "lazy"}
              fetchPriority={eager ? "high" : "auto"}
              placeholder={main.blur ? "blur" : "empty"}
              blurDataURL={main.blur ?? undefined}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-cream to-blush/60" aria-hidden="true" />
          )}
          {soldOut ? <span className="tag-box">Agotado</span> : onSale ? <span className="tag-box">Oferta</span> : null}
          <div className="pcard-ov">
            <span className="readmore">{product.customization_fields.length ? "Personalizar" : "Ver producto"}</span>
          </div>
        </div>
        <div className="mt-5 text-center">
          <h3 className="pcard-title !text-[15px] !tracking-[0.1em]">{product.name}</h3>
          {product.category ? <p className="it mt-1">{product.category.name}</p> : null}
          <p className="it mt-0.5">
            {from ? <span className="text-ink-muted">Desde </span> : null}
            {formatCOP(price)}
            {onSale ? <span className="ml-2 text-ink-muted line-through">{formatCOP(compare!)}</span> : null}
          </p>
        </div>
      </Link>
    </article>
  );
}

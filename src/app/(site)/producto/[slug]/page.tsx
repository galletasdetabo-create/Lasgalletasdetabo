import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageBand } from "@/components/ui/PageBand";
import { RichText } from "@/components/ui/RichText";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductForm } from "@/components/product/ProductForm";
import { ProductTabs } from "@/components/product/ProductTabs";
import { ProductViewTracker } from "@/components/product/ProductViewTracker";
import { ProductCard } from "@/components/shop/ProductCard";
import { BreadcrumbJsonLd, ProductJsonLd } from "@/components/seo/JsonLd";
import { getBandImage, getCatalog, getProductBySlug, priceFrom } from "@/lib/data/public";
import { STOCK_STATUS } from "@/lib/labels";
import { formatCOP } from "@/lib/format";

export async function generateStaticParams() {
  const { products } = await getCatalog();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Producto no encontrado", robots: { index: false } };
  const image = p.images?.[0];
  const description = p.seo_description || p.short_description;
  return {
    title: p.seo_title || p.name,
    description,
    alternates: { canonical: `/producto/${p.slug}` },
    openGraph: { type: "website", title: p.seo_title || p.name, description, images: image ? [{ url: image.url, width: image.width, height: image.height, alt: image.alt || p.name }] : undefined },
  };
}

function ProductSkeleton() {
  return (
    <div className="container-site pb-10 pt-12" aria-hidden="true">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="skeleton aspect-[5/4]" />
        <div className="space-y-5"><div className="skeleton h-12 w-3/4" /><div className="skeleton h-8 w-40" /><div className="skeleton h-24" /><div className="skeleton h-72" /></div>
      </div>
    </div>
  );
}

export default function ProductPage(props: PageProps<"/producto/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductDetail params={props.params} />
    </Suspense>
  );
}

async function ProductDetail({ params }: { params: PageProps<"/producto/[slug]">["params"] }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [{ products }, band] = await Promise.all([getCatalog(), getBandImage()]);
  const related = products.filter((p) => p.id !== product.id && (p.category_id === product.category_id || p.kind === product.kind)).slice(0, 4);
  const { price, compare, from } = priceFrom(product);
  const soldOut = product.stock_status === "agotado";

  return (
    <>
      <PageBand title="Tienda" image={band} as="h2" />
      <div className="container-site pb-10 pt-[50px] md:pt-[70px]">
        <nav aria-label="Migas de pan" className="it !text-[17px] text-ink-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="hover:text-gold-ink">Inicio</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/tienda" className="hover:text-gold-ink">Tienda</Link></li>
            {product.category ? (<><li aria-hidden="true">/</li><li><Link href={`/tienda/${product.category.slug}`} className="hover:text-gold-ink">{product.category.name}</Link></li></>) : null}
          </ol>
        </nav>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-[60px]">
          <ProductGallery images={product.images ?? []} name={product.name} />
          <div>
            <h1 className="anim-fade-up !text-[clamp(26px,2.6vw,36px)] !tracking-[0.1em]">{product.name}</h1>
            <p className="it anim-fade-up mt-3 !text-[24px]" style={{ ["--d" as string]: 80 }}>
              {from ? <span className="text-ink-muted">Desde </span> : null}
              {formatCOP(price)}
              {compare && compare > price ? <span className="ml-3 text-ink-muted line-through">{formatCOP(compare)}</span> : null}
              <span className={`ml-4 align-middle font-sans text-[11px] font-semibold not-italic uppercase tracking-[0.16em] ${soldOut ? "text-ink-muted" : "text-gold-deep"}`}>{STOCK_STATUS[product.stock_status]}</span>
            </p>
            {product.is_sample ? <p className="it !text-[16px] text-ink-muted">Precio de referencia (dato de prueba, pendiente de confirmar por la tienda).</p> : null}
            {product.short_description ? <p className="it anim-fade-up mt-6" style={{ ["--d" as string]: 160 }}>{product.short_description}</p> : null}
            {product.prep_time_text ? <p className="it mt-4"><span className="font-sans text-[12px] font-semibold not-italic uppercase tracking-[0.16em]">Preparación:</span> {product.prep_time_text}</p> : null}

            <ProductForm product={product} />

            <dl className="it mt-8 space-y-1 !text-[19px]">
              <div className="flex gap-2"><dt>Categoría:</dt><dd className="text-ink-muted">{product.category ? <Link href={`/tienda/${product.category.slug}`} className="hover:text-gold-ink">{product.category.name}</Link> : "—"}</dd></div>
              {product.tags.length ? <div className="flex gap-2"><dt>Etiquetas:</dt><dd className="text-ink-muted">{product.tags.join(", ")}</dd></div> : null}
            </dl>
          </div>
        </div>

        <div className="mt-[70px] md:mt-[90px]">
          <ProductTabs
            tabs={[
              { id: "descripcion", label: "Descripción", content: <RichText text={product.description} /> },
              {
                id: "informacion",
                label: "Información del pedido",
                content: (
                  <dl className="it grid grid-cols-[auto_1fr] gap-x-8 gap-y-2">
                    <dt className="text-ink-muted">Disponibilidad</dt><dd>{STOCK_STATUS[product.stock_status]}</dd>
                    <dt className="text-ink-muted">Pedido mínimo</dt><dd>{product.min_quantity} {product.quantity_label}</dd>
                    {product.prep_time_text ? (<><dt className="text-ink-muted">Preparación</dt><dd>{product.prep_time_text}</dd></>) : null}
                  </dl>
                ),
              },
            ]}
          />
        </div>

        {related.length ? (
          <section className="mt-[80px] md:mt-[110px]" aria-labelledby="relacionados">
            <h2 id="relacionados" className="!text-[clamp(22px,2vw,28px)] !tracking-[0.1em]" data-reveal>Productos relacionados</h2>
            <div className="mt-10 grid grid-cols-1 gap-x-[30px] gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} sizes="(min-width:1024px) 24vw, (min-width:640px) 48vw, 100vw" />)}
            </div>
          </section>
        ) : null}
      </div>

      <ProductJsonLd product={product} />
      <BreadcrumbJsonLd items={[{ name: "Inicio", path: "/" }, { name: "Tienda", path: "/tienda" }, ...(product.category ? [{ name: product.category.name, path: `/tienda/${product.category.slug}` }] : []), { name: product.name, path: `/producto/${product.slug}` }]} />
      <ProductViewTracker productId={product.id} />
    </>
  );
}

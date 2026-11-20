import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/ui/Icon";
import { PageBand } from "@/components/ui/PageBand";
import { ProductCard } from "./ProductCard";
import { SortSelect } from "./SortSelect";
import { formatCOP } from "@/lib/format";
import { getBandImage, getCatalog, priceFrom } from "@/lib/data/public";
import type { Category, Product } from "@/lib/types";

const SORTS = ["destacados", "precio-asc", "precio-desc", "nombre", "recientes"];

type SP = Promise<Record<string, string | string[] | undefined>>;

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function applyFilters(products: Product[], f: { q: string; sort: string; availability: string; min: number | null; max: number | null }) {
  let out = products;
  if (f.q) {
    const n = normalize(f.q);
    out = out.filter((p) => normalize([p.name, p.short_description, p.category?.name ?? "", p.tags.join(" ")].join(" ")).includes(n));
  }
  if (f.availability === "disponibles") out = out.filter((p) => p.stock_status !== "agotado");
  const price = (p: Product) => priceFrom(p).price;
  if (f.min != null) out = out.filter((p) => price(p) >= f.min!);
  if (f.max != null) out = out.filter((p) => price(p) <= f.max!);
  switch (f.sort) {
    case "precio-asc": return [...out].sort((a, b) => price(a) - price(b));
    case "precio-desc": return [...out].sort((a, b) => price(b) - price(a));
    case "nombre": return [...out].sort((a, b) => a.name.localeCompare(b.name, "es"));
    case "recientes": return [...out].sort((a, b) => b.created_at.localeCompare(a.created_at));
    default: return [...out].sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.sort - b.sort);
  }
}

const num = (v: string) => (v !== "" && Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : null);

async function Results({ searchParams, category }: { searchParams: SP; category: Category | null }) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : (sp[k] as string | undefined)) ?? "";
  const q = one("q").slice(0, 60);
  const sort = SORTS.includes(one("orden")) ? one("orden") : "destacados";
  const availability = one("disponibilidad");
  const min = num(one("min"));
  const max = num(one("max"));
  const { products, categories } = await getCatalog();
  const base = category ? products.filter((p) => p.category_id === category.id) : products;
  const filtered = applyFilters(base, { q, sort, availability, min, max });
  const action = category ? `/tienda/${category.slug}` : "/tienda";
  const prices = base.map((p) => priceFrom(p).price);
  const lo = prices.length ? Math.min(...prices) : 0;
  const hi = prices.length ? Math.max(...prices) : 0;
  const featured = products.filter((p) => p.is_featured).slice(0, 3);
  const filtering = !!(q || availability || min != null || max != null);

  return (
    <div className="grid gap-[30px] lg:grid-cols-[minmax(0,1fr)_305px]">
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="it !text-[19px] text-ink-muted" aria-live="polite">
            {filtered.length === 1 ? "Mostrando 1 resultado" : `Mostrando ${filtered.length} resultados`}
            {filtering ? <> · <Link href={action} className="underline underline-offset-4 hover:text-gold-ink">Quitar filtros</Link></> : null}
          </p>
          <SortSelect action={action} current={sort} hidden={{ q, disponibilidad: availability, min: min != null ? String(min) : "", max: max != null ? String(max) : "" }} />
        </div>

        {filtered.length ? (
          <div className="mt-8 grid grid-cols-1 gap-x-[30px] gap-y-12 sm:grid-cols-2">
            {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} eager={i < 2} sizes="(min-width:1024px) 34vw, (min-width:640px) 48vw, 100vw" />)}
          </div>
        ) : (
          <div className="mt-10 border border-line bg-white/80 p-12 text-center">
            <p className="font-sans text-[18px] font-semibold uppercase tracking-[0.1em]">No encontramos productos</p>
            <p className="it mt-3">Prueba con otra búsqueda o explora todas las categorías.</p>
            <Link href="/tienda" className="btn btn-outline mt-7">Ver toda la tienda</Link>
          </div>
        )}
      </div>

      <aside aria-label="Filtros" className="space-y-12">
        <section id="buscar" aria-labelledby="w-buscar">
          <h2 id="w-buscar" className="!text-[15px] !tracking-[0.1em]">Buscar</h2>
          <span className="sep sep-left mt-4" aria-hidden="true" />
          <form action={action} method="get" role="search" className="relative mt-6">
            <input type="hidden" name="orden" value={sort} />
            <label htmlFor="buscar-q" className="sr-only">Buscar productos</label>
            <input id="buscar-q" name="q" defaultValue={q} placeholder="Escribe aquí…" maxLength={60} className="field pr-12" />
            <button type="submit" className="absolute right-0 top-0 flex h-[52px] w-12 items-center justify-center text-gold-ink hover:text-ink" aria-label="Buscar"><Icon name="search" size={18} strokeWidth={1.3} /></button>
          </form>
        </section>

        <section aria-labelledby="w-precio">
          <h2 id="w-precio" className="!text-[15px] !tracking-[0.1em]">Filtrar por precio</h2>
          <span className="sep sep-left mt-4" aria-hidden="true" />
          <form action={action} method="get" className="mt-6 space-y-4">
            <input type="hidden" name="orden" value={sort} />
            {q ? <input type="hidden" name="q" value={q} /> : null}
            <div className="grid grid-cols-2 gap-3">
              <div><label htmlFor="f-min" className="field-label">Mínimo</label><input id="f-min" name="min" type="number" inputMode="numeric" min={0} step={500} defaultValue={min ?? ""} placeholder={String(lo)} className="field" /></div>
              <div><label htmlFor="f-max" className="field-label">Máximo</label><input id="f-max" name="max" type="number" inputMode="numeric" min={0} step={500} defaultValue={max ?? ""} placeholder={String(hi)} className="field" /></div>
            </div>
            <label className="it flex items-center gap-3 !text-[18px]"><input type="checkbox" name="disponibilidad" value="disponibles" defaultChecked={availability === "disponibles"} className="h-4 w-4 accent-[var(--brand-gold)]" /> Solo disponibles</label>
            <div className="flex items-center justify-between gap-3">
              <button type="submit" className="btn btn-gold !min-h-[44px] !px-8">Filtrar</button>
              <p className="it !text-[17px] text-ink-muted">{formatCOP(lo)} — {formatCOP(hi)}</p>
            </div>
          </form>
        </section>

        <nav aria-labelledby="w-categorias">
          <h2 id="w-categorias" className="!text-[15px] !tracking-[0.1em]">Categorías</h2>
          <span className="sep sep-left mt-4" aria-hidden="true" />
          <ul className="it mt-6 space-y-1.5">
            <li><Link href="/tienda" aria-current={!category ? "page" : undefined} className={`transition-colors hover:text-gold-ink ${!category ? "text-gold-ink" : ""}`}>Toda la tienda</Link></li>
            {categories.map((c) => (
              <li key={c.id}><Link href={`/tienda/${c.slug}`} aria-current={category?.id === c.id ? "page" : undefined} className={`transition-colors hover:text-gold-ink ${category?.id === c.id ? "text-gold-ink" : ""}`}>{c.name} <span className="text-ink-muted">({c.product_count})</span></Link></li>
            ))}
          </ul>
        </nav>

        {featured.length ? (
          <section aria-labelledby="w-destacados">
            <h2 id="w-destacados" className="!text-[15px] !tracking-[0.1em]">Destacados</h2>
            <span className="sep sep-left mt-4" aria-hidden="true" />
            <ul className="mt-6 space-y-5">
              {featured.map((p) => {
                const { price } = priceFrom(p);
                return (
                  <li key={p.id}>
                    <Link href={`/producto/${p.slug}`} className="group flex items-center gap-4">
                      <span className="relative h-[72px] w-[72px] shrink-0 overflow-hidden bg-surface-soft">{p.images?.[0] ? <Image src={p.images[0].url} alt="" fill sizes="72px" className="object-cover" quality={60} /> : null}</span>
                      <span><span className="block font-sans text-[12px] font-semibold uppercase leading-snug tracking-[0.08em] transition-colors group-hover:text-gold-deep">{p.name}</span><span className="it !text-[18px]">{formatCOP(price)}</span></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-[30px] lg:grid-cols-[minmax(0,1fr)_305px]" aria-hidden="true">
      <div>
        <div className="skeleton h-[52px]" />
        <div className="mt-8 grid grid-cols-1 gap-x-[30px] gap-y-12 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (<div key={i}><div className="skeleton aspect-square" /><div className="skeleton mx-auto mt-5 h-4 w-2/3" /></div>))}
        </div>
      </div>
      <div className="skeleton hidden h-96 lg:block" />
    </div>
  );
}

export async function ShopView({ searchParams, category }: { searchParams: SP; category: Category | null }) {
  const band = category?.image ?? (await getBandImage());
  return (
    <>
      <PageBand title={category?.name ?? "Tienda"} image={band} />
      <div className="container-site pb-[70px] pt-[50px] md:pb-[100px] md:pt-[70px]">
        {category?.description ? <p className="it mb-10 max-w-[720px]">{category.description}</p> : null}
        <Suspense fallback={<GridSkeleton />}>
          <Results searchParams={searchParams} category={category} />
        </Suspense>
      </div>
    </>
  );
}

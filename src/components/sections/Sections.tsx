import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Picture } from "@/components/ui/Picture";
import { RichText } from "@/components/ui/RichText";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductCard } from "@/components/shop/ProductCard";
import { FaqJsonLd } from "@/components/seo/JsonLd";
import { HeroSlides, type HeroSlide } from "./HeroSlides";
import { QuoteSlider } from "./QuoteSlider";
import { ParallaxBand } from "./ParallaxBand";
import { TraditionTimeline } from "./TraditionTimeline";
import { getCatalog, getMediaIndex, getSettings, priceFrom } from "@/lib/data/public";
import { instagramUrl, whatsappLink, type SiteSettings } from "@/lib/cms/settings";
import { formatCOP } from "@/lib/format";
import type { ImageRef, Section } from "@/lib/types";

type C = Record<string, unknown>;
type Ctx = { media: Record<string, ImageRef>; settings: SiteSettings; first: boolean };

const str = (c: C, k: string) => (typeof c[k] === "string" ? (c[k] as string) : "");
const list = (c: C, k: string) => (Array.isArray(c[k]) ? (c[k] as C[]) : []);
const img = (ctx: Ctx, id: unknown) => (typeof id === "string" ? ctx.media[id] ?? null : null);

/** Resuelve enlaces especiales: "whatsapp:" abre el chat configurado. */
function resolveHref(href: string, ctx: Ctx, message?: string) {
  if (!href) return null;
  if (href.startsWith("whatsapp:")) {
    const s = ctx.settings.whatsapp;
    return s.enabled ? whatsappLink(s.number, message || s.default_message) : null;
  }
  return href;
}

function Cta({ label, href, ctx, variant = "btn btn-gold", className = "" }: { label: string; href: string; ctx: Ctx; variant?: string; className?: string }) {
  const url = resolveHref(href, ctx);
  if (!label || !url) return null;
  return /^https?:\/\//.test(url) ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`${variant} ${className}`}>{label}</a>
  ) : (
    <Link href={url} className={`${variant} ${className}`}>{label}</Link>
  );
}

/** URL optimizada de Next para usarla como imagen de fondo CSS. */
const bgUrl = (url: string, w: number) => `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=85`;

const PAD = "py-[70px] md:py-[100px]";

/* ---------------------------------------------------------------- Portada */
function Hero({ s, ctx }: { s: Section; ctx: Ctx }) {
  const c = s.content;
  const mk = (x: C): HeroSlide => {
    const ctas = [
      { label: str(x, "cta_primary_label") || str(c, "cta_primary_label"), href: resolveHref(str(x, "cta_primary_href") || str(c, "cta_primary_href"), ctx) ?? "", kind: "solid" as const },
      { label: str(x, "cta_secondary_label") || str(c, "cta_secondary_label"), href: resolveHref(str(x, "cta_secondary_href") || str(c, "cta_secondary_href"), ctx) ?? "", kind: "outline" as const },
    ].filter((b) => b.label && b.href);
    return { bg: img(ctx, x.bg), image: img(ctx, x.image), eyebrow: str(x, "eyebrow") || str(c, "eyebrow"), title: str(x, "title") || str(c, "title"), text: str(x, "text") || str(c, "subtitle"), ctas };
  };
  let slides = list(c, "slides").map(mk).filter((x) => x.title);
  if (!slides.length && str(c, "title")) slides = [mk({})];
  if (!slides.length) return null;
  return <HeroSlides slides={slides} />;
}

/* ---------------------------------------------------------------- Categorías (tarjetas con READ MORE) */
function Categories({ s, ctx }: { s: Section; ctx: Ctx }) {
  const c = s.content;
  const items = list(c, "items");
  return (
    <section className={`container-site ${PAD}`}>
      <SectionHeading eyebrow={str(c, "eyebrow")} title={str(c, "title")} intro={str(c, "intro")} />
      <div className="mx-auto mt-[45px] flex max-w-[750px] flex-wrap justify-center gap-y-[60px]">
        {items.map((it, i) => {
          const href = resolveHref(str(it, "href"), ctx) ?? "/tienda";
          return (
            <Link key={i} href={href} className="group block w-1/2 px-2 text-center md:w-1/3">
              <div className="relative mx-auto h-[110px] w-[130px]">
                <Picture image={img(ctx, it.image)} sizes="130px" quality={85} className="object-contain [filter:drop-shadow(0_9px_6px_rgba(0,0,0,0.16))] transition-transform duration-[800ms] ease-out group-hover:scale-105" />
              </div>
              <h3 className="mt-[17px] !font-sans !text-[13px] !font-semibold !leading-[1.4] !tracking-[0.1em]">{str(it, "title")}</h3>
              {str(it, "text") ? <p className="it mt-[3px] !text-[16px] !leading-[20px]">{str(it, "text")}</p> : null}
              <span className="it mt-[2px] block !text-[16px] !leading-[20px] transition-colors group-hover:text-gold-deep">{str(it, "link_label") || "Ver más"}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Productos destacados (grilla) */
async function FeaturedProducts({ s, ctx }: { s: Section; ctx: Ctx }) {
  const c = s.content;
  const { products } = await getCatalog();
  const source = str(c, "source") || "featured";
  const limit = Math.min(Math.max(Number(c.limit) || 6, 1), 24);
  let list_ = products;
  if (source === "featured") list_ = products.filter((p) => p.is_featured);
  if (source === "latest") list_ = [...products].sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (source === "galletas") list_ = products.filter((p) => p.kind === "galleta_personalizada");
  if (source === "alfajores") list_ = products.filter((p) => p.kind === "alfajor");
  list_ = list_.slice(0, limit);
  if (!list_.length) return null;
  return (
    <section className={PAD}>
      <div className="container-site">
        <SectionHeading eyebrow={str(c, "eyebrow")} title={str(c, "title")} intro={str(c, "intro")} />
        {s.variant === "carousel" ? (
          <div className="scroll-snap-x -mx-5 mt-14 flex gap-6 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8">
            {list_.map((p, i) => (
              <div key={p.id} className="w-[72%] shrink-0 sm:w-[42%] lg:w-[31%]"><ProductCard product={p} index={i} sizes="(min-width:1024px) 31vw, 72vw" /></div>
            ))}
          </div>
        ) : (
          <div className="mt-14 grid grid-cols-1 gap-x-[30px] gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {list_.map((p, i) => <ProductCard key={p.id} product={p} index={i} sizes="(min-width:1024px) 31vw, (min-width:640px) 48vw, 100vw" />)}
          </div>
        )}
        {str(c, "cta_label") ? <div className="mt-14 text-center" data-reveal><Cta label={str(c, "cta_label")} href={str(c, "cta_href") || "/tienda"} ctx={ctx} variant="btn btn-outline" /></div> : null}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Bloque dividido (A TRUE DELIGHT) */
function FeatureSplit({ s, ctx }: { s: Section; ctx: Ctx }) {
  const c = s.content;
  const left = s.variant !== "image-right";
  const bullets = list(c, "bullets").map((b) => str(b, "text")).filter(Boolean);
  return (
    <section className="grid min-h-[520px] lg:grid-cols-2">
      <div className={`relative min-h-[340px] overflow-hidden bg-mist ${left ? "" : "lg:order-2"}`} data-reveal-mask>
        <Picture image={img(ctx, c.image)} sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
      </div>
      <div className={`flex items-center px-6 py-14 md:px-[8%] ${left ? "" : "lg:order-1"}`}>
        <div className="w-full max-w-[560px]">
          {str(c, "eyebrow") ? <p className="eyebrow" data-reveal>{str(c, "eyebrow")}</p> : null}
          <h3 className="mt-1" data-reveal>{str(c, "title")}</h3>
          <span className="sep sep-left mt-6" aria-hidden="true" />
          {str(c, "text") ? <div className="mt-7" data-reveal><RichText text={str(c, "text")} /></div> : null}
          {bullets.length ? (
            <ul className="mt-6 space-y-2.5">
              {bullets.map((b, i) => (
                <li key={i} className="it flex items-start gap-3" data-reveal style={{ ["--reveal-delay" as string]: 70 * i }}>
                  <i className="mt-[11px] block h-[7px] w-[7px] shrink-0 rotate-45 bg-gold" aria-hidden="true" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {str(c, "cta_label") ? <div className="mt-9" data-reveal><Cta label={str(c, "cta_label")} href={str(c, "cta_href")} ctx={ctx} /></div> : null}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Lista de productos con precios (menú) */
async function MenuList({ s, ctx }: { s: Section; ctx: Ctx }) {
  const c = s.content;
  const { products } = await getCatalog();
  const source = str(c, "source") || "alfajores";
  let items = products;
  if (source === "featured") items = products.filter((p) => p.is_featured);
  else if (source === "dulces") items = products.filter((p) => p.kind === "galleta_personalizada" || p.kind === "alfajor");
  else if (source === "galletas") items = products.filter((p) => p.kind === "galleta_personalizada");
  else if (source === "alfajores") items = products.filter((p) => p.kind === "alfajor");
  else if (source === "cajas") items = products.filter((p) => p.kind === "caja");
  items = items.slice(0, Math.min(Math.max(Number(c.limit) || 5, 1), 12));
  if (!items.length) return null;
  const image = img(ctx, c.image);
  const plate = img(ctx, c.plate);
  return (
    <ParallaxBand src={image ? bgUrl(image.url, 2048) : null} ratio={image && image.width && image.height ? image.width / image.height : 2.33} naturalHeight={image?.height ?? 822} speed={1.1} className="parallax-band-veil flex min-h-[828px] items-center !py-[100px] md:!py-[150px]">
      <div className="mx-auto w-[min(1300px,100%-90px)]">
        <div className="max-w-[525px]">
          <h3 data-reveal>{str(c, "title")}</h3>
          <span className="sep sep-left mt-[21px]" data-reveal="sep" aria-hidden="true" />
          <ul className="mt-[11px] space-y-[22px] pt-6">
            {items.map((p) => {
              const { price, from } = priceFrom(p);
              return (
                <li key={p.id}>
                  <Link href={`/producto/${p.slug}`} className="group block">
                    <h5 className="!font-sans !text-[14px] !font-semibold !uppercase !leading-[1.4] !tracking-[0.1em] transition-colors group-hover:text-gold-deep">{p.name}</h5>
                    <div className="mt-[2px] flex items-baseline gap-1">
                      <span className="it !text-[18px] !leading-[24px] line-clamp-1 max-w-[70%]">{p.short_description ?? ""}</span>
                      <span className="mb-[3px] flex-1 border-b border-dotted border-ink/60" aria-hidden="true" />
                      <span className="it !text-[18px] whitespace-nowrap">{from ? "Desde " : ""}{formatCOP(price)}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          {str(c, "cta_label") ? <div className="mt-9"><Cta label={str(c, "cta_label")} href={str(c, "cta_href") || "/tienda"} ctx={ctx} className="!min-h-[40px] !px-10 !py-2" /></div> : null}
        </div>
        {plate ? (
          <div className="relative mx-auto mt-10 aspect-[1100/785] w-[88%] max-w-[460px] md:absolute md:right-[3%] md:top-1/2 md:mt-0 md:w-[44%] md:max-w-[640px] md:-translate-y-1/2">
            <Picture image={plate} sizes="(min-width:768px) 44vw, 88vw" quality={85} className="object-contain [filter:drop-shadow(0_18px_18px_rgba(0,0,0,0.14))]" />
          </div>
        ) : null}
      </div>
    </ParallaxBand>
  );
}

/* ---------------------------------------------------------------- Cronología (TRADICIÓN) */
function Timeline({ s, ctx }: { s: Section; ctx: Ctx }) {
  const c = s.content;
  const image = img(ctx, c.image);
  const items = list(c, "items").slice(0, 5).map((it) => ({ year: str(it, "year"), label: str(it, "label"), title: str(it, "title"), text: str(it, "text") }));
  return <TraditionTimeline bg={image ? bgUrl(image.url, 1920) : null} eyebrow={str(c, "eyebrow")} title={str(c, "title")} intro={str(c, "intro")} items={items} />;
}

/* ---------------------------------------------------------------- Historia (OUR STORY / TRADITION) */
function Story({ s, ctx }: { s: Section; ctx: Ctx }) {
  const c = s.content;
  const image = img(ctx, c.image);
  const paragraphs = str(c, "text").split(/\n{2,}/).map((t) => t.trim()).filter(Boolean);
  return (
    <section className="story-band" style={image ? { backgroundImage: `url("${bgUrl(image.url, 1920)}")` } : undefined}>
      <div className="mx-auto w-[min(780px,100%-90px)] text-center">
        {str(c, "eyebrow") ? <p className="eyebrow" data-reveal>{str(c, "eyebrow")}</p> : null}
        {str(c, "title") ? <h2 data-reveal style={{ ["--reveal-delay" as string]: 60 }}>{str(c, "title")}</h2> : null}
        <span className="sep mt-[27px]" data-reveal="sep" aria-hidden="true" />
        {paragraphs.length ? (
          <div className="it-lg mt-[26px]" data-reveal style={{ ["--reveal-delay" as string]: 120 }}>
            {paragraphs.map((t, i) => <p key={i} className={i ? "mt-4" : ""}>{t}</p>)}
          </div>
        ) : null}
        {str(c, "quote") ? (
          <p className="mt-5 flex h-[112px] items-center justify-center font-script text-[48px] leading-none text-[#d4d4d4]" aria-hidden="true" data-reveal="fade" style={{ ["--reveal-delay" as string]: 200 }}>{str(c, "quote")}</p>
        ) : null}
        {str(c, "cta_label") ? <div className="mt-8" data-reveal><Cta label={str(c, "cta_label")} href={str(c, "cta_href")} ctx={ctx} /></div> : null}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Frase sobre imagen (parallax) */
function Quote({ s, ctx }: { s: Section; ctx: Ctx }) {
  const c = s.content;
  const image = img(ctx, c.image);
  return (
    <ParallaxBand src={image ? bgUrl(image.url, 2048) : null} ratio={image && image.width && image.height ? image.width / image.height : 2.66} naturalHeight={image?.height ?? 769}>
      <div className="mx-auto w-[min(1300px,100%-90px)] text-center min-[681px]:px-[10%]">
        <h2 className="my-[25px] !font-script !text-[60px] !font-normal !normal-case !leading-[75px] !tracking-normal !text-[#c19d56] min-[681px]:!text-[90px] min-[681px]:!leading-[100px]" data-reveal>{str(c, "text")}</h2>
      </div>
    </ParallaxBand>
  );
}

/* ---------------------------------------------------------------- Galería (imágenes unidas) */
function Gallery({ s, ctx }: { s: Section; ctx: Ctx }) {
  const c = s.content;
  const images = list(c, "images").map((x) => img(ctx, x.image)).filter((x): x is ImageRef => !!x);
  if (!images.length) return null;
  const strip = s.variant === "strip";
  return (
    <section className={strip ? "pb-0" : ""}>
      {str(c, "title") ? (
        <div className={`container-site ${strip ? "pb-14 pt-[70px] md:pt-[100px]" : "pb-12 pt-[70px] md:pt-[100px]"}`}><SectionHeading eyebrow={str(c, "eyebrow")} title={str(c, "title")} /></div>
      ) : null}
      {strip ? (
        <div className="grid grid-cols-2 gap-[5px] md:grid-cols-5">
          {images.slice(0, 5).map((im, i) => (
            <figure key={im.id + i} className="group relative aspect-[4/5] overflow-hidden bg-mist" data-reveal="fade" style={{ ["--reveal-delay" as string]: i * 80 }}>
              <Picture image={im} sizes="(min-width:768px) 20vw, 50vw" className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-quart)] group-hover:scale-105" />
            </figure>
          ))}
        </div>
      ) : (
        <div className="grid auto-rows-[190px] grid-cols-2 grid-flow-dense gap-[5px] md:auto-rows-[350px] md:grid-cols-4">
          {images.map((im, i) => (
            <figure key={im.id + i} className={`group relative overflow-hidden bg-mist ${i % 7 === 2 ? "md:row-span-2" : ""}`} data-reveal="fade" style={{ ["--reveal-delay" as string]: (i % 4) * 80 }}>
              <Picture image={im} sizes={i % 7 === 2 ? "(min-width:768px) 25vw, 50vw" : "(min-width:768px) 25vw, 50vw"} quality={70} className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-quart)] group-hover:scale-105" />
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- Pasos (tablas de la referencia) */
function Steps({ s, ctx }: { s: Section; ctx: Ctx }) {
  const c = s.content;
  const items = list(c, "items");
  return (
    <section className={PAD}>
      <div className="container-site">
        <SectionHeading eyebrow={str(c, "eyebrow")} title={str(c, "title")} intro={str(c, "intro")} />
        <ol className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <li key={i} className="relative border border-line bg-white/80 px-7 pb-10 pt-9 text-center" data-reveal style={{ ["--reveal-delay" as string]: i * 110 }}>
              <h3 className="font-script !text-[40px] !font-normal !normal-case !tracking-normal text-gold-ink">{str(it, "title")}</h3>
              <p className="it mt-1 !text-[38px] text-ink" aria-hidden="true">{String(i + 1).padStart(2, "0")}</p>
              <p className="it mt-4 !text-[18px] !leading-[1.7]">{str(it, "text")}</p>
            </li>
          ))}
        </ol>
        {str(c, "cta_label") ? <div className="mt-14 text-center" data-reveal><Cta label={str(c, "cta_label")} href={str(c, "cta_href")} ctx={ctx} /></div> : null}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Testimonios */
function Testimonials({ s }: { s: Section; ctx: Ctx }) {
  const c = s.content;
  const items = list(c, "items").filter((x) => str(x, "quote")).map((x) => ({ quote: str(x, "quote"), author: str(x, "author"), detail: str(x, "detail") }));
  if (!items.length) return null;
  return (
    <section className={PAD}>
      <div className="container-site">
        <SectionHeading eyebrow={str(c, "eyebrow")} title={str(c, "title")} />
        <div className="mt-12"><QuoteSlider items={items} /></div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Instagram */
function Instagram({ s, ctx }: { s: Section; ctx: Ctx }) {
  const c = s.content;
  const href = instagramUrl(ctx.settings.social.instagram);
  if (!href) return null; // sin cuenta configurada no se muestra
  const handle = ctx.settings.social.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "").replace(/^@?/, "@");
  const images = list(c, "images").map((x) => img(ctx, x.image)).filter((x): x is ImageRef => !!x).slice(0, 5);
  return (
    <section className="pb-[70px] md:pb-[100px]">
      <div className="container-site pt-[70px] md:pt-[100px]"><SectionHeading eyebrow={str(c, "eyebrow")} title={str(c, "title")} intro={str(c, "text")} /></div>
      <div className="mt-14 grid grid-cols-2 md:grid-cols-5">
        {images.map((im, i) => (
          <a key={im.id + i} href={href} target="_blank" rel="noopener noreferrer" className="group relative block aspect-[4/5] overflow-hidden bg-mist" data-reveal="fade" style={{ ["--reveal-delay" as string]: i * 80 }} aria-label={`Ver ${handle} en Instagram`}>
            <Picture image={im} sizes="(min-width:768px) 20vw, 50vw" quality={70} className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-quart)] group-hover:scale-105" />
            <span className="absolute inset-0 flex items-center justify-center bg-white/0 text-gold-deep opacity-0 transition-all duration-500 group-hover:bg-white/60 group-hover:opacity-100"><Icon name="instagram" size={28} strokeWidth={1.2} /></span>
          </a>
        ))}
      </div>
      <div className="mt-12 text-center"><a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-outline">{handle}</a></div>
    </section>
  );
}

/* ---------------------------------------------------------------- WhatsApp */
function WhatsAppCta({ s, ctx }: { s: Section; ctx: Ctx }) {
  const c = s.content;
  const w = ctx.settings.whatsapp;
  const href = w.enabled ? whatsappLink(w.number, str(c, "message") || w.default_message) : null;
  if (!href) return null; // sin número configurado no se muestra
  const image = img(ctx, c.image);
  return (
    <section className="container-site py-[50px]">
      <div className="grid items-stretch border border-line bg-white/70 md:grid-cols-2" data-reveal>
        <div className="relative hidden min-h-[320px] md:block"><Picture image={image} sizes="45vw" className="object-cover" /></div>
        <div className="flex flex-col items-center justify-center px-8 py-14 text-center md:px-14">
          {str(c, "eyebrow") ? <p className="eyebrow">{str(c, "eyebrow")}</p> : null}
          <h3 className="mt-1 !text-[30px] md:!text-[36px]">{str(c, "title")}</h3>
          <span className="sep mt-5" aria-hidden="true" />
          {str(c, "text") ? <p className="it mt-6 max-w-[440px]">{str(c, "text")}</p> : null}
          <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-gold mt-8"><Icon name="whatsapp" size={17} /> {str(c, "button_label") || "Escribir por WhatsApp"}</a>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- FAQ */
function Faq({ s, ctx }: { s: Section; ctx: Ctx }) {
  const c = s.content;
  const items = list(c, "items").map((x) => ({ question: str(x, "question"), answer: str(x, "answer") })).filter((x) => x.question && x.answer);
  if (!items.length) return null;
  const Title = ctx.first ? "h1" : "h2";
  return (
    <section className={`container-site ${PAD}`}>
      <SectionHeading eyebrow={str(c, "eyebrow")} title={str(c, "title")} as={Title} />
      <div className="mx-auto mt-14 max-w-[820px] border-t border-line">
        {items.map((q, i) => (
          <details key={i} className="group border-b border-line" data-reveal style={{ ["--reveal-delay" as string]: i * 60 }}>
            <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-4 py-4 font-sans text-[14px] font-semibold uppercase tracking-[0.08em] text-ink [&::-webkit-details-marker]:hidden">
              {q.question}
              <span className="relative block h-[11px] w-[11px] shrink-0 text-gold-ink" aria-hidden="true">
                <span className="absolute left-0 top-[5px] block h-px w-full bg-current" />
                <span className="absolute left-[5px] top-0 block h-full w-px bg-current transition-transform duration-300 group-open:scale-y-0" />
              </span>
            </summary>
            <p className="it pb-6 pr-8">{q.answer}</p>
          </details>
        ))}
      </div>
      <FaqJsonLd items={items} />
    </section>
  );
}

/* ---------------------------------------------------------------- Banner */
function Banner({ s, ctx }: { s: Section; ctx: Ctx }) {
  const c = s.content;
  const center = s.variant === "center";
  return (
    <section className="container-site py-12">
      <div className="relative overflow-hidden bg-mist" data-reveal>
        <Picture image={img(ctx, c.image)} sizes="(min-width:1340px) 1300px, 100vw" className="object-cover" />
        <div className={`absolute inset-0 ${center ? "bg-white/55" : "bg-gradient-to-r from-white/90 via-white/65 to-white/0"}`} aria-hidden="true" />
        <div className={`relative px-8 py-16 md:px-14 md:py-24 ${center ? "text-center" : "max-w-[560px]"}`}>
          {str(c, "eyebrow") ? <p className="eyebrow">{str(c, "eyebrow")}</p> : null}
          <h3 className="mt-1">{str(c, "title")}</h3>
          <span className={`sep mt-5 ${center ? "" : "sep-left"}`} aria-hidden="true" />
          {str(c, "text") ? <p className="it mt-6">{str(c, "text")}</p> : null}
          <div className="mt-8"><Cta label={str(c, "cta_label")} href={str(c, "cta_href")} ctx={ctx} /></div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Texto libre */
function RichTextSection({ s, ctx }: { s: Section; ctx: Ctx }) {
  const c = s.content;
  return (
    <section className={`container-site ${PAD}`}>
      <SectionHeading eyebrow={str(c, "eyebrow")} title={str(c, "title")} as={ctx.first ? "h1" : "h2"} />
      {str(c, "body") ? <div className="mx-auto mt-10 max-w-[720px] text-center" data-reveal><RichText text={str(c, "body")} /></div> : null}
    </section>
  );
}

const REGISTRY: Record<string, (p: { s: Section; ctx: Ctx }) => React.ReactNode | Promise<React.ReactNode>> = {
  hero: Hero,
  categories: Categories,
  timeline: Timeline,
  featured_products: FeaturedProducts,
  feature_split: FeatureSplit,
  menu_list: MenuList,
  story: Story,
  quote: Quote,
  gallery: Gallery,
  steps: Steps,
  testimonials: Testimonials,
  instagram: Instagram,
  whatsapp_cta: WhatsAppCta,
  faq: Faq,
  banner: Banner,
  rich_text: RichTextSection,
};

/** Renderiza una lista de secciones (publicadas o, en vista previa, borradores). */
export async function SectionList({ sections }: { sections: Section[] }) {
  const [media, settings] = await Promise.all([getMediaIndex(), getSettings()]);
  return (
    <>
      {sections.map((s, i) => {
        const Comp = REGISTRY[s.type];
        if (!Comp) return null;
        return <Comp key={s.id} s={s} ctx={{ media, settings, first: i === 0 }} />;
      })}
    </>
  );
}

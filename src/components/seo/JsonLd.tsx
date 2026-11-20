import { getImage, getSettings } from "@/lib/data/public";
import { SITE_URL } from "@/lib/env";
import { instagramUrl, socialUrl } from "@/lib/cms/settings";
import type { Product } from "@/lib/types";

/** Serializa JSON-LD escapando "<" para que el contenido no pueda cerrar el <script>. */
function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export async function OrganizationJsonLd() {
  const s = await getSettings();
  const logo = await getImage(s.brand.logo_id);
  const sameAs = [instagramUrl(s.social.instagram), socialUrl(s.social.facebook, "https://www.facebook.com/"), socialUrl(s.social.tiktok, "https://www.tiktok.com/@")].filter(Boolean);
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Bakery",
            "@id": `${SITE_URL}/#negocio`,
            name: s.brand.name,
            slogan: s.brand.slogan,
            url: SITE_URL,
            logo: logo?.url,
            image: logo?.url,
            description: s.seo.description,
            servesCuisine: "Repostería",
            currenciesAccepted: "COP",
            ...(s.contact.email ? { email: s.contact.email } : {}),
            ...(s.contact.phone ? { telephone: s.contact.phone } : {}),
            ...(s.contact.city ? { areaServed: s.contact.service_area || s.contact.city } : {}),
            ...(sameAs.length ? { sameAs } : {}),
          },
          {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#sitio`,
            url: SITE_URL,
            name: s.brand.name,
            inLanguage: "es-CO",
            publisher: { "@id": `${SITE_URL}/#negocio` },
            potentialAction: {
              "@type": "SearchAction",
              target: `${SITE_URL}/tienda?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
        ],
      }}
    />
  );
}

export function ProductJsonLd({ product }: { product: Product }) {
  const variants = product.variants ?? [];
  const prices = variants.length ? variants.map((v) => v.price) : [product.price];
  const availability =
    product.stock_status === "agotado" ? "https://schema.org/OutOfStock" : product.stock_status === "bajo_pedido" ? "https://schema.org/PreOrder" : "https://schema.org/InStock";
  const url = `${SITE_URL}/producto/${product.slug}`;
  const offers =
    prices.length > 1
      ? { "@type": "AggregateOffer", priceCurrency: "COP", lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length, availability, url }
      : { "@type": "Offer", priceCurrency: "COP", price: prices[0], availability, url, itemCondition: "https://schema.org/NewCondition" };
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.short_description || product.description,
        image: (product.images ?? []).map((i) => i.url),
        sku: product.slug,
        category: product.category?.name,
        brand: { "@type": "Brand", name: "Las Galletas de Tabo" },
        offers,
      }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; path: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
      }}
    />
  );
}

export function FaqJsonLd({ items }: { items: { question: string; answer: string }[] }) {
  if (!items.length) return null;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((q) => ({ "@type": "Question", name: q.question, acceptedAnswer: { "@type": "Answer", text: q.answer } })),
      }}
    />
  );
}

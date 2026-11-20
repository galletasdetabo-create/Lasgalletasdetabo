import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RichText } from "@/components/ui/RichText";
import { getSettings } from "@/lib/data/public";
import type { LegalSettings } from "@/lib/cms/settings";

const PAGES: Record<string, { key: keyof LegalSettings; title: string }> = {
  terminos: { key: "terms", title: "Términos y condiciones" },
  privacidad: { key: "privacy", title: "Política de privacidad y tratamiento de datos" },
  envios: { key: "shipping", title: "Envíos y entregas" },
  cambios: { key: "returns", title: "Cambios y devoluciones" },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = PAGES[slug];
  if (!p) return {};
  const s = await getSettings();
  return { title: p.title, alternates: { canonical: `/legal/${slug}` }, robots: s.legal[p.key].trim() ? undefined : { index: false } };
}

export default function LegalPage(props: PageProps<"/legal/[slug]">) {
  return (
    <Suspense fallback={<div className="container-site max-w-3xl py-16" aria-hidden="true"><div className="skeleton h-80 rounded-[26px]" /></div>}>
      <LegalContent params={props.params} />
    </Suspense>
  );
}

async function LegalContent({ params }: { params: PageProps<"/legal/[slug]">["params"] }) {
  const { slug } = await params;
  const p = PAGES[slug];
  if (!p) notFound();
  const s = await getSettings();
  const text = s.legal[p.key].trim();
  return (
    <article className="container-site max-w-3xl py-16">
      <h1 className="text-center text-[2.2rem] sm:text-[2.8rem]">{p.title}</h1>
      <div className="mt-10 rounded-[26px] bg-white/90 p-7 ring-1 ring-line sm:p-10">
        {text ? <RichText text={text} /> : <p className="text-center text-ink-soft">Esta política está en preparación. Si tienes alguna pregunta, escríbenos desde la página de contacto.</p>}
      </div>
    </article>
  );
}

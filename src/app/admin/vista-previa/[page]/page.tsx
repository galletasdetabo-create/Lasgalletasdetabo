import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { RevealObserver } from "@/components/site/RevealObserver";
import { SectionList } from "@/components/sections/Sections";
import { requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { CMS_PAGES } from "@/lib/cms/sections";
import type { Section } from "@/lib/types";

async function Preview({ params }: PageProps<"/admin/vista-previa/[page]">) {
  await requireStaff();
  const { page } = await params;
  const meta = CMS_PAGES.find((p) => p.key === page);
  if (!meta) notFound();
  const { data } = await (await createSessionClient()).from("page_sections").select("*").eq("page", page);
  const sections: Section[] = (data ?? [])
    .map((s) => ({
      id: s.id, page: s.page, type: s.type, label: s.label,
      variant: s.draft_variant ?? s.variant,
      sort: s.draft_sort ?? s.sort,
      is_enabled: s.draft_enabled ?? s.is_enabled,
      content: (s.draft_content ?? s.content) as Record<string, unknown>,
    }))
    .filter((s) => s.is_enabled)
    .sort((a, b) => a.sort - b.sort);
  return (
    <>
      <div className="sticky top-0 z-[70] flex flex-wrap items-center justify-center gap-3 bg-chocolate px-4 py-2 text-center text-sm text-white">
        Vista previa de «{meta.label}» con los cambios sin publicar.
        <Link href={`/admin/contenido/${page}`} className="underline">Volver al editor</Link>
      </div>
      <SiteHeader />
      <main id="contenido"><SectionList sections={sections} /></main>
      <SiteFooter />
      <RevealObserver />
    </>
  );
}

export default function PreviewPage(props: PageProps<"/admin/vista-previa/[page]">) {
  return (
    <div className="site-root marble min-h-dvh">
      <Suspense fallback={<p className="p-10 text-center text-sm text-ink-muted">Cargando vista previa…</p>}>
        <Preview {...props} />
      </Suspense>
    </div>
  );
}

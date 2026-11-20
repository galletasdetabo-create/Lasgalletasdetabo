import Link from "next/link";
import { Badge, PageHeader } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { CMS_PAGES } from "@/lib/cms/sections";

export default async function ContentPage() {
  await requireStaff();
  const { data } = await (await createSessionClient()).from("page_sections").select("page, is_enabled, draft_content, draft_enabled, draft_sort, draft_variant");
  return (
    <>
      <PageHeader title="Páginas y secciones" description="Edita textos, imágenes, botones, orden y visibilidad de cada página. Los cambios se guardan como borrador hasta que los publiques." />
      <div className="grid gap-4 sm:grid-cols-2">
        {CMS_PAGES.map((p) => {
          const rows = (data ?? []).filter((r) => r.page === p.key);
          const drafts = rows.filter((r) => r.draft_content || r.draft_enabled !== null || r.draft_sort !== null || r.draft_variant).length;
          return (
            <Link key={p.key} href={`/admin/contenido/${p.key}`} className="group rounded-2xl bg-white p-6 ring-1 ring-line transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="font-serif text-xl">{p.label}</p>
                <Icon name="arrowRight" className="text-ink-muted transition-transform group-hover:translate-x-1" />
              </div>
              <p className="mt-1 text-sm text-ink-muted">{p.path} · {rows.filter((r) => r.is_enabled).length} de {rows.length} secciones visibles</p>
              {drafts ? <div className="mt-3"><Badge tone="bg-amber-50 text-amber-800 ring-amber-200">{drafts} con cambios sin publicar</Badge></div> : null}
            </Link>
          );
        })}
      </div>
      <p className="mt-8 text-sm text-ink-muted">La información de contacto, redes sociales, pie de página, SEO y textos legales se editan en <Link href="/admin/ajustes" className="text-rose-deep underline">Información y ajustes</Link>. Logotipo, colores y tipografías en <Link href="/admin/identidad" className="text-rose-deep underline">Identidad visual</Link>.</p>
    </>
  );
}

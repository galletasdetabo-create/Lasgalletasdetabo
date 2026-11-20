import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { SectionsEditor, type EditableSection } from "@/components/admin/SectionsEditor";
import { requireStaff } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { CMS_PAGES } from "@/lib/cms/sections";

export default async function EditPage(props: PageProps<"/admin/contenido/[page]">) {
  await requireStaff();
  const { page } = await props.params;
  const meta = CMS_PAGES.find((p) => p.key === page);
  if (!meta) notFound();
  const { data } = await (await createSessionClient()).from("page_sections").select("*").eq("page", page).order("sort");
  const sections: EditableSection[] = (data ?? [])
    .map((s) => ({
      id: s.id,
      type: s.type,
      label: s.label,
      variant: s.draft_variant ?? s.variant,
      enabled: s.draft_enabled ?? s.is_enabled,
      sort: s.draft_sort ?? s.sort,
      content: (s.draft_content ?? s.content) as Record<string, unknown>,
      hasDraft: !!(s.draft_content || s.draft_variant || s.draft_enabled !== null || s.draft_sort !== null),
      published: s.is_enabled,
    }))
    .sort((a, b) => a.sort - b.sort);
  return (
    <>
      <PageHeader back={{ href: "/admin/contenido", label: "Páginas" }} title={`Editar: ${meta.label}`} description={`Ruta pública ${meta.path}. Guarda los cambios, revisa la vista previa y publica cuando esté listo.`} />
      <SectionsEditor page={page} publicPath={meta.path} initial={sections} />
    </>
  );
}

import { SectionList } from "./Sections";
import { getSections } from "@/lib/data/public";

/** Página construida íntegramente con secciones del CMS. */
export async function CmsPage({ page, fallbackTitle }: { page: string; fallbackTitle: string }) {
  const sections = await getSections(page);
  if (!sections.length) {
    return (
      <div className="container-site py-24 text-center">
        <h1 className="text-[2.6rem]">{fallbackTitle}</h1>
      </div>
    );
  }
  return <SectionList sections={sections} />;
}

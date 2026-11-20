import { PageHeader } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/MediaLibrary";
import { requireStaff } from "@/lib/auth";

export default async function MediaPage(props: PageProps<"/admin/medios">) {
  await requireStaff();
  const sp = await props.searchParams;
  return (
    <>
      <PageHeader title="Biblioteca de medios" description="Sube, organiza y sustituye imágenes. Las imágenes en uso no se pueden eliminar; al sustituir una imagen se actualiza en todo el sitio." />
      <MediaLibrary initialFolder={typeof sp.carpeta === "string" ? sp.carpeta : ""} />
    </>
  );
}

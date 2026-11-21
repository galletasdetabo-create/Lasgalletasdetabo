import { requireStaff } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";

/** Sin sesión de equipo se redirige antes de enviar nada al navegador (respuesta 307). */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[260px_1fr]">
      <AdminNav role={user.role} email={user.email} />
      <main id="contenido" className="min-w-0 px-4 pb-16 pt-6 sm:px-8 lg:pt-10">{children}</main>
    </div>
  );
}

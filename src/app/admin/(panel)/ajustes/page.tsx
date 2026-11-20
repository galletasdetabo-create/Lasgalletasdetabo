import Link from "next/link";
import { Card, PageHeader } from "@/components/admin/ui";
import { SettingsTabs } from "@/components/admin/SettingsTabs";
import { requireStaff } from "@/lib/auth";
import { getAdminSettings } from "@/lib/admin/settings";

const TABS = [
  ["contacto", "Contacto"],
  ["redes", "Redes sociales"],
  ["whatsapp", "WhatsApp"],
  ["comercio", "Comercio"],
  ["seo", "SEO"],
  ["footer", "Pie de página"],
  ["legal", "Textos legales"],
] as const;

export default async function SettingsPage(props: PageProps<"/admin/ajustes">) {
  const user = await requireStaff();
  const sp = await props.searchParams;
  const tab = (TABS.find(([k]) => k === sp.tab)?.[0] ?? "contacto") as (typeof TABS)[number][0];
  const settings = await getAdminSettings();
  return (
    <>
      <PageHeader title="Información y ajustes" description="Datos comerciales y textos del sitio. Los campos vacíos no se muestran al público." />
      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="Secciones de ajustes">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/ajustes?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${tab === k ? "bg-chocolate text-white" : "bg-white ring-1 ring-line hover:bg-cream"}`}>{label}</Link>
        ))}
      </nav>
      <Card><SettingsTabs tab={tab} settings={settings} isAdmin={user.role === "admin"} /></Card>
    </>
  );
}

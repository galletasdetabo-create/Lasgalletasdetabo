import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Panel administrativo", template: "%s · CRM Las Galletas de Tabo" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-[#faf8f7] text-ink">{children}</div>;
}

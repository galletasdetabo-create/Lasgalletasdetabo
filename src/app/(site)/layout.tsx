import { Suspense } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { RevealObserver } from "@/components/site/RevealObserver";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import { PageViewTracker } from "@/components/site/PageViewTracker";
import { Preloader } from "@/components/site/Preloader";
import { ToTop } from "@/components/site/ToTop";
import { OrganizationJsonLd } from "@/components/seo/JsonLd";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-root marble min-h-dvh">
      <Preloader />
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-white focus:px-5 focus:py-3 focus:shadow-lg">
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido">{children}</main>
      <SiteFooter />
      <WhatsAppFloat />
      <ToTop />
      <Suspense fallback={null}>
        <RevealObserver />
        <PageViewTracker />
      </Suspense>
      <OrganizationJsonLd />
    </div>
  );
}

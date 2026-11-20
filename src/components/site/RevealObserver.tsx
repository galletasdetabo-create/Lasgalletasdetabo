"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Un único IntersectionObserver para todos los elementos [data-reveal] y [data-reveal-mask].
 * Coste de JS mínimo; la animación la hace CSS (transform/opacity → sin saltos de layout).
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed]), [data-reveal-mask]:not([data-revealed])");
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.setAttribute("data-revealed", ""));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-revealed", "");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    // Contenido que llega en streaming después de montar
    const mo = new MutationObserver(() => {
      document
        .querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed]), [data-reveal-mask]:not([data-revealed])")
        .forEach((el) => io.observe(el));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);
  return null;
}

"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    // Diferido para no competir con la carga inicial.
    const id = window.setTimeout(() => track("page_view"), 1200);
    return () => window.clearTimeout(id);
  }, [pathname]);
  return null;
}

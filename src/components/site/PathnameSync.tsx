"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Lee la ruta actual dentro de un <Suspense> para que el componente padre pueda prerenderizarse. */
export function PathnameSync({ onChange }: { onChange: (path: string) => void }) {
  const pathname = usePathname();
  useEffect(() => onChange(pathname), [pathname, onChange]);
  return null;
}

"use client";
import { useEffect, useState } from "react";

/** Línea dorada con rombo (como la referencia). Se oculta cuando la página termina de cargar. */
export function Preloader() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const hide = () => window.setTimeout(() => setDone(true), 350);
    if (document.readyState === "complete") hide();
    else window.addEventListener("load", hide, { once: true });
    const safety = window.setTimeout(() => setDone(true), 2500); // nunca bloquear la página
    return () => window.clearTimeout(safety);
  }, []);
  return (
    <div className={`preloader ${done ? "is-done" : ""}`} aria-hidden="true">
      <i />
    </div>
  );
}

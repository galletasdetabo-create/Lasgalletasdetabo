"use client";
import { useEffect, useState } from "react";

/** Flecha dorada para volver arriba (aparece tras desplazarse). */
export function ToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button type="button" className="to-top" data-show={show} aria-label="Volver arriba" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} tabIndex={show ? 0 : -1}>
      <svg viewBox="0 0 34 20" width="34" height="20" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true"><path d="M1 19 17 2l16 17" /></svg>
    </button>
  );
}

"use client";
import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  src: string | null;
  /** Proporción ancho/alto de la imagen. */
  ratio: number;
  naturalHeight: number;
  /** Velocidad de la referencia (data-parallax-bg-speed): la imagen se desplaza a 0,4 × velocidad. */
  speed?: number;
  className?: string;
  children: ReactNode;
}

/**
 * Franja con parallax idéntica a la de la referencia: la imagen queda fija (background-attachment: fixed)
 * y su posición vertical es el 40 % de la distancia de la franja al borde superior de la ventana.
 * Solo en escritorio con puntero; en táctiles y con "reducir movimiento" la imagen se queda quieta y cubre la franja.
 */
export function ParallaxBand({ src, ratio, naturalHeight, speed = 1, className = "", children }: Props) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return;
    const mq = window.matchMedia("(min-width: 1025px) and (hover: hover) and (prefers-reduced-motion: no-preference)");
    let raf = 0;
    const apply = () => {
      raf = 0;
      if (!mq.matches) {
        el.style.backgroundSize = "";
        el.style.backgroundPosition = "";
        return;
      }
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Altura mínima para que la imagen fija siempre cubra la parte visible de la franja.
      const f = 0.4 * speed;
      const rowH = el.offsetHeight;
      const h = Math.max(naturalHeight, vh - f * (vh - rowH), vw / ratio);
      el.style.backgroundSize = `${Math.ceil(h * ratio)}px ${Math.ceil(h)}px`;
      el.style.backgroundPosition = `50% ${f * el.getBoundingClientRect().top}px`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    mq.addEventListener("change", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      mq.removeEventListener("change", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [src, ratio, naturalHeight, speed]);
  return (
    <section ref={ref} className={`parallax-band ${className}`} style={src ? { backgroundImage: `url("${src}")` } : undefined}>
      {children}
    </section>
  );
}

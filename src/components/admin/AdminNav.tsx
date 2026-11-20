"use client";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useState } from "react";
import { PathnameSync } from "@/components/site/PathnameSync";
import { Icon, type IconName } from "@/components/ui/Icon";
import { logoutAction } from "@/app/admin/acceso/actions";
import type { AppRole } from "@/lib/types";

const GROUPS: { title: string; items: { href: string; label: string; icon: IconName; adminOnly?: boolean }[] }[] = [
  { title: "General", items: [{ href: "/admin", label: "Panel", icon: "home" }] },
  {
    title: "Comercio",
    items: [
      { href: "/admin/pedidos", label: "Pedidos", icon: "bag" },
      { href: "/admin/productos", label: "Productos e inventario", icon: "box" },
      { href: "/admin/categorias", label: "Categorías", icon: "tag" },
      { href: "/admin/clientes", label: "Clientes", icon: "users" },
      { href: "/admin/cupones", label: "Cupones y descuentos", icon: "dollar", adminOnly: true },
      { href: "/admin/entregas", label: "Métodos de entrega", icon: "truck", adminOnly: true },
      { href: "/admin/pagos", label: "Mercado Pago", icon: "card", adminOnly: true },
    ],
  },
  {
    title: "Sitio web",
    items: [
      { href: "/admin/contenido", label: "Páginas y secciones", icon: "layout" },
      { href: "/admin/medios", label: "Biblioteca de medios", icon: "image" },
      { href: "/admin/identidad", label: "Identidad visual", icon: "palette" },
      { href: "/admin/ajustes", label: "Información y ajustes", icon: "settings" },
      { href: "/admin/mensajes", label: "Mensajes", icon: "message" },
    ],
  },
  {
    title: "Seguridad",
    items: [
      { href: "/admin/usuarios", label: "Usuarios y roles", icon: "lock", adminOnly: true },
      { href: "/admin/actividad", label: "Registro de actividad", icon: "activity" },
    ],
  },
];

export function AdminNav({ role, email }: { role: AppRole; email: string }) {
  const [pathname, setPathname] = useState("");
  const [open, setOpen] = useState(false);
  const onPath = useCallback((p: string) => {
    setPathname(p);
    setOpen(false);
  }, []);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav aria-label="CRM" className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <Image src="/brand/icono-512.png" alt="" width={40} height={40} className="h-10 w-10" />
        <div className="leading-tight">
          <p className="font-serif text-lg">Galletas de Tabo</p>
          <p className="text-[0.7rem] uppercase tracking-[0.16em] text-ink-muted">CRM · {role === "admin" ? "Administrador" : "Editor"}</p>
        </div>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {GROUPS.map((g) => {
          const items = g.items.filter((i) => !i.adminOnly || role === "admin");
          if (!items.length) return null;
          return (
            <div key={g.title}>
              <p className="px-3 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ink-muted">{g.title}</p>
              <ul className="mt-2 space-y-0.5">
                {items.map((i) => (
                  <li key={i.href}>
                    <Link href={i.href} aria-current={active(i.href) ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${active(i.href) ? "bg-chocolate text-white" : "text-ink hover:bg-cream"}`}>
                      <Icon name={i.icon} size={18} /> {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="border-t border-line p-4 text-sm">
        <p className="truncate text-xs text-ink-muted" title={email}>{email}</p>
        <div className="mt-3 flex gap-2">
          <Link href="/" target="_blank" className="flex flex-1 items-center justify-center gap-1 rounded-full border border-line py-2 text-xs hover:border-rose-deep"><Icon name="external" size={14} /> Ver sitio</Link>
          <form action={logoutAction} className="flex-1"><button type="submit" className="flex w-full items-center justify-center gap-1 rounded-full border border-line py-2 text-xs hover:border-rose-deep"><Icon name="logout" size={14} /> Salir</button></form>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      <Suspense fallback={null}><PathnameSync onChange={onPath} /></Suspense>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <p className="font-serif text-lg">CRM Galletas de Tabo</p>
        <button type="button" onClick={() => setOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-cream" aria-label="Abrir menú del CRM" aria-expanded={open}>
          <Icon name="menu" />
        </button>
      </div>
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-white lg:block">{nav}</aside>
      <div className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-chocolate/30 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
        <div className={`absolute inset-y-0 left-0 w-[86%] max-w-[300px] bg-white shadow-xl transition-transform duration-500 ease-[var(--ease-out-quart)] ${open ? "translate-x-0" : "-translate-x-full"}`} inert={!open}>
          <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-4 flex h-10 w-10 items-center justify-center rounded-full hover:bg-cream" aria-label="Cerrar menú"><Icon name="close" /></button>
          {nav}
        </div>
      </div>
    </>
  );
}

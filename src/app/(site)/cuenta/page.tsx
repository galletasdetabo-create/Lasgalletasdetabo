import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageBand } from "@/components/ui/PageBand";
import { AccountForms } from "@/components/site/AccountForms";
import { getSessionUser } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/server";
import { customerLogoutAction } from "./actions";
import { ORDER_STATUS, PAYMENT_STATUS } from "@/lib/labels";
import { formatCOP, formatDateTime } from "@/lib/format";
import type { Order } from "@/lib/types";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false, follow: false } };

async function Account() {
  const user = await getSessionUser();
  if (!user) return <AccountForms />;
  const { data } = await (await createSessionClient()).from("orders").select("id, number, public_token, total, status, payment_status, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  const orders = (data ?? []) as Order[];
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] bg-white/90 p-6 ring-1 ring-line">
        <div><p className="font-serif text-2xl">Hola, {user.fullName || user.email}</p><p className="text-sm text-ink-muted">{user.email}</p></div>
        <div className="flex gap-2">
          {user.role !== "customer" ? <Link href="/admin" className="btn btn-outline !min-h-11">Ir al panel</Link> : null}
          <form action={customerLogoutAction}><button className="btn btn-outline !min-h-11">Cerrar sesión</button></form>
        </div>
      </div>
      <h2 className="mt-10 text-2xl">Mis pedidos</h2>
      {orders.length ? (
        <ul className="mt-5 space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/pedido/${o.public_token}`} className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-white/90 p-5 ring-1 ring-line transition-shadow hover:shadow-md">
                <div><p className="font-semibold">{o.number}</p><p className="text-xs text-ink-muted">{formatDateTime(o.created_at)}</p></div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2.5 py-1 font-semibold ring-1 ${ORDER_STATUS[o.status].tone}`}>{ORDER_STATUS[o.status].label}</span>
                  <span className={`rounded-full px-2.5 py-1 font-semibold ring-1 ${PAYMENT_STATUS[o.payment_status].tone}`}>{PAYMENT_STATUS[o.payment_status].label}</span>
                  <span className="text-base font-semibold">{formatCOP(o.total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p className="mt-4 text-ink-soft">Aún no tienes pedidos asociados a tu cuenta. <Link href="/tienda" className="text-rose-deep underline">Ir a la tienda</Link></p>}
    </div>
  );
}

export default function AccountPage() {
  return (
    <>
      <PageBand title="Mi cuenta" />
      <div className="container-site pb-[70px] pt-[50px] md:pb-[100px] md:pt-[70px]">
        <Suspense fallback={<div className="skeleton mx-auto h-80 max-w-md" />}>
          <Account />
        </Suspense>
      </div>
    </>
  );
}

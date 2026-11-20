import type { Metadata } from "next";
import { connection } from "next/server";
import { PageBand } from "@/components/ui/PageBand";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getDeliveryMethods, getSettings } from "@/lib/data/public";
import { getPaymentOptions } from "@/lib/checkout/options";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  // Los medios de pago dependen de variables de entorno del servidor: la página debe resolverse en cada petición, no en la compilación.
  await connection();
  const [methods, payments, s] = await Promise.all([getDeliveryMethods(), getPaymentOptions(), getSettings()]);
  return (
    <>
      <PageBand title="Finalizar compra" />
      <div className="container-site pb-[70px] pt-[50px] md:pb-[100px] md:pt-[70px]">
        <CheckoutForm methods={methods} payments={payments} note={s.commerce.checkout_note} hasPrivacy={!!s.legal.privacy.trim()} />
      </div>
    </>
  );
}

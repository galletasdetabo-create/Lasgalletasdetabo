import type { Metadata } from "next";
import { PageBand } from "@/components/ui/PageBand";
import { CartView } from "@/components/checkout/CartView";

export const metadata: Metadata = { title: "Carrito", robots: { index: false, follow: true } };

export default function CartPage() {
  return (
    <>
      <PageBand title="Carrito" />
      <div className="container-site pb-[70px] pt-[50px] md:pb-[100px] md:pt-[70px]">
        <CartView />
      </div>
    </>
  );
}

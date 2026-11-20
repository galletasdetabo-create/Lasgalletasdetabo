import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <div className="container-site flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">Ups…</p>
      <h1 className="mt-2 text-[2.6rem] sm:text-[3.4rem]">Esta página se nos quemó</h1>
      <div className="mt-5 divider-heart" aria-hidden="true"><Icon name="heart" size={14} /></div>
      <p className="mt-5 max-w-md text-ink-soft">No encontramos lo que buscas. Puede que el enlace haya cambiado o que el producto ya no esté disponible.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/tienda" className="btn">Ir a la tienda</Link>
        <Link href="/" className="btn btn-outline">Volver al inicio</Link>
      </div>
    </div>
  );
}

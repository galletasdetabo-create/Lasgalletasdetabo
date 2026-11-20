import Image from "next/image";
import { LoginForm } from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="marble flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm rounded-[28px] bg-white/95 p-8 shadow-[0_30px_80px_-40px_rgba(106,68,55,0.45)] ring-1 ring-line">
        <Image src="/brand/logo.webp" alt="Las Galletas de Tabo" width={140} height={107} className="mx-auto h-24 w-auto" preload />
        <h1 className="mt-5 text-center text-2xl">Panel administrativo</h1>
        <p className="mt-1 text-center text-sm text-ink-muted">Acceso exclusivo para el equipo de la tienda.</p>
        <LoginForm />
      </div>
    </div>
  );
}

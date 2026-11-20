import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

export function PageHeader({ title, description, actions, back }: { title: string; description?: string; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back ? <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-rose-deep"><Icon name="arrowLeft" size={15} /> {back.label}</Link> : null}
        <h1 className="font-serif text-[1.9rem] leading-tight">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, children, actions, className = "" }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-[0_1px_0_rgba(106,68,55,0.04)] ring-1 ring-line sm:p-6 ${className}`}>
      {title || actions ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="font-sans text-[0.78rem] font-bold uppercase tracking-[0.16em] text-ink-soft">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon: IconName }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-rose-deep"><Icon name={icon} size={17} /></span>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function Badge({ children, tone = "bg-stone-100 text-stone-700 ring-stone-200" }: { children: ReactNode; tone?: string }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ring-1 ${tone}`}>{children}</span>;
}

export const SampleBadge = () => <Badge tone="bg-amber-50 text-amber-800 ring-amber-200">Dato de prueba</Badge>;
export const StockPhotoBadge = () => <Badge tone="bg-sky-50 text-sky-800 ring-sky-200">Foto de stock</Badge>;

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/60 p-10 text-center">
      <p className="font-serif text-xl">{title}</p>
      {text ? <p className="mt-1 text-sm text-ink-muted">{text}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line bg-[#fcfbfa] text-[0.7rem] uppercase tracking-[0.12em] text-ink-muted">
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export const adminBtn = "inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-chocolate px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-deep disabled:opacity-50";
export const adminBtnOutline = "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-ink transition-colors hover:border-rose-deep hover:text-rose-deep disabled:opacity-50";
export const adminBtnDanger = "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** $ 45.000 — formato colombiano sin decimales. */
export function formatCOP(value: number | null | undefined) {
  return cop.format(Math.round(value ?? 0)).replace(/ /g, " ");
}

const dateFmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "America/Bogota" });
const dateTimeFmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });
const shortFmt = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", timeZone: "America/Bogota" });

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + "T12:00:00-05:00") : new Date(value);
  return dateFmt.format(d);
}
export function formatDateTime(value: string | Date | null | undefined) {
  return value ? dateTimeFmt.format(new Date(value)) : "—";
}
export function formatShortDate(value: string | Date) {
  return shortFmt.format(new Date(value));
}

/** Fecha de hoy en Bogotá en formato YYYY-MM-DD, desplazada n días. */
export function bogotaDate(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(now);
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

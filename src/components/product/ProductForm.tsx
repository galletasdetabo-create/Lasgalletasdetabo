"use client";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";
import { QuantityStepper } from "@/components/shop/QuantityStepper";
import { cart, type CartDetail } from "@/lib/cart/store";
import { track } from "@/lib/analytics";
import { bogotaDate, formatCOP } from "@/lib/format";
import type { CustomizationField, Product } from "@/lib/types";

type Values = Record<string, string>;
const noopSubscribe = () => () => {};

export function ProductForm({ product }: { product: Product }) {
  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const groups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const v of variants) for (const [k, val] of Object.entries(v.options)) {
      const arr = map.get(k) ?? [];
      if (!arr.includes(val)) arr.push(val);
      map.set(k, arr);
    }
    return [...map.entries()];
  }, [variants]);
  const useOptions = groups.length > 0 && variants.every((v) => Object.keys(v.options).length === groups.length);

  const [options, setOptions] = useState<Values>(() => (variants[0] ? { ...variants[0].options } : {}));
  const [variantId, setVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const [qty, setQty] = useState(product.min_quantity);
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [upload, setUpload] = useState<{ path: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [added, setAdded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const variant = useOptions
    ? variants.find((v) => Object.entries(options).every(([k, val]) => v.options[k] === val)) ?? null
    : variants.find((v) => v.id === variantId) ?? null;
  const unitPrice = variant?.price ?? product.price;
  const compare = variant ? variant.compare_at_price : product.compare_at_price;
  const soldOut = product.stock_status === "agotado";
  // La fecha mínima se calcula en el navegador (no durante el prerender).
  const minDate = useSyncExternalStore(noopSubscribe, () => bogotaDate(product.prep_days_min), () => "");
  const fields = product.customization_fields;

  const available = (key: string, val: string) =>
    variants.some((v) => v.options[key] === val && Object.entries(options).every(([k, o]) => k === key || v.options[k] === o));

  async function onFile(field: CustomizationField, file: File | undefined) {
    if (!file) return;
    setErrors((e) => ({ ...e, [field.key]: "" }));
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setErrors((e) => ({ ...e, [field.key]: "Usa una imagen JPG, PNG o WebP." }));
    if (file.size > 5 * 1024 * 1024) return setErrors((e) => ({ ...e, [field.key]: "La imagen debe pesar menos de 5 MB." }));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads/referencia", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo subir la imagen.");
      setUpload({ path: json.path, name: file.name });
    } catch (e) {
      setErrors((x) => ({ ...x, [field.key]: (e as Error).message }));
    } finally {
      setUploading(false);
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (variants.length && !variant) errs.__variant = "Elige una opción disponible.";
    for (const f of fields) {
      if (f.type === "image") continue;
      const v = (values[f.key] ?? "").trim();
      if (f.required && !v) errs[f.key] = "Este campo es obligatorio.";
      else if (v && f.maxLength && v.length > f.maxLength) errs[f.key] = `Máximo ${f.maxLength} caracteres.`;
      else if (v && f.type === "date" && minDate && v < minDate) errs[f.key] = `La fecha más cercana posible es ${minDate}.`;
      else if (v && f.type === "number" && (Number(v) < (f.min ?? -Infinity) || Number(v) > (f.max ?? Infinity))) errs[f.key] = "Valor fuera de rango.";
      else if (v && f.type === "select" && f.options && !f.options.includes(v)) errs[f.key] = "Elige una opción de la lista.";
    }
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
    return !first;
  }

  function addToCart(e: React.FormEvent) {
    e.preventDefault();
    if (soldOut || !validate()) return;
    const customization: Values = {};
    const details: CartDetail[] = [];
    for (const f of fields) {
      if (f.type === "image") continue;
      const v = (values[f.key] ?? "").trim();
      if (!v) continue;
      customization[f.key] = v;
      details.push({ key: f.key, label: f.label, value: v });
    }
    if (upload) details.push({ key: "referencia", label: "Imagen de referencia", value: upload.name });
    const dateField = fields.find((f) => f.type === "date");
    cart.add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images?.[0]?.url ?? null,
      variantId: variant?.id ?? null,
      variantName: variant?.name ?? null,
      unitPrice,
      quantity: qty,
      minQuantity: product.min_quantity,
      maxQuantity: product.max_quantity,
      quantityStep: product.quantity_step,
      quantityLabel: product.quantity_label,
      customization,
      details,
      referenceImagePath: upload?.path ?? null,
      referenceImageName: upload?.name ?? null,
      neededBy: dateField ? customization[dateField.key] ?? null : null,
    });
    track("add_to_cart", { productId: product.id });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2400);
  }

  const set = (k: string, v: string) => {
    setValues((x) => ({ ...x, [k]: v }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: "" }));
  };

  const chip = (selected: boolean, ok = true) =>
    `min-h-11 border px-5 font-sans text-[12px] font-medium uppercase tracking-[0.12em] transition-colors duration-200 ${selected ? "border-chocolate bg-chocolate text-white" : ok ? "border-line bg-white text-ink hover:border-gold" : "border-dashed border-line bg-white text-ink-muted"}`;

  return (
    <form ref={formRef} onSubmit={addToCart} noValidate className="mt-8 space-y-7">
      {variants.length ? (
        useOptions ? (
          groups.map(([key, vals]) => (
            <fieldset key={key}>
              <legend className="field-label">{key}</legend>
              <div className="flex flex-wrap gap-2">
                {vals.map((val) => {
                  const selected = options[key] === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        const next = { ...options, [key]: val };
                        if (!variants.some((v) => Object.entries(next).every(([k, o]) => v.options[k] === o))) {
                          const fallback = variants.find((v) => v.options[key] === val);
                          if (fallback) return setOptions({ ...fallback.options });
                        }
                        setOptions(next);
                      }}
                      className={chip(selected, available(key, val))}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))
        ) : (
          <fieldset>
            <legend className="field-label">Opción</legend>
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => (
                <button key={v.id} type="button" aria-pressed={variantId === v.id} onClick={() => setVariantId(v.id)} className={chip(variantId === v.id)}>
                  {v.name}
                </button>
              ))}
            </div>
          </fieldset>
        )
      ) : null}
      {errors.__variant ? <p className="field-error" role="alert">{errors.__variant}</p> : null}

      {fields.length ? (
        <div className="space-y-5 border border-line bg-white/80 p-5 sm:p-7">
          <p className="flex items-center gap-3 font-sans text-[13px] font-semibold uppercase tracking-[0.14em]"><Icon name="sparkle" size={16} className="text-gold-ink" /> Personaliza tu pedido</p>
          {fields.map((f) => {
            const id = `f-${f.key}`;
            const err = errors[f.key];
            const describedBy = [f.help ? `${id}-help` : "", err ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined;
            const common = { id, "data-field": f.key, "aria-invalid": err ? true : undefined, "aria-describedby": describedBy, className: "field" } as const;
            return (
              <div key={f.key}>
                <label htmlFor={id} className="field-label">
                  {f.label} {f.required ? <span className="text-gold-deep" aria-hidden="true">*</span> : <span className="font-normal normal-case tracking-normal text-ink-muted">(opcional)</span>}
                </label>
                {f.type === "textarea" ? (
                  <textarea {...common} rows={3} maxLength={f.maxLength} placeholder={f.placeholder} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} required={f.required} />
                ) : f.type === "select" ? (
                  <select {...common} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} required={f.required}>
                    <option value="">Selecciona…</option>
                    {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === "date" ? (
                  <input {...common} type="date" min={minDate || undefined} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} required={f.required} />
                ) : f.type === "number" ? (
                  <input {...common} type="number" inputMode="numeric" min={f.min} max={f.max} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} required={f.required} />
                ) : f.type === "image" ? (
                  <div>
                    <label htmlFor={id} className={`flex min-h-[64px] cursor-pointer items-center gap-3 border border-dashed px-4 py-3 transition-colors ${upload ? "border-gold bg-cream/50" : "border-line bg-white hover:border-gold"}`}>
                      <Icon name={upload ? "check" : "upload"} size={20} className="text-gold-ink" />
                      <span className="it flex-1 truncate !text-[18px]">{uploading ? "Subiendo imagen…" : upload ? upload.name : "Seleccionar imagen"}</span>
                      {upload ? <button type="button" className="text-xs text-gold-deep underline" onClick={(e) => { e.preventDefault(); setUpload(null); }}>Quitar</button> : null}
                    </label>
                    <input id={id} data-field={f.key} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onFile(f, e.target.files?.[0])} aria-describedby={describedBy} />
                  </div>
                ) : f.type === "color" ? (
                  <input {...common} type="text" placeholder={f.placeholder ?? "Ej. rosa pastel"} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                ) : (
                  <input {...common} type="text" maxLength={f.maxLength} placeholder={f.placeholder} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} required={f.required} />
                )}
                {f.help ? <p id={`${id}-help`} className="field-help">{f.help}</p> : null}
                {f.type === "date" && minDate ? <p className="field-help">Fecha más cercana disponible: {minDate}</p> : null}
                {err ? <p id={`${id}-err`} className="field-error" role="alert">{err}</p> : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div>
        <p className="field-label">Cantidad <span className="font-normal normal-case tracking-normal text-ink-muted">({product.quantity_label}; mínimo {product.min_quantity})</span></p>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <QuantityStepper value={qty} min={product.min_quantity} max={product.max_quantity} step={product.quantity_step} label={product.name} onChange={setQty} />
          <button type="submit" className="btn btn-gold" disabled={soldOut || uploading}>
            {soldOut ? "Agotado" : added ? "Agregado al carrito" : "Agregar al carrito"}
          </button>
        </div>
        <p className="it mt-4 !text-[22px]">
          Total: {formatCOP(unitPrice * qty)}
          {compare && compare > unitPrice ? <span className="ml-3 text-ink-muted line-through">{formatCOP(compare * qty)}</span> : null}
        </p>
      </div>
      <p className="sr-only" aria-live="polite">{added ? `${product.name} se agregó al carrito.` : ""}</p>
    </form>
  );
}

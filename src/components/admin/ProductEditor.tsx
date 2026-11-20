"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { deleteProductAction, duplicateProductAction, saveProductAction } from "@/app/admin/(panel)/productos/actions";
import { MediaPickerModal, useMediaList } from "./MediaPicker";
import { Card, adminBtn, adminBtnDanger, adminBtnOutline } from "./ui";
import { slugify } from "@/lib/format";
import type { CustomizationField, CustomFieldType, Product, Variant } from "@/lib/types";

type VariantDraft = Omit<Variant, "id" | "product_id" | "sort"> & { id?: string; optionsText: string };
const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "Texto corto" },
  { value: "textarea", label: "Texto largo" },
  { value: "select", label: "Lista de opciones" },
  { value: "date", label: "Fecha" },
  { value: "number", label: "Número" },
  { value: "color", label: "Colores" },
  { value: "image", label: "Imagen de referencia" },
];

const optionsToText = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `${k}: ${v}`).join("; ");
const textToOptions = (t: string) => Object.fromEntries(t.split(";").map((p) => p.split(":").map((s) => s.trim())).filter((p) => p.length === 2 && p[0] && p[1]));

export function ProductEditor({ product, categories, imageIds }: { product: Partial<Product> | null; categories: { id: string; name: string }[]; imageIds: string[] }) {
  const router = useRouter();
  const { items: media } = useMediaList();
  const [p, setP] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    short_description: product?.short_description ?? "",
    description: product?.description ?? "",
    category_id: (product?.category_id ?? categories[0]?.id ?? null) as string | null,
    kind: product?.kind ?? "galleta_personalizada",
    price: product?.price ?? 0,
    compare_at_price: product?.compare_at_price ?? null,
    is_active: product?.is_active ?? true,
    is_featured: product?.is_featured ?? false,
    is_sample: product?.is_sample ?? false,
    stock_status: product?.stock_status ?? "bajo_pedido",
    track_inventory: product?.track_inventory ?? false,
    stock_quantity: product?.stock_quantity ?? null,
    min_quantity: product?.min_quantity ?? 1,
    max_quantity: product?.max_quantity ?? 100,
    quantity_step: product?.quantity_step ?? 1,
    quantity_label: product?.quantity_label ?? "unidades",
    prep_days_min: product?.prep_days_min ?? 2,
    prep_days_max: product?.prep_days_max ?? 4,
    prep_time_text: product?.prep_time_text ?? "",
    tags: (product?.tags ?? []).join(", "),
    seo_title: product?.seo_title ?? "",
    seo_description: product?.seo_description ?? "",
  });
  const [fields, setFields] = useState<CustomizationField[]>(product?.customization_fields ?? []);
  const [variants, setVariants] = useState<VariantDraft[]>((product?.variants ?? []).map((v) => ({ ...v, optionsText: optionsToText(v.options) })));
  const [images, setImages] = useState<string[]>(imageIds);
  const [picker, setPicker] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof p>(k: K, v: (typeof p)[K]) => setP((x) => ({ ...x, [k]: v }));
  const num = (v: string) => (v === "" ? 0 : Math.round(Number(v)));

  function save() {
    setMsg(null);
    start(async () => {
      const r = await saveProductAction({
        id: product?.id,
        ...p,
        slug: p.slug || slugify(p.name),
        compare_at_price: p.compare_at_price || null,
        stock_quantity: p.track_inventory ? p.stock_quantity ?? 0 : null,
        tags: p.tags.split(",").map((t) => t.trim()).filter(Boolean),
        seo_title: p.seo_title || null,
        seo_description: p.seo_description || null,
        customization_fields: fields.map((f) => ({ ...f, options: f.type === "select" ? (f.options ?? []).filter(Boolean) : undefined, maxLength: f.maxLength || undefined })),
        images,
        variants: variants.map((v) => ({ id: v.id, name: v.name, options: textToOptions(v.optionsText), price: v.price, compare_at_price: v.compare_at_price || null, sku: v.sku || null, is_active: v.is_active, stock_quantity: v.stock_quantity })),
      });
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: "Producto guardado y publicado en la tienda." });
      // En edición, el formulario ya refleja lo guardado: no se recarga para no perder el mensaje.
      if (!product?.id) router.replace(`/admin/productos/${r.id}`);
    });
  }

  const label = (t: string, extra = "") => <span className={`field-label ${extra}`}>{t}</span>;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        <Card title="Información">
          <div className="grid gap-4">
            <label>{label("Nombre")}<input className="field" value={p.name} onChange={(e) => set("name", e.target.value)} maxLength={140} /></label>
            <label>{label("URL (slug)")}<input className="field" value={p.slug} placeholder={slugify(p.name)} onChange={(e) => set("slug", slugify(e.target.value))} /><span className="field-help">/producto/{p.slug || slugify(p.name) || "…"}</span></label>
            <label>{label("Descripción corta")}<textarea className="field" rows={2} value={p.short_description} onChange={(e) => set("short_description", e.target.value)} maxLength={300} /></label>
            <label>{label("Descripción completa")}<textarea className="field" rows={7} value={p.description} onChange={(e) => set("description", e.target.value)} /><span className="field-help">Separa párrafos con una línea en blanco. Usa ## para subtítulos y - para listas.</span></label>
          </div>
        </Card>

        <Card title="Fotografías" actions={<button type="button" className={adminBtnOutline} onClick={() => setPicker(true)}><Icon name="plus" size={15} /> Agregar</button>}>
          {images.length ? (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((id, i) => {
                const m = media?.find((x) => x.id === id);
                return (
                  <li key={id} className="group relative aspect-square overflow-hidden rounded-xl bg-mist ring-1 ring-line">
                    {m ? <Image src={m.url} alt={m.alt} fill sizes="160px" className="object-cover" /> : null}
                    {i === 0 ? <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[0.6rem] font-bold">Principal</span> : null}
                    <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <button type="button" aria-label="Mover a la izquierda" className="flex h-7 w-7 items-center justify-center rounded-full bg-white" disabled={i === 0} onClick={() => setImages((a) => { const b = [...a]; [b[i - 1], b[i]] = [b[i], b[i - 1]]; return b; })}><Icon name="arrowLeft" size={14} /></button>
                      <button type="button" aria-label="Quitar imagen" className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-rose-700" onClick={() => setImages((a) => a.filter((x) => x !== id))}><Icon name="close" size={14} /></button>
                      <button type="button" aria-label="Mover a la derecha" className="flex h-7 w-7 items-center justify-center rounded-full bg-white" disabled={i === images.length - 1} onClick={() => setImages((a) => { const b = [...a]; [b[i + 1], b[i]] = [b[i], b[i + 1]]; return b; })}><Icon name="arrowRight" size={14} /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-ink-muted">Sin fotografías. La primera será la imagen principal.</p>}
          <MediaPickerModal open={picker} multiple folder="productos" onClose={() => setPicker(false)} onSelect={(ids) => setImages((a) => [...a, ...ids.filter((x) => !a.includes(x))])} />
        </Card>

        <Card title="Variantes (tamaños, sabores, presentaciones)" actions={<button type="button" className={adminBtnOutline} onClick={() => setVariants((v) => [...v, { name: "", options: {}, optionsText: "", price: p.price, compare_at_price: null, sku: null, is_active: true, stock_quantity: null }])}><Icon name="plus" size={15} /> Variante</button>}>
          <p className="mb-4 text-sm text-ink-muted">Cada variante tiene su propio precio. Escribe sus opciones como <code className="rounded bg-mist px-1">Sabor: Arequipe; Presentación: Caja x6</code> para mostrar selectores separados. Sin variantes se usa el precio base.</p>
          <div className="space-y-3">
            {variants.map((v, i) => (
              <div key={v.id ?? `n${i}`} className="grid gap-3 rounded-xl bg-[#fcfbfa] p-3 ring-1 ring-line sm:grid-cols-[1.2fr_1.4fr_110px_110px_auto]">
                <input aria-label="Nombre de la variante" className="field" placeholder="Nombre (ej. Caja x6)" value={v.name} onChange={(e) => setVariants((a) => a.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <input aria-label="Opciones" className="field" placeholder="Tamaño: Grande" value={v.optionsText} onChange={(e) => setVariants((a) => a.map((x, j) => (j === i ? { ...x, optionsText: e.target.value } : x)))} />
                <input aria-label="Precio" type="number" min={0} className="field" placeholder="Precio" value={v.price} onChange={(e) => setVariants((a) => a.map((x, j) => (j === i ? { ...x, price: num(e.target.value) } : x)))} />
                <input aria-label="Precio anterior (promoción)" type="number" min={0} className="field" placeholder="Antes" value={v.compare_at_price ?? ""} onChange={(e) => setVariants((a) => a.map((x, j) => (j === i ? { ...x, compare_at_price: e.target.value ? num(e.target.value) : null } : x)))} />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={v.is_active} onChange={(e) => setVariants((a) => a.map((x, j) => (j === i ? { ...x, is_active: e.target.checked } : x)))} className="accent-[var(--brand-chocolate)]" /> Activa</label>
                  <button type="button" aria-label="Eliminar variante" className="flex h-9 w-9 items-center justify-center rounded-full text-rose-700 hover:bg-rose-50" onClick={() => setVariants((a) => a.filter((_, j) => j !== i))}><Icon name="trash" size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Campos de personalización" actions={<button type="button" className={adminBtnOutline} onClick={() => setFields((f) => [...f, { key: `campo_${f.length + 1}`, label: "Nuevo campo", type: "text", required: false }])}><Icon name="plus" size={15} /> Campo</button>}>
          <p className="mb-4 text-sm text-ink-muted">Lo que el cliente completa al pedir: ocasión, diseño, texto, colores, fecha, imagen de referencia, observaciones…</p>
          <div className="space-y-3">
            {fields.map((f, i) => {
              const upd = (patch: Partial<CustomizationField>) => setFields((a) => a.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} className="rounded-xl bg-[#fcfbfa] p-3 ring-1 ring-line">
                  <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_160px_auto]">
                    <input aria-label="Etiqueta" className="field" value={f.label} onChange={(e) => upd({ label: e.target.value })} placeholder="Etiqueta visible" />
                    <input aria-label="Clave interna" className="field font-mono text-sm" value={f.key} onChange={(e) => upd({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 40) })} />
                    <select aria-label="Tipo" className="field" value={f.type} onChange={(e) => upd({ type: e.target.value as CustomFieldType })}>{FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                    <div className="flex items-center gap-1">
                      <button type="button" aria-label="Subir" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-cream disabled:opacity-30" disabled={i === 0} onClick={() => setFields((a) => { const b = [...a]; [b[i - 1], b[i]] = [b[i], b[i - 1]]; return b; })}><Icon name="arrowUp" size={16} /></button>
                      <button type="button" aria-label="Bajar" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-cream disabled:opacity-30" disabled={i === fields.length - 1} onClick={() => setFields((a) => { const b = [...a]; [b[i + 1], b[i]] = [b[i], b[i + 1]]; return b; })}><Icon name="arrowDown" size={16} /></button>
                      <button type="button" aria-label="Eliminar campo" className="flex h-9 w-9 items-center justify-center rounded-full text-rose-700 hover:bg-rose-50" onClick={() => setFields((a) => a.filter((_, j) => j !== i))}><Icon name="trash" size={16} /></button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto]">
                    {f.type === "select" ? (
                      <input aria-label="Opciones separadas por coma" className="field sm:col-span-2" value={(f.options ?? []).join(", ")} onChange={(e) => upd({ options: e.target.value.split(",").map((s) => s.trim()) })} placeholder="Opciones separadas por coma" />
                    ) : (
                      <>
                        <input aria-label="Texto de ejemplo" className="field" value={f.placeholder ?? ""} onChange={(e) => upd({ placeholder: e.target.value })} placeholder="Texto de ejemplo" />
                        <input aria-label="Ayuda" className="field" value={f.help ?? ""} onChange={(e) => upd({ help: e.target.value })} placeholder="Ayuda (opcional)" />
                      </>
                    )}
                    {["text", "textarea", "color"].includes(f.type) ? <input aria-label="Máximo de caracteres" type="number" className="field" value={f.maxLength ?? ""} onChange={(e) => upd({ maxLength: e.target.value ? Number(e.target.value) : undefined })} placeholder="Máx." /> : <span />}
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.required} onChange={(e) => upd({ required: e.target.checked })} className="accent-[var(--brand-chocolate)]" /> Obligatorio</label>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="SEO">
          <div className="grid gap-4">
            <label>{label("Título SEO")}<input className="field" value={p.seo_title} maxLength={70} onChange={(e) => set("seo_title", e.target.value)} placeholder={p.name} /><span className="field-help">{p.seo_title.length}/70</span></label>
            <label>{label("Descripción SEO")}<textarea className="field" rows={2} value={p.seo_description} maxLength={170} onChange={(e) => set("seo_description", e.target.value)} placeholder={p.short_description} /><span className="field-help">{p.seo_description.length}/170</span></label>
            <label>{label("Etiquetas (separadas por coma)")}<input className="field" value={p.tags} onChange={(e) => set("tags", e.target.value)} /></label>
          </div>
        </Card>
      </div>

      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <Card title="Publicación">
          <div className="space-y-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={p.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-4 w-4 accent-[var(--brand-chocolate)]" /> Visible en la tienda</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={p.is_featured} onChange={(e) => set("is_featured", e.target.checked)} className="h-4 w-4 accent-[var(--brand-chocolate)]" /> Producto destacado</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={p.is_sample} onChange={(e) => set("is_sample", e.target.checked)} className="h-4 w-4 accent-[var(--brand-chocolate)]" /> Precio de prueba (aviso al cliente)</label>
          </div>
          {msg ? <p className={`mt-4 rounded-xl p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`} role="status">{msg.text}</p> : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className={adminBtn} onClick={save} disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
            {product?.id ? (
              <>
                <a href={`/producto/${product.slug}`} target="_blank" className={adminBtnOutline}>Ver</a>
                <form action={duplicateProductAction.bind(null, product.id)}><button className={adminBtnOutline} disabled={pending}>Duplicar</button></form>
              </>
            ) : null}
          </div>
          {product?.id ? <DeleteButton id={product.id} /> : null}
        </Card>

        <Card title="Precio y categoría">
          <div className="grid gap-4">
            <label>{label("Precio base (COP)")}<input type="number" min={0} className="field" value={p.price} onChange={(e) => set("price", num(e.target.value))} /></label>
            <label>{label("Precio anterior / promoción")}<input type="number" min={0} className="field" value={p.compare_at_price ?? ""} onChange={(e) => set("compare_at_price", e.target.value ? num(e.target.value) : null)} /><span className="field-help">Si es mayor que el precio, se muestra tachado como oferta.</span></label>
            <label>{label("Categoría")}<select className="field" value={p.category_id ?? ""} onChange={(e) => set("category_id", (e.target.value || null) as typeof p.category_id)}><option value="">Sin categoría</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>{label("Tipo de producto")}<select className="field" value={p.kind} onChange={(e) => set("kind", e.target.value as typeof p.kind)}><option value="galleta_personalizada">Galleta personalizada</option><option value="alfajor">Alfajor</option><option value="caja">Caja / presentación</option><option value="estandar">Estándar</option></select></label>
          </div>
        </Card>

        <Card title="Disponibilidad e inventario">
          <div className="grid gap-4">
            <label>{label("Disponibilidad")}<select className="field" value={p.stock_status} onChange={(e) => set("stock_status", e.target.value as typeof p.stock_status)}><option value="bajo_pedido">Bajo pedido</option><option value="disponible">Disponible</option><option value="agotado">Agotado</option></select></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.track_inventory} onChange={(e) => set("track_inventory", e.target.checked)} className="h-4 w-4 accent-[var(--brand-chocolate)]" /> Controlar inventario (se descuenta al recibir pedidos)</label>
            {p.track_inventory ? <label>{label("Unidades disponibles")}<input type="number" min={0} className="field" value={p.stock_quantity ?? 0} onChange={(e) => set("stock_quantity", num(e.target.value))} /></label> : null}
            <div className="grid grid-cols-3 gap-2">
              <label>{label("Mínimo")}<input type="number" min={1} className="field" value={p.min_quantity} onChange={(e) => set("min_quantity", Math.max(1, num(e.target.value)))} /></label>
              <label>{label("Máximo")}<input type="number" min={1} className="field" value={p.max_quantity} onChange={(e) => set("max_quantity", Math.max(1, num(e.target.value)))} /></label>
              <label>{label("Paso")}<input type="number" min={1} className="field" value={p.quantity_step} onChange={(e) => set("quantity_step", Math.max(1, num(e.target.value)))} /></label>
            </div>
            <label>{label("Unidad")}<input className="field" value={p.quantity_label} onChange={(e) => set("quantity_label", e.target.value)} placeholder="galletas, cajas…" /></label>
          </div>
        </Card>

        <Card title="Tiempo de preparación">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-2">
              <label>{label("Días mínimos")}<input type="number" min={0} className="field" value={p.prep_days_min} onChange={(e) => set("prep_days_min", num(e.target.value))} /></label>
              <label>{label("Días máximos")}<input type="number" min={0} className="field" value={p.prep_days_max} onChange={(e) => set("prep_days_max", num(e.target.value))} /></label>
            </div>
            <p className="field-help -mt-2">Los días mínimos definen la fecha de entrega más cercana que puede elegir el cliente.</p>
            <label>{label("Texto visible")}<input className="field" value={p.prep_time_text} onChange={(e) => set("prep_time_text", e.target.value)} placeholder="Entre 3 y 5 días" /></label>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DeleteButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="mt-5 border-t border-line pt-4">
      {confirm ? (
        <div className="space-y-2">
          <p className="text-sm text-rose-800">¿Eliminar definitivamente? Los pedidos antiguos conservan su información. Si prefieres, desactívalo en lugar de eliminarlo.</p>
          <div className="flex gap-2">
            <button type="button" className={adminBtnDanger} disabled={pending} onClick={() => start(async () => { const r = await deleteProductAction(id); if (r && !r.ok) setErr(r.error ?? "Error"); })}>Sí, eliminar</button>
            <button type="button" className={adminBtnOutline} onClick={() => setConfirm(false)}>Cancelar</button>
          </div>
          {err ? <p className="text-sm text-rose-700">{err}</p> : null}
        </div>
      ) : (
        <button type="button" className="text-sm text-rose-700 underline" onClick={() => setConfirm(true)}>Eliminar producto</button>
      )}
    </div>
  );
}

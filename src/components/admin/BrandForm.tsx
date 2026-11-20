"use client";
import { SettingsForm, TextField } from "./SettingsForm";
import { MediaField } from "./MediaPicker";
import { DEFAULT_SETTINGS, type BrandSettings } from "@/lib/cms/settings";

const COLOR_LABELS: Record<keyof BrandSettings["colors"], string> = {
  cream: "Crema (tarjetas y detalles)",
  blush: "Rosa pastel (detalles)",
  rose: "Rosa empolvado (acentos)",
  rose_deep: "Rosa acentuado (enlaces y estados)",
  chocolate: "Chocolate (textos y botones)",
  gold: "Dorado suave (líneas e iconos)",
};

export function BrandForm({ initial }: { initial: BrandSettings }) {
  return (
    <SettingsForm settingKey="brand" initial={initial}>
      {(v, set) => (
        <div className="grid gap-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Nombre comercial" value={v.name} onChange={(x) => set("name", x)} />
            <TextField label="Eslogan" value={v.slogan} onChange={(x) => set("slogan", x)} />
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <MediaField label="Logotipo principal" value={v.logo_id} onChange={(x) => set("logo_id", x)} folder="marca" />
            <MediaField label="Versión alternativa (icono)" value={v.logo_alt_id} onChange={(x) => set("logo_alt_id", x)} folder="marca" />
            <MediaField label="Favicon (PNG cuadrado, 512 px)" value={v.favicon_id} onChange={(x) => set("favicon_id", x)} folder="marca" />
          </div>
          <div>
            <p className="field-label">Colores de marca</p>
            <p className="field-help mb-3">El fondo general siempre es blanco con mármol; estos colores se usan como acentos.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(COLOR_LABELS) as (keyof BrandSettings["colors"])[]).map((k) => (
                <label key={k} className="flex items-center gap-3 rounded-xl p-2 ring-1 ring-line">
                  <input type="color" value={v.colors[k]} onChange={(e) => set("colors", { ...v.colors, [k]: e.target.value.toUpperCase() })} className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent" aria-label={COLOR_LABELS[k]} />
                  <span className="text-sm"><span className="block font-medium">{COLOR_LABELS[k]}</span><span className="font-mono text-xs text-ink-muted">{v.colors[k]}</span></span>
                </label>
              ))}
            </div>
            <button type="button" className="mt-3 text-sm text-rose-deep underline" onClick={() => set("colors", { ...DEFAULT_SETTINGS.brand.colors })}>Restaurar colores originales</button>
          </div>
          <div>
            <p className="field-label">Tipografías</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["moderna", "Moderna", "Playfair Display + Manrope"],
                ["clasica", "Clásica", "Cormorant Garamond + DM Sans"],
              ] as const).map(([val, label, desc]) => (
                <label key={val} className={`cursor-pointer rounded-xl p-4 ring-1 ${v.font_pair === val ? "bg-cream ring-chocolate" : "ring-line"}`}>
                  <input type="radio" name="font_pair" value={val} checked={v.font_pair === val} onChange={() => set("font_pair", val)} className="sr-only" />
                  <span className="block font-semibold">{label}</span>
                  <span className="text-sm text-ink-muted">{desc}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </SettingsForm>
  );
}

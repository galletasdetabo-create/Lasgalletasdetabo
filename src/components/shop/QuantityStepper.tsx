"use client";

interface Props {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  size?: "sm" | "md";
  onChange: (v: number) => void;
}

/** Selector de cantidad de la referencia: casilla cuadrada con los botones + y − apilados a la derecha. */
export function QuantityStepper({ value, min, max, step = 1, label, size = "md", onChange }: Props) {
  const h = size === "sm" ? "h-[40px]" : "h-[52px]";
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div className={`inline-flex ${h} border border-line bg-white`} role="group" aria-label={`Cantidad de ${label}`}>
      <input
        type="number"
        inputMode="numeric"
        className={`${size === "sm" ? "w-[46px] text-[17px]" : "w-[62px] text-[20px]"} bg-transparent text-center font-serif italic text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={`Cantidad de ${label}`}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!Number.isNaN(v)) onChange(clamp(v));
        }}
      />
      <div className="flex w-[24px] flex-col border-l border-line">
        <button type="button" className="flex flex-1 items-center justify-center border-b border-line text-[13px] leading-none text-ink transition-colors hover:text-gold-ink disabled:opacity-35" onClick={() => onChange(clamp(value + step))} disabled={value >= max} aria-label="Aumentar cantidad">+</button>
        <button type="button" className="flex flex-1 items-center justify-center text-[13px] leading-none text-ink transition-colors hover:text-gold-ink disabled:opacity-35" onClick={() => onChange(clamp(value - step))} disabled={value <= min} aria-label="Disminuir cantidad">−</button>
      </div>
    </div>
  );
}

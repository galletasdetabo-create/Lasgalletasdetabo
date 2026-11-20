interface Props {
  eyebrow?: string;
  title?: string;
  intro?: string;
  align?: "center" | "left";
  as?: "h1" | "h2";
  className?: string;
}

/** Patrón de la referencia: subtítulo caligráfico dorado + título en mayúsculas + separador con rombo + texto en cursiva. */
export function SectionHeading({ eyebrow, title, intro, align = "center", as: Tag = "h2", className = "" }: Props) {
  if (!eyebrow && !title && !intro) return null;
  const center = align === "center";
  return (
    <div className={`${center ? "mx-auto text-center" : ""} max-w-[780px] ${className}`}>
      {eyebrow ? <p className="eyebrow" data-reveal>{eyebrow}</p> : null}
      {title ? (
        <Tag data-reveal style={{ ["--reveal-delay" as string]: 60 }}>
          {title}
        </Tag>
      ) : null}
      <span className={`sep mt-[27px] ${center ? "" : "sep-left"}`} data-reveal="sep" aria-hidden="true" />
      {intro ? (
        <p className="it-lg mt-[26px]" data-reveal style={{ ["--reveal-delay" as string]: 180 }}>
          {intro}
        </p>
      ) : null}
    </div>
  );
}

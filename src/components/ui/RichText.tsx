import { Fragment, type ReactNode } from "react";

/** Formato ligero y seguro: **negrita**, [texto](url). No interpreta HTML. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\(((?:https?:\/\/|\/|mailto:)[^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2]) out.push(<strong key={i++}>{m[2]}</strong>);
    else out.push(<a key={i++} href={m[4]} {...(m[4].startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{m[3]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Texto con ## subtítulos, ### subtítulos menores, listas con "- " y párrafos separados por línea en blanco. */
export function RichText({ text, className = "prose-brand" }: { text: string; className?: string }) {
  const blocks = (text || "").replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={className}>
      {blocks.map((b, i) => {
        if (b.startsWith("### ")) return <h3 key={i}>{inline(b.slice(4))}</h3>;
        if (b.startsWith("## ")) return <h2 key={i}>{inline(b.slice(3))}</h2>;
        const lines = b.split("\n");
        if (lines.every((l) => /^[-*] /.test(l))) {
          return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>;
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 ? <br /> : null}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

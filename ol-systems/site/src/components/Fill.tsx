import { Fragment } from "react";
import { PENDING_RE } from "@/config/site";

/**
 * Renderiza um texto que pode ter marcadores {{CONFIRMAR: ...}}.
 * Os marcadores aparecem destacados para ninguém publicar com dado faltando.
 */
export function Fill({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(PENDING_RE)) {
    const i = m.index ?? 0;
    if (i > last) parts.push(text.slice(last, i));
    parts.push(
      <mark key={i} className="pending" title="Informação a confirmar com o dono antes de publicar">
        {m[0].replace(/^\{\{CONFIRMAR:\s*/, "a confirmar: ").replace(/\}\}$/, "")}
      </mark>,
    );
    last = i + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</>;
}

/**
 * Título com marcação simples: *destaque* e _sublinhado que se desenha_.
 * Usado nos títulos das seções e no hero.
 */
export function parseMarks(text: string) {
  const tokens: { text: string; strong?: boolean; underline?: boolean }[] = [];
  const re = /(\*[^*]+\*|_[^_]+_)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) tokens.push({ text: text.slice(last, i) });
    const raw = m[0];
    if (raw.startsWith("*")) tokens.push({ text: raw.slice(1, -1), strong: true });
    else tokens.push({ text: raw.slice(1, -1), underline: true });
    last = i + raw.length;
  }
  if (last < text.length) tokens.push({ text: text.slice(last) });
  return tokens;
}

export const stripMarks = (text: string) => text.replace(/[*_]/g, "");

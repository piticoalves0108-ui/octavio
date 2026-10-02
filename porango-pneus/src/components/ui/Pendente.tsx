import { Fragment } from "react";
import { MODO_PREVIA, REGEX_MARCADOR } from "@/lib/pendente";

/**
 * Renderiza um texto e destaca os marcadores {{CONFIRMAR: ...}}.
 * Fora do modo prévia o build já garante que não sobra marcador, então vira texto puro.
 */
export function Texto({ children }: { children: string }) {
  if (!MODO_PREVIA || !children.includes("{{CONFIRMAR")) return <>{children}</>;

  const partes: React.ReactNode[] = [];
  let ultimo = 0;
  for (const m of children.matchAll(REGEX_MARCADOR)) {
    const i = m.index ?? 0;
    if (i > ultimo) partes.push(children.slice(ultimo, i));
    partes.push(
      <mark key={i} className="pendente" title="Informação a confirmar com a loja">
        {m[0]}
      </mark>,
    );
    ultimo = i + m[0].length;
  }
  if (ultimo < children.length) partes.push(children.slice(ultimo));
  return (
    <>
      {partes.map((p, i) => (
        <Fragment key={i}>{p}</Fragment>
      ))}
    </>
  );
}

/** Selo "a confirmar" para itens não confirmados (só aparece no modo prévia). */
export function SeloPendente({ confirmado }: { confirmado: boolean }) {
  if (confirmado || !MODO_PREVIA) return null;
  return <span className="selo-pendente">a confirmar</span>;
}

import { Fragment } from "react";

/**
 * Exibe um texto do conteúdo. Marcadores {{CONFIRMAR: ...}} aparecem destacados
 * (borda tracejada) para o dono ver, no próprio site, o que ainda falta preencher.
 */
export function Texto({ children }: { children: string }) {
  const partes = children.split(/(\{\{CONFIRMAR:[^}]*\}\})/g);
  return (
    <>
      {partes.map((parte, i) =>
        /^\{\{CONFIRMAR:/.test(parte) ? (
          <mark key={i} className="confirmar" title="Informação a confirmar com a fábrica antes de publicar">
            {parte}
          </mark>
        ) : (
          <Fragment key={i}>{parte}</Fragment>
        ),
      )}
    </>
  );
}

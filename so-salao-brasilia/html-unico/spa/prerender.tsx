/** Roda no Node durante o build: pré-renderiza a home e extrai intro e JSON-LD. */
import { renderToString, renderToStaticMarkup } from "react-dom/server";
import { App } from "./App";
// Caminho relativo: escapa da troca por "vazio" (só aqui precisamos da intro real).
import { Intro, scriptClasseIntro } from "../../src/components/layout/Intro";
import { jsonLd, schemaLoja, schemaPerguntas } from "@/lib/schema";

export function prerender() {
  return {
    app: renderToString(<App />),
    intro: renderToStaticMarkup(<Intro />),
    scriptIntro: scriptClasseIntro,
    jsonLd: [jsonLd(schemaLoja()), jsonLd(schemaPerguntas())],
  };
}

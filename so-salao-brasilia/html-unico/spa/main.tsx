/** Entrada do navegador: hidrata a home pré-renderizada ou renderiza a rota pedida. */
import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "./App";
import { rotaAtual } from "./rotas";

const raiz = document.getElementById("raiz")!;
if (rotaAtual().caminho === "/" && raiz.hasChildNodes()) {
  hydrateRoot(raiz, <App />);
} else {
  raiz.innerHTML = "";
  createRoot(raiz).render(<App />);
}

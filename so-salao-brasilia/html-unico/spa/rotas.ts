/**
 * Roteador por "#" da versão em arquivo único: "#/showroom", "#/configurador?modelo=...",
 * "#/linhas/cadeiras", "#/#configurador" (âncora da home). Funciona até abrindo o
 * arquivo direto do computador (file://).
 */
import { useSyncExternalStore } from "react";

export type Rota = { caminho: string; busca: string; ancora: string };

function interpretar(hash: string): Rota | null {
  if (hash && !hash.startsWith("#/")) return null; // âncora comum (ex.: #conteudo)
  const u = new URL(hash ? hash.slice(1) : "/", "http://site");
  return { caminho: u.pathname, busca: u.search, ancora: u.hash };
}

let atual: Rota = (typeof window !== "undefined" && interpretar(window.location.hash)) || {
  caminho: "/",
  busca: "",
  ancora: "",
};
const ouvintes = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => {
    const r = interpretar(window.location.hash);
    if (!r) return;
    atual = r;
    ouvintes.forEach((f) => f());
  });
}

export function rotaAtual() {
  return atual;
}

export function useRota() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => atual,
    () => atual,
  );
}

/** "/showroom" → "#/showroom"; links externos e âncoras ficam como estão. */
export function paraHash(href: string) {
  if (/^(https?:|mailto:|tel:|#)/.test(href)) return href;
  const u = new URL(href, "http://site/");
  return `#${u.pathname}${u.search}${u.hash}`;
}

export function irPara(href: string) {
  window.location.hash = paraHash(href).slice(1);
}

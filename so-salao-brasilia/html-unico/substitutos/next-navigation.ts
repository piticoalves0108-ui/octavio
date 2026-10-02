/** Substituto de next/navigation para a versão em arquivo único. */
import { irPara, rotaAtual, useRota } from "../spa/rotas";

export function useRouter() {
  return {
    push: (href: string) => irPara(href),
    replace: (href: string) => irPara(href),
    back: () => history.back(),
    prefetch: () => {},
  };
}
export function usePathname() {
  return useRota().caminho;
}
export function useSearchParams() {
  return new URLSearchParams(rotaAtual().busca);
}
export function notFound(): never {
  throw new Error("Página não encontrada");
}

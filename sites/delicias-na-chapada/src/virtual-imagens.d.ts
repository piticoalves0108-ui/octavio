/** Imagens embutidas no build de arquivo único (veja plugins/imagens.ts). */
declare module 'virtual:imagens' {
  const imagens: Record<string, string> | null
  export default imagens
}

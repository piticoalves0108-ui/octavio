/**
 * Tipo comum das fotos do site.
 *
 * Enquanto `src` for null, o site mostra um placeholder na mesma proporção,
 * com a `legenda` descrevendo a foto ideal. Para trocar: coloque o arquivo em
 * /public/images/... (com autorização do Bruce, de preferência o original em
 * alta do Instagram) e preencha `src` com o caminho, ex.: "/images/historia/fachada.jpg".
 * O Next gera AVIF/WebP no tamanho certo sozinho.
 */
export type Proporcao = "4/5" | "1/1" | "3/4" | "4/3" | "16/9" | "9/16";

export type Foto = {
  src: string | null;
  alt: string;
  legenda: string;
  proporcao: Proporcao;
};

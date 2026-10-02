import type { Foto } from "./fotos";

/**
 * Galeria (grid masonry).
 *
 * Com INSTAGRAM_ACCESS_TOKEN no ambiente, a galeria puxa as últimas fotos do
 * @churrasquinhodobruce direto da API do Instagram (src/lib/instagram.ts).
 * Sem token, usa esta lista. Coloque as fotos em /public/images/galeria/.
 */
export const fotosGaleria: Foto[] = [
  { src: null, proporcao: "4/5", alt: "Espetinho de carne saindo da brasa", legenda: "Espetinho de carne na grelha, close, brasa ao fundo." },
  { src: null, proporcao: "1/1", alt: "Hambúrguer do Bruce visto de lado", legenda: "Hambúrguer inteiro de lado, mostrando as camadas." },
  { src: null, proporcao: "9/16", alt: "Fumaça subindo da churrasqueira à noite", legenda: "Vertical: fumaça subindo da churrasqueira à noite, luz quente." },
  { src: null, proporcao: "4/3", alt: "Prato do almoço servido no balcão", legenda: "Prato do almoço visto de cima, luz natural." },
  { src: null, proporcao: "3/4", alt: "Queijo coalho dourado no espeto", legenda: "Queijo coalho dourando na grelha, bem perto." },
  { src: null, proporcao: "1/1", alt: "Mesa com vários espetinhos e bebidas", legenda: "Mesa da turma: vários espetos e bebidas, vista de cima." },
  { src: null, proporcao: "4/5", alt: "Bruce na churrasqueira virando os espetos", legenda: "O Bruce na churrasqueira virando os espetos (retrato, com autorização)." },
  { src: null, proporcao: "16/9", alt: "Fachada do Churrasquinho do Bruce com o movimento da noite", legenda: "Horizontal: a fachada com movimento à noite." },
  { src: null, proporcao: "3/4", alt: "Pedido do iFood embalado para entrega", legenda: "Pedido embalado pronto para o entregador." },
];

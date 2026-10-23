# Diretrizes de motion · Nature Senses Chapadinha

Especificação dos efeitos de movimento do site e de como foram implementados.
Vale para `index.html`, `assets/css/style.css` (tokens e efeitos) e `assets/js/main.js` (gatilhos).

## 1. Princípios

- Movimentos sutis, calmos e sem pressa, como o ritmo de um fim de tarde na Chapada.
- O motion acompanha o conteúdo e nunca disputa atenção com ele.
- Só `transform` e `opacity` (exceções conscientes na seção 6).
- Cada efeito dispara uma vez. Rolar para cima e para baixo não repete animações.
- Com `prefers-reduced-motion`, o site fica completo e parado (seção 7).

## 2. Tokens

Definidos como variáveis CSS no `:root` de `style.css`.

| Token | Valor | Uso |
| --- | --- | --- |
| `--dur-micro` | 150ms | microinterações, troca de rótulo, saída de itens do menu |
| `--dur-cta` | 200ms | hover de botões e canais |
| `--dur-hover` | 250ms | hover de cards, estados, abertura de menu e lightbox |
| `--dur-reveal` | 500ms | revelação de conteúdo ao rolar |
| `--dur-enter` | 700ms | entradas maiores (hero, blocos de destaque) |
| `--dur-page` | 300ms | entrada de página (fade) |
| `--ease-enter` | `cubic-bezier(0.22, 1, 0.36, 1)` | todas as entradas |
| `--ease-exit` | `ease-out` | todas as saídas |
| `--ease-soft` | `cubic-bezier(0.4, 0, 0.2, 1)` | crossfade de fotos do hero |
| `--dist-sm` | 8px | slides curtos (menu, mensagens, botão fixo, legendas) |
| `--dist-md` | 16px | fade-up padrão |
| `--dist-lg` | 24px | fade-up de blocos grandes (`data-reveal="lg"`) |
| `--stagger` | 90ms | intervalo entre itens de uma lista |

Nada usa `linear`, exceto a rotação do spinner de carregamento (movimento mecânico, não orgânico).

## 3. Efeitos por seção

### Página
| Efeito | Gatilho | Propriedade | Duração / easing |
| --- | --- | --- | --- |
| Entrada da página | carregamento | opacity 0 → 1 | 300ms, ease-out |
| Saída para outra página do site | clique em link interno para outro arquivo | opacity 1 → 0, depois navega | 250ms, ease-out |

Links âncora (`#secao`), links externos e links com nova aba não disparam a saída.

### Topo (header)
| Efeito | Gatilho | Propriedade | Duração / easing |
| --- | --- | --- | --- |
| Fundo aparece | rolagem > 24px | opacity 0 → 1 da camada de fundo | 250ms, ease-out |
| Header "encolhe" | rolagem > 24px | fundo `scaleY(1 → .82)`, conteúdo sobe 8px | 250ms, ease de entrada |
| Link de navegação | hover / foco / seção atual | sublinhado `scaleX(0 → 1)` | 250ms, ease de entrada |

### Menu mobile
| Efeito | Gatilho | Propriedade | Duração / easing |
| --- | --- | --- | --- |
| Abrir | toque no botão | opacity 0 → 1 + translateY(-8px → 0) | 250ms, ease de entrada |
| Itens | ao abrir | fade-up de 8px | 500ms, stagger de 60ms |
| Fechar | botão, link, Esc | opacity + translateY(0 → -8px) | 200ms, ease-out |
| Ícone do botão | abrir/fechar | linhas giram ±45° | 250ms |

### Hero
| Efeito | Gatilho | Propriedade | Duração / easing |
| --- | --- | --- | --- |
| Foto de fundo | carregou | fade 0 → 1 + scale 1.04 → 1.00 | 700ms (fade) e 1400ms (scale), ease de entrada |
| Placeholder | imediato | miniatura desfocada da própria foto | estático |
| Texto (eyebrow, 2 linhas do título, parágrafo, botões, controles) | carregamento | fade-up de 16px | 700ms, início em 250ms, stagger de 100ms |
| Troca de fotos | a cada 7s (pausável) | crossfade de opacity + scale 1.04 → 1.00 na nova foto | 1200ms, ease suave |
| Parallax do fundo | rolagem | translateY de 8% da distância ao centro (4% no celular) | rAF, sem transição |
| Indicador de scroll | contínuo | opacity .3 ↔ .85 | 2.8s, ease-in-out |
| Indicador some | rolagem > 60px | opacity → 0 | 250ms |

A troca automática pausa sozinha quando o hero sai da tela ou a aba fica oculta, e tem botão de pausa (WCAG 2.2.2).

### Revelação ao rolar (todas as seções)
| Efeito | Gatilho | Propriedade | Duração / easing |
| --- | --- | --- | --- |
| Blocos e títulos | 15% visível (IntersectionObserver) | fade-up de 16px | 500ms, ease de entrada |
| Blocos grandes (fotos do chalé, mapa, formulário, banner, assinatura do rodapé) | idem | fade-up de 24px | 700ms |
| Listas (comodidades, cards, sentidos, atrações, galeria, dúvidas, canais, rodapé) | idem | fade-up de 16px | stagger de 90ms (máx. 6 passos = 540ms) |

O observador é desligado depois da primeira revelação de cada elemento. Texto nunca tem parallax.

### Imagens
| Efeito | Gatilho | Propriedade | Duração / easing |
| --- | --- | --- | --- |
| Lazy-load com blur-up | foto carregou | foto real em fade 0 → 1 sobre o placeholder desfocado | 600ms, ease de entrada |
| Hover em foto de card ou galeria | hover / foco | scale 1 → 1.03 | 500ms, ease de entrada |

### Galeria e lightbox
| Efeito | Gatilho | Propriedade | Duração / easing |
| --- | --- | --- | --- |
| Overlay com legenda | hover / foco | overlay opacity 0 → 1; legenda sobe 8px | 250ms (sempre visível em telas de toque) |
| Abrir lightbox | clique | fundo em fade; foto em fade + scale .98 → 1 | 250ms / 350ms, ease de entrada |
| Fechar lightbox | botão, Esc, clique fora | o inverso | 200ms, ease-out |
| Trocar foto | setas, teclado, arrastar | crossfade: sai em 150ms, entra em 250ms quando carregar | sem cortes bruscos |

### Botões e CTAs
| Efeito | Gatilho | Propriedade | Duração / easing |
| --- | --- | --- | --- |
| Hover | hover / foco | translateY(-2px) + sombra (camada em opacity) + leve clareada no fundo | 200ms |
| Clique | `:active` | scale .98 | 120ms |
| Carregando | ação assíncrona (copiar mensagem) | rótulo em fade-out, spinner em fade-in, mesmo tamanho | 150ms |

### Cards (acomodação, experiências, atrações, canais)
| Efeito | Gatilho | Propriedade | Duração / easing |
| --- | --- | --- | --- |
| Entrada | rolagem | fade-up com stagger | 500ms, 90ms |
| Hover / foco | hover, `:focus-within` | translateY(-3px) + sombra em opacity + zoom 1.03 na foto | 250ms (foto 500ms) |

Hover e foco têm o mesmo resultado visual; o clique dá o retorno de scale .98.

### Dúvidas (accordion)
| Efeito | Gatilho | Propriedade | Duração / easing |
| --- | --- | --- | --- |
| Abrir | clique | altura via `grid-template-rows: 0fr → 1fr`; texto em fade + 4px | 300ms, ease de entrada |
| Fechar | clique | o inverso | 250ms, ease-out |
| Ícone | abrir/fechar | "+" gira 45° e vira "×" | 250ms |

### Formulário
| Efeito | Gatilho | Propriedade | Duração / easing |
| --- | --- | --- | --- |
| Label flutuante | foco ou campo preenchido | translateY(-10px) + scale .76 | 200ms, ease de entrada |
| Campo | hover / foco | cor da borda e do fundo | 200ms, ease-out |
| Mensagem de erro | envio inválido | fade + slide de 8px | 250ms |
| Mensagem pronta (sucesso) | envio válido | fade + slide de 8px | 250ms |

### Botão fixo de contato (WhatsApp ou Instagram)
| Efeito | Gatilho | Propriedade | Duração / easing |
| --- | --- | --- | --- |
| Aparecer | rolagem > 60% da tela | fade + translateY(8px → 0) | 250ms |
| Destaque | a cada 45s (primeiro após 15s) | anel fino em fade e leve expansão, por ~1,8s | discreto, sem pulsar |
| Hover / clique | — | -2px / scale .98 | 200ms / 120ms |

## 4. Implementação recomendada

**CSS + IntersectionObserver + `requestAnimationFrame`, sem bibliotecas.** É o que o site usa.

- Transições e keyframes em CSS cobrem 100% dos efeitos e rodam na GPU (transform/opacity).
- `IntersectionObserver` dispara as revelações e desliga cada elemento depois da primeira vez.
- Parallax e estado do header usam um único listener de scroll `passive`, agrupado em `requestAnimationFrame`, e só calculam camadas visíveis.
- Peso total do JS de motion: zero dependências.

Quando considerar bibliotecas:
- **GSAP**: só se surgirem sequências longas e encadeadas ou timelines ligadas ao scroll. Não é o caso aqui.
- **Framer Motion**: só se o site for migrado para React (por exemplo, Next.js). Os mesmos tokens servem de `transition` nos componentes.

Trechos principais:

```css
.js-motion [data-reveal] {
  opacity: 0; transform: translate3d(0, var(--d, var(--dist-md)), 0);
  transition: opacity var(--dur-reveal) var(--ease-enter), transform var(--dur-reveal) var(--ease-enter);
  transition-delay: calc(var(--i, 0) * var(--stagger));
}
.js-motion [data-reveal].is-in { opacity: 1; transform: none; }
```

```js
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    io.unobserve(e.target); // uma vez só
  });
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
```

Como usar em conteúdo novo:
- `data-reveal` num bloco: fade-up padrão. `data-reveal="lg"`: bloco grande. `data-reveal="fade"`: só fade.
- `data-stagger` no contêiner: os filhos com `data-reveal` entram em sequência.
- `data-parallax-bg="0.08"` numa camada de imagem de fundo (nunca em texto).
- Não coloque `data-reveal` no mesmo elemento que tem hover com transform; use um wrapper (como os `<li>` dos cards).

## 5. Sem JavaScript

O motion só liga quando o script do `<head>` adiciona a classe `js-motion`. Sem JS, todo o conteúdo aparece pronto, sem nada escondido.

## 6. Exceções conscientes

| Exceção | Por quê |
| --- | --- |
| Altura do accordion (`grid-template-rows`) | O guia pede abertura em altura suave. Afeta só o item aberto, em 250–300ms. |
| Cor de borda/fundo em campos e botões | O guia pede transição de borda e fundo. São áreas pequenas, só repinta. |
| `filter: blur()` no placeholder | É estático (nunca animado) e some atrás da foto real. |
| Spinner com `linear` | Rotação mecânica; easing orgânico faria parecer travado. |

## 7. Versão reduzida (`prefers-reduced-motion: reduce`)

| Fica | Sai |
| --- | --- |
| Fades curtos de estado (150ms): hover de cor, menu, lightbox, mensagens | Revelação ao rolar (conteúdo já visível) |
| Foto inicial do hero, estática | Troca automática das fotos e botão de pausa |
| Foco visível | Parallax |
| Accordion abre e fecha (sem transição de altura) | Scale de entrada e zoom no hover |
| Spinner estático (anel em opacidade) | Pulso do indicador de scroll e destaque do botão fixo |
| Rolagem por âncora instantânea | Elevação no hover e scale no clique; fade de entrada e saída de página |

## 8. Checklist de validação

Performance
- [x] Animações só em `transform` e `opacity` (exceto a seção 6).
- [x] Nenhuma animação em `width`, `height`, `top`, `left` ou filtros animados.
- [x] Revelações via IntersectionObserver, desligadas após disparar.
- [x] Um único listener de scroll, `passive`, agrupado em `requestAnimationFrame`.
- [x] Parallax reduzido pela metade no celular e calculado só para camadas visíveis.
- [x] Fotos em 640 e 1080 px com `srcset`, `loading="lazy"` e placeholder de ~400 bytes.
- [x] Sem bibliotecas de animação.
- [ ] Medir no Chrome DevTools (Performance, CPU 4× mais lenta) em celular real: sem quadros longos ao rolar.
- [ ] Lighthouse: CLS próximo de 0 (o motion não mexe no layout).

Acessibilidade
- [x] `prefers-reduced-motion` respeitado (seção 7).
- [x] Nenhum efeito piscante; o pulso do indicador varia só a opacidade, em 2,8s.
- [x] Troca automática de fotos com botão de pausa e pausa fora da tela.
- [x] Nada bloqueia leitura ou clique: animações curtas, sem telas de carregamento.
- [x] Foco visível em todos os elementos interativos, com o mesmo efeito do hover.
- [x] Menu e lightbox: Esc fecha, foco volta ao elemento de origem, conteúdo oculto fica `inert`.
- [x] Accordion com `aria-expanded`, `aria-controls` e região rotulada.
- [ ] Testar com leitor de tela (VoiceOver/TalkBack) e só teclado.

Restrições do guia
- [x] Sem pop-ups, contadores, pulsos agressivos ou urgência artificial.
- [x] Sem vídeo em autoplay.
- [x] Botão fixo sem pulsação contínua; um destaque discreto a cada 45s.

## 9. O que mudou em relação à versão anterior

Saíram, por contrariarem o guia: cenários animados em canvas (estrelas cadentes, vaga-lumes, cachoeira), cursor personalizado, botões magnéticos, inclinação 3D, faixa de texto correndo, contadores animados, palavras que acendiam com a rolagem, rolagem horizontal fixada, troca de banner com revelação circular, anéis e rota do mapa sendo desenhados, selo girando e textura de grão sobre a tela.

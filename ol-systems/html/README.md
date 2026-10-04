# OL Systems: página de vendas em HTML puro

Esta pasta é a página pronta em HTML. Não precisa de Node, Next.js nem instalação.

| Arquivo | O que é |
|---|---|
| `index.html` | A página de vendas, com CSS e fontes embutidos |
| `politica-de-privacidade.html` | Política de privacidade (link no rodapé) |
| `og-image.png` | Imagem que aparece quando o link é compartilhado (WhatsApp, Instagram, Facebook) |

## Como abrir

Dê dois cliques em `index.html`. Abre no navegador como qualquer site.

## Como publicar

Suba os três arquivos juntos, na mesma pasta, em qualquer hospedagem de site estático: Hostinger, HostGator, Locaweb (via gerenciador de arquivos ou FTP), Netlify (arraste a pasta), Vercel, GitHub Pages ou Cloudflare Pages. O `index.html` vira a página inicial do domínio.

## O que trocar antes de publicar

Tudo que falta confirmar aparece **destacado em amarelo** na própria página. No código, procure por `a confirmar` (texto da página) e por `CONFIRMAR` (comentários).

### WhatsApp, medição e conversa de exemplo

No fim do `index.html`, dentro do `<script type="module">`, fica o objeto `CONFIG`:

```js
const CONFIG = {
  whatsapp: "5562999291420", // só dígitos: 55 + DDD + número
  whatsappMessage: "Olá! Vim pelo site e quero um site para o meu negócio.",
  ga4Id: "",               // ID do Google Analytics 4 (G-XXXXXXX)
  metaPixelId: "",         // ID do Meta Pixel
  ...
};
```

Todos os botões abrem o WhatsApp (62) 99929-1420 com a mensagem pronta. Para trocar o número, mude só esse campo. Se ele ficar vazio, os botões abrem o Direct do Instagram @ol_systemss.

### Domínio

Troque `https://www.seudominio.com.br` pelo endereço final do site (usar "Localizar e substituir" no editor). Ele aparece no `<head>` (canonical e imagem de compartilhamento) e nos dados para o Google.

### Textos e preço

Os textos estão direto no HTML: use "Localizar" no editor (ex.: procure `R$ 250` para achar todos os lugares do preço). Os títulos alternativos do topo e a conversa de exemplo ficam no `CONFIG`.

### Teste A/B do título

Abra o link com `?titulo=2` ou `?titulo=3` no fim (ex.: `https://seudominio.com.br/?titulo=2`) para mostrar os outros títulos. Bom para usar em anúncios diferentes.

## O que precisa de internet

- **Fontes e estilo:** embutidos, funcionam até offline.
- **Animações de rolagem, globo 3D e rolagem suave:** as bibliotecas (GSAP, Lenis e three.js) vêm do CDN jsDelivr quando a página precisa delas. Sem internet ou com o CDN fora do ar, a página continua completa e clicável, só sem essas animações.

## Como gerar de novo a partir do projeto Next.js

Esta pasta é gerada a partir de `ol-systems/site`. Se você mudar o projeto Next.js, gere o HTML de novo:

```bash
cd ol-systems/site
npm install
npm run export:html
```

O JavaScript próprio da versão HTML fica em `ol-systems/site/html-export/`. Se você editar o `index.html` direto, lembre que gerar de novo sobrescreve essas edições.

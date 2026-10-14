# Comece aqui: Vitrine 61

**O negócio:** vender site profissional por **R$250** para comércio local que só tem Instagram, **mandando o site dele já pronto** (prévia) antes de cobrar. Depois, renda mensal com manutenção (R$39,90) e Reels editados (R$250). Sem aparecer, sem investir e tudo pelo celular.

Por que isso e não outra coisa, com fontes: [`PESQUISA.md`](PESQUISA.md).

## O que já está pronto

| O quê | Onde | Para que serve |
|---|---|---|
| **Fábrica de Sites** | `site/fabrica/` | Você preenche nome, WhatsApp e endereço, e em 2 minutos sai o site, o link de prévia e a mensagem pronta no WhatsApp do cliente. Tem 14 ramos, fotos, mini-CRM e o .zip para publicar. |
| **Site da sua marca** | `site/index.html` | Vitrine 61: preços, exemplos e botão de WhatsApp. Sem rosto e sem nome pessoal. |
| **13 sites de exemplo** | `site/exemplos/?n=barbearia` (e os outros) | Portfólio por ramo |
| **12 prévias de clientes reais** | `site/previa/…` + [`LINKS-DAS-PREVIAS.md`](LINKS-DAS-PREVIAS.md) | Negócios **novos** de Samambaia, Ceilândia e Guará sem site, com a prévia pronta para mandar hoje |
| **12 imagens para mandar junto** | `imagens/previas/` | "Fizemos uma prévia do seu site", no formato do WhatsApp |
| **6 posts + foto de perfil** | `imagens/instagram/` | Instagram da marca pronto para postar |
| **3 Reels (MP4)** | `videos/` | Vídeos de 14 segundos com os sites rolando no celular |
| **Planilha de controle** | [`controle-clientes.csv`](controle-clientes.csv) | Os 12 prospects com link, canal e status (abre no Google Planilhas) |
| **Mensagens de venda** | [`SCRIPTS-DE-VENDA.md`](SCRIPTS-DE-VENDA.md) | 1º contato, retorno, objeções, cobrança, entrega, plano mensal, indicação |
| **Plano de 14 dias** | [`PLANO-14-DIAS.md`](PLANO-14-DIAS.md) | O que fazer em cada dia, com metas e contas |
| **Como achar clientes** | [`PROSPECCAO.md`](PROSPECCAO.md) | 25 por dia em 1 hora, pelo Google Maps e pelo Instagram |
| **Publicar e entregar** | [`PUBLICAR-E-ENTREGAR.md`](PUBLICAR-E-ENTREGAR.md) | Cloudflare (grátis), domínio, termos do serviço e recibo |
| **Reels e Instagram** | [`REELS-E-INSTAGRAM.md`](REELS-E-INSTAGRAM.md) | Bio, legendas, ordem dos posts, serviço de Reels com 36 roteiros |

## Hoje (cerca de 1h30)

1. **Seu WhatsApp e Pix:** edite `site/config.js` (no GitHub: lápis → edite → Commit). *Ou mande o número para o Claude configurar.*
2. **Publique:** Parte A de [`PUBLICAR-E-ENTREGAR.md`](PUBLICAR-E-ENTREGAR.md) (Cloudflare grátis, 15 minutos).
3. **WhatsApp Business e Instagram:** foto, bio, respostas automáticas e os 6 posts + 3 Reels.
4. **Abra a Fábrica no celular** (`seusite.pages.dev/fabrica/`) → Clientes → **Importar lista pronta** → os 12 negócios aparecem.
5. Para cada um: **Abrir** → **Mandar no WhatsApp do cliente**. A conversa abre com a mensagem e o link da prévia. Para os que só têm Instagram, use **Copiar mensagem** e cole no direct.

Depois disso, siga o [`PLANO-14-DIAS.md`](PLANO-14-DIAS.md).

## Regras que fazem isso dar certo
- **Nunca cobre antes de o cliente ver e aprovar.** É isso que faz confiarem em quem não mostra o rosto.
- **Toda mensagem leva o nome do negócio e a prévia dele.** Nada de mensagem genérica.
- **Até 15 conversas novas por dia no WhatsApp e 10 no Instagram.** Sem programa de disparo.
- **Nada inventado no site do cliente:** preço, nota e depoimento só se forem reais.

## Para quem mexe no código
- `site/motor.js`: gera o site a partir de uma configuração (funciona no navegador e no Node). Os ramos, textos, cores e fontes ficam em `NICHOS` e `TEMAS`.
- `dados/prospects.json`: os negócios com prévia. Para adicionar um, copie um bloco e rode o build.
- `node ferramentas/build.mjs`: gera as prévias, os prints, as imagens de compartilhamento, os posts e o `.zip` (precisa de Playwright e Chromium). Use `--sem-imagens` para gerar só as páginas.
- `node ferramentas/videos.mjs`: gera os Reels (precisa do `ffmpeg` com `libx264`).

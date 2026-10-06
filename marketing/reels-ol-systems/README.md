# Reels / TikTok: OL Systems

Vídeos verticais de divulgação feitos a partir do carrossel em `slides/` (8 artes de 1080×1350).

**Para postar, use a versão 2 e siga o [`POSTAGEM.md`](POSTAGEM.md)**: legenda, hashtags, checklist e impulsionamento.

| Arquivo | O que é |
|---|---|
| `v2/reels-ol-systems-v2-ganchoA.mp4` | **Versão recomendada.** 19,9 s, 1080×1920, 30 fps, com efeitos sonoros e final em loop. Gancho "Seu cliente te procurou no Google… e achou o concorrente." |
| `v2/reels-ol-systems-v2-ganchoB.mp4` | Igual ao A, com o gancho "Pesquisa 'barbearia perto de mim'. Você aparece?" |
| `v2/reels-ol-systems-v2-ganchoC.mp4` | Igual ao A, com o gancho "Site para barbearia por R$ 250/mês, sem fidelidade." |
| `v2/capa-ganchoA.png` … `capa-ganchoC.png` | Capas de cada versão |
| `reels-ol-systems.mp4` / `capa-reels.png` | Versão 1 (40 s, carrossel animado completo, sem som) |
| `POSTAGEM.md` | Plano de postagem com a pesquisa de alcance e de hashtags (06/10/2026) |
| `slides/` | Artes originais e a legenda original do post |
| `render.py`, `v2/render_v2.py` | Scripts que geram os vídeos a partir das artes |
| `fontes/SpaceGrotesk-Bold.ttf` | Fonte dos títulos (licença OFL) |

## Roteiro da versão 2

| Tempo | Cena |
|---|---|
| 0–2,8 s | Gancho: a busca "barbearia perto de mim" já na tela, o concorrente com site e o cartão vermelho "Sua barbearia: nenhum site encontrado" tremendo |
| 2,8–4,6 s | "Link da bio improvisado?": celular com os links bagunçados |
| 4,6–6,5 s | "Site com preço de 2 anos atrás?": carimbos "preço antigo" e "horário errado" |
| 6,5–10,9 s | "Mudou preço ou horário? Manda no WhatsApp.": mensagem, digitando, "Feito! Já está no site." e horário atualizado |
| 10,9–14 s | "Quanto custa?": R$ 250/mês e 3 vantagens |
| 14–18 s | Pergunta aberta ("Conhece alguém com barbearia, padaria ou pet shop sem site?") e botão do WhatsApp |
| 18–19,9 s | Loop: a mesma busca, agora com "Sua barbearia ✓ Site oficial" em verde |

Escolhas de edição tiradas da pesquisa (detalhes no `POSTAGEM.md`):
- O gancho aparece já no primeiro quadro.
- Nenhum trecho fica parado por mais de 0,5 s.
- Menos texto por cena.
- Nada importante fica nos 14% de cima nem nos 35% de baixo da tela (área segura de anúncios).
- Não há pedido explícito de compartilhar, comentar ou marcar.
- A faixa de áudio traz efeitos sonoros (vídeo mudo é menos recomendado).

## Como gerar de novo

Requer Python 3 com `numpy`, `opencv-python-headless` e `Pillow`, além do `ffmpeg`.

```bash
cd marketing/reels-ol-systems
# quadros de teste
HOOK=A python3 v2/render_v2.py slides fontes previas stills 0,1.4,8,16
# trilha de efeitos sonoros
python3 v2/render_v2.py slides fontes sfx.wav audio
# vídeo (597 quadros) em 4 partes paralelas, juntando com a trilha
for i in 0 1 2 3; do HOOK=A python3 v2/render_v2.py slides fontes parte$i.mp4 chunk $((i*150)) $(((i+1)*150)) & done; wait
printf "file 'parte%d.mp4'\n" 0 1 2 3 > partes.txt
ffmpeg -f concat -safe 0 -i partes.txt -i sfx.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k \
  -shortest -movflags +faststart reels-ol-systems-v2-ganchoA.mp4
# capa
HOOK=A python3 v2/render_v2.py slides fontes capa-ganchoA.png cover
```

A versão 1 usa `python3 render.py slides <saída> stills|chunk ...` (ver o cabeçalho do script).

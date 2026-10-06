# Reels / TikTok: OL Systems

Vídeo vertical de divulgação montado a partir do carrossel `slides/` (8 artes de 1080×1350).

| Arquivo | O que é |
|---|---|
| `reels-ol-systems.mp4` | Vídeo final: 1080×1920 (9:16), 30 fps, 40 s, H.264. Sai sem música, para escolher o áudio dentro do Instagram ou do TikTok. |
| `capa-reels.png` | Quadro de capa (1080×1920) para subir como capa do Reels. |
| `slides/` | Artes originais e a legenda do post (`legenda.txt`). |
| `render.py` | Script que gera o vídeo a partir das artes. |

## Roteiro (tempo em segundos)

| Tempo | Cena | Animação |
|---|---|---|
| 0–5 | Capa: "Seu cliente te procurou no Google" | Busca "barbearia perto de mim" sendo digitada, resultados entrando e o cartão "nenhum site encontrado" tremendo |
| 5–9,5 | Link da bio improvisado | Celular sobe e os links entram um a um |
| 9,5–14 | Site parado | Etiquetas "preço antigo" e "horário errado" carimbando o site |
| 14–19 | O site acompanha você | Linha do tempo se desenhando e globo girando |
| 19–24,5 | Atualização pelo WhatsApp | Mensagem, "digitando…", resposta e o horário atualizado piscando |
| 24,5–29 | O que vem incluso | Os 8 cartões aparecendo em sequência |
| 29–33,5 | Preço | "250" em zoom e os itens marcados um a um |
| 33,5–40 | Chamada final | Globo girando e botão do WhatsApp pulsando |

Os textos ficam fora das áreas cobertas pelos botões e pela legenda do Instagram e do TikTok. Uma barra de progresso de 8 segmentos no rodapé substitui o "Arrasta para o lado".

## Como gerar de novo

Requer Python 3 com `numpy`, `opencv-python-headless` e `Pillow`, além do `ffmpeg`.

```bash
# quadros de teste em segundos específicos
python3 render.py slides previas stills 0,4.4,12.5,38

# vídeo em 4 partes paralelas (300 quadros cada) e junção com faixa de áudio muda
for i in 0 1 2 3; do python3 render.py slides parte$i.mp4 chunk $((i*300)) $(((i+1)*300)) & done; wait
printf "file 'parte%d.mp4'\n" 0 1 2 3 > partes.txt
ffmpeg -f concat -safe 0 -i partes.txt -f lavfi -i anullsrc=r=48000:cl=stereo \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 128k -shortest -movflags +faststart reels-ol-systems.mp4
```

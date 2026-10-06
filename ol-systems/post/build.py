#!/usr/bin/env python3
"""
Gera o carrossel do Instagram da OL Systems (8 cards 1080x1350).

  python3 build.py        -> escreve carrossel.html (com as fontes do site embutidas)
  node render.mjs         -> salva os PNGs (01-capa.png ... 08-chamada.png)

Os textos são os mesmos da legenda (legenda.txt). Tudo o que aparece aqui foi
confirmado pelo dono: preço, prazos, condições e contato.
"""
import math
import re
from pathlib import Path

HERE = Path(__file__).parent
SITE_HTML = HERE.parent / "html" / "index.html"

# Fontes (Space Grotesk + Inter, subset latino) tiradas da página em HTML.
styles = re.findall(r"<style>(.*?)</style>", SITE_HTML.read_text(), re.S)
FONTS = next(s for s in styles if "@font-face" in s and "base64" in s)

# ---------- Globo do logo (mesma geometria do site) ----------
TILT = 0.42
PARALLELS = [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75]
MERIDIANS = [i * 15 for i in range(12)]


def globe(size, stroke=1.2, spin=0.0, opacity=1.0, color="#fff"):
    els = []
    for lat in PARALLELS:
        p = math.radians(lat)
        els.append(
            f'<ellipse cx="0" cy="{-math.sin(p) * math.cos(TILT):.4f}" rx="{math.cos(p):.4f}" ry="{math.cos(p) * math.sin(TILT):.4f}"/>'
        )
    for lon in MERIDIANS:
        l = math.radians(lon) + spin
        rot = math.degrees(math.atan2(-math.cos(l), -math.sin(l) * math.sin(TILT)))
        ry = abs(math.sin(l) * math.cos(TILT))
        els.append(f'<ellipse rx="1" ry="{ry:.4f}" transform="rotate({rot:.2f})"/>')
    els.append('<circle r="1"/>')
    return (
        f'<svg viewBox="-1.12 -1.12 2.24 2.24" width="{size}" height="{size}" aria-hidden="true" style="opacity:{opacity}">'
        f'<g fill="none" stroke="{color}" stroke-width="{stroke}" vector-effect="non-scaling-stroke">'
        + "".join(e.replace("/>", ' vector-effect="non-scaling-stroke"/>') for e in els)
        + "</g></svg>"
    )


# ---------- Ícones (traço simples, 24x24) ----------
def icon(name, size=40, color="currentColor", sw=1.8):
    paths = {
        "search": '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
        "x": '<path d="M6 6l12 12M18 6 6 18"/>',
        "check": '<path d="m4.5 12.5 4.5 4.5 10.5-11"/>',
        "alert": '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
        "phone": '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
        "map": '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
        "lock": '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
        "server": '<rect x="3.5" y="4" width="17" height="7" rx="1.8"/><rect x="3.5" y="13" width="17" height="7" rx="1.8"/><path d="M7.5 7.5h.01M7.5 16.5h.01"/>',
        "palette": '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.8 0-1.2-1-1.6-1-2.6 0-.9.8-1.6 1.7-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14.5" cy="7" r="1"/>',
        "instagram": '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r=".9" fill="currentColor"/>',
        "link": '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
        "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
        "file": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
        "chat": '<path d="M21 12a8 8 0 0 1-11.8 7L4 20.5l1.6-4.6A8 8 0 1 1 21 12z"/>',
        "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
        "star": '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="currentColor" stroke="none"/>',
    }
    return (
        f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="{sw}" '
        f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths[name]}</svg>'
    )


WHATSAPP = (
    '<svg viewBox="0 0 24 24" width="{s}" height="{s}" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.22 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z"/></svg>'
)


def wa(size):
    return WHATSAPP.replace("{s}", str(size))


TOTAL = 8


def card(n, slug, etiqueta, body, hot=False, footer_hint=""):
    pill = f'<span class="pill{" pill-hot" if hot else ""}">{etiqueta}</span>' if etiqueta else ""
    return f"""
<section class="card" id="c{n}" data-file="{n:02d}-{slug}.png">
  <div class="dots"></div>
  <header class="top">
    <div class="brand">{globe(54, 1.1)}<span>OL Systems</span></div>
    {pill}
  </header>
  {body}
  <footer class="bottom">
    <span class="handle">{icon("instagram", 30)}@ol_systemss</span>
    <span class="count">{footer_hint}<b>{n}</b>/{TOTAL}</span>
  </footer>
</section>"""


cards = []

# 1. Capa: busca em que o concorrente aparece e "sua empresa" não.
result = lambda name, url, dim="": f"""
  <div class="res {dim}">
    <div class="res-ico">{name[0]}</div>
    <div class="res-main">
      <div class="res-name">{name}</div>
      <div class="res-url">{url}</div>
      <div class="res-stars">{icon("star", 26) * 5}</div>
      <div class="res-tags"><span>Site</span><span>WhatsApp</span><span>Como chegar</span></div>
    </div>
  </div>"""
cards.append(
    card(
        1,
        "capa",
        "Pequenos negócios",
        f"""
  <h1 class="h h-cover">Seu cliente te procurou no Google.<br><span class="hl">E achou o <u>concorrente</u>.</span></h1>
  <div class="visual search">
    <div class="sbar">{icon("search", 40)}<span>barbearia perto de mim</span><i class="caret"></i></div>
    {result("Barbearia do concorrente", "Site oficial · Aberta agora")}
    {result("Outra barbearia", "Site oficial", "dim")}
    <div class="res missing">
      <div class="res-ico x">{icon("x", 34)}</div>
      <div class="res-main"><div class="res-name">Sua barbearia</div><div class="res-url">nenhum site encontrado</div></div>
    </div>
  </div>""",
        footer_hint='<span class="swipe">Arrasta para o lado ' + icon("arrow", 28) + "</span>",
    )
)

# 2. Link da bio improvisado.
cards.append(
    card(
        2,
        "link-da-bio",
        "Primeira impressão",
        f"""
  <h2 class="h">Link da bio improvisado passa imagem de negócio improvisado.</h2>
  <p class="sub">O cliente clica, não acha preço, endereço nem WhatsApp. E vai embora.</p>
  <div class="visual bio">
    <div class="phone">
      <div class="notch"></div>
      <div class="bio-head"><div class="avatar"></div><div><div class="bio-name">sua.loja</div><div class="bio-link">{icon("link", 26)} link da bio</div></div></div>
      <div class="bio-btn bad">{icon("file", 30)} cardapio_FINAL_v3.pdf</div>
      <div class="bio-btn bad">{icon("chat", 30)} Preço? Chama no direct</div>
      <div class="bio-btn bad">{icon("map", 30)} Endereço: pergunta aí</div>
    </div>
  </div>""",
    )
)

# 3. Site parado: horário e preço errados.
cards.append(
    card(
        3,
        "site-parado",
        "Site parado",
        f"""
  <h2 class="h">O problema não é só ter site. É manter ele atualizado.</h2>
  <p class="sub">Horário e preço errados afastam quem ia comprar. E muito programador some depois que entrega.</p>
  <div class="visual stale">
    <div class="laptop"><div class="screen">
      <div class="ms-nav"><span class="ms-logo"></span><b>Padaria Bom Grão</b><span class="ms-cta">WhatsApp</span></div>
      <div class="ms-hero"><div><div class="ms-h">Pão quentinho toda manhã</div><div class="ms-p">Fornadas o dia todo e bolos caseiros.</div></div><div class="ms-img"></div></div>
      <div class="ms-row">
        <div class="ms-card">Bolo de cenoura <b class="strike">R$ 32</b><span class="tag-bad">preço antigo</span></div>
        <div class="ms-card">Sábado <b class="strike">9h às 13h</b><span class="tag-bad">horário errado</span></div>
      </div>
      <div class="ms-foot">Última atualização: há 2 anos</div>
    </div></div>
  </div>""",
    )
)

# 4. O site acompanha o negócio.
steps = [
    ("Dia 1", "Seu site no ar"),
    ("Semana 2", "Preço novo"),
    ("Mês 3", "Foto da vitrine"),
    ("Sempre", "O que você precisar"),
]
timeline = "".join(
    f'<div class="tl-step"><span class="tl-dot"></span><div class="tl-when">{w}</div><div class="tl-what">{t}</div></div>' for w, t in steps
)
cards.append(
    card(
        4,
        "acompanha",
        "Sob medida",
        f"""
  <h2 class="h">Aqui o site não acaba na entrega. <span class="hl">Ele acompanha você.</span></h2>
  <p class="sub">A OL Systems cria seu site com sua logo, suas cores e suas fotos. Você não mexe em nada técnico.</p>
  <div class="visual timeline">
    <div class="tl-globe">{globe(560, 1, 0.6, 0.16)}</div>
    <div class="tl-line"></div>
    {timeline}
  </div>""",
    )
)

# 5. Diferencial: pediu no WhatsApp, atualizado em até 3 horas.
cards.append(
    card(
        5,
        "whatsapp",
        "Sem limite",
        f"""
  <h2 class="h h-sm">Mudou preço ou horário? Manda no WhatsApp. <span class="hl">Atualizamos em até 3 horas.</span></h2>
  <div class="visual chat">
    <div class="wa">
      <div class="wa-head"><span class="wa-av">{globe(40, 1)}</span><div><b>OL Systems</b><small>online</small></div></div>
      <div class="wa-body">
        <div class="bub me">Oi! Muda o horário de sábado para 8h às 14h, por favor <i>✓✓</i></div>
        <div class="bub us">Feito! ✓ Já está no site.</div>
      </div>
    </div>
    <div class="upd">
      <span class="badge"><i></i>atualizado agora</span>
      <div class="upd-row"><span>Seg a sex: 6h às 20h</span><b class="flash">Sábado: 8h às 14h</b></div>
    </div>
    <p class="sub sub-tight">Foto, texto ou promoção: atualizações sem limite e sem pagar nada a mais.</p>
  </div>""",
        hot=True,
    )
)

# 6. Tudo incluso.
feats = [
    ("phone", "Perfeito no celular"),
    ("wa", "Botão de WhatsApp"),
    ("map", "Mapa e como chegar"),
    ("instagram", "Ligado ao Instagram"),
    ("search", "SEO básico no Google"),
    ("server", "Hospedagem inclusa"),
    ("lock", "Cadeado de site seguro"),
    ("palette", "Sua logo, cores e fotos"),
]
grid = "".join(
    f'<div class="feat"><span class="feat-ico">{wa(40) if k == "wa" else icon(k, 40)}</span>{t}</div>' for k, t in feats
)
cards.append(
    card(
        6,
        "incluso",
        "Já vem pronto",
        f"""
  <h2 class="h">Tudo que seu cliente precisa pra te achar e te chamar.</h2>
  <div class="visual feats">{grid}</div>""",
    )
)

# 7. Preço e condições.
conds = [
    "Sem taxa de adesão: começa com a 1ª mensalidade",
    "Sem fidelidade",
    "Pagamento via Pix",
    "Não precisa ter CNPJ",
]
cond_html = "".join(f'<li><span class="ok">{icon("check", 30, sw=2.6)}</span>{c}</li>' for c in conds)
cards.append(
    card(
        7,
        "preco",
        "R$ 250/mês",
        f"""
  <h2 class="h">Acha caro?</h2>
  <div class="visual price">
    <div class="price-big"><small>R$</small>250<span>/mês</span></div>
    <div class="per-day">menos de R$ 9 por dia</div>
    <ul class="conds">{cond_html}</ul>
  </div>""",
    )
)

# 8. Chamada para ação.
cards.append(
    card(
        8,
        "chamada",
        "Link na bio",
        f"""
  <div class="cta-globe">{globe(420, 1.1, 0.25, 0.9)}</div>
  <h2 class="h h-cta">Seu site no ar em 1 dia. <span class="hl">Chama no WhatsApp.</span></h2>
  <div class="visual cta">
    <div class="wa-btn">{wa(64)}(62) 99929-1420</div>
    <div class="cta-or">ou toque no link da bio</div>
    <div class="cta-area">{icon("map", 32)} Atendemos todo o Centro-Oeste</div>
  </div>""",
        hot=True,
    )
)

CSS = """
:root{--ink:#050506;--panel:#0e0f12;--panel2:#16181d;--line:rgba(255,255,255,.1);--line2:rgba(255,255,255,.2);
--fg:#f5f5f4;--muted:#a3a3ad;--dim:#8b8c96;--wa:#25d366;--wa-ink:#03170a;--bad:#ff5a5f}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#222;font-family:Inter,system-ui,sans-serif;color:var(--fg);-webkit-font-smoothing:antialiased}
.card{position:relative;width:1080px;height:1350px;overflow:hidden;background:var(--ink);padding:72px 80px 64px;display:flex;flex-direction:column;margin:0 auto 40px}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.08) 1.6px,transparent 2px);background-size:40px 40px;
  -webkit-mask-image:radial-gradient(120% 90% at 85% 10%,#000 0,transparent 75%);mask-image:radial-gradient(120% 90% at 85% 10%,#000 0,transparent 75%)}
.card>*{position:relative}
.top{display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:16px;font-family:'Space Grotesk';font-weight:700;font-size:34px;letter-spacing:-.01em}
.pill{border:2px solid var(--line2);border-radius:999px;padding:12px 26px;font-size:26px;color:var(--muted);font-weight:500}
.pill-hot{border-color:rgba(37,211,102,.55);color:var(--wa)}
.h{font-family:'Space Grotesk';font-weight:700;font-size:88px;line-height:.98;letter-spacing:-.045em;margin-top:84px;color:#fff}
.h .hl{color:#c7c7cd}
.h u{text-decoration:none;background:linear-gradient(var(--wa),var(--wa)) no-repeat 0 92%/100% 9px}
.h-sm{font-size:78px;margin-top:64px}
.h-cover{font-size:86px;margin-top:64px}
.sub{font-size:36px;line-height:1.38;color:var(--muted);margin-top:30px;max-width:880px}
.visual{flex:1;display:flex;flex-direction:column;justify-content:flex-end;margin-top:40px;margin-bottom:36px}
.bottom{display:flex;align-items:center;justify-content:space-between;font-size:28px;color:var(--dim);border-top:2px solid var(--line);padding-top:28px}
.handle{display:flex;align-items:center;gap:12px}
.count b{color:var(--fg)}
.swipe{display:inline-flex;align-items:center;gap:10px;color:var(--wa);font-weight:600;margin-right:26px}

/* 1. busca */
.search{gap:16px}
.sbar{display:flex;align-items:center;gap:20px;background:#1a1c21;border:2px solid var(--line2);border-radius:999px;padding:22px 36px;font-size:36px;color:#e9e9ec}
.caret{width:3px;height:42px;background:var(--fg);margin-left:-12px}
.res{display:flex;gap:24px;align-items:flex-start;background:var(--panel);border:2px solid var(--line);border-radius:28px;padding:22px 30px}
.res-ico{width:64px;height:64px;flex:none;border-radius:50%;background:#2a2c33;display:grid;place-items:center;font-family:'Space Grotesk';font-weight:700;font-size:32px}
.res-name{font-family:'Space Grotesk';font-weight:700;font-size:38px}
.res-url{font-size:26px;color:var(--dim);margin-top:4px}
.res-stars{display:flex;gap:4px;color:#f5c542;margin-top:12px}
.res-tags{display:flex;gap:12px;margin-top:16px}
.res-tags span{font-size:24px;border:2px solid var(--line2);border-radius:999px;padding:6px 18px;color:#d6d6db}
.res.dim{opacity:.55;padding:18px 30px}.res.dim .res-tags,.res.dim .res-stars{display:none}
.res.missing{border:3px dashed rgba(255,90,95,.6);background:rgba(255,90,95,.06);align-items:center}
.res-ico.x{background:rgba(255,90,95,.15);color:var(--bad)}
.res.missing .res-url{color:var(--bad);font-size:30px;font-weight:600}

/* 2. bio */
.bio{align-items:center}
.phone{width:620px;border:3px solid var(--line2);border-radius:60px 60px 0 0;border-bottom:0;background:#0b0c0f;padding:34px 34px 30px;position:relative;margin-bottom:-36px}
.notch{width:150px;height:30px;border-radius:999px;background:#000;margin:0 auto 30px}
.bio-head{display:flex;gap:22px;align-items:center;margin-bottom:28px}
.avatar{width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg,#3a3d45,#1b1d22);border:3px solid #2e3038}
.bio-name{font-weight:700;font-size:32px}
.bio-link{display:flex;align-items:center;gap:8px;font-size:25px;color:#8ab4ff;margin-top:6px}
.bio-btn{display:flex;align-items:center;gap:16px;border:2px solid var(--line2);border-radius:20px;padding:20px 24px;font-size:29px;margin-top:14px;color:#e4e4e7}
.bio-btn.bad svg{color:var(--bad)}
.bio-btn.ghost{color:var(--dim);border-style:dashed}

/* 3. site parado */
.stale{align-items:center}
.laptop{width:920px;border:3px solid var(--line2);border-radius:26px;background:#0b0c0f;padding:16px}
.screen{background:#f6efe4;color:#35261b;border-radius:12px;padding:30px 34px;position:relative}
.ms-nav{display:flex;align-items:center;gap:14px;font-size:26px}.ms-nav b{flex:1}
.ms-logo{width:26px;height:26px;border-radius:50%;background:#8f4815}
.ms-cta{background:#8f4815;color:#fff8ef;border-radius:999px;padding:8px 20px;font-size:22px;font-weight:600}
.ms-hero{display:grid;grid-template-columns:1.1fr 1fr;gap:28px;margin-top:26px;align-items:center}
.ms-h{font-family:'Space Grotesk';font-weight:700;font-size:46px;line-height:1;letter-spacing:-.02em}
.ms-p{font-size:22px;opacity:.7;margin-top:12px}
.ms-img{height:170px;border-radius:14px;background:radial-gradient(circle at 25% 60%,#c8742b 0 22px,transparent 23px),radial-gradient(circle at 55% 60%,#e3b26b 0 22px,transparent 23px),radial-gradient(circle at 82% 60%,#8a4b22 0 22px,transparent 23px),#3b2a1e}
.ms-row{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:26px}
.ms-card{background:#e9dcc8;border-radius:14px;padding:22px 22px 26px;font-size:24px;position:relative;display:flex;flex-direction:column;gap:6px}
.ms-card b{font-size:34px}.strike{text-decoration:line-through;text-decoration-color:var(--bad);text-decoration-thickness:4px;color:#7a5f4c}
.tag-bad{position:absolute;right:-10px;top:-22px;background:var(--bad);color:#fff;font-weight:700;font-size:22px;border-radius:999px;padding:8px 18px;transform:rotate(4deg);box-shadow:0 8px 20px rgba(0,0,0,.25)}
.ms-foot{margin-top:22px;font-size:22px;color:#b0412f;font-weight:600}

/* 4. linha do tempo */
.timeline{position:relative;justify-content:flex-end;padding-left:20px}
.tl-globe{position:absolute;right:-180px;bottom:-60px}
.tl-line{position:absolute;left:39px;top:40px;bottom:30px;width:4px;background:linear-gradient(var(--wa),rgba(37,211,102,.2))}
.tl-step{position:relative;padding:0 0 0 76px;margin-top:28px}
.tl-dot{position:absolute;left:4px;top:4px;width:36px;height:36px;border-radius:50%;background:var(--wa);box-shadow:0 0 28px rgba(37,211,102,.5)}
.tl-when{font-size:26px;color:var(--dim);text-transform:uppercase;letter-spacing:.14em;font-weight:600}
.tl-what{font-family:'Space Grotesk';font-weight:700;font-size:44px;margin-top:4px}

/* 5. whatsapp */
.chat{gap:0}
.wa{border-radius:34px;overflow:hidden;border:2px solid var(--line2)}
.wa-head{display:flex;align-items:center;gap:18px;background:#1f2c34;padding:22px 28px;font-size:30px}
.wa-head small{display:block;font-size:22px;color:rgba(255,255,255,.55)}
.wa-av{width:64px;height:64px;border-radius:50%;background:#000;display:grid;place-items:center}
.wa-body{background:#0b141a;padding:24px 26px;display:flex;flex-direction:column;gap:18px;background-image:radial-gradient(rgba(255,255,255,.035) 1.5px,transparent 1.5px);background-size:22px 22px}
.bub{max-width:82%;border-radius:24px;padding:18px 24px;font-size:30px;line-height:1.3}
.bub i{font-style:normal;font-size:22px;color:rgba(255,255,255,.5);margin-left:10px}
.bub.me{align-self:flex-end;background:#005c4b;border-top-right-radius:6px}
.bub.us{align-self:flex-start;background:#202c33;border-top-left-radius:6px}
.upd{margin-top:28px;background:#f6efe4;color:#35261b;border-radius:24px;padding:30px 30px 28px;position:relative}
.badge{position:absolute;top:-24px;left:26px;display:inline-flex;align-items:center;gap:10px;background:var(--ink);color:var(--wa);border:2px solid rgba(37,211,102,.5);border-radius:999px;padding:8px 20px;font-size:24px;font-weight:700}
.badge i{width:12px;height:12px;border-radius:50%;background:var(--wa)}
.upd-row{display:flex;justify-content:space-between;align-items:center;font-size:28px}
.flash{font-size:34px;padding:6px 14px;border-radius:12px;background:rgba(37,211,102,.22);box-shadow:0 0 0 6px rgba(37,211,102,.18)}
.sub-tight{margin-top:26px;font-size:32px}

/* 6. incluso */
.feats{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-content:end}
.feat{display:flex;align-items:center;gap:20px;background:var(--panel);border:2px solid var(--line);border-radius:26px;padding:28px 26px;font-size:31px;font-weight:600;line-height:1.15}
.feat-ico{width:76px;height:76px;flex:none;border-radius:20px;border:2px solid var(--line2);display:grid;place-items:center;color:#fff}

/* 7. preço */
.price{justify-content:center}
.price-big{font-family:'Space Grotesk';font-weight:700;font-size:300px;line-height:.85;letter-spacing:-.06em;display:flex;align-items:flex-end}
.price-big small{font-size:72px;color:var(--muted);margin:0 14px 30px 0;letter-spacing:-.02em}
.price-big span{font-size:72px;color:var(--muted);margin:0 0 30px 14px;letter-spacing:-.02em}
.per-day{display:inline-block;align-self:flex-start;margin-top:34px;background:rgba(255,255,255,.08);border-radius:999px;padding:14px 30px;font-size:32px}
.conds{list-style:none;margin-top:56px;display:flex;flex-direction:column;gap:26px}
.conds li{display:flex;align-items:center;gap:22px;font-size:38px;font-weight:500}
.ok{width:56px;height:56px;flex:none;border-radius:50%;background:var(--wa);color:var(--wa-ink);display:grid;place-items:center}

/* 8. chamada */
.cta-globe{display:flex;justify-content:center;margin-top:48px}
.h-cta{margin-top:44px;font-size:88px;text-align:center}
.cta{align-items:center;justify-content:flex-start;margin-top:48px}
.wa-btn{display:flex;align-items:center;gap:22px;background:var(--wa);color:var(--wa-ink);font-family:'Space Grotesk';font-weight:700;font-size:58px;letter-spacing:-.02em;border-radius:999px;padding:32px 56px;box-shadow:0 24px 80px -20px rgba(37,211,102,.7)}
.cta-or{margin-top:28px;font-size:34px;color:var(--muted)}
.cta-area{display:flex;align-items:center;gap:12px;margin-top:22px;font-size:32px;color:var(--fg);border:2px solid var(--line2);border-radius:999px;padding:14px 28px}
"""

html = f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Carrossel OL Systems</title>
<style>{FONTS}</style><style>{CSS}</style></head>
<body>{''.join(cards)}</body></html>"""

(HERE / "carrossel.html").write_text(html)
print("carrossel.html escrito:", len(html) // 1024, "kB")

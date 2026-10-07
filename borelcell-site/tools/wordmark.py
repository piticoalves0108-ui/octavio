"""Gera o letreiro BOREL CELL em vetor, a partir das medidas do logo da loja.

Cada letra é um contorno único (as aberturas entram pela borda), então o letreiro
fica certo tanto preenchido quanto só em traço. Medidas em unidades de altura 100,
tiradas da imagem original (BOREL com 21 px de altura):
  barra horizontal 20, haste vertical 22, fenda de cima 13;
  B e R com a parte de cima mais estreita e um ombro; fenda de cima aberta à esquerda;
  barra de cima do E solta; braço do meio do E mais curto; letras quase coladas.

Uso: python3 tools/wordmark.py
Atualiza src/js/brand.js, os <svg> do letreiro em index.html e assets/img/favicon.svg.
Depois rode "npm run build" para gerar assets/ e borelcell.html.
"""
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
H = 100


def poly(pts, x0=0.0):
    """Contorno fechado; cada ponto é (x, y, raio do canto)."""
    n = len(pts)
    out = []
    for i, (x, y, r) in enumerate(pts):
        px, py, _ = pts[i - 1]
        nx, ny, _ = pts[(i + 1) % n]
        cmd = "L" if out else "M"
        if r:
            d1 = math.hypot(px - x, py - y)
            d2 = math.hypot(nx - x, ny - y)
            a = (x + (px - x) * r / d1, y + (py - y) * r / d1)
            b = (x + (nx - x) * r / d2, y + (ny - y) * r / d2)
            out.append(f"{cmd}{x0 + a[0]:.2f} {a[1]:.2f}Q{x0 + x:.2f} {y:.2f} {x0 + b[0]:.2f} {b[1]:.2f}")
        else:
            out.append(f"{cmd}{x0 + x:.2f} {y:.2f}")
    return "".join(out) + "Z"


def glyphs(tv=22, th=20, s=13):
    mid0 = th + s          # topo da barra do meio
    mid1 = mid0 + th       # base da barra do meio
    bot = H - th           # topo da barra de baixo

    def B(x, w=127, wt=109):
        outer = [(0, 0, 0), (wt, 0, 6), (wt, 30, 0), (w, 47, 4), (w, H, 10), (0, H, 2),
                 (0, mid0, 0), (wt - tv, mid0, 0), (wt - tv, th, 0), (0, th, 0)]
        hole = [(tv, mid1, 2), (w - tv, mid1, 2), (w - tv, bot, 2), (tv, bot, 2)]
        return w, poly(outer, x) + poly(hole, x)

    def O(x, w=126):
        return w, (poly([(0, 0, 12), (w, 0, 12), (w, H, 12), (0, H, 12)], x)
                   + poly([(tv, th, 3), (w - tv, th, 3), (w - tv, bot, 3), (tv, bot, 3)], x))

    def R(x, w=127, wt=109):
        return w, poly([(0, 0, 0), (wt, 0, 6), (wt, 30, 0), (w, 47, 4), (w, H, 2), (w - tv, H, 0),
                        (w - tv, mid1, 0), (tv, mid1, 0), (tv, H, 0), (0, H, 2),
                        (0, mid0, 0), (wt - tv, mid0, 0), (wt - tv, th, 0), (0, th, 0)], x)

    def E(x, w=126):
        arm = round(w * 0.85)
        return w, (poly([(0, 0, 0), (w, 0, 2), (w, th, 2), (0, th, 0)], x)
                   + poly([(0, mid0, 0), (arm, mid0, 2), (arm, mid1, 2), (tv, mid1, 0), (tv, bot, 0),
                           (w, bot, 2), (w, H, 2), (0, H, 3)], x))

    def L(x, w=120):
        return w, poly([(0, 0, 0), (tv, 0, 0), (tv, bot, 0), (w, bot, 2), (w, H, 2), (0, H, 4)], x)

    def C(x, w=117):
        return w, poly([(0, 0, 10), (w, 0, 2), (w, th, 2), (tv, th, 0), (tv, bot, 0),
                        (w, bot, 2), (w, H, 2), (0, H, 10)], x)

    return B, O, R, E, L, C


def word(letters, gap):
    x, parts = 0, []
    for f in letters:
        w, d = f(x)
        parts.append(d)
        x += w + gap
    return x - gap, "".join(parts)


B, O, R, E, L, C = glyphs()
borel_w, borel = word([B, O, R, E, L], gap=6)
cell_w, cell = word([C, lambda x: E(x, 128), lambda x: L(x, 119), lambda x: L(x, 119)], gap=14)
b_w, glyph_b = word([B], 0)
CELL_SCALE, CELL_GAP = 0.417, 9.5
LOCKUP = {
    "w": borel_w,
    "h": round(H + CELL_GAP + H * CELL_SCALE, 2),
    "cellX": round(borel_w - cell_w * CELL_SCALE, 2),
    "cellY": H + CELL_GAP,
    "cellScale": CELL_SCALE,
}

# B mais encorpado só para o ícone da aba (precisa ser legível em 16 px)
fB, *_ = glyphs(tv=26, th=24, s=22)
fav_w, fav_b = word([fB], 0)

cell_tf = f'transform="translate({LOCKUP["cellX"]} {LOCKUP["cellY"]}) scale({CELL_SCALE})"'
vb = f'0 0 {LOCKUP["w"]} {LOCKUP["h"]}'

# 1) módulo usado pela tela 3D e pelos desenhos dos celulares
(ROOT / "src" / "js" / "brand.js").write_text(
    "// Gerado por tools/wordmark.py: letreiro BOREL CELL em vetor, no estilo do logo da loja.\n"
    f"export const BOREL = {json.dumps({'w': borel_w, 'h': H, 'd': borel})};\n"
    f"export const CELL = {json.dumps({'w': cell_w, 'h': H, 'd': cell})};\n"
    f"export const GLYPH_B = {json.dumps({'w': b_w, 'h': H, 'd': glyph_b})};\n"
    f"export const LOCKUP = {json.dumps(LOCKUP)};\n"
)

# 2) letreiros fixos em index.html
svgs = {
    "logo__svg": f'<svg class="logo__svg" viewBox="{vb}" aria-hidden="true"><path fill-rule="evenodd" d="{borel}"/><path fill-rule="evenodd" {cell_tf} d="{cell}"/></svg>',
    "loader__logo": (f'<svg class="loader__logo" viewBox="{vb}" aria-hidden="true">'
                     f'<path class="loader__path" pathLength="1" fill-rule="evenodd" d="{borel}"/>'
                     f'<path class="loader__path loader__path--cell" pathLength="1" fill-rule="evenodd" {cell_tf} d="{cell}"/></svg>'),
    "footer__big": (f'<svg class="footer__big" viewBox="-2 -2 {LOCKUP["w"] + 4} {LOCKUP["h"] + 4}" aria-hidden="true">\n'
                    '        <defs><linearGradient id="chrome-foot" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/>'
                    '<stop offset=".45" stop-color="#9ea3ad"/><stop offset=".7" stop-color="#f4f5f7"/><stop offset="1" stop-color="#7d828d"/></linearGradient></defs>\n'
                    f'        <path class="footer__borel" d="{borel}"/>\n'
                    f'        <path class="footer__cell" fill-rule="evenodd" {cell_tf} d="{cell}"/>\n'
                    '      </svg>'),
}
index = ROOT / "index.html"
html = index.read_text()
for cls, markup in svgs.items():
    html, n = re.subn(rf'<svg class="{cls}"[^>]*>.*?</svg>', lambda _m, m=markup: m, html, flags=re.S)
    if n != 1:
        raise SystemExit(f"index.html: esperava 1 <svg class=\"{cls}\">, achei {n}")
index.write_text(html)

# 3) ícone da aba
k = 30 / fav_w
fav_h = H * k
(ROOT / "assets" / "img" / "favicon.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#0A0A0C"/>'
    f'<path fill="#F5F5F7" fill-rule="evenodd" transform="translate({(48 - 30) / 2} {(48 - fav_h) / 2:.2f}) scale({k:.4f})" d="{fav_b}"/></svg>\n'
)

print(json.dumps({"lockup": LOCKUP, "borel_w": borel_w, "cell_w": cell_w}))

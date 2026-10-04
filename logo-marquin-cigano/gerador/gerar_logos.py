"""Generate the Marquin Cigano logo kit as self-contained SVGs (all text converted to paths)."""
import math
import os
import sys

from textpath import Font, glyph_run

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'svg')
os.makedirs(OUT, exist_ok=True)

script = Font('GreatVibes-Regular.ttf')
cinzel = Font('Cinzel[wght].ttf', {'wght': 500})
cinzel_b = Font('Cinzel[wght].ttf', {'wght': 600})

PALETTES = {
    # name: (paint for the mark, background used on presentation boards)
    'dourado': ('gold', '#0c0b0f'),
    'branco': ('#ffffff', '#0f1b30'),
    'preto': ('#111111', '#f4efe6'),
    'dourado-chapado': ('#c9a24a', '#0c0b0f'),
}


def gold_defs(x0, y0, x1, y1):
    return f'''<linearGradient id="gold" gradientUnits="userSpaceOnUse" x1="{x0:.1f}" y1="{y0:.1f}" x2="{x1:.1f}" y2="{y1:.1f}">
    <stop offset="0" stop-color="#a87a22"/>
    <stop offset=".22" stop-color="#e3c26e"/>
    <stop offset=".42" stop-color="#fbeab2"/>
    <stop offset=".58" stop-color="#d8b257"/>
    <stop offset=".8" stop-color="#a57620"/>
    <stop offset="1" stop-color="#d9b862"/>
  </linearGradient>'''


def paint_of(p):
    return 'url(#gold)' if p == 'gold' else p


def mic(uid, fill):
    """Retro capsule microphone with yoke. Drawn in a 100-unit box; visible bounds x 17..83, y 8..132."""
    slots = ''.join(f'<rect x="0" y="{y}" width="100" height="3"/>' for y in range(12, 100, 7))
    head = 'M28 30a22 22 0 0 1 44 0v40a22 22 0 0 1-44 0z'
    return f'''<defs>
    <clipPath id="mic-slots-{uid}"><path d="M33 30a17 17 0 0 1 34 0v40a17 17 0 0 1-34 0z"/></clipPath>
    <mask id="mic-mask-{uid}" maskUnits="userSpaceOnUse" x="-20" y="-20" width="140" height="180">
      <path d="{head}" fill="#fff"/>
      <g clip-path="url(#mic-slots-{uid})" fill="#000">{slots}</g>
    </mask>
  </defs>
  <g fill="{fill}">
    <path d="{head}" mask="url(#mic-mask-{uid})"/>
    <rect x="24" y="47" width="52" height="7" rx="3.5"/>
    <path d="M17 50v8a33 33 0 0 0 66 0v-8h-7v8a26 26 0 0 1-52 0v-8z"/>
    <rect x="46.5" y="90" width="7" height="34"/>
    <path d="M30 132a20 8 0 0 1 40 0z"/>
  </g>'''


MIC_BOX = (17, 8, 83, 132)


def sparkle(cx, cy, r, fill, pinch=0.14):
    a = r * pinch
    pts = [(0, -r), (r, 0), (0, r), (-r, 0)]
    ctrl = [(a, -a), (a, a), (-a, a), (-a, -a)]
    d = f'M{cx:.2f} {cy - r:.2f}'
    for i in range(4):
        nx, ny = pts[(i + 1) % 4]
        c1x, c1y = ctrl[i]
        d += f'C{cx + c1x:.2f} {cy + c1y:.2f} {cx + c1x:.2f} {cy + c1y:.2f} {cx + nx:.2f} {cy + ny:.2f}'
    return f'<path fill="{fill}" d="{d}Z"/>'


def diamond(cx, cy, r, fill):
    return f'<path fill="{fill}" d="M{cx:.2f} {cy - r:.2f}L{cx + r:.2f} {cy:.2f}L{cx:.2f} {cy + r:.2f}L{cx - r:.2f} {cy:.2f}Z"/>'


def svg_doc(vb, body, defs='', title='Marquin Cigano'):
    x, y, w, h = vb
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x:.1f} {y:.1f} {w:.1f} {h:.1f}" '
            f'width="{w:.0f}" height="{h:.0f}" role="img" aria-label="{title}">\n'
            f'  <title>{title}</title>\n  <defs>\n  {defs}\n  </defs>\n{body}\n</svg>\n')


# ---------------------------------------------------------------- principal (horizontal)
def principal(paint):
    S = 300
    fill = paint_of(paint)
    m = script.text('Marquin', S, drop_idot=True)
    mx0, my0, mx1, my1 = m['bbox']
    dx, dy, dw = m['dots'][0]

    cs = S * 0.15
    sub_probe = cinzel_b.text('CIGANO', cs, tracking=0.42)
    sw = sub_probe['bbox'][2] - sub_probe['bbox'][0]
    right = mx1 - S * 0.02
    base = S * 0.36
    sub = cinzel_b.text('CIGANO', cs, x=right - sw - sub_probe['bbox'][0], y=base, tracking=0.42)

    # Mic: bottom of its base sits on CIGANO's baseline, top reaches the x-height band.
    top = -S * 0.50
    k = (base - top) / (MIC_BOX[3] - MIC_BOX[1])
    micx = mx1 + S * 0.11 - MIC_BOX[0] * k
    micy = top - MIC_BOX[1] * k
    mic_right = micx + MIC_BOX[2] * k

    x0, y0 = mx0, min(my0, dy - dw * 1.4)
    x1, y1 = mic_right, max(my1, base)
    pad = S * 0.14
    vb = (x0 - pad, y0 - pad, (x1 - x0) + 2 * pad, (y1 - y0) + 2 * pad)
    body = f'''  <path fill="{fill}" d="{m['d']}"/>
  {sparkle(dx, dy - dw * 0.1, dw * 1.35, fill)}
  <path fill="{fill}" d="{sub['d']}"/>
  <g transform="translate({micx:.2f} {micy:.2f}) scale({k:.4f})">{mic('p', fill)}</g>'''
    defs = gold_defs(x0, y0, x1, y1) if paint == 'gold' else ''
    return svg_doc(vb, body, defs)


# ---------------------------------------------------------------- vertical (stacked, centred)
def vertical(paint):
    S = 300
    fill = paint_of(paint)
    m = script.text('Marquin', S, drop_idot=True)
    mx0, my0, mx1, my1 = m['bbox']
    cx = (mx0 + mx1) / 2
    dx, dy, dw = m['dots'][0]

    # Mic emblem above the name
    mic_h = S * 0.85
    k = mic_h / (MIC_BOX[3] - MIC_BOX[1])
    gap = S * 0.12
    mic_bottom = my0 - gap
    micx = cx - (MIC_BOX[0] + MIC_BOX[2]) / 2 * k
    micy = mic_bottom - MIC_BOX[3] * k
    mic_top = micy + MIC_BOX[1] * k

    # CIGANO below the descenders with flanking rules
    cs = S * 0.15
    probe = cinzel_b.text('CIGANO', cs, tracking=0.45)
    sw = probe['bbox'][2] - probe['bbox'][0]
    base = my1 + S * 0.24
    sub = cinzel_b.text('CIGANO', cs, x=cx - sw / 2 - probe['bbox'][0], y=base, tracking=0.45)
    cap = -(probe['bbox'][1])
    ly = base - cap / 2
    rule_gap = S * 0.07
    rule_len = S * 0.36
    lx1 = cx - sw / 2 - rule_gap
    rx0 = cx + sw / 2 + rule_gap
    t = S * 0.0075
    rules = (f'<rect fill="{fill}" x="{lx1 - rule_len:.2f}" y="{ly - t:.2f}" width="{rule_len:.2f}" height="{2 * t:.2f}"/>'
             f'<rect fill="{fill}" x="{rx0:.2f}" y="{ly - t:.2f}" width="{rule_len:.2f}" height="{2 * t:.2f}"/>'
             + diamond(lx1 - rule_len - S * 0.035, ly, S * 0.02, fill)
             + diamond(rx0 + rule_len + S * 0.035, ly, S * 0.02, fill))

    x0 = min(mx0, lx1 - rule_len - S * 0.05)
    x1 = max(mx1, rx0 + rule_len + S * 0.05)
    y0, y1 = mic_top, base
    pad = S * 0.14
    vb = (x0 - pad, y0 - pad, (x1 - x0) + 2 * pad, (y1 - y0) + 2 * pad)
    body = f'''  <g transform="translate({micx:.2f} {micy:.2f}) scale({k:.4f})">{mic('v', fill)}</g>
  <path fill="{fill}" d="{m['d']}"/>
  {sparkle(dx, dy - dw * 0.1, dw * 1.35, fill)}
  <path fill="{fill}" d="{sub['d']}"/>
  {rules}'''
    defs = gold_defs(x0, y0, x1, y1) if paint == 'gold' else ''
    return svg_doc(vb, body, defs)


# ---------------------------------------------------------------- emblema (round seal)
def arc_text(font, s, size, tracking, cx, cy, r, top, fill):
    run = glyph_run(font, s, size, tracking)
    total = sum(adv for _, adv in run) - tracking * size
    span = total / r
    out = []
    acc = 0.0
    for d, adv in run:
        gw = adv - tracking * size
        if top:
            a = -math.pi / 2 - span / 2 + (acc + gw / 2) / r
            rot = math.degrees(a) + 90
        else:
            a = math.pi / 2 + span / 2 - (acc + gw / 2) / r
            rot = math.degrees(a) - 90
        px, py = cx + r * math.cos(a), cy + r * math.sin(a)
        out.append(f'<path transform="translate({px:.2f} {py:.2f}) rotate({rot:.2f}) translate({-gw / 2:.2f} 0)" d="{d}"/>')
        acc += adv
    return f'<g fill="{fill}">{"".join(out)}</g>'


def emblema(paint):
    fill = paint_of(paint)
    C = 500
    size = 74
    cap = size * 0.7
    r_mid = 405
    r_top = r_mid - cap / 2          # baseline radius, letters grow outward
    r_bot = r_mid + cap / 2          # baseline radius, letters grow inward
    top = arc_text(cinzel_b, 'MARQUIN', size, 0.32, C, C, r_top, True, fill)
    bot = arc_text(cinzel_b, 'CIGANO', size, 0.32, C, C, r_bot, False, fill)
    k = 400 / (MIC_BOX[3] - MIC_BOX[1])
    micx = C - (MIC_BOX[0] + MIC_BOX[2]) / 2 * k
    micy = C - (MIC_BOX[1] + MIC_BOX[3]) / 2 * k
    body = f'''  <circle cx="{C}" cy="{C}" r="488" fill="none" stroke="{fill}" stroke-width="10"/>
  <circle cx="{C}" cy="{C}" r="464" fill="none" stroke="{fill}" stroke-width="2.5"/>
  <circle cx="{C}" cy="{C}" r="346" fill="none" stroke="{fill}" stroke-width="2.5"/>
  {top}
  {bot}
  {sparkle(C - r_mid, C, 20, fill)}
  {sparkle(C + r_mid, C, 20, fill)}
  {sparkle(C - 150, C - 150, 16, fill)}
  {sparkle(C + 150, C - 150, 16, fill)}
  <g transform="translate({micx:.2f} {micy:.2f}) scale({k:.4f})">{mic('e', fill)}</g>'''
    defs = gold_defs(0, 0, 1000, 1000) if paint == 'gold' else ''
    return svg_doc((0, 0, 1000, 1000), body, defs)


def icone(paint):
    """Simplified mark for small sizes (favicon, avatar, watermark)."""
    fill = paint_of(paint)
    C = 500
    k = 560 / (MIC_BOX[3] - MIC_BOX[1])
    micx = C - (MIC_BOX[0] + MIC_BOX[2]) / 2 * k
    micy = C - (MIC_BOX[1] + MIC_BOX[3]) / 2 * k
    body = f'''  <circle cx="{C}" cy="{C}" r="480" fill="none" stroke="{fill}" stroke-width="22"/>
  {sparkle(C - 255, C - 190, 34, fill)}
  {sparkle(C + 255, C - 190, 34, fill)}
  <g transform="translate({micx:.2f} {micy:.2f}) scale({k:.4f})">{mic('i', fill)}</g>'''
    defs = gold_defs(0, 0, 1000, 1000) if paint == 'gold' else ''
    return svg_doc((0, 0, 1000, 1000), body, defs)


KINDS = [('principal', principal), ('vertical', vertical), ('emblema', emblema), ('icone', icone)]

if __name__ == '__main__':
    for kind, fn in KINDS:
        for pname, (paint, _) in PALETTES.items():
            path = os.path.join(OUT, f'marquin-cigano-{kind}-{pname}.svg')
            with open(path, 'w') as fh:
                fh.write(fn(paint))
    print('ok')

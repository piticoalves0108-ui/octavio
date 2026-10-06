#!/usr/bin/env python3
"""Renderiza o Reels da OL Systems a partir dos 8 slides do carrossel.

uso: render.py <pasta_slides> <saida.mp4|pasta_stills> [stills t1,t2,...]
"""
import sys, math, subprocess
import numpy as np
import cv2
from PIL import Image

IN, OUT = sys.argv[1], sys.argv[2]
MODE = sys.argv[3] if len(sys.argv) > 3 else 'video'

FPS = 30
W, H = 1080, 1920
SW, SH = 1200, 2134          # palco (stage) = quadro / 0.9
OX, OY = 60, 195             # posição do slide (0,0) no palco
BG = np.array([5, 5, 6], np.float32) / 255
GREEN = np.array([37, 211, 102], np.float32) / 255
EXIT = 0.38


def load(n):
    return np.asarray(Image.open(f'{IN}/{n}.png').convert('RGB')).astype(np.float32) / 255


def rgb(*c):
    return np.array(c, np.float32) / 255


def c2a(img, ref):
    """Color-to-alpha: separa o conteúdo do fundo `ref` (pré-multiplicado RGBA)."""
    ref = np.broadcast_to(np.asarray(ref, np.float32), img.shape)
    up = np.where(img > ref, (img - ref) / np.maximum(1 - ref, 1e-4), 0)
    dn = np.where(img < ref, (ref - img) / np.maximum(ref, 1e-4), 0)
    a = np.clip(np.maximum(up, dn).max(axis=2), 0, 1)
    prem = np.clip(img - ref * (1 - a[..., None]), 0, None)
    prem = np.minimum(prem, a[..., None])
    return np.dstack([prem, a]).astype(np.float32)


class L:
    def __init__(s, rgba, sx, sy):
        s.img = np.ascontiguousarray(rgba, np.float32)
        s.x, s.y = sx + OX, sy + OY
        s.h, s.w = s.img.shape[:2]


def crop(rgba, x0, y0, x1, y1):
    return L(rgba[y0:y1, x0:x1], x0, y0)


# ---------------------------------------------------------------- composição
def comp(stage, img, x, y, alpha=1.0):
    h, w = img.shape[:2]
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, SW), min(y + h, SH)
    if x1 <= x0 or y1 <= y0:
        return
    src = img[y0 - y:y1 - y, x0 - x:x1 - x]
    if alpha < 1:
        src = src * alpha
    dst = stage[y0:y1, x0:x1]
    dst *= (1 - src[..., 3:4])
    dst += src[..., :3]


def draw(stage, lay, dx=0.0, dy=0.0, s=1.0, alpha=1.0, anchor=(0.5, 0.5), img=None):
    img = lay.img if img is None else img
    if alpha <= 0.003 or s <= 0.01:
        return
    if abs(s - 1) < 1e-4 and abs(dx - round(dx)) < 0.02 and abs(dy - round(dy)) < 0.02:
        comp(stage, img, lay.x + int(round(dx)), lay.y + int(round(dy)), alpha)
        return
    ax, ay = lay.x + anchor[0] * lay.w, lay.y + anchor[1] * lay.h
    tx, ty = s * (lay.x - ax) + ax + dx, s * (lay.y - ay) + ay + dy
    X0, Y0 = int(math.floor(tx)) - 1, int(math.floor(ty)) - 1
    X1, Y1 = int(math.ceil(tx + s * lay.w)) + 1, int(math.ceil(ty + s * lay.h)) + 1
    rx0, ry0, rx1, ry1 = max(X0, 0), max(Y0, 0), min(X1, SW), min(Y1, SH)
    if rx1 <= rx0 or ry1 <= ry0:
        return
    M = np.float32([[s, 0, tx - rx0], [0, s, ty - ry0]])
    out = cv2.warpAffine(img, M, (rx1 - rx0, ry1 - ry0), flags=cv2.INTER_LINEAR,
                         borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    if alpha < 1:
        out *= alpha
    dst = stage[ry0:ry1, rx0:rx1]
    dst *= (1 - out[..., 3:4])
    dst += out[..., :3]


# ---------------------------------------------------------------- easing
def cl(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def eoc(x):
    x = cl(x); return 1 - (1 - x) ** 3


def eoq(x):
    x = cl(x); return 1 - (1 - x) ** 5


def eic(x):
    x = cl(x); return x ** 3


def eob(x, k=1.70158):
    x = cl(x); c3 = k + 1; return 1 + c3 * (x - 1) ** 3 + k * (x - 1) ** 2


def anim(kind, p, D):
    """-> dx, dy, escala, alpha"""
    if p < 0:
        return 0, 0, 1, 0
    if kind == 'none':
        return 0, 0, 1, 1
    if kind == 'fade':
        return 0, 0, 1, eoc(p)
    if kind in ('up', 'down', 'left', 'right'):
        e = eoq(p)
        off = (1 - e) * D
        a = eoc(p * 1.5)
        return {'up': (0, off), 'down': (0, -off), 'left': (-off, 0), 'right': (off, 0)}[kind] + (1, a)
    if kind == 'pop':
        return 0, (1 - eoq(p)) * 14, 0.86 + 0.14 * eob(p, 2.0), cl(p * 3)
    if kind == 'stamp':
        return 0, 0, 1.7 - 0.7 * eob(p, 2.4), cl(p * 4)
    if kind == 'zoom':
        return 0, 0, 1.28 - 0.28 * eoq(p), eoc(p * 1.8)
    if kind == 'settle':
        e = eoq(p); return 0, (1 - e) * 10, 1.035 - 0.035 * e, 1
    raise ValueError(kind)


# ---------------------------------------------------------------- globo
def globe_img(R, ang, tilt=0.38, front=0.85, back=0.22, ss=3, step=15):
    size = int(2 * R + 10)
    S = size * ss
    mb = np.zeros((S, S), np.uint8)
    mf = np.zeros((S, S), np.uint8)
    c, r = S / 2, R * ss
    ct, st = math.cos(tilt), math.sin(tilt)

    def proj(lat, lon):
        x = np.cos(lat) * np.sin(lon + ang)
        y = np.sin(lat)
        z = np.cos(lat) * np.cos(lon + ang)
        y2 = y * ct - z * st
        z2 = y * st + z * ct
        return c + r * x, c - r * y2, z2

    polys = []
    t = np.linspace(-math.pi / 2, math.pi / 2, 160)
    for k in range(0, 360, step):
        polys.append(proj(t, np.full_like(t, math.radians(k))))
    u = np.linspace(0, 2 * math.pi, 240)
    for lat in range(-90 + step, 90, step):
        polys.append(proj(np.full_like(u, math.radians(lat)), u))
    th = max(1, int(round(ss * 0.95)))
    for X, Y, Z in polys:
        pts = np.stack([X, Y], 1)
        front_m = Z >= 0
        # quebra em trechos contíguos frente/verso
        idx = np.flatnonzero(np.diff(front_m.astype(np.int8))) + 1
        for seg in np.split(np.arange(len(pts)), idx):
            if len(seg) < 2:
                continue
            sl = slice(seg[0], min(seg[-1] + 2, len(pts)))
            p = np.round(pts[sl] * 16).astype(np.int32)
            target = mf if front_m[seg[0]] else mb
            cv2.polylines(target, [p], False, 255, th, cv2.LINE_AA, 4)
    cv2.circle(mf, (int(c * 16), int(c * 16)), int(r * 16), 255, th, cv2.LINE_AA, 4)
    m = np.maximum(mb.astype(np.float32) / 255 * back, mf.astype(np.float32) / 255 * front)
    m = cv2.resize(m, (size, size), interpolation=cv2.INTER_AREA)
    return np.dstack([m, m, m, m]).astype(np.float32)


# ---------------------------------------------------------------- utilidades
def rrect_mask(w, h, r, ss=4):
    m = np.zeros((h * ss, w * ss), np.uint8)
    R = int(r * ss)
    cv2.rectangle(m, (R, 0), (w * ss - 1 - R, h * ss - 1), 255, -1)
    cv2.rectangle(m, (0, R), (w * ss - 1, h * ss - 1 - R), 255, -1)
    for cx, cy in [(R, R), (w * ss - 1 - R, R), (R, h * ss - 1 - R), (w * ss - 1 - R, h * ss - 1 - R)]:
        cv2.circle(m, (cx, cy), R, 255, -1, cv2.LINE_AA)
    return cv2.resize(m.astype(np.float32) / 255, (w, h), interpolation=cv2.INTER_AREA)


def solid(w, h, color, r, alpha=1.0):
    m = rrect_mask(w, h, r) * alpha
    return np.dstack([m[..., None] * color, m]).astype(np.float32)


def glow_of(alpha, color, pad, sigma, strength):
    a = np.pad(alpha, pad)
    g = cv2.GaussianBlur(a, (0, 0), sigma) * strength
    g = np.clip(g, 0, 1)
    return np.dstack([g[..., None] * color, g]).astype(np.float32)


def E(layer, kind='up', t=0.0, dur=0.55, D=40, anchor=(0.5, 0.5), cont=None, dyn=None, wipe=None):
    return dict(layer=layer, kind=kind, t=t, dur=dur, D=D, anchor=anchor, cont=cont, dyn=dyn, wipe=wipe)


def lines(rgba, rows, x0=76, x1=1004, t0=0.0, gap=0.08, **kw):
    return [E(crop(rgba, x0, a, x1, b), t=t0 + i * gap, **kw) for i, (a, b) in enumerate(rows)]


def pill_of(rgba, x0):
    return crop(rgba, x0 - 3, 69, 1004, 135)


def apply_wipe(img, prog, axis, soft=14):
    h, w = img.shape[:2]
    n = w if axis == 'x' else h
    u = np.arange(n, dtype=np.float32)
    m = np.clip((prog * (n + soft) - u) / soft, 0, 1)
    m = m[None, :, None] if axis == 'x' else m[:, None, None]
    return img * m


# ================================================================ SLIDES
slides = []          # cada um: dict(dur, pill, els, extra)

# ---------- 1. capa
a = load('01-capa')
bar_fill = a[600, 800].copy()
txt_box = (176, 574, 600, 628)
search_txt = c2a(a[574:628, 176:600], bar_fill)
# separa o cursor original (último bloco de colunas)
colsum = search_txt[..., 3].sum(0)
nz = np.flatnonzero(colsum > 0.05)
runs = np.split(nz, np.flatnonzero(np.diff(nz) > 1) + 1)
cursor_run = runs[-1]
search_txt[:, cursor_run[0]:] = 0
char_edges = [r[-1] + 1 for r in runs[:-1]]
a[574:628, 176:600] = bar_fill
r1 = c2a(a, BG)
header_left = crop(r1, 78, 69, 340, 135)
divider = crop(r1, 76, 1219, 1004, 1227)
search_layer = L(search_txt, 176, 574)
cur_x = [176 + e for e in char_edges]
cursor = L(solid(3, 40, rgb(235, 235, 240), 1), 0, 581)


def s1_extra(stage, tl, ex):
    # cursor que digita
    t0, t1 = 1.55, 2.45
    if tl < 1.35:
        return
    p = cl((tl - t0) / (t1 - t0))
    n = int(p * len(cur_x) + 1e-6)
    x = (cur_x[n - 1] + 3) if n > 0 else 178
    blink = 1.0 if (tl < t1 + 0.1 or (tl * 2.2) % 1 < 0.55) else 0.0
    a_in = eoc((tl - 1.35) / 0.4)
    cursor.x = x + OX
    draw(stage, cursor, alpha=blink * a_in * ex)


def s1_type(stage, el, tl, ex):
    t0, t1 = 1.55, 2.45
    if tl < t0:
        return
    p = cl((tl - t0) / (t1 - t0))
    n = int(p * len(cur_x) + 1e-6)
    if n == 0:
        return
    img = search_layer.img.copy()
    img[:, cur_x[n - 1] - 176 + 1:] = 0
    draw(stage, search_layer, alpha=ex, img=img)


def shake(ts, amp=13, f=7.5, k=6.5):
    def c(tl):
        if tl < ts or tl > ts + 0.9:
            return 0, 0, 1
        u = tl - ts
        return amp * math.sin(2 * math.pi * f * u) * math.exp(-k * u), 0, 1
    return c


els = [
    E(crop(r1, 76, 200, 1004, 288), 'settle', 0.0, 0.7),
    E(crop(r1, 76, 288, 1004, 372), 'settle', 0.0, 0.7),
    E(crop(r1, 76, 372, 1004, 440), 'up', 0.55),
    E(crop(r1, 460, 441, 942, 455), 'none', 0.95, 0.45, wipe='x'),
    E(crop(r1, 76, 551, 1004, 651), 'up', 1.15, D=50),
    E(None, 'custom', 0.0, dyn=s1_type),
    E(crop(r1, 76, 659, 1004, 897), 'up', 2.6, D=60),
    E(crop(r1, 76, 905, 1004, 1036), 'up', 2.78, D=60),
    E(crop(r1, 76, 1044, 1004, 1190), 'pop', 3.05, cont=shake(3.45)),
]
slides.append(dict(dur=5.0, pill=pill_of(r1, 700), els=els, extra=s1_extra))

# ---------- 2. link da bio
a = load('02-link-da-bio')
orig = a.copy()
phone_fill = a[950, 250].copy()
item_rows = [(800, 902), (924, 1009), (1017, 1102), (1110, 1195)]
items = []
for (y0, y1) in item_rows:
    items.append(L(c2a(orig[y0:y1, 260:822], phone_fill), 260, y0))
    a[y0:y1, 260:822] = phone_fill
r2 = c2a(a, BG)
phone = r2[700:1221, 224:858].copy()
fade = np.ones(phone.shape[0], np.float32)
fade[-70:] = np.linspace(1, 0, 70) ** 1.5
phone *= fade[:, None, None]
phone_l = L(phone, 224, 700)
els = lines(r2, [(220, 310), (310, 395), (395, 482)], t0=0.0)
els += lines(r2, [(509, 552), (558, 601)], t0=0.42, gap=0.06, D=30)
els += [E(phone_l, 'up', 0.75, 0.75, D=160)]
els += [E(it, 'up', 1.3 + i * 0.2, 0.5, D=26) for i, it in enumerate(items)]
slides.append(dict(dur=4.5, pill=pill_of(r2, 703), els=els))

# ---------- 3. site parado
a = load('03-site-parado')
orig = a.copy()
S = a.copy()
BX1, BX2, RC = (133, 530), (549, 946), 18
DK = (573, 946, 938)


def src_col(x):
    if BX1[0] <= x <= BX1[1]:
        if x > BX1[1] - RC:
            return BX1[0] + (BX1[1] - x)
        return BX1[0] + RC + 2
    if BX2[0] <= x <= BX2[1]:
        if x < BX2[0] + RC:
            return BX1[0] + (x - BX2[0])
        if x > BX2[1] - RC:
            return BX1[0] + (BX2[1] - x)
        return BX1[0] + RC + 2
    return 120


ty0, ty1 = 918, 1036
tag_layers = []
for (nx0, nx1) in [(345, 569), (740, 980)]:
    for x in range(nx0, nx1):
        S[ty0:ty1, x] = orig[ty0:ty1, src_col(x)]
        if DK[0] <= x <= DK[1]:
            sx = DK[0] + (DK[1] - x) if x > DK[1] - RC else 700
            S[ty0:DK[2] + 2, x] = orig[ty0:DK[2] + 2, sx]
    reg = (slice(ty0, ty1), slice(nx0, nx1))
    m = (np.abs(orig[reg] - S[reg]).max(2) > 3 / 255).astype(np.uint8)
    m = cv2.dilate(m, np.ones((5, 5), np.uint8)).astype(np.float32)
    lay = c2a(orig[reg], S[reg]) * m[..., None]
    tag_layers.append(L(lay, nx0, ty0))
    a[reg] = S[reg] * m[..., None] + orig[reg] * (1 - m[..., None])
cream = rgb(246, 239, 228)
upd = L(c2a(orig[1104:1142, 128:446], cream), 128, 1104)
a[1104:1142, 128:446] = cream
r3 = c2a(a, BG)
els = lines(r3, [(220, 310), (310, 380), (392, 466)], t0=0.0)
els += lines(r3, [(509, 552), (558, 601)], t0=0.42, gap=0.06, D=30)
els += [E(crop(r3, 76, 648, 1004, 1190), 'up', 0.75, 0.7, D=90)]
els += [E(tag_layers[0], 'stamp', 1.65, 0.45), E(tag_layers[1], 'stamp', 1.95, 0.45)]
els += [E(upd, 'left', 2.35, 0.5, D=24)]
slides.append(dict(dur=4.5, pill=pill_of(r3, 801), els=els))

# ---------- 4. acompanha
a = load('04-acompanha')
a[690:1218, 630:] = BG
r4 = c2a(a, BG)
TL = (712, 1172)
tl_col = crop(r4, 84, TL[0], 164, TL[1])
item_rows4 = [(736, 824), (855, 952), (968, 1062), (1093, 1190)]
dots_y = [759, 878, 997, 1116]
G4R, G4C = 251, (900, 962)
g4_layer = L(np.zeros((int(2 * G4R + 10),) * 2 + (4,), np.float32), G4C[0] - G4R - 5, G4C[1] - G4R - 5)


def g4_dyn(stage, el, tl, ex):
    p = (tl - el['t']) / 0.9
    if p < 0:
        return
    img = globe_img(G4R, math.radians(18 * tl), tilt=0.30, front=0.30, back=0.11)
    draw(stage, g4_layer, s=0.92 + 0.08 * eoq(p), alpha=eoc(p) * ex, img=img)


els = [E(None, 'custom', 0.55, dyn=g4_dyn)]
els += lines(r4, [(220, 310), (308, 396), (394, 482)], t0=0.0)
els += lines(r4, [(509, 552), (558, 594), (608, 644)], t0=0.42, gap=0.06, D=30)
WT0, WT1 = 1.0, 2.5
els += [E(tl_col, 'none', WT0, WT1 - WT0, wipe='y')]
for (y0, y1), dy in zip(item_rows4, dots_y):
    tt = WT0 + (WT1 - WT0) * (dy - TL[0]) / (TL[1] - TL[0]) - 0.05
    els.append(E(crop(r4, 166, y0, 620, y1), 'left', tt, 0.5, D=28))
slides.append(dict(dur=5.0, pill=pill_of(r4, 796), els=els))

# ---------- 5. whatsapp
a = load('05-whatsapp')
orig = a.copy()
cy0, cy1, cx0, cx1 = 677, 930, 82, 998
ys, xs = np.mgrid[cy0:cy1, cx0:cx1]
dots_bg = orig[680 + ((ys - 680) % 22), 100 + ((xs - 100) % 22)]
diff = (np.abs(orig[cy0:cy1, cx0:cx1] - dots_bg).max(2) > 2 / 255).astype(np.uint8)
diff = cv2.dilate(diff, np.ones((5, 5), np.uint8))
n, lab, stats, _ = cv2.connectedComponentsWithStats(diff)
bubbles = []
for i in range(1, n):
    x, y, w, h, area = stats[i]
    if area < 500:
        continue
    m = (lab[y:y + h, x:x + w] == i).astype(np.float32)[..., None]
    reg = (slice(cy0 + y, cy0 + y + h), slice(cx0 + x, cx0 + x + w))
    lay = c2a(orig[reg], dots_bg[y:y + h, x:x + w]) * m
    bubbles.append(L(lay, cx0 + x, cy0 + y))
    a[reg] = dots_bg[y:y + h, x:x + w] * m + orig[reg] * (1 - m)
bubbles.sort(key=lambda l: l.y)
user_b, reply_b = bubbles[0], bubbles[1]
reply_fill = orig[870, 180].copy() if False else orig[reply_b.y - OY + 8, reply_b.x - OX + 30].copy()
# selo "atualizado agora" sobre a caixa
px0, px1, py0, py1 = 103, 372, 934, 989
Sp = np.repeat(orig[py0:py1, 600:601], px1 - px0, axis=1)
m = (np.abs(orig[py0:py1, px0:px1] - Sp).max(2) > 3 / 255).astype(np.uint8)
m = cv2.dilate(m, np.ones((3, 3), np.uint8)).astype(np.float32)[..., None]
upd_pill = L(c2a(orig[py0:py1, px0:px1], Sp) * m, px0, py0)
a[py0:py1, px0:px1] = Sp * m + orig[py0:py1, px0:px1] * (1 - m)
r5 = c2a(a, BG)
# realce do horário novo
hl_x0, hl_y0, hl_x1, hl_y1 = 636, 986, 976, 1050
hl = L(solid(hl_x1 - hl_x0, hl_y1 - hl_y0, GREEN, 12), hl_x0, hl_y0)
tb_w, tb_h = 118, reply_b.h
typing = L(solid(tb_w, tb_h, reply_fill, 16), reply_b.x - OX, reply_b.y - OY)
dot = L(solid(12, 12, rgb(150, 160, 170), 6), 0, 0)
TY0, TY1 = 1.55, 2.3


def s5_extra(stage, tl, ex):
    if TY0 <= tl <= TY1 + 0.12:
        a_in = eoc((tl - TY0) / 0.15) * (1 - cl((tl - TY1) / 0.12))
        s = 0.8 + 0.2 * eob((tl - TY0) / 0.3)
        draw(stage, typing, s=s, alpha=a_in * ex, anchor=(0, 1))
        for k in range(3):
            ph = (tl - TY0) * 2 * math.pi * 1.6 - k * 0.9
            bounce = max(0.0, math.sin(ph)) * 7
            dot.x = typing.x + 30 + k * 24
            dot.y = typing.y + tb_h // 2 - 6
            draw(stage, dot, dy=-bounce, alpha=a_in * ex)
    t_hl = 3.3
    if tl >= t_hl:
        p = (tl - t_hl) / 0.9
        if p < 1:
            draw(stage, hl, alpha=0.45 * (1 - eoc(p)) * ex, s=1 + 0.04 * eoc(p))


els = lines(r5, [(200, 280), (279, 356), (355, 418), (430, 494)], t0=0.0)
els += [E(crop(r5, 76, 562, 1004, 937), 'up', 0.6, 0.65, D=90)]
els += [E(user_b, 'pop', 1.05, 0.45, anchor=(1, 1))]
els += [E(reply_b, 'pop', TY1, 0.45, anchor=(0, 1))]
els += [E(crop(r5, 76, 937, 1004, 1076), 'up', 2.75, 0.55, D=50)]
els += [E(upd_pill, 'pop', 3.15, 0.45)]
els += lines(r5, [(1103, 1142), (1147, 1186)], t0=3.5, gap=0.06, D=24)
slides.append(dict(dur=5.5, pill=pill_of(r5, 812), els=els, extra=s5_extra))

# ---------- 6. incluso
a = load('06-incluso')
r6 = c2a(a, BG)
els = lines(r6, [(220, 310), (308, 396), (394, 466)], t0=0.0)
grid_rows = [(579, 721), (735, 877), (891, 1033), (1047, 1189)]
k = 0
for (y0, y1) in grid_rows:
    for (x0, x1) in [(77, 533), (547, 1003)]:
        els.append(E(crop(r6, x0, y0, x1, y1), 'pop', 0.55 + k * 0.11, 0.5))
        k += 1
slides.append(dict(dur=4.5, pill=pill_of(r6, 767), els=els))

# ---------- 7. preço
a = load('07-preco')
r7 = c2a(a, BG)
els = [E(crop(r7, 76, 220, 1004, 294), 'up', 0.0)]
els += [E(crop(r7, 186, 398, 686, 632), 'zoom', 0.4, 0.6, anchor=(0.5, 0.6))]
els += [E(crop(r7, 78, 398, 172, 632), 'left', 0.62, 0.5, D=40)]
els += [E(crop(r7, 686, 398, 862, 632), 'right', 0.66, 0.5, D=40)]
els += [E(crop(r7, 76, 672, 490, 750), 'pop', 0.95, 0.45)]
check_rows = [(806, 888), (915, 979), (997, 1061), (1079, 1143)]
for i, (y0, y1) in enumerate(check_rows):
    els.append(E(crop(r7, 76, y0, 140, y1), 'pop', 1.3 + i * 0.17, 0.4))
    els.append(E(crop(r7, 150, y0, 900, y1), 'left', 1.36 + i * 0.17, 0.5, D=26))
slides.append(dict(dur=4.5, pill=pill_of(r7, 794), els=els))

# ---------- 8. chamada
a = load('08-chamada')
orig = a.copy()
a[190:590, 330:750] = BG
BTN = (218, 863, 863, 1001)   # x0, x1, y0, y1
bw, bh = BTN[1] - BTN[0], BTN[3] - BTN[2]
bmask = rrect_mask(bw, bh, bh / 2)
btn_img = orig[BTN[2]:BTN[3], BTN[0]:BTN[1]]
btn = L(np.dstack([btn_img * bmask[..., None], bmask]), BTN[0], BTN[2])
GP = 70
btn_glow = L(glow_of(bmask, GREEN, GP, 24, 0.9), BTN[0] - GP, BTN[2] - GP)
# limpa o brilho verde original e refaz o texto cinza "ou toque no link da bio" sem o brilho
reg = a[830:1085, 120:960]
txt = orig[1028:1080, 120:960]
al = np.clip((txt[..., 0] - 8 / 255) / ((163 - 8) / 255), 0, 1)[..., None]
reg[:] = BG
a[1028:1080, 120:960] = BG + al * (rgb(163, 166, 174) - BG)
r8 = c2a(a, BG)
G8R, G8C = 188, (539, 389)
g8_layer = L(np.zeros((int(2 * G8R + 10),) * 2 + (4,), np.float32), G8C[0] - G8R - 5, G8C[1] - G8R - 5)


def g8_dyn(stage, el, tl, ex):
    p = (tl - el['t']) / 0.9
    if p < 0:
        return
    img = globe_img(G8R, math.radians(22 * tl), tilt=0.38, front=0.9, back=0.2)
    draw(stage, g8_layer, s=0.6 + 0.4 * eoq(p), alpha=eoc(p * 1.4) * ex, img=img)


def pulse(t0, period=1.15, amp=0.035):
    def c(tl):
        if tl < t0:
            return 0, 0, 1
        v = 0.5 - 0.5 * math.cos(2 * math.pi * (tl - t0) / period)
        return 0, 0, 1 + amp * v
    return c


BT = 0.95


def btn_dyn(stage, el, tl, ex):
    p = (tl - BT) / 0.5
    if p < 0:
        return
    _, dy, s, al = anim('pop', p, 0)
    if tl > BT + 0.6:
        v = 0.5 - 0.5 * math.cos(2 * math.pi * (tl - BT - 0.6) / 1.15)
    else:
        v = 0.0
    s *= 1 + 0.035 * v
    draw(stage, btn_glow, dy=dy, s=s, alpha=al * ex * (0.55 + 0.45 * v))
    draw(stage, btn, dy=dy, s=s, alpha=al * ex)


els = [E(None, 'custom', 0.0, dyn=g8_dyn)]
els += [E(crop(r8, 90, 648, 990, 722), 'up', 0.3), E(crop(r8, 90, 734, 990, 826), 'up', 0.42)]
els += [E(None, 'custom', 0.0, dyn=btn_dyn)]
els += [E(crop(r8, 120, 1028, 960, 1080), 'fade', 1.3, 0.5)]
els += [E(crop(r8, 230, 1086, 850, 1169), 'up', 1.5, 0.55, D=30)]
slides.append(dict(dur=6.5, pill=pill_of(r8, 806), els=els))

# ---------- rodapé e fundo
footer_handle = crop(c2a(load('02-link-da-bio'), BG), 76, 1250, 330, 1292)
starts = np.cumsum([0] + [s['dur'] for s in slides])
TOTAL = float(starts[-1])
seg_w, seg_gap, seg_h = 30, 7, 5
seg_x1 = 1000
seg_y = 1268
seg_bg = L(solid(seg_w, seg_h, rgb(48, 50, 56), 2.5), 0, seg_y)
seg_fg_full = solid(seg_w, seg_h, GREEN, 2.5)

yy, xx = np.mgrid[0:SH, 0:SW].astype(np.float32)
glow = 0.075 * np.exp(-(((xx - SW / 2) / 900) ** 2 + ((yy - SH - 150) / 620) ** 2))
glow += 0.035 * np.exp(-(((xx - 150) / 650) ** 2 + ((yy + 120) / 420) ** 2))
BGIMG = (BG[None, None, :] + glow[..., None] * (GREEN[None, None, :] - BG[None, None, :])).astype(np.float32)


def render(t):
    stage = BGIMG.copy()
    k = int(np.searchsorted(starts, t, side='right') - 1)
    k = min(k, len(slides) - 1)
    sl = slides[k]
    tl = t - starts[k]
    end = sl['dur']
    last = k == len(slides) - 1

    stg = 0.1 / max(len(sl['els']) + 1, 1)

    def exitf(i):
        if last:
            return 1.0, 0.0
        q = cl((tl - (end - EXIT) - i * stg) / (EXIT - 0.1))
        return 1 - eic(q) * 1.0 if q < 1 else 0.0, -34 * eic(q)

    # fixos
    draw(stage, header_left)
    draw(stage, divider)
    draw(stage, footer_handle)
    for i in range(len(slides)):
        x = seg_x1 - (len(slides) - i) * (seg_w + seg_gap) + seg_gap
        seg_bg.x = x + OX
        draw(stage, seg_bg)
        f = cl((t - starts[i]) / slides[i]['dur'])
        if f > 0:
            fw = max(1, int(round(seg_w * f)))
            img = seg_fg_full.copy()
            img[:, fw:] = 0
            draw(stage, seg_bg, img=img)
    # selo do topo
    pe, pdy = exitf(0)
    if k == 0:
        draw(stage, sl['pill'], dy=pdy, alpha=pe)
    else:
        dx, dy, s, al = anim('up', (tl - 0.05) / 0.5, 22)
        draw(stage, sl['pill'], dy=dy + pdy, alpha=al * pe)
    for i, el in enumerate(sl['els']):
        ex, edy = exitf(i + 1)
        if ex <= 0:
            continue
        if el['dyn'] is not None:
            # camadas dinâmicas cuidam da própria animação
            sub = stage
            el['dyn'](sub, el, tl, ex) if el['kind'] == 'custom' else None
            continue
        p = (tl - el['t']) / el['dur']
        if p < 0:
            continue
        dx, dy, s, al = anim(el['kind'], p, el['D'])
        if el['cont']:
            cdx, cdy, cs = el['cont'](tl)
            dx += cdx; dy += cdy; s *= cs
        img = None
        if el['wipe']:
            img = apply_wipe(el['layer'].img, eoc(p), el['wipe'])
        draw(stage, el['layer'], dx=dx, dy=dy + edy, s=s, alpha=al * ex, anchor=el['anchor'], img=img)
    if sl.get('extra'):
        ex, _ = exitf(len(sl['els']))
        sl['extra'](stage, tl, ex)
    frame = cv2.resize(stage, (W, H), interpolation=cv2.INTER_AREA)
    return frame


def to8(frame, rng):
    f = frame * 255 + rng.uniform(-0.5, 0.5, frame.shape[:2])[..., None].astype(np.float32)
    return np.clip(f + 0.5, 0, 255).astype(np.uint8)


rng = np.random.default_rng(7)
if MODE == 'stills':
    import os
    os.makedirs(OUT, exist_ok=True)
    for ts in sys.argv[4].split(','):
        t = float(ts)
        Image.fromarray(to8(render(t), rng)).save(f'{OUT}/t{t:05.2f}.png')
    print('ok')
elif MODE == 'info':
    print(TOTAL, int(round(TOTAL * FPS)))
else:
    # chunk: render.py IN out.mp4 chunk f0 f1  (vídeo sem áudio; o áudio entra na junção)
    nfr = int(round(TOTAL * FPS))
    f0, f1 = int(sys.argv[4]), min(int(sys.argv[5]), nfr)
    cmd = ['ffmpeg', '-y', '-loglevel', 'error',
           '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
           '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
           '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-level', '4.2',
           '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
           '-g', str(FPS * 2), '-an', OUT]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    rng = np.random.default_rng(f0)
    for i in range(f0, f1):
        proc.stdin.write(to8(render(i / FPS), rng).tobytes())
        if (i - f0) % 60 == 0:
            print(f'{OUT}: {i - f0}/{f1 - f0}', flush=True)
    proc.stdin.close()
    proc.wait()
    print('done', OUT)

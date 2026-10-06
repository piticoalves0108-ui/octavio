#!/usr/bin/env python3
"""Versão 2 do Reels da OL Systems, editada para retenção e alcance (~20 s).

uso:
  render_v2.py <slides> <fontes> <saida_dir> stills t1,t2,...
  render_v2.py <slides> <fontes> <saida.mp4> chunk f0 f1      (vídeo sem áudio)
  render_v2.py <slides> <fontes> <saida.wav> audio            (trilha de efeitos)
  render_v2.py <slides> <fontes> - info
"""
import sys, math, subprocess, wave
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

import os
IN, FONTS, OUT, MODE = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
HOOK = os.environ.get('HOOK', 'A')

FPS = 30
W, H = 1080, 1920
SBG = np.array([5, 5, 6], np.float32) / 255           # fundo das artes
GREEN = np.array([37, 211, 102], np.float32) / 255
RED = np.array([239, 68, 68], np.float32) / 255
WHITE = np.array([1, 1, 1], np.float32)
GREY = np.array([199, 199, 205], np.float32) / 255
SUB = np.array([163, 163, 173], np.float32) / 255
SG_BOLD = f'{FONTS}/SpaceGrotesk-Bold.ttf'
INTER_SB = '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
INTER_MD = '/usr/share/fonts/opentype/inter/Inter-Medium.otf'
TX = 70                     # margem esquerda dos títulos
TITLE_Y = 345               # topo do bloco de título


def rgb(*c):
    return np.array(c, np.float32) / 255


def load(n):
    return np.asarray(Image.open(f'{IN}/{n}.png').convert('RGB')).astype(np.float32) / 255


def c2a(img, ref):
    ref = np.broadcast_to(np.asarray(ref, np.float32), img.shape)
    up = np.where(img > ref, (img - ref) / np.maximum(1 - ref, 1e-4), 0)
    dn = np.where(img < ref, (ref - img) / np.maximum(ref, 1e-4), 0)
    a = np.clip(np.maximum(up, dn).max(axis=2), 0, 1)
    prem = np.clip(img - ref * (1 - a[..., None]), 0, None)
    prem = np.minimum(prem, a[..., None])
    return np.dstack([prem, a]).astype(np.float32)


class L:
    """Camada pré-multiplicada posicionada em coordenadas do quadro."""
    def __init__(s, img, x, y):
        s.img = np.ascontiguousarray(img, np.float32)
        s.x, s.y = int(round(x)), int(round(y))
        s.h, s.w = s.img.shape[:2]


def scale_img(img, s):
    if abs(s - 1) < 1e-6:
        return img
    h, w = img.shape[:2]
    out = cv2.resize(img, (max(1, round(w * s)), max(1, round(h * s))),
                     interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
    out = np.clip(out, 0, 1)
    out[..., :3] = np.minimum(out[..., :3], out[..., 3:4])
    return out


class Group:
    """Mapeia caixas do slide (coordenadas originais) para o quadro, com escala s."""
    def __init__(s, rgba, sx0, sy0, fx0, fy0, scale):
        s.rgba, s.sx0, s.sy0, s.fx0, s.fy0, s.s = rgba, sx0, sy0, fx0, fy0, scale

    def pos(s, x, y):
        return s.fx0 + (x - s.sx0) * s.s, s.fy0 + (y - s.sy0) * s.s

    def piece(s, x0, y0, x1, y1, img=None):
        src = s.rgba[y0:y1, x0:x1] if img is None else img
        fx, fy = s.pos(x0, y0)
        return L(scale_img(src, s.s), fx, fy)


def centered_group(rgba, box, scale, fy0, cx=W / 2):
    x0, y0, x1, y1 = box
    fx0 = cx - (x1 - x0) * scale / 2
    return Group(rgba, x0, y0, fx0, fy0, scale)


# ---------------------------------------------------------------- composição
def comp(stage, img, x, y, alpha=1.0):
    h, w = img.shape[:2]
    x0, y0, x1, y1 = max(x, 0), max(y, 0), min(x + w, W), min(y + h, H)
    if x1 <= x0 or y1 <= y0:
        return
    src = img[y0 - y:y1 - y, x0 - x:x1 - x]
    if alpha < 1:
        src = src * alpha
    dst = stage[y0:y1, x0:x1]
    dst *= (1 - src[..., 3:4])
    dst += src[..., :3]


def draw(stage, lay, dx=0.0, dy=0.0, s=1.0, alpha=1.0, anchor=(0.5, 0.5), img=None, cam=None, sy=None):
    """Desenha a camada com deslocamento, escala (s; sy opcional para escala vertical) e câmera da cena."""
    img = lay.img if img is None else img
    if alpha <= 0.003 or s <= 0.01:
        return
    sx_, sy_ = s, (s if sy is None else sy)
    if sy_ <= 0.01:
        return
    ax, ay = lay.x + anchor[0] * lay.w, lay.y + anchor[1] * lay.h
    tx, ty = sx_ * (lay.x - ax) + ax + dx, sy_ * (lay.y - ay) + ay + dy
    if cam is not None:
        C, px, py = cam[:3]
        oy = cam[3] if len(cam) > 3 else 0.0
        tx, ty = C * (tx - px) + px, C * (ty - py) + py + oy
        sx_, sy_ = sx_ * C, sy_ * C
    if abs(sx_ - 1) < 1e-4 and abs(sy_ - 1) < 1e-4 and abs(tx - round(tx)) < 0.02 and abs(ty - round(ty)) < 0.02:
        comp(stage, img, int(round(tx)), int(round(ty)), alpha)
        return
    X0, Y0 = int(math.floor(tx)) - 1, int(math.floor(ty)) - 1
    X1, Y1 = int(math.ceil(tx + sx_ * lay.w)) + 1, int(math.ceil(ty + sy_ * lay.h)) + 1
    rx0, ry0, rx1, ry1 = max(X0, 0), max(Y0, 0), min(X1, W), min(Y1, H)
    if rx1 <= rx0 or ry1 <= ry0:
        return
    M = np.float32([[sx_, 0, tx - rx0], [0, sy_, ty - ry0]])
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
    if kind in ('up', 'left', 'right'):
        e = eoq(p)
        off = (1 - e) * D
        a = eoc(p * 2.2)
        return {'up': (0, off), 'left': (-off, 0), 'right': (off, 0)}[kind] + (1, a)
    if kind == 'pop':
        return 0, (1 - eoq(p)) * 14, 0.86 + 0.14 * eob(p, 2.0), cl(p * 3.5)
    if kind == 'stamp':
        return 0, 0, 1.7 - 0.7 * eob(p, 2.4), cl(p * 4)
    if kind == 'zoom':
        return 0, 0, 1.3 - 0.3 * eoq(p), eoc(p * 2.2)
    if kind == 'flash':
        return 0, 0, 1, eoc(p * 4) * (0.45 + 0.55 * math.exp(-3 * p))
    if kind == 'settle':
        e = eoq(p); return 0, (1 - e) * 8, 1.03 - 0.03 * e, 1
    raise ValueError(kind)


# ---------------------------------------------------------------- desenho
def rrect_mask(w, h, r, ss=4, border=None):
    """Máscara AA de retângulo arredondado (preenchido, ou só a borda com espessura `border`)."""
    def fill(m, w_, h_, r_, off=0):
        R = int(r_)
        x0, y0, x1, y1 = off, off, off + w_ - 1, off + h_ - 1
        cv2.rectangle(m, (x0 + R, y0), (x1 - R, y1), 255, -1)
        cv2.rectangle(m, (x0, y0 + R), (x1, y1 - R), 255, -1)
        for cx, cy in [(x0 + R, y0 + R), (x1 - R, y0 + R), (x0 + R, y1 - R), (x1 - R, y1 - R)]:
            cv2.circle(m, (cx, cy), R, 255, -1, cv2.LINE_AA)
    m = np.zeros((h * ss, w * ss), np.uint8)
    fill(m, w * ss, h * ss, r * ss)
    if border:
        inner = np.zeros_like(m)
        b = int(border * ss)
        fill(inner, w * ss - 2 * b, h * ss - 2 * b, max(1, (r - border) * ss), off=b)
        m = cv2.subtract(m, inner)
    return cv2.resize(m.astype(np.float32) / 255, (w, h), interpolation=cv2.INTER_AREA)


def solid(w, h, color, r, alpha=1.0):
    m = rrect_mask(w, h, r) * alpha
    return np.dstack([m[..., None] * color, m]).astype(np.float32)


def glow_of(alpha, color, pad, sigma, strength, outside=False):
    a = np.pad(alpha, pad)
    g = np.clip(cv2.GaussianBlur(a, (0, 0), sigma) * strength, 0, 1)
    if outside:
        g *= (1 - a)
    return np.dstack([g[..., None] * color, g]).astype(np.float32)


def text_img(txt, font, size, color, track=-0.055, pad=6):
    f = ImageFont.truetype(font, size)
    tr = track * size
    n = len(txt)
    xs = [f.getlength(txt[:i]) + i * tr for i in range(n)]
    width = int(math.ceil((f.getlength(txt) + (n - 1) * tr) if n else 0)) + 2 * pad
    asc, desc = f.getmetrics()
    hgt = asc + desc + 2 * pad
    im = Image.new('L', (width + 8, hgt), 0)
    d = ImageDraw.Draw(im)
    for ch, x in zip(txt, xs):
        d.text((pad + x, pad), ch, font=f, fill=255)
    m = np.asarray(im).astype(np.float32) / 255
    return np.dstack([m[..., None] * color, m]).astype(np.float32), pad, asc


def text_layer(txt, font, size, color, x, top, track=-0.055):
    """Camada de texto cujo topo da linha (ascendente) fica em `top`."""
    img, pad, asc = text_img(txt, font, size, color, track)
    return L(img, x - pad, top - pad)


def text_width(txt, font, size, track=-0.055):
    f = ImageFont.truetype(font, size)
    return f.getlength(txt) + (len(txt) - 1) * track * size


def title_lines(lines, size=92, top=TITLE_Y, lh=1.0, x=TX):
    """lines: [(texto, cor)] -> lista de camadas, uma por linha."""
    out = []
    for i, (t, c) in enumerate(lines):
        out.append(text_layer(t, SG_BOLD, size, c, x, top + i * size * lh))
    return out


# ---------------------------------------------------------------- cenas
class Scene:
    def __init__(s, start, dur, exit_=True, cam=None):
        s.start, s.dur, s.exit, s.cam = start, dur, exit_, cam
        s.els = []

    def add(s, layer, kind='up', t=0.0, dur=0.45, D=34, anchor=(0.5, 0.5), cont=None, wipe=None, dyn=None):
        s.els.append(dict(layer=layer, kind=kind, t=t, dur=dur, D=D, anchor=anchor, cont=cont, wipe=wipe, dyn=dyn))


scenes = []
SFX = []          # (tempo absoluto, nome, ganho)


def sfx(t, name, g=1.0):
    SFX.append((t, name, g))


def shake(ts, amp=15, f=8.0, k=4.2, dur=1.0):
    def c(tl):
        if tl < ts or tl > ts + dur:
            return 0, 0, 1
        u = tl - ts
        return amp * math.sin(2 * math.pi * f * u) * math.exp(-k * u), 0, 1
    return c


def apply_wipe(img, prog, axis='x', soft=14):
    h, w = img.shape[:2]
    n = w if axis == 'x' else h
    u = np.arange(n, dtype=np.float32)
    m = np.clip((prog * (n + soft) - u) / soft, 0, 1)
    m = m[None, :, None] if axis == 'x' else m[:, None, None]
    return img * m


# ===== peças das artes ========================================================
# --- slide 1: busca e resultados
a1 = load('01-capa')
bar_fill = a1[600, 800].copy()
r1 = c2a(a1, SBG)
header = L(scale_img(r1[69:135, 78:340], 0.9), TX - 4, 276)

# cartão verde "Sua barbearia" (mesmo tamanho do cartão vermelho)
CX0, CY0, CX1, CY1 = 80, 1048, 1000, 1186
cw, ch = CX1 - CX0, CY1 - CY0
card = np.ones((ch, cw, 3), np.float32) * SBG
fill = rrect_mask(cw, ch, 20)
card = card * (1 - fill[..., None]) + fill[..., None] * rgb(9, 30, 19)
brd = rrect_mask(cw, ch, 20, border=3)
card = card * (1 - brd[..., None]) + brd[..., None] * GREEN
# círculo com check
cc = np.zeros((ch * 4, cw * 4), np.uint8)
cv2.circle(cc, (64 * 4, 69 * 4), 31 * 4, 255, -1, cv2.LINE_AA)
ccm = cv2.resize(cc.astype(np.float32) / 255, (cw, ch), interpolation=cv2.INTER_AREA)
card = card * (1 - ccm[..., None]) + ccm[..., None] * rgb(22, 92, 52)
ck = np.zeros((ch * 4, cw * 4), np.uint8)
pts = np.array([[52, 70], [61, 79], [77, 60]], np.float32) * 4
cv2.polylines(ck, [np.round(pts * 16).astype(np.int32)], False, 255, 5 * 4, cv2.LINE_AA, 4)
ckm = cv2.resize(ck.astype(np.float32) / 255, (cw, ch), interpolation=cv2.INTER_AREA)
card = card * (1 - ckm[..., None]) + ckm[..., None] * GREEN
green_card = c2a(card, SBG)
# textos do cartão verde: mesmo tamanho dos originais
def fit_size(txt, font, target_w, lo=20, hi=60, track=-0.02):
    best = lo
    for sz in range(lo, hi):
        if text_width(txt, font, sz, track) <= target_w:
            best = sz
    return best
sz_name = fit_size('Sua barbearia', SG_BOLD, 456 - 201, track=-0.01)
sz_sub = fit_size('nenhum site encontrado', INTER_SB, 548 - 203, track=0.0)
t_name, pad_n, asc_n = text_img('Sua barbearia', SG_BOLD, sz_name, WHITE, track=-0.01)
t_sub, pad_s, asc_s = text_img('Site oficial · Aberta agora · WhatsApp', INTER_SB, sz_sub, GREEN, track=0.0)


def paste_prem(dst, img, x, y):
    h, w = img.shape[:2]
    reg = dst[y:y + h, x:x + w]
    reg[..., :3] = img[..., :3] + reg[..., :3] * (1 - img[..., 3:4])
    reg[..., 3:4] = img[..., 3:4] + reg[..., 3:4] * (1 - img[..., 3:4])


paste_prem(green_card, t_name, 201 - CX0 - pad_n, 1082 - CY0 - pad_n - (asc_n - int(sz_name * 0.73)))
paste_prem(green_card, t_sub, 203 - CX0 - pad_s, 1130 - CY0 - pad_s - (asc_s - int(sz_sub * 0.73)))

# --- slide 2: celular
a2 = load('02-link-da-bio')
o2 = a2.copy()
phone_fill = a2[950, 250].copy()
item_rows = [(800, 902), (924, 1009), (1017, 1102), (1110, 1195)]
items2 = []
for (y0, y1) in item_rows:
    items2.append(((260, y0, 822, y1), c2a(o2[y0:y1, 260:822], phone_fill)))
    a2[y0:y1, 260:822] = phone_fill
r2 = c2a(a2, SBG)
phone = r2[700:1221, 224:858].copy()
fade = np.ones(phone.shape[0], np.float32)
fade[-90:] = np.linspace(1, 0, 90) ** 1.5
phone *= fade[:, None, None]

# --- slide 3: site parado (etiquetas separadas)
a3 = load('03-site-parado')
o3 = a3.copy()
S3 = a3.copy()
BX1, BX2, RC = (133, 530), (549, 946), 18
DK = (573, 946, 938)


def src_col(x):
    if BX1[0] <= x <= BX1[1]:
        return BX1[0] + (BX1[1] - x) if x > BX1[1] - RC else BX1[0] + RC + 2
    if BX2[0] <= x <= BX2[1]:
        if x < BX2[0] + RC:
            return BX1[0] + (x - BX2[0])
        if x > BX2[1] - RC:
            return BX1[0] + (BX2[1] - x)
        return BX1[0] + RC + 2
    return 120


ty0, ty1 = 918, 1036
tags3 = []
for (nx0, nx1) in [(345, 569), (740, 980)]:
    for x in range(nx0, nx1):
        S3[ty0:ty1, x] = o3[ty0:ty1, src_col(x)]
        if DK[0] <= x <= DK[1]:
            sx = DK[0] + (DK[1] - x) if x > DK[1] - RC else 700
            S3[ty0:DK[2] + 2, x] = o3[ty0:DK[2] + 2, sx]
    reg = (slice(ty0, ty1), slice(nx0, nx1))
    m = (np.abs(o3[reg] - S3[reg]).max(2) > 3 / 255).astype(np.uint8)
    m = cv2.dilate(m, np.ones((5, 5), np.uint8)).astype(np.float32)
    tags3.append(((nx0, ty0, nx1, ty1), c2a(o3[reg], S3[reg]) * m[..., None]))
    a3[reg] = S3[reg] * m[..., None] + o3[reg] * (1 - m[..., None])
cream = rgb(246, 239, 228)
upd3 = ((128, 1104, 446, 1142), c2a(o3[1104:1142, 128:446], cream))
a3[1104:1142, 128:446] = cream
r3 = c2a(a3, SBG)

# --- slide 5: WhatsApp
a5 = load('05-whatsapp')
o5 = a5.copy()
cy0, cy1, cx0, cx1 = 677, 930, 82, 998
ys, xs = np.mgrid[cy0:cy1, cx0:cx1]
dots_bg = o5[680 + ((ys - 680) % 22), 100 + ((xs - 100) % 22)]
diff = (np.abs(o5[cy0:cy1, cx0:cx1] - dots_bg).max(2) > 2 / 255).astype(np.uint8)
diff = cv2.dilate(diff, np.ones((5, 5), np.uint8))
n, lab, stats, _ = cv2.connectedComponentsWithStats(diff)
bubbles5 = []
for i in range(1, n):
    x, y, w, h, area = stats[i]
    if area < 500:
        continue
    m = (lab[y:y + h, x:x + w] == i).astype(np.float32)[..., None]
    reg = (slice(cy0 + y, cy0 + y + h), slice(cx0 + x, cx0 + x + w))
    bubbles5.append(((cx0 + x, cy0 + y, cx0 + x + w, cy0 + y + h), c2a(o5[reg], dots_bg[y:y + h, x:x + w]) * m))
    a5[reg] = dots_bg[y:y + h, x:x + w] * m + o5[reg] * (1 - m)
bubbles5.sort(key=lambda b: b[0][1])
(ub_box, ub_img), (rb_box, rb_img) = bubbles5[0], bubbles5[1]
reply_fill = o5[rb_box[1] + 8, rb_box[0] + 30].copy()
px0, px1, py0, py1 = 103, 372, 934, 989
Sp = np.repeat(o5[py0:py1, 600:601], px1 - px0, axis=1)
m = (np.abs(o5[py0:py1, px0:px1] - Sp).max(2) > 3 / 255).astype(np.uint8)
m = cv2.dilate(m, np.ones((3, 3), np.uint8)).astype(np.float32)[..., None]
updpill5 = ((px0, py0, px1, py1), c2a(o5[py0:py1, px0:px1], Sp) * m)
a5[py0:py1, px0:px1] = Sp * m + o5[py0:py1, px0:px1] * (1 - m)
r5 = c2a(a5, SBG)

# --- slide 7: preço
r7 = c2a(load('07-preco'), SBG)
check_circle = r7[815:879, 76:140]

# --- slide 8: chamada
a8 = load('08-chamada')
o8 = a8.copy()
BTN = (218, 863, 863, 1001)
bw, bh = BTN[1] - BTN[0], BTN[3] - BTN[2]
bmask = rrect_mask(bw, bh, bh / 2)
btn_img = np.dstack([o8[BTN[2]:BTN[3], BTN[0]:BTN[1]] * bmask[..., None], bmask]).astype(np.float32)
reg = a8[830:1085, 120:960]
txt8 = o8[1028:1080, 120:960]
al = np.clip((txt8[..., 0] - 8 / 255) / ((163 - 8) / 255), 0, 1)[..., None]
reg[:] = SBG
a8[1028:1080, 120:960] = SBG + al * (rgb(163, 166, 174) - SBG)
a8[190:590, 330:750] = SBG
r8 = c2a(a8, SBG)


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
        return c + r * x, c - r * (y * ct - z * st), y * st + z * ct

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
        fm = Z >= 0
        idx = np.flatnonzero(np.diff(fm.astype(np.int8))) + 1
        for seg in np.split(np.arange(len(pts)), idx):
            if len(seg) < 2:
                continue
            sl = slice(seg[0], min(seg[-1] + 2, len(pts)))
            cv2.polylines(mf if fm[seg[0]] else mb, [np.round(pts[sl] * 16).astype(np.int32)], False, 255, th, cv2.LINE_AA, 4)
    cv2.circle(mf, (int(c * 16), int(c * 16)), int(r * 16), 255, th, cv2.LINE_AA, 4)
    m = np.maximum(mb.astype(np.float32) / 255 * back, mf.astype(np.float32) / 255 * front)
    m = cv2.resize(m, (size, size), interpolation=cv2.INTER_AREA)
    return np.dstack([m, m, m, m]).astype(np.float32)


# ===== layout da busca (cena 1 e cena final usam o mesmo, para o loop) =========
SEARCH_S = 1.03
SEARCH_Y = 640
G1 = centered_group(r1, (76, 551, 1004, 1190), SEARCH_S, SEARCH_Y)
search_bar = G1.piece(76, 551, 1004, 651)
card_comp = G1.piece(76, 659, 1004, 897)
# o cartão "Outra barbearia" sai; o vermelho sobe para logo abaixo do concorrente
RED_SHIFT = 1044 - 905
card_red = G1.piece(76, 1044, 1004, 1190)
card_red.y -= round(RED_SHIFT * SEARCH_S)
gx, gy = G1.pos(CX0, CY0)
card_green = L(scale_img(green_card, SEARCH_S), gx, gy - round(RED_SHIFT * SEARCH_S))
red_glow_mask = rrect_mask(round(cw * SEARCH_S), round(ch * SEARCH_S), 20)
red_glow = L(glow_of(red_glow_mask, RED, 60, 22, 0.85, outside=True), card_red.x + round(4 * SEARCH_S) - 60, card_red.y + round(4 * SEARCH_S) - 60)
green_glow = L(glow_of(red_glow_mask, GREEN, 60, 22, 0.9, outside=True), red_glow.x, red_glow.y)
comp_mask = rrect_mask(round((1000 - 80) * SEARCH_S), round((893 - 663) * SEARCH_S), 20)
comp_glow = L(glow_of(comp_mask, GREEN, 60, 20, 0.8, outside=True), card_comp.x + round(4 * SEARCH_S) - 60, card_comp.y + round(4 * SEARCH_S) - 60)
# cursor piscando no fim do texto digitado
st_txt = c2a(a1[574:628, 176:600], bar_fill)
nz = np.flatnonzero(st_txt[..., 3].sum(0) > 0.05)
runs = np.split(nz, np.flatnonzero(np.diff(nz) > 1) + 1)
cur_x, _ = G1.pos(176 + runs[-1][0], 581)
cursor = L(solid(3, 42, rgb(235, 235, 240), 1), cur_x, G1.pos(0, 581)[1])
a1_bar_no_cursor = r1.copy()
a1_bar_no_cursor[574:628, 176 + runs[-1][0]:600] = c2a(np.broadcast_to(bar_fill, (54, 600 - 176 - runs[-1][0], 3)).copy(), SBG)
search_bar = G1.piece(76, 551, 1004, 651, img=a1_bar_no_cursor[551:651, 76:1004])


def blink_cursor(t0, t1):
    def dyn(stage, sc, el, tl, ex, cam):
        if tl < t0 or tl > t1:
            return
        on = ((tl - t0) * 1.9) % 1 < 0.6
        if on:
            draw(stage, cursor, alpha=ex, cam=cam)
    return dyn


def cam_push(c0, c1, dur, py=1000):
    def cam(tl):
        return (c0 + (c1 - c0) * eoc(tl / dur), W / 2, py)
    return cam


# ===== CENA 1: gancho (0 – 2.8) ================================================
T = 0.0
sc = Scene(T, 2.8, cam=cam_push(1.0, 1.035, 2.8))
HOOKS = {
    'A': (('Seu cliente te procurou', 'no Google…'), ('e achou o ', 'concorrente', '.')),
    'B': (('Pesquisa “barbearia', 'perto de mim”.'), ('Você ', 'aparece', '?')),
    'C': (('Site para barbearia', 'por R$ 250/mês,'), ('', 'sem fidelidade', '.')),
}
(h1, h2), (pre, word, post) = HOOKS[HOOK]
tl1 = title_lines([(h1, WHITE), (h2, WHITE)], size=88)
tl1b = title_lines([(pre + word + post, GREY)], size=88, top=TITLE_Y + 176)[0]
sc.add(tl1[0], 'settle', 0.0, 0.6)
sc.add(tl1[1], 'settle', 0.0, 0.6)
sc.add(tl1b, 'up', 0.3, 0.4)
# sublinhado verde sob a palavra-chave da 3a linha
pre_w = (text_width(pre, SG_BOLD, 88) - 0.055 * 88) if pre else -0.055 * 88
word_w = text_width(word, SG_BOLD, 88)
und = L(solid(int(word_w), 9, GREEN, 2), TX + pre_w + 2, TITLE_Y + 176 + ImageFont.truetype(SG_BOLD, 88).getmetrics()[0] + 8)
sc.add(und, 'none', 0.6, 0.4, wipe='x')
sc.add(search_bar, 'none', 0.0)
sc.add(None, dyn=blink_cursor(0.0, 2.8))
sc.add(comp_glow, 'flash', 1.0, 1.0)
sc.add(card_comp, 'none', 0.0)
sc.add(red_glow, 'none', 0.0, cont=shake(0.1, amp=16, dur=1.1))
sc.add(card_red, 'none', 0.0, cont=shake(0.1, amp=16, dur=1.1))
scenes.append(sc)
sfx(0.1, 'error', 0.9)
sfx(0.5, 'tick', 0.5)
sfx(0.8, 'swish', 0.5)

# ===== CENA 2: link da bio (2.8 – 4.5) =========================================
OVL = 0.0
T = sc.start + sc.dur - OVL
sc = Scene(T, 1.75, cam=cam_push(1.0, 1.02, 1.75))
for l in title_lines([('Link da bio', WHITE), ('improvisado?', GREY)], size=104):
    sc.add(l, 'up', -0.04 if not sc.els else 0.02, 0.38, D=40)
G2 = centered_group(r2, (224, 700, 858, 1221), 1.12, 600)
sc.add(L(scale_img(phone, 1.12), *G2.pos(224, 700)), 'up', -0.02, 0.45, D=120)
for i, (box, img) in enumerate(items2):
    x0, y0, x1, y1 = box
    sc.add(L(scale_img(img, 1.12), *G2.pos(x0, y0)), 'up', 0.25 + i * 0.09, 0.35, D=24)
    sfx(T + 0.25 + i * 0.09, 'tick', 0.45)
scenes.append(sc)
sfx(T, 'whoosh', 0.7)

# ===== CENA 3: site parado (4.5 – 6.4) =========================================
T = sc.start + sc.dur - OVL
sc = Scene(T, 1.95, cam=cam_push(1.0, 1.02, 1.95))
for i, l in enumerate(title_lines([('Site com preço', WHITE), ('de 2 anos atrás?', GREY)], size=104)):
    sc.add(l, 'up', -0.04 + i * 0.06, 0.38, D=40)
G3 = centered_group(r3, (76, 648, 1004, 1190), 1.03, 600)
sc.add(G3.piece(76, 648, 1004, 1190), 'up', -0.02, 0.45, D=110)
for i, (box, img) in enumerate(tags3):
    sc.add(L(scale_img(img, 1.03), *G3.pos(box[0], box[1])), 'stamp', 0.45 + i * 0.22, 0.4)
    sfx(T + 0.45 + i * 0.22 + 0.12, 'stamp', 0.9)
sc.add(L(scale_img(upd3[1], 1.03), *G3.pos(upd3[0][0], upd3[0][1])), 'left', 0.95, 0.4, D=24)
scenes.append(sc)
sfx(T, 'whoosh', 0.7)

# ===== CENA 4: WhatsApp (6.4 – 11.2) ===========================================
T = sc.start + sc.dur - OVL
D4 = 4.4
sc = Scene(T, D4, cam=cam_push(1.0, 1.02, D4))
for i, l in enumerate(title_lines([('Mudou preço ou horário?', WHITE), ('Manda no WhatsApp.', GREY)], size=88)):
    sc.add(l, 'up', -0.04 + i * 0.06, 0.38, D=40)
G5 = centered_group(r5, (76, 562, 1004, 1076), 1.03, 570)
sc.add(G5.piece(76, 562, 1004, 937), 'up', 0.1, 0.45, D=90)
ub = L(scale_img(ub_img, 1.03), *G5.pos(ub_box[0], ub_box[1]))
rb = L(scale_img(rb_img, 1.03), *G5.pos(rb_box[0], rb_box[1]))
TY0, TY1 = 0.85, 1.45
sc.add(ub, 'pop', 0.4, 0.4, anchor=(1, 1))
sc.add(rb, 'pop', TY1, 0.4, anchor=(0, 1))
typing = L(solid(round(118 * 1.03), rb.h, reply_fill, 16), rb.x, rb.y)
dot = L(solid(12, 12, rgb(150, 160, 170), 6), 0, 0)


def typing_dyn(stage, sc_, el, tl, ex, cam):
    if TY0 <= tl <= TY1 + 0.1:
        a_in = eoc((tl - TY0) / 0.15) * (1 - cl((tl - TY1) / 0.1))
        draw(stage, typing, s=0.8 + 0.2 * eob((tl - TY0) / 0.3), alpha=a_in * ex, anchor=(0, 1), cam=cam)
        for k in range(3):
            ph = (tl - TY0) * 2 * math.pi * 1.8 - k * 0.9
            bounce = max(0.0, math.sin(ph)) * 7
            dot.x = typing.x + 32 + k * 25
            dot.y = typing.y + typing.h // 2 - 6
            draw(stage, dot, dy=-bounce, alpha=a_in * ex, cam=cam)


sc.add(None, dyn=typing_dyn)
sc.add(G5.piece(76, 937, 1004, 1076), 'up', 1.9, 0.45, D=50)
sc.add(L(scale_img(updpill5[1], 1.03), *G5.pos(updpill5[0][0], updpill5[0][1])), 'pop', 2.25, 0.4)
hl = L(solid(round(340 * 1.03), round(64 * 1.03), GREEN, 12), *G5.pos(636, 986))


def hl_dyn(stage, sc_, el, tl, ex, cam):
    t0 = 2.35
    if tl >= t0:
        p = (tl - t0) / 0.9
        if p < 1:
            draw(stage, hl, alpha=0.5 * (1 - eoc(p)) * ex, s=1 + 0.05 * eoc(p), cam=cam)


sc.add(None, dyn=hl_dyn)
badge_txt = 'Atualizações sem limite, em até 3h'
bt, bpad, basc = text_img(badge_txt, INTER_SB, 38, GREEN, track=-0.01)
bw_, bh_ = bt.shape[1] + 48, 76
badge = np.zeros((bh_, bw_, 4), np.float32)
badge += solid(bw_, bh_, rgb(9, 30, 19), bh_ / 2)
bb = rrect_mask(bw_, bh_, bh_ / 2, border=2)
badge = badge * (1 - bb[..., None]) + np.dstack([bb[..., None] * GREEN, bb])
paste_prem(badge, bt, 24, (bh_ - bt.shape[0]) // 2 + 2)
badge_y = G5.pos(0, 1076)[1] + 24
sc.add(L(badge, (W - bw_) / 2, badge_y), 'pop', 2.8, 0.4)
scenes.append(sc)
sfx(T, 'whoosh', 0.7)
sfx(T + 0.4, 'pop', 0.7)
for k in range(5):
    sfx(T + TY0 + 0.05 + k * 0.11, 'key', 0.35)
sfx(T + TY1, 'ding', 0.8)
sfx(T + 2.25, 'pop', 0.6)
sfx(T + 2.8, 'pop', 0.5)

# ===== CENA 5: preço (11.2 – 14.6) =============================================
T = sc.start + sc.dur - OVL
D5 = 3.1
sc = Scene(T, D5, cam=cam_push(1.0, 1.02, D5))
sc.add(title_lines([('Quanto custa?', WHITE)], size=104)[0], 'up', -0.04, 0.38, D=40)
G7 = Group(r7, 78, 398, TX - 8, 492, 1.15)
sc.add(G7.piece(186, 398, 686, 632), 'zoom', 0.3, 0.5, anchor=(0.5, 0.6))
sc.add(G7.piece(78, 398, 172, 632), 'left', 0.45, 0.4, D=40)
sc.add(G7.piece(686, 398, 862, 632), 'right', 0.5, 0.4, D=40)
sc.add(G7.piece(76, 672, 490, 750), 'pop', 0.75, 0.4)
checks = ['Sem taxa de adesão', 'Sem fidelidade', 'Pix e sem CNPJ']
cy = G7.pos(0, 750)[1] + 60
for i, t in enumerate(checks):
    y = cy + i * 92
    sc.add(L(scale_img(check_circle, 1.0), TX - 4, y), 'pop', 1.05 + i * 0.16, 0.35)
    sc.add(text_layer(t, INTER_SB, 46, WHITE, TX + 82, y + 7, track=-0.01), 'left', 1.1 + i * 0.16, 0.4, D=24)
    sfx(T + 1.05 + i * 0.16, 'tick', 0.55)
scenes.append(sc)
sfx(T, 'whoosh', 0.7)
sfx(T + 0.3, 'boom', 0.7)

# ===== CENA 6: chamada (14.6 – 18.6) ===========================================
T = sc.start + sc.dur - OVL
D6 = 4.0
sc = Scene(T, D6)
GR, GC = 140, (W / 2, 545)
glayer = L(np.zeros((int(2 * GR + 10),) * 2 + (4,), np.float32), GC[0] - GR - 5, GC[1] - GR - 5)


def globe_dyn(stage, sc_, el, tl, ex, cam):
    p = (tl + 0.08) / 0.7
    img = globe_img(GR, math.radians(26 * (tl + sc_.start)), front=0.9, back=0.2)
    draw(stage, glayer, s=0.6 + 0.4 * eoq(p), alpha=eoc(p * 1.4) * ex, img=img, cam=cam)


for i, l in enumerate(title_lines([('Conhece alguém com', WHITE), ('barbearia, padaria ou', WHITE), ('pet shop sem site?', GREEN)], size=66)):
    sc.add(l, 'up', -0.04 + i * 0.06, 0.38, D=36)
G8 = centered_group(r8, (90, 648, 990, 1169), 1.0, 610)
sc.add(G8.piece(90, 648, 990, 722), 'up', 0.3, 0.38, D=40)
sc.add(G8.piece(90, 734, 990, 826), 'up', 0.38, 0.38, D=40)
btn = L(btn_img, *G8.pos(BTN[0], BTN[2]))
GP = 70
btn_glow = L(glow_of(bmask, GREEN, GP, 24, 0.9), btn.x - GP, btn.y - GP)
BT = 0.65


def btn_dyn(stage, sc_, el, tl, ex, cam):
    p = (tl - BT) / 0.45
    if p < 0:
        return
    _, dy, s, al = anim('pop', p, 0)
    v = 0.5 - 0.5 * math.cos(2 * math.pi * (tl - BT - 0.5) / 1.0) if tl > BT + 0.5 else 0.0
    s *= 1 + 0.035 * v
    draw(stage, btn_glow, dy=dy, s=s, alpha=al * ex * (0.55 + 0.45 * v), cam=cam)
    draw(stage, btn, dy=dy, s=s, alpha=al * ex, cam=cam)


sc.add(None, dyn=btn_dyn)
sc.add(G8.piece(120, 1028, 960, 1080), 'fade', 0.95, 0.4)
sc.add(G8.piece(230, 1086, 850, 1169), 'up', 1.05, 0.4, D=26)
scenes.append(sc)
sfx(T, 'whoosh', 0.7)
sfx(T + BT, 'pop', 0.8)

# ===== CENA 7: fechamento em loop (18.6 – 20.4) ================================
T = sc.start + sc.dur - OVL
D7 = 1.9
sc = Scene(T, D7, exit_=False, cam=cam_push(1.035, 1.0, 1.0))
for i, l in enumerate(title_lines([('Agora quem te procura,', WHITE), ('te acha.', GREEN)], size=88)):
    sc.add(l, 'up', -0.04 + i * 0.08, 0.38, D=40)
sc.add(search_bar, 'up', -0.04, 0.35, D=60)
sc.add(None, dyn=blink_cursor(0.0, 9))
sc.add(card_comp, 'up', 0.04, 0.35, D=60)
FLIP = 0.55


def flip_dyn(stage, sc_, el, tl, ex, cam):
    # cartão vermelho entra, vira e revela o verde
    _, dy, _, al = anim('up', (tl - 0.12) / 0.35, 60)
    if tl < FLIP:
        draw(stage, card_red, dy=dy, alpha=al, cam=cam)
    elif tl < FLIP + 0.12:
        k = 1 - eic((tl - FLIP) / 0.12)
        draw(stage, card_red, sy=k, s=1, cam=cam)
    else:
        p = (tl - FLIP - 0.12) / 0.3
        k = eob(p, 1.6)
        draw(stage, green_glow, alpha=eoc(p) * (0.6 + 0.4 * math.exp(-2 * max(0, tl - FLIP - 0.4))), cam=cam)
        draw(stage, card_green, sy=max(k, 0.02), s=1, cam=cam)


sc.add(None, dyn=flip_dyn)
scenes.append(sc)
sfx(T, 'whoosh', 0.6)
sfx(T + FLIP + 0.12, 'success', 0.9)

TOTAL = scenes[-1].start + scenes[-1].dur
EXIT = 0.2


# ---------------------------------------------------------------- fundo
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
base = rgb(9, 10, 13)
glow = 0.10 * np.exp(-(((xx - W / 2) / 820) ** 2 + ((yy - H - 120) / 560) ** 2))
glow += 0.045 * np.exp(-(((xx - 120) / 600) ** 2 + ((yy + 80) / 380) ** 2))
BGIMG = (base[None, None, :] + glow[..., None] * (GREEN - base)[None, None, :]).astype(np.float32)


BG_GR, BG_GC, BG_STEP = 600, (W / 2, 2010), 15
BG_SPEED = 8.0                                   # graus por segundo
BG_N = int(round(BG_STEP / BG_SPEED * FPS))      # quadros por ciclo (simetria de 15 graus)
BG_Y0 = int(BG_GC[1] - BG_GR - 5)
_bg_cache = {}


def bg_globe(t):
    k = int(round(t * FPS)) % BG_N
    if k not in _bg_cache:
        img = globe_img(BG_GR, math.radians(BG_STEP * k / BG_N), tilt=0.42, front=0.20, back=0.07, ss=2)
        a = img[..., 3]
        x0 = int(BG_GC[0] - BG_GR - 5)
        out = np.zeros((H - BG_Y0, W), np.float32)
        src = a[:H - BG_Y0, max(0, -x0):max(0, -x0) + W]
        out[:, :src.shape[1]] = src
        _bg_cache[k] = out
    return _bg_cache[k]


def render(t):
    stage = BGIMG.copy()
    ga = bg_globe(t)[..., None]
    reg = stage[BG_Y0:]
    reg *= (1 - ga)
    reg += ga * np.array([0.75, 1.0, 0.85], np.float32)
    draw(stage, header)
    for sc in scenes:
        tl = t - sc.start
        if tl < 0 or tl > sc.dur:
            continue
        cam = sc.cam(tl) if sc.cam else None
        q = cl((tl - (sc.dur - EXIT)) / EXIT) if sc.exit else 0.0
        ex, edy = 1 - eic(q), -40 * eic(q)
        for el in sc.els:
            if ex <= 0:
                break
            if el['dyn'] is not None:
                el['dyn'](stage, sc, el, tl, ex, (cam[0], cam[1], cam[2], edy) if cam else (1.0, W / 2, H / 2, edy))
                continue
            p = (tl - el['t']) / el['dur']
            if p < 0:
                continue
            dx, dy, s, al = anim(el['kind'], p, el['D'])
            if el['cont']:
                cdx, cdy, cs = el['cont'](tl)
                dx += cdx; dy += cdy; s *= cs
            img = apply_wipe(el['layer'].img, eoc(p)) if el['wipe'] else None
            draw(stage, el['layer'], dx=dx, dy=dy + edy, s=s, alpha=al * ex, anchor=el['anchor'], img=img, cam=cam)
    return stage


def to8(frame, rng):
    f = frame * 255 + rng.uniform(-0.5, 0.5, frame.shape[:2])[..., None].astype(np.float32)
    return np.clip(f + 0.5, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------- efeitos sonoros
SR = 48000


def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def bandnoise(n, lo, hi, rng):
    x = rng.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    y = np.fft.irfft(X, n)
    return y / (np.abs(y).max() + 1e-9)


def make_sfx(name, rng):
    if name == 'whoosh':
        n = int(0.32 * SR)
        x = rng.standard_normal(n)
        t = np.arange(n) / n
        out = np.zeros(n)
        # filtro passa-faixa móvel aproximado por blocos
        blk = 512
        for i in range(0, n, blk):
            seg = x[i:i + blk]
            fc = 500 + 3500 * math.sin(math.pi * min(1, i / n))
            X = np.fft.rfft(seg, blk)
            f = np.fft.rfftfreq(blk, 1 / SR)
            X *= np.exp(-((f - fc) / (fc * 0.6)) ** 2)
            out[i:i + blk] = np.fft.irfft(X, blk)[:len(seg)]
        e = np.sin(np.pi * t) ** 2
        return out / (np.abs(out).max() + 1e-9) * e * 0.5
    if name == 'swish':
        n = int(0.22 * SR)
        y = bandnoise(n, 2500, 9000, rng)
        t = np.arange(n) / n
        return y * np.sin(np.pi * t) ** 3 * 0.25
    if name in ('tick', 'key'):
        n = int(0.05 * SR)
        y = bandnoise(n, 1500 if name == 'key' else 2500, 7000, rng)
        return y * env(n, 0.0005, 0.008 if name == 'key' else 0.012) * (0.35 if name == 'key' else 0.4)
    if name == 'pop':
        n = int(0.12 * SR)
        t = np.arange(n) / SR
        f = 900 * np.exp(-t * 30) + 350
        ph = 2 * np.pi * np.cumsum(f) / SR
        return np.sin(ph) * env(n, 0.002, 0.035) * 0.55
    if name == 'stamp':
        n = int(0.3 * SR)
        t = np.arange(n) / SR
        f = 140 * np.exp(-t * 12) + 55
        body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.09)
        click = bandnoise(n, 800, 5000, rng) * env(n, 0.0003, 0.012) * 0.5
        return (body * 0.8 + click) * 0.8
    if name == 'boom':
        n = int(0.6 * SR)
        t = np.arange(n) / SR
        f = 90 * np.exp(-t * 5) + 45
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.004, 0.22) * 0.7
    if name == 'ding':
        n = int(0.9 * SR)
        t = np.arange(n) / SR
        y = np.sin(2 * np.pi * 1318.5 * t) * 0.6 + np.sin(2 * np.pi * 1975.5 * t) * 0.3 + np.sin(2 * np.pi * 2637 * t) * 0.12
        return y * env(n, 0.002, 0.25) * 0.35
    if name == 'success':
        out = np.zeros(int(1.0 * SR))
        for k, (fr, dt) in enumerate([(1046.5, 0.0), (1318.5, 0.09), (1568, 0.18)]):
            n = int(0.7 * SR)
            t = np.arange(n) / SR
            y = (np.sin(2 * np.pi * fr * t) * 0.7 + np.sin(2 * np.pi * fr * 2 * t) * 0.15) * env(n, 0.002, 0.22)
            i = int(dt * SR)
            out[i:i + n] += y[:len(out) - i]
        return out * 0.3
    if name == 'error':
        n = int(0.32 * SR)
        t = np.arange(n) / SR
        y = np.sign(np.sin(2 * np.pi * 155 * t)) * 0.5 + np.sin(2 * np.pi * 310 * t) * 0.3
        gate = ((t < 0.11) | ((t > 0.16) & (t < 0.27))).astype(float)
        lp = np.convolve(y * gate, np.ones(24) / 24, mode='same')
        return lp * env(n, 0.003, 0.5) * 0.28
    raise ValueError(name)


def build_audio(path):
    rng = np.random.default_rng(3)
    n = int(math.ceil(TOTAL * SR))
    mix = np.zeros(n)
    cache = {}
    for (t, name, g) in SFX:
        if name not in cache:
            cache[name] = make_sfx(name, rng)
        y = cache[name] * g
        i = int(round(t * SR))
        j = min(n, i + len(y))
        if i < n:
            mix[i:j] += y[:j - i]
    peak = np.abs(mix).max()
    mix = mix / max(peak, 1e-9) * 0.5           # pico em -6 dBFS; a música do app fica por cima
    pcm = np.clip(mix * 32767, -32768, 32767).astype(np.int16)
    stereo = np.repeat(pcm[:, None], 2, axis=1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(stereo.tobytes())


if MODE == 'info':
    print(round(TOTAL, 3), int(round(TOTAL * FPS)))
    for sc in scenes:
        print(f'cena {sc.start:6.2f} – {sc.start + sc.dur:6.2f}')
elif MODE == 'stills':
    import os
    os.makedirs(OUT, exist_ok=True)
    rng = np.random.default_rng(7)
    for ts in sys.argv[5].split(','):
        t = float(ts)
        Image.fromarray(to8(render(t), rng)).save(f'{OUT}/t{t:05.2f}.png')
    print('ok')
elif MODE == 'cover':
    # capa: quadro do gancho + selo com a palavra-chave do serviço
    scenes[0].cam = None
    frame = render(1.7)
    tt, tpad, tasc = text_img('Criação de sites', INTER_SB, 34, WHITE, track=-0.01)
    pw, ph = tt.shape[1] + 44, 66
    pill = solid(pw, ph, rgb(9, 30, 19), ph / 2)
    pb = rrect_mask(pw, ph, ph / 2, border=2)
    pill = pill * (1 - pb[..., None]) + np.dstack([pb[..., None] * GREEN, pb])
    paste_prem(pill, tt, 22, (ph - tt.shape[0]) // 2 + 1)
    comp(frame, pill, W - 70 - pw, 268)
    Image.fromarray(to8(frame, np.random.default_rng(1))).save(OUT)
    print('cover ok')
elif MODE == 'audio':
    build_audio(OUT)
    print('audio ok', TOTAL)
else:
    nfr = int(round(TOTAL * FPS))
    f0, f1 = int(sys.argv[5]), min(int(sys.argv[6]), nfr)
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

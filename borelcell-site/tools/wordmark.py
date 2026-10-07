"""Gera src/js/brand.js com o letreiro BOREL CELL em vetor (traços do logo da loja).

Letras largas, traço grosso e miolo em fenda, como no logo enviado pela loja.
Uso: python3 tools/wordmark.py
"""
import json
from pathlib import Path


def rr(x, y, w, h, r):
    """Retângulo com cantos arredondados [sup-esq, sup-dir, inf-dir, inf-esq]."""
    tl, tr, br, bl = r
    return (f"M{x+tl} {y}H{x+w-tr}" + (f"A{tr} {tr} 0 0 1 {x+w} {y+tr}" if tr else "")
            + f"V{y+h-br}" + (f"A{br} {br} 0 0 1 {x+w-br} {y+h}" if br else "")
            + f"H{x+bl}" + (f"A{bl} {bl} 0 0 1 {x} {y+h-bl}" if bl else "")
            + f"V{y+tl}" + (f"A{tl} {tl} 0 0 1 {x+tl} {y}" if tl else "") + "Z")


T, S, H = 24, 14, 100  # barra, fenda, altura


def B(x):
    w = 118
    return w, rr(x, 0, w, H, [5, 20, 20, 5]) + rr(x + T, T, w - 2 * T - 2, S, [0, 3, 3, 0]) + rr(x + T, H - T - S, w - 2 * T - 2, S, [0, 3, 3, 0])


def O(x):
    w = 124
    return w, rr(x, 0, w, H, [20, 20, 20, 20]) + rr(x + T, T, w - 2 * T, H - 2 * T, [5, 5, 5, 5])


def R(x):
    w = 118
    return w, rr(x, 0, w, H, [5, 20, 5, 5]) + rr(x + T, T, w - 2 * T - 2, S, [0, 3, 3, 0]) + rr(x + T, T + S + T, w - T - 30, H - (T + S + T), [0, 0, 0, 0])


def E(x):
    w = 108
    return w, rr(x, 0, w, H, [8, 4, 4, 8]) + rr(x + T, T, w - T, S, [0, 0, 0, 0]) + rr(x + T, H - T - S, w - T, S, [0, 0, 0, 0])


def L(x):
    w = 104
    return w, rr(x, 0, w, H, [8, 0, 4, 8]) + rr(x + T, 0, w - T, H - T, [0, 0, 0, 0])


def C(x):
    w = 108
    return w, rr(x, 0, w, H, [20, 4, 4, 20]) + rr(x + T, T, w - T, H - 2 * T, [5, 0, 0, 5])


def word(letters, gap=14):
    x, parts = 0, []
    for f in letters:
        w, d = f(x)
        parts.append(d)
        x += w + gap
    return x - gap, "".join(parts)


borel_w, borel = word([B, O, R, E, L])
cell_w, cell = word([C, E, L, L], gap=18)
b_w, glyph_b = word([B])
CELL_SCALE = 0.4
CELL_GAP = 12
lockup = {
    "w": borel_w,
    "h": round(H + CELL_GAP + H * CELL_SCALE),
    "cellX": round(borel_w - cell_w * CELL_SCALE, 2),
    "cellY": H + CELL_GAP,
    "cellScale": CELL_SCALE,
}

out = Path(__file__).resolve().parent.parent / "src" / "js" / "brand.js"
out.write_text(
    "// Gerado por tools/wordmark.py: letreiro BOREL CELL em vetor, no estilo do logo da loja.\n"
    f"export const BOREL = {json.dumps({'w': borel_w, 'h': H, 'd': borel})};\n"
    f"export const CELL = {json.dumps({'w': cell_w, 'h': H, 'd': cell})};\n"
    f"export const GLYPH_B = {json.dumps({'w': b_w, 'h': H, 'd': glyph_b})};\n"
    f"export const LOCKUP = {json.dumps(lockup)};\n"
)
print(json.dumps({"lockup": lockup, "borel": borel, "cell": cell, "b": glyph_b}))

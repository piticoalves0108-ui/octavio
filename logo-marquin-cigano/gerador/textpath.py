"""Shape text with HarfBuzz and turn it into SVG path data with fontTools."""
import os

import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.recordingPen import DecomposingRecordingPen

FONT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fontes') + os.sep


class Font:
    def __init__(self, filename, variations=None):
        path = FONT_DIR + filename
        self.data = open(path, 'rb').read()
        self.tt = TTFont(path)
        self.upem = self.tt['head'].unitsPerEm
        self.gs = self.tt.getGlyphSet(location=variations) if variations else self.tt.getGlyphSet()
        self.hbfont = hb.Font(hb.Face(self.data))
        if variations:
            self.hbfont.set_variations(variations)
        self.order = self.tt.getGlyphOrder()

    def _contours(self, name):
        rec = DecomposingRecordingPen(self.gs)
        self.gs[name].draw(rec)
        contours, cur = [], []
        for op, args in rec.value:
            cur.append((op, args))
            if op in ('closePath', 'endPath'):
                contours.append(cur)
                cur = []
        if cur:
            contours.append(cur)
        return contours

    def text(self, s, size, x=0, y=0, tracking=0.0, drop_idot=False, features=None):
        """Return dict(d, bbox, advance, dots). y is the baseline (SVG coords)."""
        buf = hb.Buffer()
        buf.add_str(s)
        buf.guess_segment_properties()
        hb.shape(self.hbfont, buf, features or {})
        k = size / self.upem
        svg = SVGPathPen(None, ntos=lambda v: ('%.2f' % v).rstrip('0').rstrip('.'))
        bounds = BoundsPen(None)
        cx = 0.0
        dots = []
        n = len(buf.glyph_infos)
        for idx, (info, pos) in enumerate(zip(buf.glyph_infos, buf.glyph_positions)):
            name = self.order[info.codepoint]
            ch = s[info.cluster]
            tr = (k, 0, 0, -k, x + (cx + pos.x_offset) * k, y - pos.y_offset * k)
            contours = self._contours(name)
            if drop_idot and ch == 'i':
                keep = []
                for c in contours:
                    bp = BoundsPen(None)
                    for op, args in c:
                        getattr(bp, op)(*args)
                    xmin, ymin, xmax, ymax = bp.bounds
                    if ymin > self.upem * 0.33 and (xmax - xmin) < self.upem * 0.2:
                        # It's the tittle: remember its centre in SVG coords
                        mx, my = (xmin + xmax) / 2, (ymin + ymax) / 2
                        dots.append((tr[4] + mx * k, tr[5] - my * k, (xmax - xmin) * k))
                    else:
                        keep.append(c)
                contours = keep
            for c in contours:
                for pen in (TransformPen(svg, tr), TransformPen(bounds, tr)):
                    for op, args in c:
                        getattr(pen, op)(*args)
            cx += pos.x_advance
            if idx < n - 1:
                cx += tracking * self.upem
        return {
            'd': svg.getCommands(),
            'bbox': bounds.bounds,  # xmin, ymin, xmax, ymax in SVG coords (y down)
            'advance': cx * k,
            'dots': dots,
        }


def glyph_run(font, s, size, tracking=0.0):
    """Per-glyph paths at the origin (baseline y=0) plus each glyph's advance, for text on a curve."""
    buf = hb.Buffer()
    buf.add_str(s)
    buf.guess_segment_properties()
    hb.shape(font.hbfont, buf, {})
    k = size / font.upem
    out = []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = font.order[info.codepoint]
        svg = SVGPathPen(None, ntos=lambda v: ('%.2f' % v).rstrip('0').rstrip('.'))
        font.gs[name].draw(TransformPen(svg, (k, 0, 0, -k, 0, 0)))
        out.append((svg.getCommands(), pos.x_advance * k + tracking * size))
    return out

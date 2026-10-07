#!/usr/bin/env python3
"""Gera anuncio.html a partir de anuncio.src.html, embutindo as fontes do site.

  python3 build.py && node render.mjs   -> anuncio.mp4
"""
import re
from pathlib import Path

here = Path(__file__).parent
styles = re.findall(r"<style>(.*?)</style>", (here.parent / "html" / "index.html").read_text(), re.S)
fonts = next(s for s in styles if "@font-face" in s and "base64" in s)
src = (here / "anuncio.src.html").read_text()
(here / "anuncio.html").write_text(src.replace("/*FONTS*/", fonts, 1))
print("anuncio.html escrito")

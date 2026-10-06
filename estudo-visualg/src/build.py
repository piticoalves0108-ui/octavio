"""Monta estudo-visualg/index.html a partir de src/ (python3 estudo-visualg/src/build.py)."""
from pathlib import Path

src = Path(__file__).resolve().parent
out = src.parent / 'index.html'
read = lambda name: (src / name).read_text(encoding='utf-8')

fonts = ('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400'
         '&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Caveat:wght@600'
         '&family=JetBrains+Mono:wght@400;600;700&display=swap')
page = f"""<meta charset="utf-8">
<title>VisuAlg em 4 Horas</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{fonts}">
<style>
{read('style.css')}
</style>
{read('content.html')}
<script>
{read('visualg.js')}
</script>
<script>
{read('app.js')}
</script>
"""
for bad in ('</script', '<!--'):
    for name in ('visualg.js', 'app.js'):
        assert bad not in read(name), f'{name} contém {bad}'
out.write_text(page, encoding='utf-8')
print(f'{out} ({len(page.encode()) // 1024} KB)')

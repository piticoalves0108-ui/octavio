/* Inicialização: cada módulo roda isolado; um erro num não derruba os outros. */
function boot() {
  const modules = [
    ["chrome", typeof initChrome === "function" ? initChrome : null],
    ["hero", typeof initHero === "function" ? initHero : null],
    ["globe", typeof initGlobe === "function" ? initGlobe : null],
    ["demo", typeof initDemo === "function" ? initDemo : null],
    ["portfolio", typeof initPortfolio === "function" ? initPortfolio : null],
    ["scrollFx", typeof initScrollFx === "function" ? initScrollFx : null],
  ];
  for (const [name, init] of modules) {
    if (!init) continue;
    try {
      init();
    } catch (err) {
      console.error(`[${name}]`, err);
    }
  }
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

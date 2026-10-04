// Exporta cada SVG de ../svg para PNG transparente em ../png (requer Playwright).
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const WIDTHS = { principal: 3000, vertical: 2400, emblema: 2000, icone: 1024 };
const svgDir = path.join(__dirname, '..', 'svg');
const pngDir = path.join(__dirname, '..', 'png');

(async () => {
  fs.mkdirSync(pngDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const file of fs.readdirSync(svgDir).filter((f) => f.endsWith('.svg')).sort()) {
    const kind = Object.keys(WIDTHS).find((k) => file.includes(`-${k}-`));
    const svg = fs.readFileSync(path.join(svgDir, file), 'utf8')
      .replace('<svg ', `<svg style="display:block;width:${WIDTHS[kind]}px;height:auto" `);
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    const out = path.join(pngDir, file.replace('.svg', '.png'));
    await page.locator('svg').screenshot({ path: out, omitBackground: true });
    console.log(out);
  }
  await browser.close();
})();

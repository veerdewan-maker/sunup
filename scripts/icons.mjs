// Renders the PNG app icons from public/icon.svg. Run: node scripts/icons.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFileSync } from 'node:fs';
const svg = readFileSync('public/icon.svg', 'utf8');
const browser = await chromium.launch();
const shot = async (name, size, pad, square) => {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const inner = Math.round(size * (1 - pad * 2));
  const s = square ? svg.replace('rx="112"', 'rx="0"') : svg;
  await page.setContent(`<body style="margin:0;background:${square ? '#0e1116' : 'transparent'};display:grid;place-items:center;width:${size}px;height:${size}px"><div style="width:${inner}px;height:${inner}px">${s}</div></body>`);
  await page.screenshot({ path: `public/${name}`, omitBackground: !square });
  await page.close();
};
await shot('icon-192.png', 192, 0, false);
await shot('icon-512.png', 512, 0, false);
await shot('icon-maskable-512.png', 512, 0.1, true);
await shot('apple-touch-icon.png', 180, 0, true);
await browser.close();

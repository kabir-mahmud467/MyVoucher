import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const svg = fs.readFileSync(path.join(root, 'public/favicon.svg'), 'utf8');
const font = fs
  .readFileSync(path.join(root, 'public/fonts/NotoSansBengali-Medium.ttf'))
  .toString('base64');

const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--font-render-hinting=none'],
});
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });

const logoHtml = (size) =>
  `<div class="logo" style="width:${size}px;height:${size}px">${svg}</div>`;

const baseCss = `
  @font-face { font-family: 'Noto Bengali'; src: url(data:font/ttf;base64,${font}) format('truetype'); font-weight: 500; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'DejaVu Sans', sans-serif; }
  .logo svg { width: 100%; height: 100%; display: block; }
  .splash {
    width: 100%; height: 100%; background: #0f5a48; color: #fffaf0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0;
  }
  .splash .brand { font-weight: 700; letter-spacing: -0.5px; }
  .splash .subtitle { font-family: 'Noto Bengali', sans-serif; color: #cfe3dc; }
`;

const writeScreenshot = async (html, width, height, file, transparent = false) => {
  await page.setViewportSize({ width, height });
  await page.setContent(`<style>${baseCss}</style>${html}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, omitBackground: transparent });
  console.log('wrote', file);
};

// Master transparent logo, rendered by Chromium (correct gradients and filters).
await writeScreenshot(
  `<div style="width:1024px;height:1024px">${logoHtml(1024)}</div>`,
  1024,
  1024,
  '/tmp/mv-assets/icon-master.png',
  true,
);

// Opaque master on the brand background for maskable/apple icons.
await writeScreenshot(
  `<div class="splash" style="justify-content:center">${logoHtml(430)}</div>`,
  1024,
  1024,
  '/tmp/mv-assets/icon-maskable-master.png',
);

// Splash screens with Bengali subtitle.
const splash = (width, height, logo, brandSize, subSize) => `
  <div class="splash" style="width:${width}px;height:${height}px">
    ${logoHtml(logo)}
    <div class="brand" style="font-size:${brandSize}px;margin-top:54px">MyVoucher</div>
    <div class="subtitle" style="font-size:${subSize}px;margin-top:18px">খরচ ও ভাউচার ব্যবস্থাপনা</div>
  </div>`;

await writeScreenshot(splash(1280, 1920, 420, 96, 38), 1280, 1920, '/tmp/mv-assets/splash-portrait.png');
await writeScreenshot(splash(1920, 1280, 360, 84, 34), 1920, 1280, '/tmp/mv-assets/splash-landscape.png');

await browser.close();

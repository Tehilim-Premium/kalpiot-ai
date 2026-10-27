// Real screenshots of dist/index.html: phone 412×860 and desktop 1366×860, dark and light,
// every screen, plus one contact sheet (qa/shots/contact-sheet.jpg). Logs console errors.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'qa/shots'); fs.mkdirSync(out, { recursive: true });
const url = pathToFileURL(path.join(root, 'docs/index.html')).href;
const GPU = ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'];
let browser = await chromium.launch({ channel: 'chrome', headless: true, args: GPU }).catch(() => chromium.launch({ headless: true, args: GPU }));
const errors = [];
const shots = [];
const t0 = Date.now();

async function run(device, theme) {
  const mobile = device === 'phone';
  const ctx = await browser.newContext({ viewport: mobile ? { width: 412, height: 860 } : { width: 1366, height: 860 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, colorScheme: theme, locale: 'he-IL' });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(`${device}/${theme}: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`${device}/${theme}: ${e.message}`));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => document.fonts.status === 'loaded' && window.KAI && window.KAI.city.n > 0, null, { timeout: 15000 }).catch(() => errors.push(`${device}/${theme}: city did not build`));
  await page.waitForTimeout(2800);
  const snap = async (name) => { const f = path.join(out, `${device}-${theme}-${name}.png`); await page.screenshot({ path: f }); shots.push({ f, label: `${device} · ${theme} · ${name}` }); };
  await snap('home');
  if (mobile) { await page.click('#tabs [data-s="city"]'); await page.waitForTimeout(1200); }
  else { await page.waitForTimeout(400); }
  await snap('city');
  // select a big tower via the API (deterministic), then the locality card
  await page.evaluate(() => { const big = [...window.KAI.rows].sort((a, b) => b.elig - a.elig)[0]; window.KAI.city.focus(big.name); });
  await page.waitForTimeout(1500);
  await snap('city-pick');
  await page.click('#pick [data-open]');
  await page.waitForTimeout(700);
  await snap('locality');
  await page.evaluate(() => window.KAI.loc.close());
  await page.waitForTimeout(300);
  await page.click('#tabs [data-s="list"]'); await page.waitForTimeout(500); await snap('list');
  await page.click('#tabs [data-s="groups"]'); await page.waitForTimeout(700); await snap('groups');
  await page.click('#tabs [data-s="ask"]'); await page.waitForTimeout(500); await snap('ask');
  await page.click('#tabs [data-s="home"]'); await page.click('[data-info="home"]'); await page.waitForTimeout(500); await snap('info');
  await page.evaluate(() => window.KAI.sheet.close());
  // overflow check: body never scrolls sideways
  const ovf = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (ovf) errors.push(`${device}/${theme}: horizontal overflow`);
  await ctx.close();
}
for (const d of ['phone', 'desktop']) for (const t of ['dark', 'light']) await run(d, t);

// contact sheet
const sheetPage = await browser.newPage({ viewport: { width: 1800, height: 100 } });
const imgs = shots.map(s => `<figure><img src="data:image/png;base64,${fs.readFileSync(s.f).toString('base64')}"><figcaption>${s.label}</figcaption></figure>`).join('');
await sheetPage.setContent(`<style>body{margin:0;background:#111;color:#ddd;font:12px system-ui;padding:10px}div{display:flex;flex-wrap:wrap;gap:10px}figure{margin:0;width:286px}figure.d{width:420px}img{width:100%;border:1px solid #444;border-radius:6px}figcaption{padding:3px 0}</style><div>${imgs}</div>`);
await sheetPage.evaluate(() => document.querySelectorAll('figure').forEach(f => { if (/desktop/.test(f.textContent)) f.classList.add('d'); }));
await sheetPage.waitForTimeout(800);
await sheetPage.screenshot({ path: path.join(out, 'contact-sheet.jpg'), fullPage: true, type: 'jpeg', quality: 82 });
await browser.close();
const report = { seconds: Math.round((Date.now() - t0) / 1000), shots: shots.length, errors };
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

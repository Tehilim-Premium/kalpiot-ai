// Promo clip: 7 scenes recorded from the real app (phone, dark), 1080x1920. Writes qa/promo/scene-N.webm; qa/promo-build.sh joins them.
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const url = pathToFileURL(path.resolve('docs/index.html')).href;
const out = 'qa/promo'; const only = process.argv.slice(2).map(Number); if (!only.length) fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11','--ignore-gpu-blocklist','--enable-gpu'] });
const CAP = `<style>.pcap{position:fixed;left:50%;bottom:150px;transform:translate(-50%,30px);opacity:0;z-index:999;pointer-events:none;background:rgba(0,36,122,.88);color:#fff;border:1px solid rgba(217,181,74,.6);border-radius:18px;padding:12px 22px;font:700 21px Heebo,system-ui,sans-serif;white-space:nowrap;box-shadow:0 20px 50px -20px #000;backdrop-filter:blur(6px);transition:all .5s cubic-bezier(.22,1,.36,1)}.pcap.on{opacity:1;transform:translate(-50%,0)}.pcap b{color:#F0DEA0}</style>`;
async function scene(n, secs, fn, opts = {}) {
  if (only.length && !only.includes(n)) return;
  const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark', locale: 'he-IL', recordVideo: { dir: out + '/raw', size: { width: 1080, height: 1920 } } });
  const p = await ctx.newPage();
  if (!opts.card) {
    await p.addInitScript(() => { try { localStorage.setItem('kai-gest', '1'); localStorage.setItem('kai-layout2', 'map'); localStorage.setItem('kai-theme', 'dark'); } catch (_) {} });
    await p.goto(url, { waitUntil: 'load' });
    await p.waitForFunction(() => document.fonts.status === 'loaded' && window.KAI && window.KAI.city.n > 0, null, { timeout: 20000 });
    await p.evaluate(c => { document.head.insertAdjacentHTML('beforeend', c); const d = document.createElement('div'); d.className = 'pcap'; d.id = 'pcap'; document.body.appendChild(d); }, CAP);
  }
  const cap = (html, top) => p.evaluate(([h, t]) => { const d = document.getElementById('pcap'); d.innerHTML = h; if (t) { d.style.top = t + 'px'; d.style.bottom = 'auto'; } d.classList.add('on'); }, [html, top || 0]);
  const t0 = Date.now();
  await fn(p, cap);
  const left = secs * 1000 - (Date.now() - t0); if (left > 0) await p.waitForTimeout(left);
  const v = p.video(); await ctx.close(); const vp = await v.path(); fs.renameSync(vp, `${out}/scene-${n}.webm`); console.log('scene', n, 'ok');
}
const cdpTouch = async (p, ctx) => { const s = await p.context().newCDPSession(p); return (type, pts) => s.send('Input.dispatchTouchEvent', { type, touchPoints: pts }); };
const card = (title, sub, extra = '') => `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@700;900&family=Heebo:wght@400;700;900&display=swap" rel="stylesheet"><style>
html,body{margin:0;height:100%;background:radial-gradient(circle at 50% 35%,#13275f,#060c1f 70%);color:#fff;font-family:Heebo,system-ui,sans-serif;overflow:hidden}
.w{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center}
.star{width:200px;height:200px;color:#D9B54A;animation:pop 1.1s cubic-bezier(.34,1.4,.64,1) both,spin 6s linear infinite}
h1{font:900 112px "Frank Ruhl Libre",serif;margin:0;animation:rise .9s .25s cubic-bezier(.22,1,.36,1) both;letter-spacing:-.02em}
h1 span{color:#D9B54A}
p{margin:0;font-size:30px;max-width:86%;line-height:1.35;color:#C0CCEE;animation:rise .9s .5s cubic-bezier(.22,1,.36,1) both}
.url{margin-top:30px;padding:18px 34px;border-radius:22px;background:#0038B8;font-weight:900;font-size:34px;animation:rise .9s .75s cubic-bezier(.22,1,.36,1) both;box-shadow:0 30px 60px -20px #000}
.flag{position:absolute;left:0;right:0;height:14px;background:#0038B8}.flag.t{top:70px}.flag.b{bottom:70px}
@keyframes pop{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:none}}@keyframes rise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
</style></head><body><div class="flag t"></div><div class="flag b"></div><div class="w"><svg class="star" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"><path d="M32 8 L52 42 L12 42 Z"/><path d="M32 56 L12 22 L52 22 Z"/></svg><h1>${title}</h1><p>${sub}</p>${extra}</div></body></html>`;

// 1. title card
await scene(1, 2.2, async p => { await p.setContent(card('קלפיות <span>AI</span>', 'הכנסת ה-26 · 27.10.2026 · אחוזי הצבעה חיים, יישוב-יישוב')); await p.waitForTimeout(300); }, { card: true });
// 2. home: the big number
await scene(2, 2.4, async (p, cap) => { await p.waitForTimeout(400); await cap('<b>66.7%</b> הצביעו · 1,215 יישובים · מול 2022'); });
// 3. map: cinematic intro, then a finger turns the map
await scene(3, 4.2, async (p, cap) => { await p.click('#tabs [data-s="city"]'); await p.waitForTimeout(2300); await cap('מפת ישראל בתלת-ממד · כל יישוב מגדל', 128); const ev = await cdpTouch(p); await ev('touchStart', [{ x: 120, y: 560, id: 1 }]); for (let i = 1; i <= 36; i++) { await ev('touchMove', [{ x: 120 + 7 * i, y: 560 - i, id: 1 }]); await p.waitForTimeout(33); } await ev('touchEnd', []); });
// 4. fly to Jerusalem, card pops
await scene(4, 2.6, async (p, cap) => { await p.click('#tabs [data-s="city"]'); await p.waitForTimeout(600); await p.evaluate(() => { KAI.city.focus('ירושלים'); KAI.city.trad = 42; KAI.city.tpol = 1.0; }); await p.waitForTimeout(900); await cap('נגיעה על מגדל · <b>ירושלים</b> בכרטיס', 128); });
// 5. the ring by profile
await scene(5, 2.6, async (p, cap) => { await p.evaluate(() => { try { localStorage.setItem('kai-layout2', 'ring'); } catch (_) {} }); await p.click('#tabs [data-s="city"]'); await p.waitForTimeout(300); await p.evaluate(() => KAI.city.setLayout('ring')); await p.waitForTimeout(1000); await cap('מעגל לפי פרופיל הצבעה · 6 גזרות', 128); const ev = await cdpTouch(p); await ev('touchStart', [{ x: 140, y: 600, id: 1 }]); for (let i = 1; i <= 24; i++) { await ev('touchMove', [{ x: 140 + 9 * i, y: 600, id: 1 }]); await p.waitForTimeout(33); } await ev('touchEnd', []); });
// 6. who against whom report
await scene(6, 2.6, async (p, cap) => { await p.evaluate(() => KAI.reports.open('duels')); await p.waitForTimeout(700); await cap('מי מול מי · ימין, שמאל, ערבים, חרדים'); await p.evaluate(() => { const l = document.querySelector('.layer.on'); if (l) l.scrollTo({ top: 420, behavior: 'smooth' }); }); });
// 7. end card
await scene(7, 2.6, async p => { await p.setContent(card('קלפיות <span>AI</span>', 'מתקינים בטלפון · שואלים את העיר · חי כל היום', '<div class="url">kalpiot-ai.netlify.app</div>')); await p.waitForTimeout(300); }, { card: true });
fs.rmSync(out + '/raw', { recursive: true, force: true });
await b.close();

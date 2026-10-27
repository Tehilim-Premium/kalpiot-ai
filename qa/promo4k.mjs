// Promo in 4K vertical (2160x3840): every frame is a real screenshot of the app at a virtual 30fps clock,
// so motion is perfectly smooth whatever the machine speed. Writes qa/promo4k/scene-N/f0001.png...
//   node qa/promo4k.mjs            all scenes
//   node qa/promo4k.mjs 3 --max 12 scene 3, first 12 frames (quick check)
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const url = pathToFileURL(path.resolve('docs/index.html')).href;
const args = process.argv.slice(2); const maxI = args.indexOf('--max'); const MAX = maxI >= 0 ? +args[maxI + 1] : Infinity;
const only = args.filter(a => /^\d+$/.test(a)).map(Number);
const FPS = 30, DT = 1000 / FPS, DPR = +(process.env.DPR || 4);
const out = 'qa/promo4k';
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'] });
const CLOCK = () => {
  const vt = { t: 0, q: [] }; window.__vt = vt;
  performance.now = () => vt.t;
  window.requestAnimationFrame = cb => { vt.q.push(cb); return vt.q.length; }; window.cancelAnimationFrame = () => {};
  window.__freeze = () => { document.getAnimations().forEach(a => { try { a.pause(); } catch (_) {} }); };
  window.__tick = dt => { vt.t += dt; const q = vt.q; vt.q = []; q.forEach(cb => { try { cb(vt.t); } catch (e) { console.error(e); } }); document.getAnimations().forEach(a => { try { if (a.playState === 'finished') return; a.pause(); a.currentTime = (a.currentTime || 0) + dt; } catch (_) {} }); };
};
const CAP = `<style>.pcap{position:fixed;left:50%;bottom:150px;transform:translate(-50%,30px);opacity:0;z-index:999;pointer-events:none;background:rgba(0,36,122,.88);color:#fff;border:1px solid rgba(217,181,74,.6);border-radius:18px;padding:12px 22px;font:700 21px Heebo,system-ui,sans-serif;white-space:nowrap;box-shadow:0 20px 50px -20px #000;backdrop-filter:blur(6px);transition:all .5s cubic-bezier(.22,1,.36,1)}.pcap.on{opacity:1;transform:translate(-50%,0)}.pcap b{color:#F0DEA0}</style>`;
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

async function scene(n, secs, steps, opts = {}) {
  if (only.length && !only.includes(n)) return;
  const dir = `${out}/scene-${n}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true, colorScheme: 'dark', locale: 'he-IL' });
  const p = await ctx.newPage(); p.on('pageerror', e => console.error('pageerror', e.message));
  await p.addInitScript(CLOCK);
  await p.addInitScript(() => { try { localStorage.setItem('kai-gest', '1'); localStorage.setItem('kai-layout2', 'map'); localStorage.setItem('kai-theme', 'dark'); } catch (_) {} });
  const cdp = await ctx.newCDPSession(p); await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.0001 });
  const ev = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  if (opts.card) { await p.setContent(opts.card, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.evaluate(CLOCK); await p.evaluate(() => __freeze()); }
  else {
    await p.goto(url, { waitUntil: 'load' });
    await p.waitForFunction(() => document.fonts.status === 'loaded' && window.KAI && window.KAI.city.n > 0, null, { timeout: 20000 });
    await p.evaluate(c => { document.head.insertAdjacentHTML('beforeend', c); const d = document.createElement('div'); d.className = 'pcap'; d.id = 'pcap'; document.body.appendChild(d); KAI.city.r.setPixelRatio(devicePixelRatio); KAI.city.resize(); __freeze(); }, CAP);
    for (let i = 0; i < 20; i++) await p.evaluate(dt => __tick(dt), DT);   // let the page settle (fonts, first layout)
  }
  const cap = (html, top) => p.evaluate(([h, t]) => { const d = document.getElementById('pcap'); d.innerHTML = h; if (t) { d.style.top = t + 'px'; d.style.bottom = 'auto'; } d.classList.add('on'); __freeze(); }, [html, top || 0]);
  const api = { p, ev, cap, tick: () => p.evaluate(dt => __tick(dt), DT) };
  const N = Math.min(MAX, Math.round(secs * FPS)); const t0 = Date.now();
  for (let f = 0; f < N; f++) {
    for (const s of steps) if (f >= s.at && f < s.at + (s.len || 1)) await s.fn(api, f - s.at, s.len || 1);
    await api.tick();
    await p.screenshot({ path: `${dir}/f${String(f + 1).padStart(4, '0')}.png`, type: 'png', animations: 'allow', caret: 'hide' });
  }
  await ctx.close(); console.log(`scene ${n}: ${N} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
const drag = (from, to, id = 1) => ({ fn: async ({ ev }, i, len) => { const t = (i + 1) / len, e = 1 - Math.pow(1 - t, 2); const x = from[0] + (to[0] - from[0]) * e, y = from[1] + (to[1] - from[1]) * e; if (i === 0) await ev('touchStart', [{ x: from[0], y: from[1], id }]); await ev('touchMove', [{ x, y, id }]); if (i === len - 1) await ev('touchEnd', []); } });
const at = (f, len, step) => ({ at: f, len, ...step });
const once = (f, fn) => ({ at: f, len: 1, fn });

// 1 title · 2 home · 3 map intro + turn · 4 Jerusalem · 5 ring · 6 who vs whom · 7 end
await scene(1, 2.2, [], { card: card('קלפיות <span>AI</span>', 'הכנסת ה-26 · 27.10.2026 · אחוזי הצבעה חיים, יישוב-יישוב') });
await scene(2, 2.4, [once(10, ({ cap }) => cap('<b>66.7%</b> הצביעו · 1,215 יישובים · מול 2022'))]);
await scene(3, 4.4, [once(0, async ({ p }) => { await p.click('#tabs [data-s="city"]'); await p.evaluate(() => __freeze()); }), once(70, ({ cap }) => cap('מפת ישראל בתלת-ממד · כל יישוב מגדל', 128)), at(76, 50, drag([120, 560], [380, 520]))]);
await scene(4, 2.8, [once(0, async ({ p }) => { await p.click('#tabs [data-s="city"]'); await p.evaluate(() => { KAI.city.focus('ירושלים'); KAI.city.trad = 42; KAI.city.tpol = 1.0; __freeze(); }); }), once(28, ({ cap }) => cap('נגיעה על מגדל · <b>ירושלים</b> בכרטיס', 128))]);
await scene(5, 2.8, [once(0, async ({ p }) => { await p.click('#tabs [data-s="city"]'); await p.evaluate(() => { KAI.city.setLayout('ring'); __freeze(); }); }), once(30, ({ cap }) => cap('מעגל לפי פרופיל הצבעה · 6 גזרות', 128)), at(34, 46, drag([140, 600], [360, 600]))]);
await scene(6, 2.8, [once(0, async ({ p }) => { await p.evaluate(() => { KAI.reports.open('duels'); __freeze(); }); }), once(18, ({ cap }) => cap('מי מול מי · ימין, שמאל, ערבים, חרדים')), at(30, 50, { fn: async ({ p }, i, len) => p.evaluate(y => { const l = document.querySelector('.layer.on'); if (l) l.scrollTop = y; }, Math.round(460 * (1 - Math.pow(1 - (i + 1) / len, 2)))) })]);
await scene(7, 2.8, [], { card: card('קלפיות <span>AI</span>', 'מתקינים בטלפון · שואלים את העיר · חי כל היום', '<div class="url">kalpiot-ai.netlify.app</div>') });
await b.close();

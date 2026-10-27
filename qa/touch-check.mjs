// Touch on the map via CDP, recorded as a video (qa/touch.webm): one finger turns the map in place,
// a sloppy pinch only zooms, lifting one finger does not jump, "north" realigns.  node qa/touch-check.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const url = pathToFileURL(path.resolve('docs/index.html')).href;
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11','--ignore-gpu-blocklist','--enable-gpu'] });
const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, locale: 'he-IL', colorScheme: 'dark', recordVideo: { dir: 'qa/video', size: { width: 412, height: 860 } } });
const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await p.goto(url, { waitUntil: 'load' });
await p.waitForFunction(() => window.KAI && window.KAI.city.n > 0, null, { timeout: 15000 });
await p.click('#tabs [data-s="city"]'); await p.waitForTimeout(2500);
const cdp = await ctx.newCDPSession(p);
const ev = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
const cam = () => p.evaluate(() => { const c = KAI.city; return { az: +c.taz.toFixed(3), pol: +c.tpol.toFixed(3), rad: +c.trad.toFixed(1), tx: +c.ttx.toFixed(2), tz: +c.ttz.toFixed(2) }; });
// a visible finger dot so the video shows where the touch is
await p.evaluate(() => { const mk = id => { const d = document.createElement('div'); d.id = id; d.style.cssText = 'position:fixed;width:34px;height:34px;border-radius:50%;background:rgba(255,215,80,.55);border:2px solid #fff;z-index:999;pointer-events:none;display:none;transform:translate(-50%,-50%)'; document.body.appendChild(d); }; mk('f1'); mk('f2'); });
const show = pts => p.evaluate(pts => { ['f1','f2'].forEach((id,i) => { const d = document.getElementById(id); const t = pts[i]; d.style.display = t ? 'block' : 'none'; if (t) { d.style.left = t.x + 'px'; d.style.top = t.y + 'px'; } }); }, pts);
const move = async (pts) => { await show(pts); await ev('touchMove', pts); await p.waitForTimeout(24); };
const start = async (pts) => { await show(pts); await ev('touchStart', pts); await p.waitForTimeout(30); };
const end = async () => { await show([]); await ev('touchEnd', []); };
const s0 = await cam(); console.log('start', s0);
// 1) one finger, drag right 160px: the map turns in place (az changes, target stays)
await start([{x:120,y:520,id:1}]); for (let i=1;i<=20;i++) await move([{x:120+8*i,y:520,id:1}]); await end(); await p.waitForTimeout(900);
const s1 = await cam(); console.log('one finger right', s1);
// 2) one finger, drag up 100px: tilt
await start([{x:200,y:600,id:1}]); for (let i=1;i<=16;i++) await move([{x:200,y:600-6*i,id:1}]); await end(); await p.waitForTimeout(700);
const s2 = await cam(); console.log('one finger up', s2);
// 3) sloppy pinch out (with twist and drift): only zoom, no turn
await start([{x:190,y:470,id:1}]); await start([{x:190,y:470,id:1},{x:230,y:490,id:2}]);
for (let i=1;i<=16;i++){ const t=i/16; await move([{x:190-70*t,y:470-20*t,id:1},{x:230+70*t,y:490+60*t,id:2}]); }
const s3 = await cam(); console.log('sloppy pinch', s3);
// 4) lift finger 2, keep dragging finger 1 right: continues smoothly (no jump)
await ev('touchEnd', [{x:300,y:550,id:2}]); await show([{x:120,y:450}]); const s4a = await cam();
for (let i=1;i<=10;i++) await move([{x:120+6*i,y:450,id:1}]); await end(); await p.waitForTimeout(700);
const s4 = await cam(); console.log('after lift', s4a, 'then drag', s4);
// 5) north button realigns
const northShown = await p.evaluate(() => !document.getElementById('btnNorth').hidden);
await p.click('#btnNorth'); await p.waitForTimeout(1200); const s5 = await cam(); console.log('north', northShown, s5);
await p.waitForTimeout(600);
const C = { turnsInPlace: Math.abs(s1.az-s0.az)>.3 && Math.abs(s1.tx-s0.tx)<.05 && Math.abs(s1.tz-s0.tz)<.05, tilts: Math.abs(s2.pol-s1.pol)>.1, pinchOnlyZooms: s3.rad<s2.rad-5 && Math.abs(s3.az-s2.az)<.01, noJump: Math.abs(s4a.az-s3.az)<.01, keepsTurning: Math.abs(s4.az-s4a.az)>.05, compass: northShown && Math.abs(s5.az-Math.PI/2)<.01 };
console.log(C); const ok = Object.values(C).every(Boolean);
const video = p.video(); await ctx.close(); const vp = await video.path(); fs.copyFileSync(vp, 'qa/touch.webm'); fs.rmSync('qa/video', { recursive: true, force: true });
console.log(ok ? 'TOUCH OK' : 'TOUCH FAIL', errs, 'video qa/touch.webm');
await b.close(); process.exit(ok ? 0 : 1);

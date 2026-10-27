// Realistic touch on the map via CDP: a sloppy pinch (twist + drift), then lift one finger and keep dragging, then a one-finger drag.
import { chromium } from 'playwright-core';
import path from 'node:path'; import { pathToFileURL } from 'node:url';
const url = pathToFileURL(path.resolve('docs/index.html')).href;
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11','--ignore-gpu-blocklist','--enable-gpu'] });
const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'he-IL' });
const p = await ctx.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await p.goto(url, { waitUntil: 'load' });
await p.waitForFunction(() => window.KAI && window.KAI.city.n > 0, null, { timeout: 15000 });
await p.click('#tabs [data-s="city"]'); await p.waitForTimeout(1500);
const cdp = await ctx.newCDPSession(p);
const ev = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
const cam = () => p.evaluate(() => { const c = KAI.city; return { az: +c.taz.toFixed(3), pol: +c.tpol.toFixed(3), rad: +c.trad.toFixed(1), tx: +c.ttx.toFixed(2), tz: +c.ttz.toFixed(2), mode: c.layoutMode }; });
console.log('start', await cam());
// 1) sloppy pinch out: fingers separate, with ~12° twist and 20px downward drift
let A=[180,420], B=[230,440];
await ev('touchStart', [{x:A[0],y:A[1],id:1}]); await p.waitForTimeout(40);
await ev('touchStart', [{x:A[0],y:A[1],id:1},{x:B[0],y:B[1],id:2}]);
for (let i=1;i<=12;i++){ const t=i/12; const a=[180-70*t, 420-30*t+20*t], bb=[230+70*t, 440+45*t+20*t]; await ev('touchMove',[{x:a[0],y:a[1],id:1},{x:bb[0],y:bb[1],id:2}]); await p.waitForTimeout(16); }
const afterPinch = await cam(); console.log('after sloppy pinch', afterPinch);
// 2) lift finger 2, keep finger 1 and drag it 60px right: the map must follow without a jump
await ev('touchEnd', [{x:110,y:410,id:1}].map(()=>({x:300,y:505,id:2}))); // finger 2 up
const afterLift = await cam();
for (let i=1;i<=8;i++){ await ev('touchMove',[{x:110+60*i/8,y:410,id:1}]); await p.waitForTimeout(16); }
const afterDrag1 = await cam();
await ev('touchEnd', []); await p.waitForTimeout(300);
console.log('after lift (no jump?)', afterLift, 'after one-finger drag right', afterDrag1);
// 3) fresh one-finger drag right and down, bigger
const before = await cam();
await ev('touchStart',[{x:200,y:400,id:3}]); for(let i=1;i<=10;i++){ await ev('touchMove',[{x:200+12*i,y:400+8*i,id:3}]); await p.waitForTimeout(16);} await ev('touchEnd',[]); await p.waitForTimeout(100);
const after = await cam(); console.log('drag right+down', before, '->', after);
// 4) deliberate twist (> 30°) rotates; compass shows; tapping compass realigns
await ev('touchStart',[{x:150,y:450,id:4}]); await ev('touchStart',[{x:150,y:450,id:4},{x:250,y:450,id:5}]);
for(let i=1;i<=15;i++){ const ang=i/15*1.0; const cx=200, cy=450; await ev('touchMove',[{x:cx-50*Math.cos(ang),y:cy-50*Math.sin(ang),id:4},{x:cx+50*Math.cos(ang),y:cy+50*Math.sin(ang),id:5}]); await p.waitForTimeout(16);} await ev('touchEnd',[]); await p.waitForTimeout(200);
const twisted = await cam(); const northShown = await p.evaluate(()=>!document.getElementById('btnNorth').hidden);
await p.click('#btnNorth'); await p.waitForTimeout(600); const realigned = await cam();
console.log('twist', twisted, 'compass shown', northShown, 'realigned', realigned);
const C={pinchNoTwist:Math.abs(afterPinch.az-1.571)<.02,zoomed:afterPinch.rad<70,noJump:Math.abs(afterLift.tx-afterPinch.tx)<.5,dragRight:afterDrag1.tx<afterLift.tx-1,rightDown:after.tx<before.tx&&after.tz<before.tz,twist:Math.abs(twisted.az-1.571)>.4,compass:northShown,realigned:Math.abs(realigned.az-1.571)<.01};console.log(C);const ok=Object.values(C).every(Boolean);
console.log(ok?'TOUCH OK':'TOUCH FAIL', errs);
await b.close(); process.exit(ok?0:1);

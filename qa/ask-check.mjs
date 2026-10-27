// One-off check of "שאל את העיר" in the installed app: with a fake key the page must reach
// api.anthropic.com from the browser (CORS + request shape) and show the key error, not a network error.
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const b = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => chromium.launch({ headless: true }));
const p = await b.newPage({ viewport: { width: 412, height: 860 } });
const net = [];
p.on('response', r => { if (r.url().includes('anthropic.com')) net.push(r.status() + ' ' + r.url()); });
await p.goto(pathToFileURL(path.join(root, 'docs/index.html')).href);
await p.waitForFunction(() => window.KAI && window.KAI.city.n > 0);
await p.evaluate(() => localStorage.setItem('kai-key', 'sk-ant-test-invalid'));
await p.click('#tabs [data-s="ask"]');
await p.fill('#askIn', 'מה המצב בירושלים?');
await p.click('#askSend');
await p.waitForFunction(() => [...document.querySelectorAll('.msg.a')].some(m => /המפתח|השירות|שנ׳/.test(m.textContent)), null, { timeout: 20000 }).catch(() => {});
const last = await p.evaluate(() => [...document.querySelectorAll('.msg.a')].pop().textContent);
console.log(JSON.stringify({ network: net, lastMessage: last }, null, 2));
await b.close();

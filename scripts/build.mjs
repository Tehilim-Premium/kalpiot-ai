// Inlines the data files into src/page.html and writes:
//   dist/artifact.html  — the page as the claude.ai Artifact tool expects it (no document skeleton)
//   dist/index.html     — a standalone page (local screenshots)
//   docs/               — the installable web app for GitHub Pages (index.html + manifest + service worker + icons)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');

const data = {
  cls: JSON.parse(rd('data/cls.json')),
  snaps: fs.readdirSync(path.join(root, 'data')).filter(f => /^snap-\d{4}\.json$/.test(f)).sort().map(f => JSON.parse(rd('data/' + f))),
  ref2022: JSON.parse(rd('data/ref-2022.json')),
  geo: JSON.parse(rd('data/geo.json')),
  scale: 1.08,
  built: new Date().toISOString().slice(0, 16).replace('T', ' ')
};
const page = rd('src/page.html').replace('/*__DATA__*/{}', JSON.stringify(data).replace(/<\/script/g, '<\\/script'));
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/artifact.html'), page);
const standalone = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0038B8">
<meta name="application-name" content="קלפיות AI">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="קלפיות AI">
<meta name="description" content="עיר תלת-ממדית של אחוזי ההצבעה לכנסת ה-26 לפי יישוב, בהשוואה ל-2022">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${page}
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'dist/index.html'), standalone);
// installable app for GitHub Pages
const docs = path.join(root, 'docs'); fs.mkdirSync(path.join(docs, 'icons'), { recursive: true });
const stamp = data.built.replace(/[^0-9]/g, '');
fs.writeFileSync(path.join(docs, 'index.html'), standalone.replace('</body>', `<script>if('serviceWorker' in navigator&&location.protocol==='https:')addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))</script>
</body>`));
for (const f of ['manifest.webmanifest', 'sw.js']) fs.writeFileSync(path.join(docs, f), rd('public/' + f).replace('__BUILD__', stamp));
for (const f of fs.readdirSync(path.join(root, 'public/icons'))) fs.copyFileSync(path.join(root, 'public/icons', f), path.join(docs, 'icons', f));
fs.writeFileSync(path.join(docs, '.nojekyll'), '');
console.log('built', Math.round(page.length / 1024) + 'KB', 'localities', Object.keys(data.cls).length, 'snapshots', data.snaps.map(s => s.time).join(', '));

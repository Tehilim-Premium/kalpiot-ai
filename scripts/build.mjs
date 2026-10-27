// Inlines the data files into src/page.html and writes:
//   dist/artifact.html  — the page as the claude.ai Artifact tool expects it (no document skeleton)
//   dist/index.html     — a standalone page (for GitHub / Netlify / local screenshots)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');

const data = {
  cls: JSON.parse(rd('data/cls.json')),
  snaps: [JSON.parse(rd('data/snap-1249.json')), JSON.parse(rd('data/snap-1645.json'))],
  ref2022: JSON.parse(rd('data/ref-2022.json')),
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
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230038B8'/%3E%3Cpath d='M32 12 L49 42 L15 42 Z M32 52 L15 22 L49 22 Z' fill='none' stroke='%23fff' stroke-width='3'/%3E%3C/svg%3E">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${page}
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'dist/index.html'), standalone);
console.log('built', Math.round(page.length / 1024) + 'KB', 'localities', Object.keys(data.cls).length, 'snapshots', data.snaps.map(s => s.time).join(', '));

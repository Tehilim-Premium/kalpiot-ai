// Builds data/geo.json: a position for every locality the committee lists, plus the country outline
// and municipal boundaries for the 3D floor. Sources: govmap municipal boundaries (by CBS code via
// expc-2022.csv) and Wikidata (fallback by Hebrew name, mainly for localities beyond the Green Line).
// Units: kilometres in EPSG:3857 relative to the country's centre (x east, y north).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as tc from 'topojson-client';
import * as ts from 'topojson-simplify';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');

const topo = JSON.parse(rd('data/raw-geo/municipal_geometry.topojson'));
const obj = topo.objects[Object.keys(topo.objects)[0]];
const bb = topo.bbox; const C = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];
const km = ([x, y]) => [Math.round((x - C[0]) / 100) / 10, Math.round((y - C[1]) / 100) / 10];
const R = 6378137; // metres; mercator lon/lat -> 3857
const merc = (lon, lat) => [R * lon * Math.PI / 180, R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))];

// centroid (area-weighted) of the largest ring of each municipality
const fc = tc.feature(topo, obj);
const centroid = ring => { let a = 0, cx = 0, cy = 0; for (let i = 0; i < ring.length - 1; i++) { const [x0, y0] = ring[i], [x1, y1] = ring[i + 1]; const f = x0 * y1 - x1 * y0; a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f; } a *= 3; return a ? [cx / a, cy / a] : ring[0]; };
const byCode = new Map(), byMuniName = new Map();
for (const f of fc.features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const biggest = polys.map(p => p[0]).sort((a, b) => b.length - a.length)[0];
  const c = centroid(biggest); byCode.set(+f.properties.SETL_CODE, c); byMuniName.set(f.properties['שם ישוב'], c);
}

// committee name -> CBS code through the official 2022 file (same normalisation as classify.mjs)
const norm = s => String(s).replace(/[()"'״׳]/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(אל|א)\s/, '').replace(/\bישוב\b/g, 'יישוב');
const tight = s => norm(s).replace(/\s/g, '');
const csv = rd('data/expc-2022.csv').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
const codeByNorm = new Map(), codeByTight = new Map();
for (const line of csv.slice(1)) { const c = line.split(','); codeByNorm.set(norm(c[1]), +c[2]); codeByTight.set(tight(c[1]), +c[2]); }

// Wikidata fallback by Hebrew name
const wd = new Map();
for (const f of ['data/raw-geo/wikidata-settlements.csv', 'data/raw-geo/wikidata-israel.csv']) {
  for (const line of rd(f).split(/\r?\n/).slice(1)) { const m = line.match(/^[^,]+,(.*),Point\(([-\d.]+) ([-\d.]+)\)$/); if (!m) continue; const name = m[1].replace(/^"|"$/g, ''); const k = norm(name.replace(/\s*\(.*?\)\s*$/, '')); if (!wd.has(k)) wd.set(k, merc(+m[2], +m[3])); }
}

const snap = JSON.parse(rd('data/snap-1843.json'));
const geo = {}; const src = { muni: 0, wd: 0, none: [] };
for (const [, name] of snap.rows) {
  const code = codeByNorm.get(norm(name)) ?? codeByTight.get(tight(name)) ?? codeByNorm.get(norm(name.replace(/\(.*?\)/, '')));
  let c = code != null ? byCode.get(code) : null; if (!c) c = byMuniName.get(name) || null;
  if (c) src.muni++;
  else { const k = norm(name.replace(/\s*\(.*?\)\s*$/, '')); c = wd.get(k) || wd.get(k.replace(/\s/g, '')) || null; if (c) src.wd++; }
  if (c) geo[name] = km(c); else src.none.push(name);
}

// country outline: Natural Earth 50m, Israel + Judea and Samaria merged into one landmass (projected to 3857, km from centre)
const world = JSON.parse(rd('data/raw-geo/countries-10m.json'));
const land = tc.merge(world, world.objects.countries.geometries.filter(g => g.id === '376' || g.id === '275'));
const toKm = ([lon, lat]) => km(merc(lon, lat));
const outline = (land.type === 'Polygon' ? [land.coordinates] : land.coordinates).map(p => p[0].map(toKm)).filter(r => r.length > 8);
// neighbours as faint context (Lebanon, Syria, Jordan, Egypt), heavily thinned
const ctx = {};
for (const [id, name] of [['422', 'lb'], ['760', 'sy'], ['400', 'jo'], ['818', 'eg']]) { const g = tc.feature(world, world.objects.countries.geometries.find(x => x.id === id)).geometry; const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates; ctx[name] = polys.map(p => p[0]).sort((x, y) => y.length - x.length).slice(0, 2).map(r => r.filter((_, i) => i % 2 === 0).map(toKm)); }
// municipal boundaries for the floor texture
const meshGeom = tc.mesh(ts.simplify(ts.presimplify(JSON.parse(JSON.stringify(topo))), 2.5e5), obj);
const mesh = meshGeom.coordinates.filter(l => l.length > 2).map(l => l.map(km));
const out = { units: 'km from centre, EPSG:3857', centre: C, outline, ctx, mesh, pos: geo };
fs.writeFileSync(path.join(root, 'data/geo.json'), JSON.stringify(out));
const xs = Object.values(geo).map(p => p[0]), ys = Object.values(geo).map(p => p[1]);
console.log(JSON.stringify({ placed: Object.keys(geo).length, fromMunicipal: src.muni, fromWikidata: src.wd, missing: src.none.length, missingNames: src.none.slice(0, 40), outlineRings: outline.map(r => r.length), meshLines: mesh.length, meshPoints: mesh.reduce((a, l) => a + l.length, 0), bytesKB: Math.round(JSON.stringify(out).length / 1024), x: [Math.min(...xs), Math.max(...xs)], y: [Math.min(...ys), Math.max(...ys)] }));

// Turns a saved committee page (.mht / .html, "אחוזי הצבעה לפי יישוב") into data/snap-HHMM.json.
// Same parser as the page's parseSaved, so what works here works in the browser upload too.
//   node scripts/snapshot.mjs "<path to .mht>"
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2];
if (!file) { console.error('usage: node scripts/snapshot.mjs <file.mht>'); process.exit(1); }

function parseSaved(buf) {
  const bytes = new Uint8Array(buf); const latin = new TextDecoder('latin1').decode(bytes); let html;
  if (/^From:|^MIME-Version:|^Snapshot-Content-Location:/m.test(latin.slice(0, 4000))) {
    const hi = latin.search(/Content-Type:\s*text\/html/i); if (hi < 0) throw new Error('no html part');
    const hdrEnd = latin.indexOf('\r\n\r\n', hi) > 0 ? latin.indexOf('\r\n\r\n', hi) + 4 : latin.indexOf('\n\n', hi) + 2;
    const hdr = latin.slice(hi, hdrEnd); const enc = ((hdr.match(/Content-Transfer-Encoding:\s*([\w-]+)/i) || [])[1] || 'binary').toLowerCase();
    let partEnd = latin.indexOf('\r\n------', hdrEnd); if (partEnd < 0) partEnd = latin.indexOf('\n------', hdrEnd); if (partEnd < 0) partEnd = latin.length;
    if (enc === 'quoted-printable') { const body = latin.slice(hdrEnd, partEnd).replace(/=\r?\n/g, ''); const out = []; for (let j = 0; j < body.length; j++) { const c = body[j]; if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(body.substr(j + 1, 2))) { out.push(parseInt(body.substr(j + 1, 2), 16)); j += 2; } else out.push(c.charCodeAt(0) & 255); } html = new TextDecoder('utf-8').decode(new Uint8Array(out)); }
    else if (enc === 'base64') { const bin = Buffer.from(latin.slice(hdrEnd, partEnd).replace(/\s+/g, ''), 'base64'); html = new TextDecoder('utf-8').decode(bin); }
    else html = new TextDecoder('utf-8').decode(bytes.subarray(hdrEnd, partEnd));
  } else html = new TextDecoder('utf-8').decode(bytes);
  const re = /_rank_[^"]*">(\d+)<\/span>[\s\S]*?_name_[^"]*">([^<]*)<\/span>[\s\S]*?_value_[^"]*">([\d.]+)%<\/span><span class="_valueSub_[^"]*">עודכן ([\d:]+)<\/span>/g;
  const out = []; let m; while ((m = re.exec(html))) out.push([+m[1], m[2].trim(), +m[3], m[4]]);
  if (out.length < 50) throw new Error('locality list not found (' + out.length + ')');
  const txt = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const time = (txt.match(/עודכן (\d{1,2}:\d{2})/) || [])[1] || '??:??';
  const nat = (txt.match(/(\d{1,2}\.\d)%/) || [])[1]; const vot = (txt.match(/([\d,]{7,}) מצביעים/) || [])[1]; const el = (txt.match(/מתוך ([\d,]{7,})/) || [])[1];
  const voters = vot ? +vot.replace(/,/g, '') : 0, eligible = el ? +el.replace(/,/g, '') : 7331981;
  return { key: time.replace(':', '').padStart(4, '0'), time, date: '2026-10-27', pct: nat ? +nat : (voters && eligible ? Math.round(1000 * voters / eligible) / 10 : 0), voters, eligible, rows: out };
}

const snap = parseSaved(fs.readFileSync(file));
const out = path.join(root, 'data', `snap-${snap.key}.json`);
fs.writeFileSync(out, JSON.stringify(snap));
const times = snap.rows.map(r => r[3]).sort();
console.log(JSON.stringify({ file: path.basename(out), time: snap.time, pct: snap.pct, voters: snap.voters, eligible: snap.eligible, localities: snap.rows.length, rowTimes: [times[0], times[times.length - 1]], top: snap.rows.slice(0, 3), bottom: snap.rows.slice(-2) }));

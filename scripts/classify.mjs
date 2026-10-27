// Builds data/cls.json for every locality the committee page lists (1,215 at 16:45),
// from the official 2022 results (data/expc-2022.csv) plus the editorial sector/type
// classification of the first 555 (data/cls-555.json).
//
// Output row per locality name (as the committee page spells it):
//   { s: sector, t: type, p: profile, b: eligible 2022, v: turnout 2022 (%),
//     co: coalition %, op: opposition %, ar: arab %, ot: other %,
//     h: haredi %, rz: religious-zionist %, lab: labour+meretz %, est: 1 if sector/type were derived by rule }
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');

const CLS555 = JSON.parse(rd('data/cls-555.json'));
const SNAP = JSON.parse(rd('data/snap-1645.json'));
const csv = rd('data/expc-2022.csv').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
const head = csv[0].split(',');
const col = n => head.indexOf(n);
const PARTY = { co: ['מחל', 'ט', 'שס', 'ג'], op: ['פה', 'כן', 'ל', 'אמת', 'מרצ'], ar: ['עם', 'ום', 'ד'], h: ['ג', 'שס'], rz: ['ט'], lab: ['אמת', 'מרצ'] };

const norm = s => String(s).replace(/[()"'״׳]/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/^(אל|א)\s/, '').replace(/\bישוב\b/g, 'יישוב');
const tight = s => norm(s).replace(/\s/g, '');

const byNorm = new Map(), byTight = new Map();
for (const line of csv.slice(1)) {
  const c = line.split(',');
  const name = c[1].trim();
  const bzb = +c[col('בזב')], voters = +c[col('מצביעים')], valid = +c[col('כשרים')];
  const sum = k => PARTY[k].reduce((a, p) => a + (+c[col(p)] || 0), 0);
  const pct = k => valid ? Math.round(1000 * sum(k) / valid) / 10 : 0;
  const row = { name, bzb, t: bzb ? Math.round(1000 * voters / bzb) / 10 : null, co: pct('co'), op: pct('op'), ar: pct('ar'), h: pct('h'), rz: pct('rz'), lab: pct('lab') };
  row.ot = Math.max(0, Math.round(10 * (100 - row.co - row.op - row.ar)) / 10);
  byNorm.set(norm(name), row); byTight.set(tight(name), row);
}

const KIBBUTZ = `אדמית אור הנר אורטל אורים איילת השחר אילון אלומות אלונים אלרום אפיק אפיקים אשדות יעקב איחוד אשדות יעקב מאוחד באר טוביה בארי בית אלפא בית גוברין בית הערבה בית השיטה בית זרע בית ניר בית עובד בית קמה בית קשת ברור חיל ברעם ברקאי גבולות גבים גבע גבעת ברנר גבעת חיים איחוד גבעת חיים מאוחד גבעת עוז גבת גדות גונן גזית גזר גינוסר גלאון גלגל גליל ים גן שמואל גניגר גשור גשר גשר הזיו דביר דגניה א דגניה ב דורות דליה דפנה דברת הגושרים הזורע הזורעים החותרים המעפיל הסוללים העוגן הראל זיקים חולדה חולית חורשים חמדיה חניתה חפץ חיים חצור חצרים חרוב טירת צבי יגור יד חנה יד מרדכי יהל יזרעאל יחיעם יסעור יפעת יפתח יקום יראון ירדנה כברי כיסופים כפר בלום כפר גלעדי כפר גליקסון כפר החורש כפר המכבי כפר הנשיא כפר מנחם כפר מסריק כפר סאלד כפר עזה כפר רופין כרם שלום כרמיה לביא להב להבות הבשן להבות חביבה לוחמי הגיטאות לוטן לטרון מבוא חמה מגידו מגל מגן מגן מיכאל מולדת מורן מזרע מחניים מלכיה מנרה מסילות מעגן מעגן מיכאל מעוז חיים מעלה גלבוע מעלה החמישה מענית מפלסים מצובה מצר מרחביה מרום גולן משאבי שדה משגב עם משמר דוד משמר הנגב משמר העמק משמר השרון משמרות מתת נאות מרדכי נאות סמדר נגבה נווה אור נווה איתן נווה אילן נווה ים נווה אור נחל עוז נחשולים נחשון נחשונים ניר אליהו ניר דוד ניר יצחק ניר עוז ניר עם ניר עציון נירים נען נצר סרני נתיב הל ה סאסא סמר סעד סער עין גב עין גדי עין דור עין החורש עין המפרץ עין הנצי ב עין השופט עין השלושה עין זיוון עין חרוד איחוד עין חרוד מאוחד עין כרמל עין צורים עין שמר עלומים עמיעד עמיר עלומים פלמחים פרוד צאלים צובה צרעה קבוצת יבנה קדמה קטורה קליה קרית ענבים ראש הנקרה רביבים רבדים רגבים רוחמה רמת דוד רמת השופט רמת יוחנן רמת רחל רעים רשפים שדה אליהו שדה בוקר שדה יואב שדה נחום שדה נחמיה שדות ים שובל שומרת שלוחות שמיר שניר שער הגולן שער העמקים שפיים שריד תל יוסף תל קציר תלם תמוז יטבתה כפר עציון מגדל עוז ראש צורים`.split(/\s{2,}|\s(?=[א-ת])/).map(norm);
const KIB = new Set(KIBBUTZ);
const YOSH = `אדורה אדם אורנית איתמר אלון מורה אלון שבות אלמוג אלעזר אלפי מנשה אספר אפרת אריאל בית אל בית אריה בית הערבה בית חורון בקעות ברוכין ברקן בת עין גבע בנימין גבעון החדשה גיתית גלגל דולב הר אדר הר ברכה הר גילה חגי חוות יאיר חיננית חלמיש חמדת חרמש חשמונאים טלמון טנא יבנאל יפית יצהר יקיר ירחיב כוכב השחר כוכב יעקב כפר אדומים כפר האורנים כפר עציון כפר תפוח כרמי צור כרמל מבוא דותן מבוא חורון מבואות יריחו מגדל עוז מגדלים מודיעין עילית מכורה מעון מעלה אדומים מעלה אפרים מעלה לבונה מעלה מכמש מעלה עמוס מעלה שומרון מצדות יהודה מצפה יריחו מתתיהו נגוהות נוה דניאל נווה דניאל נופי פרת נופים נוקדים נחליאל נטף נטעים נעלה נעמה נעמ ה נצרים ניל י סוסיה סלעית עופרה עטרת עלי עלי זהב עלמון עמיחי עמנואל ענב עץ אפרים עתניאל פדואל פני חבר פסגות פצאל צופים קדומים קדר קלי ה קריית ארבע קרית ארבע קרית נטפים קרני שומרון רבבה רועי ריחן רימונים רמת גלעד רותם שבי שומרון שדמות מחולה שילה שים ה שלומית שקד תומר תל ציון תלם תקוע חברון גבעת זאב בית אריה עופרים נוה צוף הר שמואל מבוא חמה`.split(/\s(?=[א-ת])/).map(norm);
const YS = new Set(YOSH);
const DRUZE = new Set(['דאלית אל כרמל', 'עספיא', 'ירכא', 'ג ולס', 'אבו סנאן', 'כסרא סמיע', 'חורפיש', 'בית ג ן', 'יאנוח ג ת', 'פקיעין', 'מג דל שמס', 'מסעדה', 'בוקעאתא', 'עין קנייא', 'סאג ור', 'עין אל אסד', 'ג ת', 'ג וליס'].map(norm));
const NEGEV_BEDOUIN = new Set(['רהט', 'תל שבע', 'כסיפה', 'ערערה בנגב', 'חורה', 'לקיה', 'שגב שלום', 'ביר הדאג', 'קצר א סר', 'אבו קרינאת', 'אבו תלול', 'אל סייד', 'מכחול', 'דריג את', 'מולדה', 'תראבין א צאנע', 'אום בטין', 'אבו קרינאת יישוב'].map(norm));

const PROFILE = r => {
  if (r.ar >= 50) return 'ערבי';
  if (r.h >= 45) return 'חרדי';
  if (r.rz >= 35) return 'דתי-לאומי';
  if (r.co >= 55) return 'ימין';
  if (r.lab >= 30) return 'שמאל';
  if (r.op >= 50) return 'מרכז-שמאל';
  return r.co >= r.op ? 'ימין' : 'מרכז-שמאל';
};

const out = {}; const unmatched = [];
for (const [, name] of SNAP.rows) {
  const r = byNorm.get(norm(name)) || byTight.get(tight(name)) || byNorm.get(norm(name.replace(/\(.*?\)/, ''))) || null;
  const old = CLS555[name];
  const rec = { s: 'לא מסווג', t: 'כפר / יישוב', p: null, b: 0, v: null, co: null, op: null, ar: null, ot: null, h: null, rz: null, lab: null, est: 1 };
  if (r) Object.assign(rec, { b: r.bzb, v: r.t, co: r.co, op: r.op, ar: r.ar, ot: r.ot, h: r.h, rz: r.rz, lab: r.lab, p: PROFILE(r) });
  if (old) {
    rec.s = old[0]; rec.t = old[1]; rec.est = 0;
    if (!r) { rec.b = old[3] || 0; rec.v = old[4]; rec.co = old[5]; rec.op = old[6]; rec.ar = old[7]; if (rec.co != null) rec.ot = Math.max(0, 100 - rec.co - rec.op - rec.ar); }
    if (!rec.p && rec.co != null) rec.p = PROFILE({ ar: rec.ar, h: 0, rz: 0, co: rec.co, lab: 0, op: rec.op });
  } else if (r) {
    const n = norm(name);
    const arab = r.ar >= 50;
    if (arab) {
      const bed = /שבט/.test(name) || NEGEV_BEDOUIN.has(n) || /^אבו |^אל |^א /.test(n) && r.bzb < 8000 && [...NEGEV_BEDOUIN].some(x => n.includes(x.split(' ')[0]));
      rec.s = DRUZE.has(n) ? 'דרוזי' : bed ? 'בדואי (נגב)' : 'ערבי';
      rec.t = /שבט/.test(name) ? 'שבט בדואי' : r.bzb >= 15000 ? 'עיר' : 'כפר / יישוב';
    } else {
      rec.s = 'יהודי';
      rec.t = rec.p === 'חרדי' && r.bzb >= 2500 ? 'חרדי' : KIB.has(n) ? 'קיבוץ' : YS.has(n) ? 'יו"ש' : r.bzb >= 12000 ? 'עיר' : 'מושב / קהילתי';
    }
  } else unmatched.push(name);
  if (!rec.p) rec.p = 'ללא נתון';
  out[name] = rec;
}
fs.writeFileSync(path.join(root, 'data/cls.json'), JSON.stringify(out));
const count = k => Object.values(out).reduce((m, r) => (m[r[k]] = (m[r[k]] || 0) + 1, m), {});
console.log('localities', Object.keys(out).length, 'unmatched', unmatched.length, unmatched.slice(0, 40));
console.log('sector', count('s')); console.log('type', count('t')); console.log('profile', count('p'));
console.log('new (est)', Object.values(out).filter(r => r.est).length);

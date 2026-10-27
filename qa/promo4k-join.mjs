// Joins qa/promo4k/scene-N/f%04d.png (30fps, 2160x3840) into qa/promo-4k.mp4: crossfades, soft pad, fades.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const D = 'qa/promo4k', XF = 0.45, FPS = 30;
const durs = [1, 2, 3, 4, 5, 6, 7].map(n => fs.readdirSync(`${D}/scene-${n}`).filter(f => f.endsWith('.png')).length / FPS);
const trans = ['fade', 'slideleft', 'fade', 'circleopen', 'slideleft', 'fade'];
const inputs = durs.flatMap((_, i) => ['-framerate', String(FPS), '-i', `${D}/scene-${i + 1}/f%04d.png`]);
let f = durs.map((_, i) => `[${i}:v]format=yuv420p,setsar=1[v${i + 1}]`).join(';') + ';';
let off = 0, prev = 'v1';
for (let i = 1; i < durs.length; i++) { off += durs[i - 1] - XF; const o = `x${i}`; f += `[${prev}][v${i + 1}]xfade=transition=${trans[i - 1]}:duration=${XF}:offset=${off.toFixed(3)}[${o}];`; prev = o; }
const total = off + durs[durs.length - 1];
f += `[${prev}]fade=t=in:st=0:d=0.5,fade=t=out:st=${(total - 0.6).toFixed(3)}:d=0.6[vout];`;
const n = durs.length; const freqs = [174.61, 220, 261.63, 329.63];
const audioIn = freqs.flatMap(fr => ['-f', 'lavfi', '-i', `sine=frequency=${fr}:duration=${total.toFixed(3)}`]);
f += freqs.map((_, i) => `[${n + i}:a]`).join('') + `amix=inputs=4:normalize=0,lowpass=f=900,tremolo=f=0.35:d=0.35,volume=0.16,afade=t=in:st=0:d=1.2,afade=t=out:st=${(total - 1.5).toFixed(3)}:d=1.5[aout]`;
const outFile = process.argv[2] || 'qa/promo-4k.mp4';
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, ...audioIn, '-filter_complex', f, '-map', '[vout]', '-map', '[aout]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-level', '5.1', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-t', total.toFixed(3), outFile], { stdio: 'inherit' });
console.log('durations', durs.map(d => d.toFixed(2)).join(' '), 'total', total.toFixed(2) + 's');
console.log(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'csv=p=0', outFile]).toString());

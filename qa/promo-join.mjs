// Joins qa/promo/scene-1..7.webm into qa/promo.mp4 (1080x1920 vertical, 30fps): crossfades, a soft synthesized pad, fades.
import { execFileSync } from 'node:child_process';
const D = 'qa/promo', XF = 0.45;
const durs = [2.2, 2.4, 4.2, 2.6, 2.6, 2.6, 2.6];
const trans = ['fade', 'slideleft', 'fade', 'circleopen', 'slideleft', 'fade'];
const inputs = durs.flatMap((_, i) => ['-i', `${D}/scene-${i + 1}.webm`]);
// each recording starts before the page is ready: keep the LAST d seconds of every scene
const lens = durs.map((_, i) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', `${D}/scene-${i + 1}.webm`]).toString());
let f = durs.map((d, i) => `[${i}:v]trim=start=${Math.max(0, lens[i] - d).toFixed(3)},setpts=PTS-STARTPTS,fps=30,scale=1080:1920:flags=lanczos,format=yuv420p[v${i + 1}]`).join(';') + ';';
let off = 0, prev = 'v1';
for (let i = 1; i < durs.length; i++) { off += durs[i - 1] - XF; const o = `x${i}`; f += `[${prev}][v${i + 1}]xfade=transition=${trans[i - 1]}:duration=${XF}:offset=${off.toFixed(3)}[${o}];`; prev = o; }
const total = off + durs[durs.length - 1];
f += `[${prev}]fade=t=in:st=0:d=0.5,fade=t=out:st=${(total - 0.6).toFixed(3)}:d=0.6[vout];`;
const n = durs.length; const freqs = [174.61, 220, 261.63, 329.63];
const audioIn = freqs.flatMap(fr => ['-f', 'lavfi', '-i', `sine=frequency=${fr}:duration=${total.toFixed(3)}`]);
f += freqs.map((_, i) => `[${n + i}:a]`).join('') + `amix=inputs=4:normalize=0,lowpass=f=900,tremolo=f=0.35:d=0.35,volume=0.16,afade=t=in:st=0:d=1.2,afade=t=out:st=${(total - 1.5).toFixed(3)}:d=1.5[aout]`;
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, ...audioIn, '-filter_complex', f, '-map', '[vout]', '-map', '[aout]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-t', total.toFixed(3), 'qa/promo.mp4'], { stdio: 'inherit' });
console.log('total', total.toFixed(2) + 's');
console.log(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'csv=p=0', 'qa/promo.mp4']).toString());

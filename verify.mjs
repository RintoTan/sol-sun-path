import { readFileSync } from 'node:fs';

const html = readFileSync('./index.html', 'utf8');
const a = html.indexOf('var RAD=');
const b = html.indexOf('3 · 状态');
if (a < 0 || b < 0) throw new Error('could not locate math section');
const math = html.slice(a, html.lastIndexOf('/* =====', b));

const tests = `
function t(label, got, want, tol, unit) {
  const d = got - want;
  const ok = Math.abs(d) <= tol;
  const s = v => (v>0?'+':v<0?'-':'') + Math.abs(v).toFixed(unit==='s'?0:2);
  console.log((ok?'  PASS  ':'  FAIL  ') + label.padEnd(46) +
    ' got=' + (typeof got==='number'? got.toFixed(unit==='s'?3:4) : got) +
    '  want=' + want + '  delta=' + s(d) + (unit||''));
  if (!ok) process.exitCode = 1;
}
console.log('--- A. Shanghai 2026-10-14 vs timeanddate.com (authoritative reference) ---');
const sh = dayInfo(2026,10,14,31.2304,121.4737,8);
t('sunrise  (ref 05:55)', sh.rise, 5*60+55, 1.6, 'min');
t('sunset   (ref 17:23)', sh.set,  17*60+23, 1.6, 'min');
t('daylength(ref 11:28:02)', sh.len*60, 11*3600+28*60+2, 120, 's');
t('solar noon (ref 11:40)', sh.noon, 11*60+40, 0.5, 'min');
t('noon altitude (ref 50.7)', sh.noonAlt, 50.7, 0.3, 'deg');
t('civil dawn (ref 05:31)', sh.civ[0], 5*60+31, 1.6, 'min');
t('civil dusk (ref 17:48)', sh.civ[1], 17*60+48, 1.6, 'min');
t('nautical dawn (ref 05:03)', sh.nau[0], 5*60+3, 1.6, 'min');
t('nautical dusk (ref 06:16pm)', sh.nau[1], 18*60+16, 1.6, 'min');
t('astronomical dawn (ref 04:35)', sh.ast[0], 4*60+35, 1.6, 'min');
t('sunrise azimuth (ref 99)', sh.riseAz, 99, 1.0, 'deg');
t('sunset azimuth (ref 261)', sh.setAz, 261, 1.0, 'deg');

console.log('--- B. Instant check: 2026-10-14 13:18:31 local, ref alt 44.13 / az 215.02 ---');
const p = sunAt(13*60+18+31/60, julian(2026,10,14,0), 31.2304, 121.4737, 8);
t('altitude (ref 44.13)', p.alt, 44.13, 0.2, 'deg');
t('azimuth  (ref 215.02)', p.az, 215.02, 0.3, 'deg');

console.log('--- C. Physical invariants ---');
const eq = dayInfo(2026,10,14,0,0,0);
t('equator daylength ~ 12h (Oct)', eq.len, 720, 8, 'min');
const eqJun = dayInfo(2026,6,21,0,0,0);
const eqDec = dayInfo(2026,12,21,0,0,0);
t('equator daylength ~ 12h (Jun)', eqJun.len, 720, 8, 'min');
t('equator daylength ~ 12h (Dec)', eqDec.len, 720, 8, 'min');
const northJun = dayInfo(2026,6,21,31.2304,121.4737,8);
const northDec = dayInfo(2026,12,21,31.2304,121.4737,8);
t('Shanghai Jun 21 > Oct 14 (summer longer)', northJun.len > sh.len ? 1 : 0, 1, 0);
t('Shanghai Dec 21 < Oct 14 (winter shorter)', northDec.len < sh.len ? 1 : 0, 1, 0);
t('Dec 21 daylength ~ 10h07', northDec.len, 10*60+7, 4, 'min');
const syd = dayInfo(2026,12,21,-33.8688,151.2093,11);
t('Sydney Dec 21 is the LONG day (~14h25)', syd.len, 14*60+25, 6, 'min');
t('Sydney Dec 21 is longer than Shanghai Dec 21', syd.len > northDec.len ? 1 : 0, 1, 0);
const shDecNoon = northDec.noonAlt, shJunNoon = northJun.noonAlt;
t('Shanghai noon alt Jun > Dec', shJunNoon > shDecNoon ? 1 : 0, 1, 0);
t('Shanghai Jun noon alt ~ 82.1', shJunNoon, 82.1, 0.4, 'deg');

console.log('--- D. Polar cases ---');
const troJun = dayInfo(2026,6,21,69.6492,18.9553,1);
const troDec = dayInfo(2026,12,21,69.6492,18.9553,1);
t('Tromso Jun 21 polar day (1440)', troJun.state==='polar-day'?1440:0, 1440, 0);
t('Tromso Dec 21 polar night (0)', troDec.state==='polar-night'?0:1, 0, 0);
const norJun = dayInfo(2026,6,21,89.9,0,0);
t('lat 89.9N Jun 21 polar day', norJun.state==='polar-day'?1440:0, 1440, 0);
const norDec = dayInfo(2026,12,21,89.9,0,0);
t('lat 89.9N Dec 21 polar night', norDec.state==='polar-night'?0:1, 0, 0);
const exactJun = dayInfo(2026,6,21,90,0,0);
t('exact 90N Jun 21 stays polar day (no NaN)', exactJun.state==='polar-day'?1440:0, 1440, 0);
const exactDec = dayInfo(2026,12,21,90,0,0);
t('exact 90N Dec 21 stays polar night', exactDec.state==='polar-night'?0:1, 0, 0);
const mcJun = dayInfo(2026,6,21,-77.8419,166.6863,13);
t('McMurdo Jun 21 polar night', mcJun.state==='polar-night'?0:1, 0, 0);

console.log('--- E. Solar noon is due south/north ---');
const noonAz = sunAt(sh.noon, julian(2026,10,14,0), 31.2304, 121.4737, 8).az;
t('Shanghai noon azimuth ~ 180 (due south)', noonAz, 180, 0.6, 'deg');
const noonAzS = sunAt(syd.noon, julian(2026,12,21,0), -33.8688, 151.2093, 11).az;
t('Sydney noon azimuth ~ 0/360 (due north)', Math.min(noonAzS, 360-noonAzS), 0, 0.6, 'deg');

console.log('--- F. Continuity / sanity of the 24h loop ---');
let maxJump = 0;
for (let mn = 0; mn < 1440; mn += 1) {
  const a1 = sunAt(mn, julian(2026,10,14,0), 31.2304, 121.4737, 8).az;
  const a2 = sunAt(mn+1, julian(2026,10,14,0), 31.2304, 121.4737, 8).az;
  let d = Math.abs(a2-a1); if (d > 180) d = 360-d;
  if (d > maxJump) maxJump = d;
}
t('max azimuth step per minute < 2deg', maxJump, 0.4, 1.6, 'deg');
`;

new Function(math + tests)();

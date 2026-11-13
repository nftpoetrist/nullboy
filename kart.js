(() => {
'use strict';
/* =====================================================================
   NULL KART — cart 03. Pseudo-3D kart racer for the pocket LCD.
   8 racers · 3 laps · drift + turbo · rocket / shield / trap / turbo
   ===================================================================== */
let A, ctx, W, H, TOP, VH, C;
const SEG = 200, ROADW = 1500, CAMH = 1000, DEPTH = 0.84, PZ = CAMH * DEPTH, DRAW = 70, LAPS = 3, MAXS = 104;

const CHARS = [
  { n: 'NULL',    kart: '#3f5486', sp: 3, ac: 3, hd: 4, lvl: 1, tag: 'HEADPHONES ON' },
  { n: 'VISOR',   kart: '#6a2a8a', sp: 4, ac: 2, hd: 4, lvl: 1, tag: 'SEES IN RGB' },
  { n: 'GOGGLES', kart: '#a8322e', sp: 5, ac: 2, hd: 2, lvl: 1, tag: 'LATE FOR THE TRAIN' },
  { n: 'XED',     kart: '#6f6d68', sp: 2, ac: 5, hd: 3, lvl: 1, tag: 'OUT COLD, STILL FAST' },
  { n: 'FUSE',    kart: '#ff6a2b', sp: 3, ac: 4, hd: 3, lvl: 1, tag: 'SHORT TEMPER' },
  { n: 'STATIC',  kart: '#58c59a', sp: 4, ac: 3, hd: 3, lvl: 2, tag: 'NO SIGNAL' },
  { n: 'MOTH',    kart: '#d8c8a8', sp: 2, ac: 4, hd: 5, lvl: 3, tag: 'DRAWN TO LAMPS' },
  { n: 'HALO',    kart: '#e8c04a', sp: 5, ac: 3, hd: 3, lvl: 4, tag: 'SAVE FILE 00' }
];
const PAINTS = [null, '#3f5486', '#a8322e', '#58c59a', '#ff6a2b', '#6a2a8a', '#e8c04a', '#1d1d1a'];
const PAINT_LV = [1, 1, 1, 1, 2, 3, 4, 5];
const PAINT_N = ['STOCK', 'DENIM', 'CONSOLE RED', 'MINT', 'MEMORY CARD', 'VISOR', 'LAMP', 'VOID'];
const TRACKS = [
  { n: 'NEON AVENUE', sky: '#d8d6cf', sky2: '#c6c3bb', bld: '#aaa79f', g1: '#c6c3bb', g2: '#bab7af', r1: '#6f6d68', r2: '#686661', acc: '#ff6a2b', lit: false,
    plan: [[40, 0, 0], [50, 3, 0], [30, 0, 20], [60, -4, -20], [40, 0, 0], [50, 5, 30], [40, -2, -30], [70, -5, 0], [40, 0, 40], [60, 3, -40], [50, 0, 0]] },
  { n: 'LAVA LAMP PASS', sky: '#f2d2a8', sky2: '#eab98a', bld: '#c98a62', g1: '#d8b48a', g2: '#cda67c', r1: '#6f5d58', r2: '#665550', acc: '#e0352b', lit: false,
    plan: [[30, 0, 0], [50, -3, 50], [40, 4, -50], [30, 0, 60], [70, 6, -30], [40, 0, -30], [50, -6, 40], [40, 3, 0], [60, -4, -40], [40, 0, 60], [60, 5, -60], [40, 0, 0]] },
  { n: 'MIDNIGHT LINE', sky: '#1d1d1a', sky2: '#2a2733', bld: '#3a3745', g1: '#3a3745', g2: '#33303d', r1: '#8a8892', r2: '#807e88', acc: '#ffb657', lit: true,
    plan: [[30, 0, 0], [40, 6, 0], [30, -6, 20], [50, 4, -20], [30, -5, 0], [60, 0, 50], [50, 7, -50], [40, -7, 0], [40, 5, 30], [50, -4, -30], [60, 6, 0], [40, -3, 0], [40, 0, 0]] }
];
const ITEMS = ['ROCKET', 'SHIELD', 'TRAP', 'TURBO'];
const PTS = [10, 8, 6, 5, 4, 3, 2, 1];

/* ----------------------------- save ----------------------------- */
let save;
function load() {
  save = A.store.get('kart', null) || {};
  save.xp = save.xp || 0; save.races = save.races || 0; save.wins = save.wins || 0; save.podiums = save.podiums || 0;
  save.best = save.best || {}; save.char = save.char || 0; save.paint = save.paint || 0; save.season = save.season || {};
}
const persist = () => A.store.set('kart', save);
const level = () => 1 + Math.floor(save.xp / 150);
const fmt = f => { if (!f && f !== 0) return '-:--.--'; const cs = Math.round(f * 100 / 60); return ((cs / 6000) | 0) + ':' + String(((cs / 100) | 0) % 60).padStart(2, '0') + '.' + String(cs % 100).padStart(2, '0'); };

/* ---------------------------- sprites ---------------------------- */
function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
/* head silhouettes in the Nulls language: flat black shape, pale eyes, one accent */
function head(g, cx, cy, i, front) {
  const p = (x, y, w, h, c) => { g.fillStyle = c || '#0b0b0d'; g.fillRect(cx + x, cy + y, w || 1, h || 1); };
  const disc = (r, c) => { for (let y = -r; y <= r; y++) { const hw = Math.floor(Math.sqrt(r * r + r * 0.8 - y * y)); p(-hw, y, hw * 2 + 1, 1, c); } };
  const cr = '#f2efe8';
  if (i === 5) { p(-6, -6, 13, 12); p(-4, -10, 1, 4); p(4, -10, 1, 4); p(-5, -11); p(5, -11); }
  else disc(6);
  switch (i) {
    case 0: p(-6, -9, 2, 4); p(-5, -11, 1, 2); p(-1, -10, 3, 4); p(0, -12, 1, 2); p(5, -9, 2, 4); p(5, -11, 1, 2); p(-8, -2, 2, 5, '#e0352b'); p(7, -2, 2, 5, '#e0352b'); break;
    case 1: p(-6, -11, 3, 6); p(-5, -13, 2, 2); p(4, -11, 3, 6); p(4, -13, 2, 2); p(-5, -10, 1, 3, '#e2b89a'); p(5, -10, 1, 3, '#e2b89a'); break;
    case 2: p(-9, -8, 4, 2); p(-10, -10, 2, 2); p(6, -8, 4, 2); p(9, -10, 2, 2); p(-8, -8, 1, 1, cr); p(8, -8, 1, 1, cr); break;
    case 3: [[-7, -5], [-5, -8], [-2, -10], [2, -10], [5, -8], [7, -5], [-8, -1], [8, -1]].forEach(([x, y]) => { p(x, y, 2, 2); p(x + (x < 0 ? -1 : 1), y - 1, 1, 1, cr); }); break;
    case 4: p(-5, -8, 3, 2); p(-7, -10, 2, 2); p(-9, -12, 2, 2, '#ff6a2b'); p(-8, -13, 1, 1, cr); break;
    case 6: p(-9, -4, 3, 9); p(7, -4, 3, 9); p(-9, 5, 2, 2); p(8, 5, 2, 2); break;
    case 7: p(-5, -11, 11, 1, '#e8c04a'); p(-6, -10, 1, 1, '#e8c04a'); p(6, -10, 1, 1, '#e8c04a'); p(-5, -9, 11, 1, '#e8c04a'); break;
  }
  if (!front) {
    if (i === 1) { p(-7, -1, 15, 2, '#8e97c4'); p(-8, -2, 2, 4, cr); }
    if (i === 2) p(-6, -1, 13, 2, cr);
    return;
  }
  switch (i) {
    case 0: p(-4, -1, 2, 1, cr); p(-3, 0, 2, 1, cr); p(3, -1, 2, 1, cr); p(2, 0, 2, 1, cr); break;
    case 1: ['#e0352b', '#ff6a2b', '#e8c04a', '#58c59a', '#3a56c5', '#6a2a8a'].forEach((c, k) => p(-6 + k * 2, -2, 3, 4, c)); p(-3, -1, 2, 2, cr); p(2, -1, 2, 2, cr); p(-8, -2, 2, 4, cr); break;
    case 2: p(-6, -3, 5, 5, cr); p(1, -3, 5, 5, cr); p(-5, -2, 3, 3, '#ff6a2b'); p(2, -2, 3, 3, '#ff6a2b'); p(-4, -1, 1, 1, '#e0352b'); p(3, -1, 1, 1, '#e0352b'); break;
    case 3: [[-4, -1], [2, -1]].forEach(([x, y]) => { p(x, y, 1, 1, cr); p(x + 2, y, 1, 1, cr); p(x + 1, y + 1, 1, 1, cr); p(x, y + 2, 1, 1, cr); p(x + 2, y + 2, 1, 1, cr); }); break;
    case 4: p(-4, 0, 1, 2, cr); p(-3, 2, 2, 1, cr); p(-1, 0, 1, 2, cr); p(1, 0, 1, 2, cr); p(2, 2, 2, 1, cr); p(4, 0, 1, 2, cr); break;
    case 5: p(-4, -4, 9, 8, '#58c59a'); p(-3, 0, 2, 1); p(-1, -1, 2, 1); p(1, 0, 2, 1); p(3, -1, 1, 1); break;
    case 6: p(-4, 0, 3, 1, cr); p(2, 0, 3, 1, cr); p(-4, 1, 3, 1, '#8e97c4'); p(2, 1, 3, 1, '#8e97c4'); break;
    case 7: p(-2, -2, 5, 5, cr); p(0, -1, 2, 3); break;
  }
}
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), c = k => Math.max(0, Math.min(255, Math.round(((n >> k) & 255) * f))); return '#' + [16, 8, 0].map(k => c(k).toString(16).padStart(2, '0')).join(''); };
function mkRear(i, color) {
  const c = cvs(26, 26), g = c.getContext('2d'), p = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  p(8, 13, 10, 5, '#0b0b0d');                                    // seat
  head(g, 13, 9, i, false);
  p(4, 16, 18, 7, color); p(4, 16, 18, 1, shade(color, 1.35)); p(4, 21, 18, 2, shade(color, 0.62));
  p(9, 17, 8, 3, shade(color, 0.8)); p(11, 22, 4, 2, '#f2efe8');  // engine cover, plate
  p(0, 15, 5, 10, '#0b0b0d'); p(21, 15, 5, 10, '#0b0b0d');        // wheels
  p(1, 17, 3, 1, '#6f6d68'); p(1, 20, 3, 1, '#6f6d68'); p(22, 17, 3, 1, '#6f6d68'); p(22, 20, 3, 1, '#6f6d68');
  p(6, 23, 2, 2, '#6f6d68'); p(18, 23, 2, 2, '#6f6d68');          // exhausts
  return c;
}
function mkFace(i) {
  const c = cvs(22, 22), g = c.getContext('2d');
  g.fillStyle = CHARS[i].kart; g.fillRect(4, 18, 14, 4); g.fillStyle = shade(CHARS[i].kart, 1.3); g.fillRect(4, 18, 14, 1);
  head(g, 11, 12, i, true);
  return c;
}
function mkProp(kind, t) {
  if (kind === 0) { const c = cvs(10, 44), g = c.getContext('2d'); g.fillStyle = '#1d1d1a'; g.fillRect(4, 6, 2, 38); g.fillRect(2, 4, 8, 3); g.fillStyle = t.acc; g.fillRect(6, 7, 3, 2); return c; }
  if (kind === 1) { const c = cvs(36, 30), g = c.getContext('2d'); g.fillStyle = '#1d1d1a'; g.fillRect(0, 0, 36, 18); g.fillRect(6, 18, 2, 12); g.fillRect(28, 18, 2, 12); g.fillStyle = '#f2efe8'; g.fillRect(2, 2, 32, 14); g.fillStyle = '#1d1d1a'; g.font = '700 8px Silkscreen, monospace'; g.textAlign = 'center'; g.fillText('NULLS', 18, 12); g.fillStyle = t.acc; g.fillRect(2, 14, 32, 2); return c; }
  if (kind === 2) { const c = cvs(30, 56), g = c.getContext('2d'); g.fillStyle = t.lit ? '#12101a' : '#6f6d68'; g.fillRect(0, 0, 30, 56); g.fillStyle = t.lit ? '#ffb657' : '#c6c3bb'; for (let y = 4; y < 50; y += 8) for (let x = 4; x < 26; x += 8) if ((x * 7 + y * 3) % 5) g.fillRect(x, y, 4, 5); return c; }
  const c = cvs(20, 12), g = c.getContext('2d'); g.fillStyle = '#1d1d1a'; g.fillRect(0, 0, 20, 12); g.fillStyle = t.acc; for (let k = 0; k < 3; k++) { g.fillRect(2 + k * 6, 5, 1, 2); g.fillRect(3 + k * 6, 3, 1, 6); g.fillRect(4 + k * 6, 1, 1, 10); } return c;
}
function mkBox() { const c = cvs(16, 16), g = c.getContext('2d'); g.fillStyle = '#1d1d1a'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#f2efe8'; g.fillRect(1, 1, 14, 14); g.fillStyle = '#ff6a2b'; g.fillRect(5, 3, 6, 2); g.fillRect(9, 5, 2, 3); g.fillRect(7, 7, 3, 2); g.fillRect(7, 11, 2, 2); return c; }
function mkTrap() { const c = cvs(14, 14), g = c.getContext('2d'); g.fillStyle = '#0b0b0d'; for (let y = -5; y <= 5; y++) { const hw = Math.floor(Math.sqrt(30 - y * y)); g.fillRect(7 - hw, 8 + y, hw * 2, 1); } g.fillRect(3, 2, 3, 2); g.fillStyle = '#ff6a2b'; g.fillRect(1, 0, 2, 2); g.fillStyle = '#f2efe8'; g.fillRect(4, 7, 1, 2); g.fillRect(8, 7, 1, 2); return c; }
function mkRocket() { const c = cvs(10, 12), g = c.getContext('2d'); g.fillStyle = '#e0352b'; g.fillRect(3, 0, 4, 8); g.fillStyle = '#f2efe8'; g.fillRect(3, 2, 4, 2); g.fillStyle = '#1d1d1a'; g.fillRect(1, 5, 2, 4); g.fillRect(7, 5, 2, 4); g.fillStyle = '#ffb657'; g.fillRect(3, 8, 4, 4); return c; }
let FACE = [], REAR = [], BOX, TRAP, ROCKET, PROPS = [];

/* ----------------------------- track ----------------------------- */
let segs = [], trackLen = 0, T = TRACKS[0], ti = 0;
function buildTrack(i) {
  ti = i; T = TRACKS[i]; segs = [];
  const ease = (a, b, t) => a + (b - a) * ((-Math.cos(t * Math.PI) / 2) + 0.5);
  let y = 0;
  T.plan.forEach(([n, curve, hill], pi) => {
    const y0 = y, y1 = pi === T.plan.length - 1 ? 0 : y + hill * SEG * 0.5, en = Math.floor(n / 4), le = Math.floor(n / 4), tot = n;
    for (let k = 0; k < tot; k++) {
      const cv = Math.max(-4.5, Math.min(4.5, curve * 0.82));
      const c = k < en ? cv * (k / en) : k >= tot - le ? cv * ((tot - k) / le) : cv;
      const ya = ease(y0, y1, k / tot), yb = ease(y0, y1, (k + 1) / tot), idx = segs.length;
      segs.push({ i: idx, y1: ya, y2: yb, curve: c, alt: (Math.floor(idx / 3) % 2) === 0, props: [] });
    }
    y = y1;
  });
  trackLen = segs.length * SEG;
  PROPS = [0, 1, 2, 3].map(k => mkProp(k, T));
  for (let n = 6; n < segs.length; n += 7) {
    const s = segs[n], side = (n / 7) % 2 ? 1 : -1, c = Math.abs(s.curve) > 2.5;
    const kind = c ? 3 : [0, 2, 0, 1, 0, 2][(n / 7 | 0) % 6];
    s.props.push({ img: kind, x: c ? (s.curve > 0 ? -1.3 : 1.3) : side * (kind === 2 ? 2.7 + ((n * 13) % 5) * 0.25 : kind === 1 ? 1.75 : 1.3), w: c ? 420 : 0, f: c && s.curve > 0 });
    if (!c && n % 3 === 0) s.props.push({ img: 2, x: -side * (3.1 + (n % 4) * 0.3), w: 0 });
  }
}
const segAt = pos => segs[Math.floor(((pos % trackLen) + trackLen) % trackLen / SEG) % segs.length];

/* ------------------------------ race ------------------------------ */
let st = 'menu', mi = 0, sel = 0, tsel = 0, psel = 0, flow = false, t = 0, raceT = 0, cd = 0, pauseI = 0;
let racers = [], P = null, boxes = [], traps = [], rockets = [], sparks = [], order = [], finOrder = 0, skyOff = 0, msg = '', msgT = 0, result = null, warn = 0;

function startRace() {
  buildTrack(tsel);
  const mine = save.char, col = PAINTS[save.paint] || CHARS[mine].kart;
  REAR = CHARS.map((c, i) => mkRear(i, i === mine ? col : c.kart));
  const others = CHARS.map((_, i) => i).filter(i => i !== mine).sort(() => Math.random() - 0.5);
  racers = [];
  others.concat([mine]).forEach((ci, g) => {
    const isP = ci === mine, c = CHARS[ci];
    racers.push({ ci, isP, x: (g % 2 ? 0.42 : -0.42), pos: trackLen - (g + 1) * SEG * 1.1, lap: -1, speed: 0, spin: 0, shield: 0, boost: 0, item: -1, itemT: 0,
      fin: false, finT: 0, place: 0, steer: 0, surf: 0, driftLock: false, lane: (g % 2 ? 0.42 : -0.42), laneT: 60 + Math.random() * 200, skill: (Math.random() - 0.5) * 0.05, lapStart: 0, bestLap: 0,
      max: MAXS * (0.9 + c.sp * 0.022), acc: 0.5 + c.ac * 0.12, hd: 0.8 + c.hd * 0.07, drift: 0, charge: 0, hop: 0 });
  });
  P = racers[racers.length - 1];
  boxes = []; [0.14, 0.38, 0.62, 0.86].forEach(f => [-0.55, 0, 0.55].forEach(x => boxes.push({ pos: Math.floor(segs.length * f) * SEG + SEG / 2, x, cool: 0 })));
  order = racers.slice().sort((a, b) => total(b) - total(a));
  traps = []; rockets = []; sparks = []; finOrder = 0; raceT = 0; cd = 200; skyOff = 0; msg = ''; msgT = 0; result = null; warn = 0;
  st = 'count';
}
const total = r => r.lap * trackLen + r.pos;
function fwd(a, b) { let d = (b - a) % trackLen; if (d < -trackLen / 2) d += trackLen; if (d > trackLen / 2) d -= trackLen; return d; }

function spinOut(r, by) {
  if (r.spin > 0 || r.fin) return;
  if (r.shield > 0) { r.shield = 0; if (r.isP) { say('SHIELD BROKE'); A.sfx.hurt(); } return; }
  r.spin = 70; r.drift = 0; r.charge = 0; r.boost = 0; r.steer = 0;
  if (r.isP) { A.sfx.boom(); say(by || 'SPUN OUT'); }
}
let sub = '';
const HOW = ['PRESS SPACE (A) TO FIRE', 'PRESS SPACE (A) TO ACTIVATE', 'PRESS SPACE (A) TO DROP IT', 'PRESS SPACE (A) TO BOOST'];
function say(m, s2, dur) { msg = m; sub = s2 || ''; msgT = dur || 90; }
function useItem(r) {
  const it = r.item; if (it < 0) return; r.item = -1;
  if (it === 0) {
    const ahead = order[order.indexOf(r) - 1];
    rockets.push({ pos: r.pos, tot: total(r), x: r.x, owner: r, target: ahead && !ahead.fin ? ahead : null, life: 260 });
    if (r.isP) { A.sfx.spin(); say(ahead ? 'ROCKET FIRED' : 'NO TARGET', ahead ? 'CHASING ' + CHARS[ahead.ci].n : 'NOBODY AHEAD OF YOU'); } else if (ahead === P) { warn = 80; }
  } else if (it === 1) { r.shield = 480; if (r.isP) { A.sfx.shield(); say('SHIELD ON', 'BLOCKS ONE HIT FOR 8 SEC'); } }
  else if (it === 2) { traps.push({ pos: (r.pos - SEG * 1.2 + trackLen) % trackLen, x: r.x, owner: r, arm: 40 }); if (r.isP) { A.sfx.stomp(); say('TRAP DROPPED', 'LEFT BEHIND YOU'); } }
  else { r.boost = 100; if (r.isP) { A.sfx.bounce(); say('TURBO', 'ITEM BOOST'); } }
}

function stepRacer(r) {
  const s = segAt(r.pos), sp = r.speed / MAXS;
  if (r.spin > 0) { r.spin--; r.speed *= 0.965; }
  else if (r.isP && !r.fin) {
    // steering: eased wheel, speed-sensitive authority, cornering force that grows with speed squared
    const want = (A.down.right ? 1 : 0) - (A.down.left ? 1 : 0);
    r.steer += (want - r.steer) * (want ? 0.17 : 0.3);
    if (Math.abs(r.steer) < 0.01) r.steer = 0;
    const auth = 0.027 * r.hd * Math.min(1, sp * 3.5) * (1 - 0.2 * Math.min(1, sp));
    const cent = s.curve * sp * sp * 0.003;                       // +curve bends right, pushes the kart left (outwards)
    if (!A.down.b) r.driftLock = false;
    if (A.down.b && want && sp > 0.45 && !r.drift && !r.driftLock) { r.drift = want; r.charge = 0; r.hop = 8; r.driftLock = true; A.tone(300, 0.08, 'square', 0.08, 500); }
    if (r.drift && (!A.down.b || sp < 0.3)) {
      if (r.charge >= 110) { r.boost = 95; A.sfx.bounce(); say('SUPER TURBO', 'DRIFT BOOST EARNED'); } else if (r.charge >= 50) { r.boost = 55; A.sfx.djump(); say('TURBO', 'DRIFT BOOST EARNED'); }
      r.drift = 0; r.charge = 0;
    }
    if (r.drift) {
      r.charge++; r.x += auth * (r.drift * 0.62 + r.steer * 0.62) - cent * 0.4;
      if (t % 3 === 0) sparks.push({ x: W / 2 + (Math.random() * 40 - 20), y: TOP + VH - 6, vx: -r.drift * (1 + Math.random() * 2), vy: -Math.random() * 1.5, life: 12, c: r.charge >= 110 ? '#e0352b' : r.charge >= 50 ? '#ff6a2b' : C.cream });
    } else r.x += auth * r.steer - cent;
    // surface: road -> rumble strip (mild) -> grass (slow), with a soft barrier instead of a cliff
    const ax = Math.abs(r.x); r.surf = ax > 1.22 ? 2 : ax > 1.0 ? 1 : 0;
    const top = r.boost > 0 ? r.max * (r.surf === 2 ? 1.05 : 1.32) : r.surf === 2 ? r.max * 0.55 : r.surf === 1 ? r.max * 0.9 : r.max;
    if (A.down.down) r.speed -= 2.0; else if (r.speed < top) r.speed += r.acc * (r.boost > 0 ? 2.2 : 1) * (r.surf === 2 ? 0.6 : 1); else r.speed -= r.surf === 2 ? 1.5 : 0.7;
    if (ax > 1.55) { r.x = Math.sign(r.x) * 1.55; r.speed *= 0.985; }
    if (A.hit.a) useItem(r);
    r.x = Math.max(-1.55, Math.min(1.55, r.x));
  } else {
    // AI (and the player's kart on autopilot after the flag)
    const pd = total(r) - total(P);
    let top = (r.max + MAXS * r.skill) * (1 - Math.min(0.14, Math.abs(s.curve) * 0.016)) * (r.fin ? 0.7 : 1);
    if (!r.isP) { if (pd > 2600) top *= 0.93; else if (pd < -3200) top *= 1.07; }
    if (r.boost > 0) top *= 1.3;
    r.speed += r.speed < top ? r.acc * 0.9 : -0.9;
    if (--r.laneT <= 0) { r.lane = (Math.random() * 1.5 - 0.75); r.laneT = 90 + Math.random() * 260; }
    for (const o of racers) if (o !== r) { const d = fwd(r.pos, o.pos); if (d > 0 && d < SEG * 2.2 && Math.abs(o.x - r.x) < 0.3 && o.speed < r.speed) { r.lane = o.x + (o.x > 0 ? -0.55 : 0.55); r.laneT = 60; } }
    for (const tr of traps) { const d = fwd(r.pos, tr.pos); if (d > 0 && d < SEG * 4 && Math.abs(tr.x - r.x) < 0.3 && Math.random() < 0.8) { r.lane = tr.x + (tr.x > 0 ? -0.6 : 0.6); r.laneT = 50; } }
    r.lane = Math.max(-0.8, Math.min(0.8, r.lane));
    r.x += Math.max(-0.02, Math.min(0.02, r.lane - r.x));
    if (!r.fin && !r.isP && r.item >= 0 && --r.itemT <= 0) useItem(r);
  }
  r.speed = Math.max(0, r.speed);
  if (r.boost > 0) r.boost--; if (r.shield > 0) r.shield--; if (r.hop > 0) r.hop--;
  r.pos += r.speed;
  if (r.pos >= trackLen) {
    r.pos -= trackLen; r.lap++;
    if (r.lap > 0) { const lt = raceT - r.lapStart; if (!r.bestLap || lt < r.bestLap) r.bestLap = lt; }
    r.lapStart = raceT;
    if (r.lap >= LAPS && !r.fin) { r.fin = true; r.finT = raceT; r.place = ++finOrder; if (r.isP) { st = 'finish'; cd = 150; A.sfx.clear(); } }
    else if (r.isP && r.lap > 0) { say(r.lap === LAPS - 1 ? 'FINAL LAP' : 'LAP ' + (r.lap + 1)); A.sfx.check(); }
  }
  // pickups & hazards
  if (!r.fin) {
    for (const b of boxes) if (b.cool <= 0 && Math.abs(fwd(r.pos, b.pos)) < SEG * 0.6 && Math.abs(b.x - r.x) < 0.27) {
      b.cool = 40;
      if (r.item < 0) { const lead = order.indexOf(r) === 0; let it = Math.floor(Math.random() * 4); if (lead && it === 0) it = 2; r.item = it; r.itemT = 50 + Math.random() * 220; if (r.isP) { A.sfx.ember(); say('YOU GOT ' + ITEMS[it], HOW[it], 170); } }
    }
    for (let k = traps.length - 1; k >= 0; k--) { const tr = traps[k]; if ((tr.arm <= 0 || tr.owner !== r) && Math.abs(fwd(r.pos, tr.pos)) < SEG * 0.6 && Math.abs(tr.x - r.x) < 0.24) { traps.splice(k, 1); spinOut(r, 'TRAPPED'); } }
  }
}

function stepRace() {
  raceT++;
  order = racers.slice().sort((a, b) => (a.fin && b.fin) ? a.place - b.place : a.fin ? -1 : b.fin ? 1 : total(b) - total(a));
  for (const r of racers) stepRacer(r);
  // bumps with the player
  if (!P.fin) for (const o of racers) if (o !== P) {
    const d = fwd(P.pos, o.pos);
    if (Math.abs(d) < SEG * 0.55 && Math.abs(o.x - P.x) < 0.21) {
      if (d > 0 && P.speed > o.speed) { P.speed = Math.max(o.speed * 0.97, P.speed * 0.9); if (t % 12 === 0) A.sfx.stomp(); }
      if (Math.abs(P.x) < 0.9) P.x += (P.x >= o.x ? 0.012 : -0.012); else o.lane = o.x + (o.x > P.x ? 0.4 : -0.4);
    }
  }
  for (const b of boxes) if (b.cool > 0) b.cool--;
  for (const tr of traps) if (tr.arm > 0) tr.arm--;
  for (let k = rockets.length - 1; k >= 0; k--) {
    const rk = rockets[k]; rk.pos = (rk.pos + 185) % trackLen; rk.tot += 185; rk.life--;
    if (rk.target) { rk.x += Math.max(-0.05, Math.min(0.05, rk.target.x - rk.x)); if (total(rk.target) - rk.tot < SEG) { spinOut(rk.target, 'ROCKET HIT'); if (rk.owner.isP) { A.sfx.boom(); say('DIRECT HIT'); } rockets.splice(k, 1); continue; } }
    if (rk.life <= 0 || rk.target && rk.target.fin) rockets.splice(k, 1);
  }
  for (let k = sparks.length - 1; k >= 0; k--) { const q = sparks[k]; q.x += q.vx; q.y += q.vy; if (--q.life <= 0) sparks.splice(k, 1); }
  skyOff += segAt(P.pos).curve * (P.speed / MAXS) * 0.6;
  if (msgT > 0) msgT--; if (warn > 0) { warn--; if (warn % 16 === 0) A.sfx.tick(); }
  // engine: unpitched low purr (a pitched buzz clashed with the soundtrack and read as a second tune)
  if (t % 6 === 0 && P.speed > 4 && !P.fin) A.noise(0.05, 0.028 + (P.boost > 0 ? 0.02 : 0), 220 + P.speed * 5);
}

function finishRace() {
  order = racers.slice().sort((a, b) => (a.fin && b.fin) ? a.place - b.place : a.fin ? -1 : b.fin ? 1 : total(b) - total(a));
  const place = order.indexOf(P) + 1, pts = PTS[place - 1], lv0 = level();
  order.forEach((r, k) => { const n = r.isP ? 'YOU' : CHARS[r.ci].n; save.season[n] = (save.season[n] || 0) + PTS[k]; });
  save.races++; if (place === 1) save.wins++; if (place <= 3) save.podiums++;
  const xp = pts * 9 + 10; save.xp += xp;
  const key = 't' + ti, newBest = P.bestLap && (!save.best[key] || P.bestLap < save.best[key]);
  if (newBest) save.best[key] = P.bestLap;
  persist();
  result = { place, pts, xp, newBest, lvUp: level() > lv0, time: P.finT };
  st = 'results'; cd = 0;
}

/* ------------------------------ step ------------------------------ */
const MENU = ['RACE', 'RACERS', 'GARAGE', 'RANKING', 'PROFILE', 'EJECT CART'];
function step() {
  t++;
  const h = A.hit, nav = (n, cur, cols) => { let v = cur; if (h.left) v--; if (h.right) v++; if (cols) { if (h.up) v -= cols; if (h.down) v += cols; } v = (v + n) % n; if (v !== cur) A.sfx.sel(); return v; };
  if (st === 'menu') {
    const m = mi; if (h.up) mi = (mi + MENU.length - 1) % MENU.length; if (h.down) mi = (mi + 1) % MENU.length; if (m !== mi) A.sfx.sel();
    if (h.a || h.start) { A.sfx.ok(); flow = mi === 0; if (mi <= 1) { st = 'chars'; sel = save.char; } else if (mi === 2) { st = 'garage'; psel = save.paint; } else if (mi === 3) st = 'rank'; else if (mi === 4) st = 'profile'; else A.exit(); }
    else if (h.select) A.exit();
  } else if (st === 'chars') {
    sel = nav(8, sel, 4);
    if (h.a || h.start) { if (CHARS[sel].lvl > level()) A.sfx.hurt(); else { save.char = sel; persist(); A.sfx.ok(); st = flow ? 'tracks' : 'menu'; } }
    else if (h.b || h.select) st = 'menu';
  } else if (st === 'tracks') {
    const v = tsel; if (h.up) tsel = (tsel + 2) % 3; if (h.down) tsel = (tsel + 1) % 3; if (v !== tsel) A.sfx.sel();
    if (h.a || h.start) { A.sfx.ok(); startRace(); } else if (h.b || h.select) st = 'chars';
  } else if (st === 'garage') {
    psel = nav(8, psel, 0);
    if (h.a || h.start) { if (PAINT_LV[psel] > level()) A.sfx.hurt(); else { save.paint = psel; persist(); A.sfx.ok(); st = 'menu'; } }
    else if (h.b || h.select) st = 'menu';
  } else if (st === 'rank' || st === 'profile') { if (h.a || h.b || h.start || h.select) { A.sfx.sel(); st = 'menu'; } }
  else if (st === 'count') {
    cd--; if (cd === 180 || cd === 120 || cd === 60) A.sfx.tick(); if (cd === 0) { A.tone(880, 0.4, 'square', 0.12); st = 'race'; say('GO'); }
    if (h.select || h.start) { st = 'pause'; pauseI = 0; }
  } else if (st === 'race') {
    if (h.select || h.start) { st = 'pause'; pauseI = 0; A.sfx.sel(); } else stepRace();
  } else if (st === 'pause') {
    if (h.up || h.down) { pauseI ^= 1; A.sfx.sel(); }
    if (h.a || h.start) { A.sfx.ok(); st = pauseI ? 'menu' : (cd > 0 ? 'count' : 'race'); } else if (h.select) st = cd > 0 ? 'count' : 'race';
  } else if (st === 'finish') { stepRace(); if (--cd <= 0) finishRace(); }
  else if (st === 'results') { cd++; if (cd > 40 && (h.a || h.start || h.select)) { A.sfx.ok(); st = 'menu'; mi = 0; } }
}

/* ----------------------------- render ----------------------------- */
const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, Math.ceil(w), Math.ceil(h)); };
function quad(x1, y1, x2, y2, x3, y3, x4, y4, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill(); }
function billboard(img, sc, sx, sy, worldW, clipY, flip) {
  const dw = sc * worldW * W / 2, dh = dw * img.height / img.width, dx = sx - dw / 2, dy = sy - dh;
  const clipH = clipY ? Math.max(0, dy + dh - clipY) : 0;
  if (dw < 1.5 || clipH >= dh || dx > W || dx + dw < 0) return;
  if (flip) { ctx.save(); ctx.translate(Math.round(dx + dw), 0); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, img.width, img.height * (1 - clipH / dh), 0, Math.round(dy), Math.ceil(dw), Math.ceil(dh - clipH)); ctx.restore(); }
  else ctx.drawImage(img, 0, 0, img.width, img.height * (1 - clipH / dh), Math.round(dx), Math.round(dy), Math.ceil(dw), Math.ceil(dh - clipH));
}
function hash(n) { n = Math.imul((n | 0) ^ ((n | 0) >>> 15), 2246822519); n = Math.imul(n ^ (n >>> 13), 3266489917); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }

function drawRoad() {
  const HY = TOP + VH / 2;
  R(0, TOP, W, VH / 2 + 2, T.sky); R(0, HY - 26, W, 28, T.sky2);
  // sun / moon + skyline
  ctx.fillStyle = T.lit ? '#f2efe8' : T.acc; ctx.globalAlpha = T.lit ? 0.9 : 0.55;
  for (let y = -15; y <= 15; y++) { const hw = Math.sqrt(225 - y * y) | 0; if (y < 4 || (y & 3) < 2) ctx.fillRect(238 - hw - ((skyOff * 0.2) | 0) % 1, TOP + 34 + y, hw * 2, 1); }
  ctx.globalAlpha = 1;
  const bw = 22, off = ((skyOff * 1.6) % (bw * 40) + bw * 40) % (bw * 40);
  for (let i = -1; i < W / bw + 2; i++) {
    const id = i + Math.floor(off / bw), hh = 14 + hash(id * 31 + ti * 77) * 44, x = i * bw - (off % bw);
    R(x, HY - hh, bw - 2, hh + 1, T.bld);
    ctx.fillStyle = T.lit ? T.acc : T.sky2;
    for (let wr = 0, wy = HY - hh + 4; wy < HY - 4; wy += 7, wr++) for (let wc = 0, wx = x + 3; wx < x + bw - 6; wx += 6, wc++) if (hash(id * 7919 + wr * 131 + wc * 17) > 0.6) ctx.fillRect(wx | 0, wy | 0, 2, 3);
  }
  R(0, HY, W, VH / 2, T.g1);

  const camPos = ((P.pos - PZ) % trackLen + trackLen) % trackLen, base = segAt(camPos), bp = (camPos % SEG) / SEG;
  const ps = segAt(P.pos), pp = (P.pos % SEG) / SEG, camY = ps.y1 + (ps.y2 - ps.y1) * pp + CAMH, camX = P.x * ROADW;
  let maxy = TOP + VH, x = 0, dx = -(base.curve * bp);
  const bySeg = new Map();
  const put = (pos, o) => { const s = segAt(pos); if (!bySeg.has(s.i)) bySeg.set(s.i, []); bySeg.get(s.i).push(o); };
  for (const r of racers) if (r !== P) put(r.pos, { k: 'car', r, pos: r.pos, x: r.x });
  for (const b of boxes) if (b.cool <= 0) put(b.pos, { k: 'box', pos: b.pos, x: b.x });
  for (const tr of traps) put(tr.pos, { k: 'trap', pos: tr.pos, x: tr.x });
  for (const rk of rockets) put(rk.pos, { k: 'rocket', pos: rk.pos, x: rk.x });
  const vis = [];
  for (let n = 0; n < DRAW; n++) {
    const s = segs[(base.i + n) % segs.length], looped = s.i < base.i, cz = camPos - (looped ? trackLen : 0);
    const z1 = s.i * SEG - cz, z2 = z1 + SEG;
    const sc1 = DEPTH / z1, sc2 = DEPTH / z2;
    const x1 = W / 2 + sc1 * (x - camX) * W / 2, x2 = W / 2 + sc2 * (x + dx - camX) * W / 2;
    const y1 = HY - sc1 * (s.y1 - camY) * VH / 2, y2 = HY - sc2 * (s.y2 - camY) * VH / 2;
    const w1 = sc1 * ROADW * W / 2, w2 = sc2 * ROADW * W / 2;
    x += dx; dx += s.curve;
    if (z1 <= DEPTH * 40) continue;
    vis.push({ s, sc1, sc2, x1, x2, y1, y2, clip: maxy, n });
    if (y2 >= y1 || y2 >= maxy) continue;
    R(0, y2, W, y1 - y2 + 1, s.alt ? T.g1 : T.g2);
    const r1 = w1 / 7, r2 = w2 / 7, rc = s.alt ? C.cream : (T.lit ? T.acc : C.ink);
    quad(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, rc); quad(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, rc);
    quad(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, s.i < 2 ? ((s.i & 1) ? C.cream : C.ink) : (s.alt ? T.r1 : T.r2));
    if (s.i < 2) { const n8 = 8; for (let k = 0; k < n8; k += 2) { const a = -1 + (k + (s.i & 1)) * 2 / n8, b = a + 2 / n8; quad(x1 + w1 * a, y1, x1 + w1 * b, y1, x2 + w2 * b, y2, x2 + w2 * a, y2, (s.i & 1) ? C.ink : C.cream); } }
    else if (s.alt) { const l1 = w1 / 34, l2 = w2 / 34; [-1 / 3, 1 / 3].forEach(f => quad(x1 + w1 * f - l1, y1, x1 + w1 * f + l1, y1, x2 + w2 * f + l2, y2, x2 + w2 * f - l2, y2, C.cream)); }
    maxy = y2;
  }
  // sprites, far to near
  for (let k = vis.length - 1; k >= 0; k--) {
    const v = vis[k], s = v.s;
    for (const pr of s.props) billboard(PROPS[pr.img], v.sc1, v.x1 + v.sc1 * pr.x * ROADW * W / 2, v.y1, pr.w || [140, 620, 700, 420][pr.img], v.clip, pr.f);
    const list = bySeg.get(s.i); if (!list) continue;
    list.sort((a, b) => b.pos - a.pos);
    for (const o of list) {
      const f = (o.pos % SEG) / SEG, sc = v.sc1 + (v.sc2 - v.sc1) * f, sx = v.x1 + (v.x2 - v.x1) * f + sc * o.x * ROADW * W / 2, sy = v.y1 + (v.y2 - v.y1) * f;
      if (o.k === 'car') {
        const r = o.r; billboard(REAR[r.ci], sc, sx, sy, 300, v.clip, r.spin > 0 && ((r.spin >> 2) & 1));
        if (r.shield > 0 && (t >> 2) & 1) { const d = sc * 340 * W / 2; ctx.strokeStyle = C.or; ctx.lineWidth = 1; ctx.strokeRect((sx - d / 2) | 0, (sy - d) | 0, d | 0, d | 0); }
      } else if (o.k === 'box') billboard(BOX, sc, sx, sy - sc * 120 * VH / 2 * (0.5 + 0.3 * Math.sin(t / 9)), 190, v.clip);
      else if (o.k === 'trap') billboard(TRAP, sc, sx, sy, 170, v.clip);
      else billboard(ROCKET, sc, sx, sy - sc * 100 * VH / 2, 120, v.clip);
    }
  }
  // the player's kart
  const steer = (A.down.right ? 1 : 0) - (A.down.left ? 1 : 0), bob = (P.speed > 4 && (t >> 2) & 1) ? 1 : 0, hop = P.hop > 0 ? Math.sin(P.hop / 8 * Math.PI) * 5 : 0;
  const rough = P.surf && P.speed > 8 ? ((t >> 1) & 1) * P.surf : 0;
  const px = W / 2 + (P.drift ? P.drift * 5 : Math.round(P.steer * 3)), py = TOP + VH - 4 + bob - hop - rough;
  if (P.boost > 0) { R(px - 13, py - 2, 4, 5 + (t & 3), (t & 2) ? C.or : C.cream); R(px + 9, py - 2, 4, 5 + (t & 3), (t & 2) ? C.or : C.cream); }
  ctx.save(); ctx.translate(px | 0, py | 0);
  if (P.spin > 0) ctx.scale(((P.spin >> 2) & 1) ? -1 : 1, 1); else ctx.transform(1, 0, P.drift ? P.drift * 0.16 : P.steer * 0.07, 1, 0, 0);
  ctx.drawImage(REAR[P.ci], -26, -52, 52, 52); ctx.restore();
  if (P.shield > 0) { ctx.strokeStyle = (t >> 2) & 1 ? C.or : C.cream; ctx.lineWidth = 1; ctx.strokeRect(px - 30, py - 56, 60, 58); }
  for (const q of sparks) R(q.x, q.y, 2, 2, q.c);
}

function bars(l, r) {
  R(0, 0, W, TOP, C.ink); A.big('NULL KART', 34, 9, 8, C.cream); R(W - 28, 2, 1, 8, C.or); A.txt('03', W - 8, 9, C.cream, 8, 'right');
  R(0, H - 12, W, 12, C.ink); A.txt(l, 8, H - 3, C.l2);
  ctx.font = '8px Silkscreen, monospace'; A.tri(W - 14 - ctx.measureText(r).width, H - 10, C.cream); A.txt(r, W - 8, H - 3, C.cream, 8, 'right');
}
function paper() { R(0, TOP, W, VH, C.bg); ctx.fillStyle = C.l1; for (let y = TOP + 2; y < TOP + VH; y += 4) ctx.fillRect(0, y, W, 1); }
function face(i, x, y, s) { ctx.drawImage(FACE[i], x, y, 22 * s, 22 * s); }
function statBar(label, v, x, y) { A.txt(label, x, y, C.mid); for (let k = 0; k < 5; k++) R(x + 44 + k * 9, y - 6, 7, 6, k < v ? C.ink : C.l2); }

function drawHud() {
  const place = order.indexOf(P) + 1;
  R(0, 0, W, TOP, C.ink);
  A.txt('POS', 6, 9, C.l2); A.txt(place + '/8', 28, 9, place === 1 ? C.or : C.cream, 8, 'left', true);
  A.txt('LAP', 66, 9, C.l2); A.txt(Math.min(LAPS, Math.max(1, P.lap + 1)) + '/' + LAPS, 88, 9, C.cream, 8, 'left', true);
  A.txt(fmt(raceT), 176, 9, C.cream, 8, 'right');
  A.txt('ITEM', 196, 9, C.l2); R(224, 1, 58, 10, P.item >= 0 ? C.or : '#33322e'); A.txt(P.item >= 0 ? ITEMS[P.item] : '---', 253, 9, P.item >= 0 ? C.ink : C.mid, 8, 'center', true);
  R(W - 28, 2, 1, 8, C.or); A.txt('03', W - 8, 9, C.cream, 8, 'right');
  // lap progress strip
  R(0, H - 12, W, 12, C.ink); R(8, H - 7, 204, 2, C.mid); R(8, H - 10, 1, 8, C.cream); R(211, H - 10, 1, 8, C.cream);
  for (const r of racers) if (r !== P) R(8 + (r.pos / trackLen) * 202, H - 9, 2, 6, C.l2);
  R(7 + (P.pos / trackLen) * 202, H - 10, 4, 8, C.or);
  if (P.item >= 0 && !P.fin) { if ((t >> 4) & 1) A.txt('SPACE = ' + ITEMS[P.item], W - 8, H - 3, C.or, 8, 'right', true); } else { A.txt('B', W - 44, H - 3, C.or, 8, 'right', true); A.txt('DRIFT', W - 8, H - 3, C.cream, 8, 'right'); }
  // drift charge
  if (P.drift) { R(W / 2 - 21, TOP + VH - 66, 42, 5, C.ink); R(W / 2 - 20, TOP + VH - 65, Math.min(40, P.charge * 40 / 110), 3, P.charge >= 110 ? '#e0352b' : P.charge >= 50 ? C.or : C.cream); }
  const ahead = segAt(P.pos + SEG * 16).curve;
  if (Math.abs(ahead) >= 2.4 && Math.abs(segAt(P.pos).curve) < Math.abs(ahead) && (t >> 3) & 1 && st === 'race') {
    const d = ahead > 0 ? 1 : -1, n = Math.abs(ahead) >= 3.6 ? 3 : 2;
    for (let k = 0; k < n; k++) { const ax = W / 2 + d * (k * 9 - (n - 1) * 4.5); for (let j = 0; j < 5; j++) R(ax + d * (2 - Math.abs(j - 2)) - 1, TOP + 6 + j * 2, 3, 2, C.or); }
  }
  if (P.surf === 2 && !P.fin && (t >> 4) & 1) A.txt('OFF ROAD', W / 2, TOP + VH - 72, '#e0352b', 8, 'center', true);
  if (warn > 0 && (warn >> 3) & 1) { R(W / 2 - 34, TOP + 18, 68, 13, '#e0352b'); A.txt('! ROCKET !', W / 2, TOP + 28, C.cream, 8, 'center', true); }
  if (msgT > 0) {
    ctx.font = '8px Silkscreen, monospace'; const sw = sub ? ctx.measureText(sub).width + 20 : 0;
    ctx.font = '700 16px Silkscreen, monospace';
    const w = Math.min(W - 12, Math.max(ctx.measureText(msg).width + 30, sw)), hh = sub ? 30 : 17, y = TOP + 36, hot = msgT > 60 && (msgT & 8);
    R(W / 2 - w / 2 - 2, y - 2, w + 4, hh + 4, hot ? C.or : C.cream); R(W / 2 - w / 2, y, w, hh, C.ink);
    A.big(msg, W / 2 + 2, y + 14, 16, hot ? C.or : C.cream);
    if (sub) A.txt(sub, W / 2, y + 25, C.cream, 8, 'center');
  }
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (st === 'menu') {
    paper();
    A.big('NULL', 96, TOP + 44, 32, C.ink); A.big('KART', 104, TOP + 74, 32, C.ink);
    A.txt('@ 8 RACERS. 3 LAPS. NO BRAKES.', 16, TOP + 90, C.mid);
    MENU.forEach((m, i) => { const y = TOP + 108 + i * 13; if (i === mi) { R(14, y - 9, 110, 12, C.ink); A.tri(19, y - 6, C.or); A.txt(m, 28, y, C.cream, 8, 'left', true); } else A.txt(m, 28, y, C.ink); });
    // showcase: your racer on a strip of road
    R(190, TOP + 14, 116, 164, C.ink); R(192, TOP + 16, 112, 160, C.l1);
    quad(214, TOP + 176, 282, TOP + 176, 256, TOP + 84, 240, TOP + 84, C.mid);
    for (let k = 0; k < 5; k++) { const f = ((k * 20 + t * 2) % 100) / 100, y = TOP + 84 + f * f * 92; R(247 - f * 2, y, 2 + f * 4, 3 + f * 6, C.cream); }
    R(192, TOP + 16, 112, 68, C.bg); for (let i = 0; i < 6; i++) R(192 + i * 19, TOP + 84 - 14 - hash(i * 9) * 34, 17, 50, C.l2);
    R(192, TOP + 84, 112, 1, C.ink);
    ctx.drawImage(mkRearCached(), 248 - 39, TOP + 92 + ((t >> 3) & 1), 78, 78);
    R(192, TOP + 16, 112, 12, C.ink); A.txt(CHARS[save.char].n, 248, TOP + 25, C.cream, 8, 'center', true);
    bars('LV ' + level(), 'SELECT');
  } else if (st === 'chars') {
    paper(); A.big(flow ? 'PICK YOUR RACER' : 'RACERS', W / 2 + 3, TOP + 20, 16, C.ink);
    CHARS.forEach((c, i) => {
      const x = 22 + (i % 4) * 72, y = TOP + 28 + ((i / 4) | 0) * 54, locked = c.lvl > level();
      R(x - 2, y - 2, 64, 50, i === sel ? C.or : C.ink); R(x, y, 60, 46, i === sel ? C.cream : C.l1);
      if (locked) { R(x + 22, y + 16, 16, 14, C.mid); R(x + 25, y + 9, 10, 9, C.mid); R(x + 27, y + 11, 6, 6, C.l1); A.txt('LV ' + c.lvl, x + 30, y + 42, C.mid, 8, 'center'); }
      else { face(i, x + 8, y - 7 + (i === sel ? ((t >> 3) & 1) : 0), 2); R(x, y + 36, 60, 10, i === sel ? C.ink : C.l2); A.txt(c.n, x + 30, y + 44, i === sel ? C.cream : C.ink, 8, 'center', i === sel); }
    });
    const c = CHARS[sel]; R(14, TOP + 140, W - 28, 46, C.ink); R(16, TOP + 142, W - 32, 42, C.bg);
    A.big(c.n, 70, TOP + 160, 16, C.ink); A.txt(c.lvl > level() ? 'UNLOCKS AT LEVEL ' + c.lvl : c.tag, 24, TOP + 176, c.lvl > level() ? '#e0352b' : C.mid);
    statBar('SPEED', c.sp, 190, TOP + 154); statBar('ACCEL', c.ac, 190, TOP + 166); statBar('GRIP', c.hd, 190, TOP + 178);
    bars('BACK', flow ? 'NEXT' : 'CHOOSE');
  } else if (st === 'tracks') {
    paper(); A.big('PICK A TRACK', W / 2 + 3, TOP + 24, 16, C.ink);
    TRACKS.forEach((tr, i) => {
      const y = TOP + 40 + i * 46, on = i === tsel;
      R(20, y - 2, W - 40, 40, on ? C.or : C.ink); R(22, y, W - 44, 36, on ? C.cream : C.l1);
      R(26, y + 4, 56, 28, tr.sky); R(26, y + 20, 56, 12, tr.g1); quad(40, y + 32, 68, y + 32, 58, y + 20, 52, y + 20, tr.r1); for (let k = 0; k < 4; k++) R(28 + k * 14, y + 20 - 6 - hash(k + i * 5) * 8, 11, 14, tr.bld); R(26, y + 20, 56, 1, C.ink);
      A.txt('0' + (i + 1), 92, y + 14, C.or, 8, 'left', true); A.txt(tr.n, 110, y + 14, C.ink, 8, 'left', true);
      A.txt('BEST LAP ' + fmt(save.best['t' + i]), 92, y + 28, C.mid);
      if (on) A.tri(W - 36, y + 15, C.ink);
    });
    bars('BACK', 'START');
  } else if (st === 'garage') {
    paper(); A.big('GARAGE', W / 2 + 3, TOP + 22, 16, C.ink);
    const col = PAINTS[psel] || CHARS[save.char].kart, locked = PAINT_LV[psel] > level();
    R(104, TOP + 30, 112, 96, C.ink); R(106, TOP + 32, 108, 92, C.l1); R(106, TOP + 104, 108, 20, C.mid); for (let k = 0; k < 6; k++) R(108 + ((k * 20 + t) % 108), TOP + 112, 8, 2, C.cream);
    if (garKey !== save.char + col) { garKey = save.char + col; garImg = mkRear(save.char, col); }
    ctx.drawImage(garImg, 160 - 39, TOP + 36 + ((t >> 3) & 1), 78, 78);
    PAINTS.forEach((p, i) => { const x = 40 + i * 31; R(x - 2, TOP + 136, 26, 26, i === psel ? C.or : C.ink); R(x, TOP + 138, 22, 22, p || CHARS[save.char].kart); if (PAINT_LV[i] > level()) { R(x + 6, TOP + 146, 10, 8, C.cream); A.txt(String(PAINT_LV[i]), x + 11, TOP + 153, C.ink, 8, 'center'); } if (i === save.paint) R(x + 8, TOP + 164, 6, 3, C.ink); });
    A.txt(PAINT_N[psel] + (locked ? '  -  LOCKED UNTIL LV ' + PAINT_LV[psel] : ''), W / 2, TOP + 182, locked ? '#e0352b' : C.ink, 8, 'center', true);
    bars('BACK', 'PAINT IT');
  } else if (st === 'rank') {
    paper(); A.big('SEASON RANKING', W / 2 + 3, TOP + 20, 16, C.ink);
    const rows = CHARS.map((c, i) => i === save.char ? null : { n: c.n, i, p: save.season[c.n] || 0 }).filter(Boolean).concat([{ n: 'YOU', i: save.char, p: save.season.YOU || 0, me: true }]).sort((a, b) => b.p - a.p);
    const podium = [[W / 2 - 34, 46, 68, C.or], [36, 58, 60, C.cream], [W - 96, 64, 60, C.l2]];
    rows.slice(0, 3).forEach((r, k) => { const [x, y, w, c] = podium[k]; R(x - 2, TOP + y - 2, w + 4, 104 - y, C.ink); R(x, TOP + y, w, 100 - y, c); face(r.i, x + w / 2 - 22, TOP + y - 40, 2); A.big(String(k + 1), x + w / 2 + 2, TOP + y + 20, 16, C.ink); A.txt(r.n, x + w / 2, TOP + y + 31, C.ink, 8, 'center', r.me); A.txt(r.p + ' PT', x + w / 2, TOP + 96, C.ink, 8, 'center'); });
    rows.slice(3).forEach((r, k) => { const y = TOP + 116 + k * 14; if (r.me) R(30, y - 9, W - 60, 12, C.ink); const c = r.me ? C.cream : C.ink; A.txt(String(k + 4), 40, y, r.me ? C.or : C.mid, 8, 'left', true); ctx.drawImage(FACE[r.i], 56, y - 10, 11, 11); A.txt(r.n, 74, y, c, 8, 'left', r.me); A.txt(r.p + ' PT', W - 40, y, c, 8, 'right'); });
    bars('BACK', 'OK');
  } else if (st === 'profile') {
    paper(); A.big('PLAYER CARD', W / 2 + 3, TOP + 20, 16, C.ink);
    R(18, TOP + 30, 92, 118, C.ink); R(20, TOP + 32, 88, 114, '#3a56c5'); ctx.fillStyle = '#6a8ae7'; for (let y = TOP + 34; y < TOP + 110; y += 3) ctx.fillRect(20, y, 88, 1);
    face(save.char, 20, TOP + 26, 4); R(20, TOP + 112, 88, 34, C.ink); A.txt('PLAYER 1', 26, TOP + 126, C.cream, 8, 'left', true); A.txt(CHARS[save.char].n, 26, TOP + 139, C.or);
    const lv = level(), x = 126; A.txt('LEVEL', x, TOP + 42, C.mid); A.big(String(lv), x + 60, TOP + 46, 16, C.ink);
    R(x, TOP + 52, 170, 8, C.ink); R(x + 1, TOP + 53, 168 * ((save.xp % 150) / 150), 6, C.or); A.txt((save.xp % 150) + '/150 XP', x + 170, TOP + 70, C.mid, 8, 'right');
    [['RACES', save.races], ['WINS', save.wins], ['PODIUMS', save.podiums], ['RACERS', CHARS.filter(c => c.lvl <= lv).length + '/8'], ['PAINTS', PAINT_LV.filter(l => l <= lv).length + '/8']].forEach((r, k) => { A.txt(r[0], x, TOP + 86 + k * 12, C.mid); A.txt(String(r[1]), x + 170, TOP + 86 + k * 12, C.ink, 8, 'right', true); });
    TRACKS.forEach((tr, i) => { A.txt(tr.n, 20, TOP + 162 + i * 10, C.mid); A.txt(fmt(save.best['t' + i]), W - 24, TOP + 162 + i * 10, C.ink, 8, 'right', true); });
    bars('BACK', 'OK');
  } else if (st === 'results') {
    paper(); const r = result;
    A.big(r.place === 1 ? 'WINNER' : r.place <= 3 ? 'PODIUM' : 'FINISHED', 100, TOP + 26, 24, C.ink);
    A.big(r.place + ['ST', 'ND', 'RD', 'TH', 'TH', 'TH', 'TH', 'TH'][r.place - 1], 260, TOP + 28, 24, r.place <= 3 ? C.or : C.mid);
    order.forEach((o, k) => { if (cd < 6 + k * 5) return; const y = TOP + 44 + k * 14; if (o.isP) R(14, y - 10, 190, 13, C.ink); const c = o.isP ? C.cream : C.ink; A.txt(String(k + 1), 20, y, k < 3 ? C.or : C.mid, 8, 'left', true); ctx.drawImage(FACE[o.ci], 34, y - 10, 11, 11); A.txt(o.isP ? 'YOU' : CHARS[o.ci].n, 50, y, c, 8, 'left', o.isP); A.txt(o.fin ? fmt(o.finT) : '-:--.--', 160, y, c, 8, 'right'); A.txt('+' + PTS[k], 198, y, k < 3 ? C.or : c, 8, 'right'); });
    R(212, TOP + 36, 96, 118, C.ink); R(214, TOP + 38, 92, 114, C.cream); face(P.ci, 238, TOP + 34, 2);
    A.txt('TIME', 220, TOP + 92, C.mid); A.txt(fmt(r.time), 300, TOP + 92, C.ink, 8, 'right', true);
    A.txt('BEST LAP', 220, TOP + 104, C.mid); A.txt(fmt(P.bestLap), 300, TOP + 116, r.newBest ? C.or : C.ink, 8, 'right', true);
    A.txt('XP', 220, TOP + 130, C.mid); A.txt('+' + r.xp, 300, TOP + 130, C.ink, 8, 'right', true);
    if (r.newBest && (t >> 4) & 1) A.txt('NEW RECORD', 260, TOP + 146, C.or, 8, 'center', true);
    if (r.lvUp) { R(14, TOP + 160, W - 28, 16, C.or); A.txt('LEVEL UP!  NOW LV ' + level() + ' - CHECK RACERS + GARAGE', W / 2, TOP + 171, C.ink, 8, 'center', true); }
    bars(TRACKS[ti].n, 'CONTINUE');
  } else {
    drawRoad(); drawHud();
    if (st === 'count') { const n = Math.ceil(cd / 60); if (n <= 3) { R(W / 2 - 24, TOP + 40, 48, 44, C.ink); A.big(String(n), W / 2 + 4, TOP + 76, 32, n === 1 ? C.or : C.cream); } else { R(W / 2 - 80, TOP + 44, 160, 30, C.ink); A.txt('TRACK 0' + (ti + 1), W / 2, TOP + 56, C.or, 8, 'center'); A.txt(T.n, W / 2, TOP + 68, C.cream, 8, 'center', true); } }
    if (st === 'finish') { R(0, TOP + 60, W, 40, C.ink); A.big('FINISH', W / 2 + 6, TOP + 92, 32, (t >> 3) & 1 ? C.or : C.cream); }
    if (st === 'pause') { R(W / 2 - 72, TOP + 56, 144, 72, C.ink); R(W / 2 - 70, TOP + 58, 140, 68, C.bg); A.big('PAUSED', W / 2 + 3, TOP + 80, 16, C.ink); ['RESUME', 'QUIT RACE'].forEach((m, i) => { const y = TOP + 98 + i * 14; if (i === pauseI) { R(W / 2 - 58, y - 9, 116, 12, C.ink); A.tri(W / 2 - 52, y - 6, C.or); A.txt(m, W / 2 - 42, y, C.cream, 8, 'left', true); } else A.txt(m, W / 2 - 42, y, C.ink); }); }
  }
}
let rearCache = null, rearKey = '', garImg = null, garKey = '';
function mkRearCached() { const k = save.char + '|' + save.paint; if (k !== rearKey) { rearKey = k; rearCache = mkRear(save.char, PAINTS[save.paint] || CHARS[save.char].kart); } return rearCache; }

window.NullKart = {
  init(api) { A = api; ctx = api.ctx; W = api.W; H = api.H; TOP = api.TOP; VH = api.VH; C = api.C; load(); FACE = CHARS.map((_, i) => mkFace(i)); BOX = mkBox(); TRAP = mkTrap(); ROCKET = mkRocket(); },
  enter() { load(); st = 'menu'; mi = 0; },
  pause() { if (st === 'race' || st === 'count') { st = 'pause'; pauseI = 0; } },
  step, render,
  rear(i) { return mkRear(i, CHARS[i].kart); },   // rear-view kart sprite, used on the cart cover
  get state() { return st; }, get hasItem() { return !!P && P.item >= 0; }, get dbg() { return P ? { x: P.x, surf: P.surf, speed: P.speed, curve: segAt(P.pos).curve } : null; }, get place() { return order.indexOf(P) + 1; }
};
})();

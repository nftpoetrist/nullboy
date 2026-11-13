(() => {
'use strict';
/* =====================================================================
   NULL CITY — cart 01. An original open-city game for the pocket LCD.
   Walk the streets, borrow cars, dodge the heat, run jobs for the crew.
   ===================================================================== */
let A, ctx, W, H, TOP, VH, C;
const T = 16, MW = 110, MH = 94, PW = MW * T, PH = MH * T, TAU = Math.PI * 2;
// road grid: [first tile, width in tiles]
const VX = [[2, 2], [12, 2], [26, 4], [38, 2], [52, 2], [64, 4], [76, 2], [90, 2], [102, 2]];
const HY = [[2, 2], [13, 2], [24, 4], [38, 2], [49, 2], [60, 4], [73, 2], [83, 2]];
const NV = VX.length, NH = HY.length, DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const vseg = VX.map(() => HY.slice(1).map(() => true)), hseg = HY.map(() => VX.slice(1).map(() => true));
vseg[4][3] = false;   // the park swallows this stretch
hseg[4][7] = false;   // so does the container yard
const vcx = i => (VX[i][0] + VX[i][1] / 2) * T, hcy = j => (HY[j][0] + HY[j][1] / 2) * T;
const exitOK = (i, j, d) => d === 0 ? j > 0 && vseg[i][j - 1] : d === 2 ? j < NH - 1 && vseg[i][j] : d === 3 ? i > 0 && hseg[j][i - 1] : i < NV - 1 && hseg[j][i];
const IX = (i, j) => [vcx(i), hcy(j)];

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const angd = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const hash = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shade(hex, f) { const n = parseInt(hex.slice(1), 16), c = k => clamp(Math.round(((n >> k) & 255) * f), 0, 255); return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1); }
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[(Math.random() * a.length) | 0];

/* ------------------------------ map ------------------------------ */
const ROAD = 0, WALK = 1, BLD = 2, GRASS = 3, WATER = 4, SAND = 5, PLAZA = 6, LOT = 7, TREE = 8, WOOD = 9, HEDGE = 10, ZEBRA = 11, PALM = 12, YARD = 13;
const map = new Uint8Array(MW * MH);
const tAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= MW || ty >= MH) ? HEDGE : map[ty * MW + tx];
const tPx = (x, y) => tAt(Math.floor(x / T), Math.floor(y / T));
const SOLID = t => t === BLD || t === WATER || t === TREE || t === HEDGE || t === PALM;
const solidPx = (x, y) => SOLID(tPx(x, y));

const DNAME = { down: 'NEON CORE', mid: 'MIDLINE', sub: 'OLD SAVE', park: 'LAMP PARK', docks: 'CARGO BAY', beach: 'SUNSET STRIP' };
const district = (c, r) => (c === 3 || c === 4) && r === 3 ? 'park' : c === 7 ? 'docks' : r === 6 ? 'beach' : c >= 2 && c <= 5 && r <= 2 ? 'down' : c <= 1 ? 'sub' : 'mid';
function districtAt(x, y) {
  if (y > 85 * T) return 'beach';
  let c = 0, r = 0;
  for (let i = 0; i < NV - 1; i++) if (x >= VX[i][0] * T) c = i;
  for (let j = 0; j < NH - 1; j++) if (y >= HY[j][0] * T) r = j;
  return district(c, r);
}
const SPECIAL = [
  { id: 'HOME',    c: 1, r: 2, sign: "NULL'S PAD", wall: '#3f5486', roof: '#5a70a8', neon: '#9fd8f2', lot: 1 },
  { id: 'ARCADE',  c: 3, r: 1, sign: 'NULLSCADE',  wall: '#2a1a3a', roof: '#ff6a2b', neon: '#ff8a4a', lot: 1 },
  { id: 'STATION', c: 6, r: 1, sign: 'POLICE',     wall: '#2a3a62', roof: '#3f5486', neon: '#8fb4ff' },
  { id: 'CLINIC',  c: 1, r: 4, sign: 'CLINIC',     wall: '#e9e4d8', roof: '#58c59a', neon: '#7dff8a' },
  { id: 'RESPRAY', c: 6, r: 4, sign: 'RESPRAY',    wall: '#6a2a8a', roof: '#d64fb0', neon: '#ff7ad8' },
  { id: 'HOTEL',   c: 4, r: 6, sign: 'HOTEL',      wall: '#f2a0b8', roof: '#f7c4d4', neon: '#ffd98a' },
  { id: 'DINER',   c: 3, r: 5, sign: 'DINER',      wall: '#a8322e', roof: '#e75858', neon: '#ffb657' },
  { id: 'TOWER',   c: 4, r: 0, sign: 'RUN CLUB',   wall: '#1d1d1a', roof: '#6f6d68', neon: '#f2efe8' },
  { id: 'KART',    c: 6, r: 2, sign: 'KART CLUB',  wall: '#3f5486', roof: '#e8c04a', neon: '#ffe27a' },
  { id: 'POGS',    c: 0, r: 3, sign: 'POGS',       wall: '#b5522e', roof: '#d98058', neon: '#ffc46b' }
];
const PALS = {
  down:  [['#5b4a8a', '#7a68b0'], ['#3f5486', '#6a82c0'], ['#8a3c6a', '#b05a8e'], ['#2f6f7a', '#4fa0a8'], ['#6a2a8a', '#9a52c0'], ['#444a6a', '#6f7699']],
  mid:   [['#b5522e', '#d98058'], ['#a8482e', '#cf7a52'], ['#8e6a8a', '#b894b4'], ['#c48e7c', '#e6b494'], ['#58708a', '#84a0bc'], ['#9a8a5a', '#c8b880']],
  sub:   [['#d8c8a8', '#b85c3e'], ['#e9dac8', '#8c3c36'], ['#c9d8c0', '#58708a'], ['#ecd0c0', '#6a4a7a'], ['#d0d8e8', '#a8482e']],
  docks: [['#6f6d68', '#8e8c86'], ['#7a5a4a', '#9c7a66'], ['#4a5a6a', '#6c8094']],
  beach: [['#f2a0b8', '#f7c4d4'], ['#7fd6d0', '#b0ece8'], ['#f2efe8', '#ffd98a'], ['#ffb07a', '#ffd0a8'], ['#b9a8ef', '#d6ccf7']]
};
const CONT = ['#e0352b', '#3a56c5', '#e8c04a', '#58c59a', '#ff6a2b', '#8e97c4'];
const blds = [], lamps = [], trees = [], palms = [], deco = [], spots = [], pogSpots = [], PL = {};
let PIER = null;

function gen() {
  const r = rng(90210);
  const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < MW && y < MH) map[y * MW + x] = t; };
  const fill = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t); };
  const X0 = VX[0][0], X1 = VX[NV - 1][0] + VX[NV - 1][1] - 1, Y0 = HY[0][0], Y1 = HY[NH - 1][0] + HY[NH - 1][1] - 1;
  fill(0, 0, MW - 1, MH - 1, HEDGE);
  fill(0, Y1 + 2, MW - 1, Y1 + 5, SAND);
  fill(0, Y1 + 6, MW - 1, MH - 1, WATER);
  fill(X1 + 2, 0, MW - 1, MH - 1, WATER);
  fill(X0, Y1 + 1, X1 + 1, Y1 + 1, WALK);
  fill(X1 + 1, Y0, X1 + 1, Y1 + 1, WALK);
  for (let i = 0; i < NV; i++) fill(VX[i][0], Y0, VX[i][0] + VX[i][1] - 1, Y1, ROAD);
  for (let j = 0; j < NH; j++) fill(X0, HY[j][0], X1, HY[j][0] + HY[j][1] - 1, ROAD);

  const addB = (x0, y0, x1, y1, b, kind, sp) => {
    if (x1 < x0 || y1 < y0) return;
    fill(x0, y0, x1, y1, BLD);
    const d = b.d, h = y1 - y0 + 1;
    let hg = kind === 'cont' ? 7 : sp ? 18 : d === 'sub' ? 8 + r() * 3 : d === 'mid' ? 10 + r() * 5 : d === 'down' ? 12 + r() * 14 : d === 'docks' ? 9 + r() * 4 : 10 + r() * 5;
    if (y0 <= b.y0 + 1) hg = Math.min(hg, 13);
    hg = Math.min(hg | 0, h * T - 5);
    const p = kind === 'cont' ? [CONT[(r() * CONT.length) | 0], ''] : sp ? [sp.wall, sp.roof] : PALS[d][(r() * PALS[d].length) | 0];
    blds.push({ x: x0, y: y0, w: x1 - x0 + 1, h, hg, wall: p[0], roof: p[1] || shade(p[0], 1.15), kind: kind || d, sign: sp ? sp.sign : '', neon: sp ? sp.neon : '', seed: (r() * 1e6) | 0, shop: !sp && (d === 'mid' || d === 'down' || d === 'beach') && r() < .5 });
  };
  const addTree = (x, y) => { set(x, y, TREE); trees.push({ x: x * T + 8, y: y * T + 8, r: 9 + (r() * 4 | 0), k: r() }); };
  const addPalm = (x, y) => { palms.push({ x: x * T + 8, y: y * T + 8, k: r(), base: tAt(x, y) }); set(x, y, PALM); };
  const addLot = (x0, y0, x1, y1, b, sure) => {
    fill(x0, y0, x1, y1, b.d === 'docks' ? YARD : LOT);
    const h = y1 - y0 + 1, rows = h >= 4 ? [y0 * T + 13, (y1 + 1) * T - 13] : [y0 * T + 13];
    rows.forEach((py, k) => { for (let x = x0; x <= x1; x++) { const must = sure && k === 0 && x === x0; if (must || r() < .5) spots.push({ x: x * T + 8, y: py, ang: r() < .5 ? 0 : Math.PI, tp: must ? 0 : wpick(r, b.d === 'docks' ? [1, 2, 0, 4, 0, 0, 3] : b.d === 'down' ? [2, 4, 2, 1, 1, 0, 0] : [4, 4, 1, 2, 1, 0, 0]), col: (r() * 10) | 0, car: null, gone: 0 }); } });
  };
  const leaf = (x0, y0, x1, y1, b) => {
    const w = x1 - x0 + 1, h = y1 - y0 + 1, d = b.d, q = r(), base = d === 'docks' ? YARD : d === 'sub' ? GRASS : PLAZA;
    const lotP = { sub: .06, mid: .16, down: .07, docks: .2, beach: .1 }[d], openP = { sub: .2, mid: .08, down: .09, docks: 0, beach: .2 }[d];
    if (q < lotP) return addLot(x0, y0, x1, y1, b);
    if (q < lotP + openP) {
      fill(x0, y0, x1, y1, d === 'down' ? PLAZA : d === 'beach' ? SAND : GRASS);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (r() < .22) { d === 'beach' ? addPalm(x, y) : addTree(x, y); } else if (r() < .1) deco.push({ k: 'bench', x: x * T + 3, y: y * T + 6 });
      return;
    }
    if (d === 'docks' && q < lotP + .32) {
      fill(x0, y0, x1, y1, YARD);
      for (let y = y0; y <= y1; y += 2) for (let x = x0; x + 1 <= x1; x += 3) if (r() < .78) addB(x, y, x + 1, y, b, 'cont');
      return;
    }
    fill(x0, y0, x1, y1, base);
    let bx0 = x0, bx1 = x1, by1 = y1;
    if (w >= 3 && r() < .4) bx1--;
    if (h >= 3 && r() < (d === 'sub' ? .7 : .3)) by1--;
    if (d === 'sub' && bx1 - bx0 >= 2 && r() < .5) bx0++;
    addB(bx0, y0, bx1, by1, b);
    if (d === 'sub') for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tAt(x, y) === GRASS && r() < .18) addTree(x, y);
  };
  const lots = (x0, y0, x1, y1, b) => {
    const w = x1 - x0 + 1, h = y1 - y0 + 1, mx = b.d === 'sub' ? 3 : b.d === 'down' ? 5 : 4;
    if (w < 1 || h < 1) return;
    if (w < 2 || h < 2) return fill(x0, y0, x1, y1, b.d === 'docks' ? YARD : PLAZA);
    if (w >= h && w > mx && w >= 4) { const s = x0 + 2 + (r() * (w - 3) | 0); lots(x0, y0, s - 1, y1, b); lots(s, y0, x1, y1, b); }
    else if (h > mx && h >= 4) { const s = y0 + 2 + (r() * (h - 3) | 0); lots(x0, y0, x1, s - 1, b); lots(x0, s, x1, y1, b); }
    else if (w > mx && w >= 4) { const s = x0 + 2 + (r() * (w - 3) | 0); lots(x0, y0, s - 1, y1, b); lots(s, y0, x1, y1, b); }
    else leaf(x0, y0, x1, y1, b);
  };

  for (let c = 0; c < NV - 1; c++) for (let rr = 0; rr < NH - 1; rr++) {
    if ((c === 4 && rr === 3) || (c === 7 && rr === 4)) continue;
    let x0 = VX[c][0] + VX[c][1], x1 = VX[c + 1][0] - 1, y0 = HY[rr][0] + HY[rr][1], y1 = HY[rr + 1][0] - 1;
    if (c === 3 && rr === 3) x1 = VX[5][0] - 1;
    if (c === 7 && rr === 3) y1 = HY[5][0] - 1;
    const b = { c, r: rr, x0, y0, x1, y1, d: district(c, rr) };
    fill(x0, y0, x1, y1, WALK);
    for (let x = x0 + 2; x < x1; x += 6) { lamps.push({ x: x * T + 8, y: y0 * T + 3 }); lamps.push({ x: x * T + 11, y: y1 * T + 13 }); }
    const ix0 = x0 + 1, iy0 = y0 + 1, ix1 = x1 - 1, iy1 = y1 - 1;
    if (b.d === 'park') {
      fill(ix0, iy0, ix1, iy1, GRASS); fill(ix0, 44, ix1, 44, PLAZA); fill(51, iy0, 52, iy1, PLAZA); fill(49, 43, 54, 45, PLAZA);
      for (let x = 55; x <= 60; x++) for (let y = 41; y <= 42; y++) if (!((x === 55 || x === 60) && y === 41)) set(x, y, WATER);
      deco.push({ k: 'fountain', x: 52 * T, y: 44 * T + 8 });
      for (let y = iy0; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) if (tAt(x, y) === GRASS && tAt(x, y + 1) !== PLAZA && tAt(x, y - 1) !== PLAZA && tAt(x + 1, y) !== PLAZA && tAt(x - 1, y) !== PLAZA && r() < .2) addTree(x, y);
      for (let x = ix0 + 1; x < ix1; x += 4) if (tAt(x, 43) === GRASS) deco.push({ k: 'bench', x: x * T + 3, y: 43 * T + 9 });
      for (let x = ix0 + 2; x < ix1; x += 5) lamps.push({ x: x * T + 8, y: 45 * T + 3 });
      continue;
    }
    const sp = SPECIAL.find(s => s.c === c && s.r === rr);
    if (sp) {
      const iw = ix1 - ix0 + 1, sw = Math.min(6, iw), sx0 = ix0 + ((iw - sw) >> 1);
      lots(ix0, iy0, ix1, iy1 - 3, b);
      if (sx0 > ix0) { if (sp.lot) addLot(ix0, iy1 - 2, sx0 - 1, iy1, b, true); else lots(ix0, iy1 - 2, sx0 - 1, iy1, b); }
      if (sx0 + sw <= ix1) lots(sx0 + sw, iy1 - 2, ix1, iy1, b);
      addB(sx0, iy1 - 2, sx0 + sw - 1, iy1, b, 'special', sp);
      PL[sp.id] = { x: (sx0 + sw / 2) * T, y: y1 * T + 8, rx: (sx0 + sw / 2) * T, ry: HY[rr + 1][0] * T + 8, lx: ix0 * T + 8, ly: (iy1 - 2) * T + 13 };
    } else lots(ix0, iy0, ix1, iy1, b);
  }
  // crossings
  for (let i = 0; i < NV; i++) for (let j = 0; j < NH; j++) {
    const xa = VX[i][0], xb = xa + VX[i][1] - 1, ya = HY[j][0], yb = ya + HY[j][1] - 1;
    if (exitOK(i, j, 0)) fill(xa, ya - 1, xb, ya - 1, ZEBRA);
    if (exitOK(i, j, 2)) fill(xa, yb + 1, xb, yb + 1, ZEBRA);
    if (exitOK(i, j, 3)) fill(xa - 1, ya, xa - 1, yb, ZEBRA);
    if (exitOK(i, j, 1)) fill(xb + 1, ya, xb + 1, yb, ZEBRA);
  }
  // pier, jetties, beach palms, fun fair
  fill(64, 86, 67, 92, WOOD); PIER = [66 * T, 91 * T + 8];
  fill(105, 20, 107, 21, WOOD); fill(105, 44, 108, 45, WOOD); fill(105, 66, 107, 67, WOOD);
  for (let x = 3; x < 104; x += 4) if (x < 62 || x > 69) { if (r() < .8) addPalm(x, 86); if (r() < .25) deco.push({ k: 'towel', x: x * T + 20, y: 88 * T + (r() * 12 | 0), c: (r() * 5) | 0 }); }
  deco.push({ k: 'wheel', x: 74 * T, y: 87 * T + 12 });
  for (let x = 6; x < 104; x += 7) lamps.push({ x: x * T + 8, y: 85 * T + 4 });
  for (let y = 8; y < 84; y += 7) lamps.push({ x: 104 * T + 12, y: y * T });
  // hidden pogs: quiet corners, spaced out
  const cand = [];
  for (let y = 3; y < 92; y++) for (let x = 3; x < 108; x++) { const t = tAt(x, y); if (t === PLAZA || t === GRASS || t === YARD || t === WOOD || t === SAND) cand.push([x, y]); }
  let guard = 0;
  while (pogSpots.length < 20 && guard++ < 4000) {
    const [x, y] = cand[(r() * cand.length) | 0];
    if (pogSpots.every(p => Math.abs(p.tx - x) + Math.abs(p.ty - y) > 16)) pogSpots.push({ tx: x, ty: y, x: x * T + 8, y: y * T + 8 });
  }
}
function wpick(r, w) { let s = 0; w.forEach(v => s += v); let q = r() * s; for (let i = 0; i < w.length; i++) { q -= w[i]; if (q < 0) return i; } return 0; }

/* ------------------------------ art ------------------------------ */
let gnd, top, lit, mini, artReady = false;
function disc(g, cx, cy, r, col) { g.fillStyle = col; for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y)); g.fillRect(cx - w, cy + y, w * 2 + 1, 1); } }
function ell(g, cx, cy, rx, ry, col) { g.fillStyle = col; for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(1 - y * y / (ry * ry))); if (w > 0) g.fillRect(cx - w, cy + y, w * 2, 1); } }
function poly(g, pts, col) {
  g.fillStyle = col; let y0 = 1e9, y1 = -1e9; pts.forEach(q => { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
  for (let y = Math.ceil(y0); y < y1; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) g.fillRect(Math.round(xs[i]), y, Math.max(1, Math.round(xs[i + 1]) - Math.round(xs[i])), 1);
  }
}
function glow(g, x, y, r, col, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; }

function paintArt() {
  gnd = mkc(PW, PH); top = mkc(PW, PH); lit = mkc(PW, PH); mini = mkc(MW, MH);
  const g = gnd.getContext('2d'), tg = top.getContext('2d'), lg = lit.getContext('2d'), mg = mini.getContext('2d');
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const t = (x, y, w, h, c) => { tg.fillStyle = c; tg.fillRect(x, y, w, h); };
  const onV = tx => VX.some(v => tx >= v[0] && tx < v[0] + v[1]), onH = ty => HY.some(v => ty >= v[0] && ty < v[0] + v[1]);
  const isRoad = q => q === ROAD || q === ZEBRA;
  const MC = ['#8e8a9c', '#3a3648', '#23202e', '#3a7a58', '#2f5fc4', '#d8c48e', '#4a4658', '#57536a', '#2c6650', '#b98552', '#1f4a3a', '#8e8a9c', '#3a7a58', '#5a5668'];
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const q = map[ty * MW + tx], x = tx * T, y = ty * T, hv = hash(tx, ty), h2 = hash(ty + 77, tx + 13);
    mg.fillStyle = MC[q]; mg.fillRect(tx, ty, 1, 1);
    if (q === ROAD || q === ZEBRA) {
      px(x, y, 16, 16, '#4a465c');
      if (hv > .55) px(x + (h2 * 13 | 0), y + (hv * 290 % 13 | 0), 2, 1, '#55516a');
      if (hv < .12) px(x + (h2 * 12 | 0), y + 2 + (hv * 90 | 0), 3, 1, '#413d52');
      if (hv > .985) { disc(g, x + 8, y + 8, 3, '#3a3648'); px(x + 6, y + 8, 5, 1, '#55516a'); }
      if (q === ZEBRA) { if (onV(tx) && !onH(ty)) for (let k = 0; k < 4; k++) px(x + 1 + k * 4, y + 3, 2, 10, '#e4e0ee'); else for (let k = 0; k < 4; k++) px(x + 3, y + 1 + k * 4, 10, 2, '#e4e0ee'); }
    } else if (q === WALK) {
      px(x, y, 16, 16, '#b9b4c8'); px(x, y, 16, 1, '#a9a3ba'); px(x, y, 1, 16, '#a9a3ba'); px(x + 8, y, 1, 16, '#b1abc2'); px(x, y + 8, 16, 1, '#b1abc2');
      if (hv > .93) px(x + 4, y + 10, 3, 2, '#a39db4');
      if (isRoad(tAt(tx, ty - 1))) px(x, y, 16, 2, '#e6e2f0'); if (isRoad(tAt(tx, ty + 1))) { px(x, y + 14, 16, 2, '#e6e2f0'); }
      if (isRoad(tAt(tx - 1, ty))) px(x, y, 2, 16, '#e6e2f0'); if (isRoad(tAt(tx + 1, ty))) px(x + 14, y, 2, 16, '#e6e2f0');
      if (tAt(tx + 1, ty) === WATER) px(x + 13, y, 3, 16, '#6f6b80'); if (tAt(tx, ty + 1) === WATER) px(x, y + 13, 16, 3, '#6f6b80');
    } else if (q === GRASS || q === TREE) {
      px(x, y, 16, 16, '#62b07c'); px(x + (hv * 13 | 0), y + (h2 * 13 | 0), 2, 1, '#4f9a6a'); px(x + 2 + (h2 * 11 | 0), y + 2 + (hv * 11 | 0), 1, 2, '#74c28c');
      if (hv > .93) px(x + (h2 * 12 | 0), y + (hv * 1000 % 12 | 0), 2, 2, '#ffd98a');
      if (q === TREE) { disc(g, x + 11, y + 12, 7, 'rgba(20,50,40,.3)'); px(x + 6, y + 6, 4, 7, '#6a4a3a'); px(x + 6, y + 6, 1, 7, '#8a6248'); }
    } else if (q === SAND || q === PALM) {
      px(x, y, 16, 16, '#f0daa6'); px(x + (hv * 13 | 0), y + (h2 * 14 | 0), 2, 1, '#e2c98e'); px(x + (h2 * 14 | 0), y + (hv * 14 | 0), 1, 1, '#fff0c8');
      if (tAt(tx, ty + 1) === WATER) { px(x, y + 12, 16, 4, '#e6ecd2'); px(x, y + 14, 16, 2, '#bfe0ee'); }
      if (q === PALM) { disc(g, x + 12, y + 13, 5, 'rgba(90,60,30,.25)'); px(x + 7, y + 2, 3, 11, '#9a7250'); for (let k = 0; k < 4; k++) px(x + 7, y + 3 + k * 3, 3, 1, '#7a5638'); }
    } else if (q === WATER) {
      px(x, y, 16, 16, '#2f5fc4'); px(x, y + (hv * 14 | 0), 16, 1, '#3468cc');
      if (tAt(tx, ty - 1) !== WATER) px(x, y, 16, 2, '#6f9cf0'); if (tAt(tx - 1, ty) !== WATER) px(x, y, 2, 16, '#5f8ce4');
    } else if (q === PLAZA) { px(x, y, 16, 16, (tx + ty) & 1 ? '#cdbfd0' : '#c3b4c8'); px(x, y, 16, 1, '#b8a8be'); if (hv > .9) px(x + 5, y + 6, 2, 2, '#b8a8be'); }
    else if (q === LOT) { px(x, y, 16, 16, '#57536a'); px(x, y, 1, 16, '#9c98b0'); if (hv > .6) px(x + 4 + (h2 * 8 | 0), y + (hv * 14 | 0), 2, 1, '#615d76'); }
    else if (q === WOOD) { px(x, y, 16, 16, '#b98552'); for (let k = 0; k < 4; k++) px(x, y + k * 4, 16, 1, '#96693e'); px(x + (hv * 12 | 0), y, 1, 16, '#a87646'); }
    else if (q === HEDGE) { px(x, y, 16, 16, '#2c6650'); px(x + 1, y + 1, 7, 7, '#347a5c'); px(x + 9, y + 7, 6, 6, '#3a8a66'); px(x + 10, y + 1, 4, 4, '#25584a'); px(x + 2, y + 10, 5, 4, '#25584a'); px(x + 3, y + 2, 2, 2, '#4a9a72'); px(x + 11, y + 9, 2, 2, '#4a9a72'); }
    else if (q === YARD) { px(x, y, 16, 16, '#8f8b9c'); px(x, y, 16, 1, '#827e90'); if (hv > .8) px(x + 3, y + (h2 * 12 | 0), 6, 1, '#7a7688'); if (tAt(tx + 1, ty) === WATER) px(x + 13, y, 3, 16, '#e8c04a'); }
    else px(x, y, 16, 16, '#2a2636');
  }
  // lane markings
  const dash = '#e9d9a0', lane = '#a7a3b8';
  for (let i = 0; i < NV; i++) for (let j = 0; j < NH - 1; j++) if (vseg[i][j]) {
    const ya = (HY[j][0] + HY[j][1] + 1) * T, yb = (HY[j + 1][0] - 1) * T, cx = vcx(i);
    if (VX[i][1] === 4) { px(cx - 2, ya, 1, yb - ya, dash); px(cx + 1, ya, 1, yb - ya, dash); for (let y = ya + 3; y < yb - 5; y += 14) { px(cx - 17, y, 1, 7, lane); px(cx + 16, y, 1, 7, lane); } }
    else for (let y = ya + 3; y < yb - 5; y += 14) px(cx - 1, y, 2, 7, dash);
  }
  for (let j = 0; j < NH; j++) for (let i = 0; i < NV - 1; i++) if (hseg[j][i]) {
    const xa = (VX[i][0] + VX[i][1] + 1) * T, xb = (VX[i + 1][0] - 1) * T, cy = hcy(j);
    if (HY[j][1] === 4) { px(xa, cy - 2, xb - xa, 1, dash); px(xa, cy + 1, xb - xa, 1, dash); for (let x = xa + 3; x < xb - 5; x += 14) { px(x, cy - 17, 7, 1, lane); px(x, cy + 16, 7, 1, lane); } }
    else for (let x = xa + 3; x < xb - 5; x += 14) px(x, cy - 1, 7, 2, dash);
  }
  // ground decoration
  deco.forEach(d => {
    if (d.k === 'bench') { px(d.x, d.y, 10, 2, '#8a5a3a'); px(d.x, d.y + 2, 10, 1, '#6a4028'); px(d.x + 1, d.y + 3, 1, 2, '#3a2a2a'); px(d.x + 8, d.y + 3, 1, 2, '#3a2a2a'); }
    else if (d.k === 'fountain') { disc(g, d.x, d.y, 13, '#8f8b9c'); disc(g, d.x, d.y, 11, '#4fb8e8'); disc(g, d.x, d.y, 7, '#6fcaf0'); disc(g, d.x, d.y, 3, '#d6f2ff'); }
    else if (d.k === 'towel') { const c = ['#e75858', '#3a56c5', '#58c59a', '#ff6a2b', '#d64fb0'][d.c]; px(d.x, d.y, 6, 11, c); px(d.x, d.y + 2, 6, 1, '#f2efe8'); px(d.x, d.y + 8, 6, 1, '#f2efe8'); }
  });
  // buildings, north to south so nearer roofs overlap farther walls
  blds.sort((a, b) => a.y - b.y || a.x - b.x);
  blds.forEach(b => px((b.x + b.w) * T, b.y * T + 3, Math.min(6, b.hg >> 1), b.h * T - 3, 'rgba(24,14,48,.25)'));
  blds.forEach(b => {
    const X = b.x * T, Y = b.y * T, Wd = b.w * T, Hh = b.h * T, hg = b.hg, wy = Y + Hh - hg, ry = Y - hg, rr = rng(b.seed), cx = X + (Wd >> 1), R1 = b.roof;
    px(X, Y, Wd, Hh, shade(b.wall, .5));
    px(X, wy, Wd, hg, b.wall); px(X, wy, Wd, 1, shade(b.wall, .7)); px(X, wy, 1, hg, shade(b.wall, 1.15)); px(X + Wd - 1, wy, 1, hg, shade(b.wall, .75)); px(X, Y + Hh - 1, Wd, 1, shade(b.wall, .6));
    lg.clearRect(X, ry, Wd, Hh); tg.clearRect(X, wy, Wd, hg);
    if (b.kind === 'cont') {
      for (let x = 2; x < Wd - 1; x += 3) px(X + x, wy + 1, 1, hg - 2, shade(b.wall, .82));
      t(X, ry, Wd, Hh, shade(b.wall, 1.12)); for (let x = 2; x < Wd - 1; x += 3) t(X + x, ry + 1, 1, Hh - 2, b.wall); t(X, ry, Wd, 1, shade(b.wall, 1.3)); t(X, ry + Hh - 1, Wd, 1, shade(b.wall, .7)); t(X + Wd - 1, ry, 1, Hh, shade(b.wall, .8));
      return;
    }
    const gf = hg >= 12;
    for (let y = wy + 3; y + 4 <= Y + Hh - (gf ? 7 : 1); y += 6) for (let x = X + 3; x + 3 <= X + Wd - 3; x += 6) {
      if (b.sign && y < wy + 11) continue;
      px(x, y, 3, 4, '#2a2a48'); px(x, y, 1, 1, '#7f9fd8');
      if (rr() < .55) { lg.fillStyle = rr() < .5 ? '#ffd98a' : '#ffb657'; lg.fillRect(x, y, 3, 4); }
    }
    if (gf) {
      const acc = ['#e75858', '#ff6a2b', '#58c59a', '#3a56c5', '#d64fb0'][(rr() * 5) | 0];
      if (b.shop && Wd >= 32) {
        px(X + 3, Y + Hh - 7, cx - 5 - (X + 3), 5, '#35406a'); px(cx + 5, Y + Hh - 7, X + Wd - 3 - (cx + 5), 5, '#35406a'); px(X + 4, Y + Hh - 6, 3, 1, '#7f9fd8');
        for (let x = X + 2; x < X + Wd - 2; x += 4) px(x, Y + Hh - 10, Math.min(4, X + Wd - 2 - x), 3, ((x - X) >> 2) & 1 ? '#f2efe8' : acc);
        lg.fillStyle = '#ffe9b0'; lg.globalAlpha = .7; lg.fillRect(X + 3, Y + Hh - 7, cx - 5 - (X + 3), 5); lg.fillRect(cx + 5, Y + Hh - 7, X + Wd - 3 - (cx + 5), 5); lg.globalAlpha = 1;
      }
      px(cx - 3, Y + Hh - 7, 6, 7, '#1d1a2a'); px(cx - 2, Y + Hh - 6, 4, 6, shade(b.wall, .45)); px(cx + 1, Y + Hh - 4, 1, 1, '#e8c04a');
    } else px(cx - 2, Y + Hh - 5, 4, 5, '#1d1a2a');
    if (b.sign) {
      [g, lg].forEach(q => { q.font = '700 8px Silkscreen, monospace'; q.textAlign = 'center'; q.textBaseline = 'alphabetic'; });
      const tw = Math.ceil(g.measureText(b.sign).width || b.sign.length * 7) + 8;
      px(cx - (tw >> 1), wy + 1, tw, 10, '#14121c'); px(cx - (tw >> 1), wy + 1, tw, 1, b.neon);
      g.fillStyle = b.neon; g.fillText(b.sign, cx, wy + 9);
      lg.fillStyle = b.neon; lg.fillText(b.sign, cx, wy + 9); glow(lg, cx, wy + 6, 34, b.neon, .5);
    }
    // roof
    t(X, ry, Wd, Hh, R1);
    if (b.kind === 'sub') {
      const hh = Hh >> 1; t(X, ry, Wd, hh, shade(R1, 1.12)); t(X, ry + hh, Wd, Hh - hh, shade(R1, .86)); for (let y = 3; y < Hh; y += 4) t(X, ry + y, Wd, 1, shade(R1, y < hh ? 1 : .76));
      t(X, ry + hh - 1, Wd, 2, shade(R1, 1.35)); const chx = X + 3 + (rr() * (Wd - 10) | 0); t(chx, ry + 3, 4, 4, '#6a4a3a'); t(chx, ry + 3, 4, 1, '#9a7250');
    } else {
      t(X + 2, ry + 2, Wd - 4, Hh - 4, shade(R1, .9)); t(X + 3, ry + 3, Wd - 6, Hh - 6, shade(R1, .96));
      if (b.sign) {
        t(X + 4, ry + 4, Wd - 8, 2, b.neon); t(X + 4, ry + Hh - 6, Wd - 8, 2, b.neon);
        lg.fillStyle = b.neon; lg.fillRect(X + 4, ry + 4, Wd - 8, 2); lg.fillRect(X + 4, ry + Hh - 6, Wd - 8, 2);
        if (b.sign === 'NULLSCADE') { tg.font = '700 16px Silkscreen, monospace'; tg.textAlign = 'center'; tg.fillStyle = '#f2efe8'; tg.fillText('N', cx + 1, ry + (Hh >> 1) + 6); glow(lg, cx, ry + (Hh >> 1), 40, '#ff6a2b', .45); }
        else if (b.sign === 'CLINIC') { t(cx - 2, ry + (Hh >> 1) - 7, 4, 14, '#f2efe8'); t(cx - 7, ry + (Hh >> 1) - 2, 14, 4, '#f2efe8'); }
        else if (b.sign === 'POLICE') { disc(tg, cx, ry + (Hh >> 1), 9, '#e8c04a'); disc(tg, cx, ry + (Hh >> 1), 7, shade(R1, .9)); t(cx - 4, ry + (Hh >> 1) - 5, 2, 10, '#e8c04a'); t(cx + 2, ry + (Hh >> 1) - 5, 2, 10, '#e8c04a'); t(cx - 4, ry + (Hh >> 1) - 1, 8, 2, '#e8c04a'); }
      } else {
        let n = Math.min(4, (b.w * b.h / 3) | 0);
        if (b.kind === 'down' && b.w >= 3 && b.h >= 3 && rr() < .35) { const hx = X + (Wd >> 1), hy = ry + (Hh >> 1); disc(tg, hx, hy, 11, '#3a3648'); disc(tg, hx, hy, 9, '#55516a'); t(hx - 4, hy - 5, 2, 10, '#f2efe8'); t(hx + 2, hy - 5, 2, 10, '#f2efe8'); t(hx - 4, hy - 1, 8, 2, '#f2efe8'); n = 1; }
        while (n-- > 0) {
          const x = X + 4 + (rr() * Math.max(1, Wd - 18) | 0), y = ry + 4 + (rr() * Math.max(1, Hh - 14) | 0), k = rr();
          if (k < .3) { t(x, y, 7, 6, '#9c98a8'); t(x + 1, y + 1, 5, 4, '#6f6b7c'); t(x + 3, y + 2, 1, 2, '#c8c4d4'); }
          else if (k < .45) t(x, y, 3, 3, '#3a3648');
          else if (k < .6) { disc(tg, x + 3, y + 3, 3, '#8a6a4a'); disc(tg, x + 3, y + 3, 2, '#a8845e'); }
          else if (k < .78) { t(x, y, 8, 5, '#35406a'); t(x + 1, y + 1, 3, 1, '#7f9fd8'); lg.fillStyle = '#ffe9b0'; lg.globalAlpha = .5; lg.fillRect(x, y, 8, 5); lg.globalAlpha = 1; }
          else if (b.kind === 'beach' && Wd >= 32) { t(x, y, 12, 7, '#f2efe8'); t(x + 1, y + 1, 10, 5, '#4fb8e8'); t(x + 2, y + 2, 3, 1, '#bfe8fa'); }
          else t(x, y, 8, 6, '#4f9a6a');
        }
      }
    }
    t(X, ry, Wd, 1, shade(R1, 1.25)); t(X, ry, 1, Hh, shade(R1, 1.25)); t(X + Wd - 1, ry, 1, Hh, shade(R1, .72)); t(X, ry + Hh - 1, Wd, 1, shade(R1, .66));
  });
  // lamps, trees, palms
  lamps.forEach(l => { px(l.x - 1, l.y - 1, 3, 2, '#2a2636'); t(l.x - 1, l.y - 10, 2, 10, '#3a3648'); t(l.x - 3, l.y - 12, 6, 2, '#55516a'); t(l.x - 2, l.y - 10, 4, 1, '#ffe9b0'); glow(lg, l.x, l.y - 3, 36, '#ffcf70', .6); lg.fillStyle = '#fff3c8'; lg.fillRect(l.x - 2, l.y - 10, 4, 1); });
  trees.forEach(q => {
    const pink = q.k > .72, c = pink ? ['#a8407c', '#d870a8', '#f4a4cc'] : ['#2a6e50', '#3d9166', '#5ab480'], y = q.y - 6;
    disc(tg, q.x, y, q.r, c[0]); disc(tg, q.x - 1, y - 1, q.r - 2, c[1]); disc(tg, q.x - 3, y - 3, q.r >> 1, c[2]);
    t(q.x + 3, y + 2, 2, 2, c[0]); t(q.x - 5, y + 4, 2, 1, c[0]); t(q.x + 1, y - 5, 1, 1, '#fff0c8');
  });
  palms.forEach(q => {
    const cx = q.x, cy = q.y - 8;
    [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy], n) => { const len = dx && dy ? 4 : 5; for (let k = 1; k <= len; k++) t(cx + dx * k * 2 - 1, cy + dy * k * 2 - 1 + ((k * k) >> 3), 3, 2, (n + k) & 1 ? '#2f8a5a' : '#44a86e'); });
    disc(tg, cx, cy, 2, '#7a5638'); t(cx - 1, cy - 1, 1, 1, '#c89a6a');
  });
  artReady = true;
}

/* --------------------------- characters --------------------------- */
const K = '#17151c', CR = '#f2efe8';
const STY = [
  { n: 'NULL',    head: 'null',  hp: '#e0352b', tee: '#f2efe8', pants: '#3f5486', shoe: '#e9e2d0', eye: 'null', logo: 1 },
  { n: 'VISOR',   head: 'ears',  tee: '#6a2a8a', pants: '#2a2636', shoe: '#f2efe8', eye: 'visor' },
  { n: 'GOGGLES', head: 'one',   tee: '#a8322e', pants: '#3f5486', shoe: '#1d1d1a', eye: 'goggles' },
  { n: 'XED',     head: 'round', tee: '#6f6d68', pants: '#2a2636', shoe: '#f2efe8', eye: 'x' },
  { n: 'FUSE',    head: 'fuse',  tee: '#ff6a2b', pants: '#1d1d1a', shoe: '#f2efe8', eye: 'tall' },
  { n: 'STATIC',  head: 'ears',  tee: '#58c59a', pants: '#2f6f7a', shoe: '#1d1d1a', eye: 'static' },
  { n: 'MOTH',    head: 'moth',  tee: '#d8c8a8', pants: '#8e6a8a', shoe: '#6a4a3a', eye: 'sleepy' },
  { n: 'HALO',    head: 'halo',  tee: '#e8c04a', pants: '#f2efe8', shoe: '#e8c04a', eye: 'one' },
  { n: 'COP',     head: 'cap', cap: '#2a3a62', tee: '#3f5486', pants: '#1f2a48', shoe: '#17151c', eye: 'dot' }
];
(() => {
  const r = rng(4242), heads = ['round', 'ears', 'one', 'cap', 'beanie', 'round', 'ears'], eyes = ['dot', 'tall', 'sleepy', 'dot', 'null'];
  const tees = ['#e75858', '#58c59a', '#8e97c4', '#ffd98a', '#d64fb0', '#f2efe8', '#ff6a2b', '#7fd6d0', '#b9a8ef', '#c48e7c'], pants = ['#3f5486', '#2a2636', '#6f6d68', '#8e6a8a', '#2f6f7a', '#b5522e'];
  for (let i = 0; i < 16; i++) STY.push({ n: '', head: heads[(r() * heads.length) | 0], cap: tees[(r() * tees.length) | 0], tee: tees[(r() * tees.length) | 0], pants: pants[(r() * pants.length) | 0], shoe: r() < .5 ? '#f2efe8' : '#1d1d1a', eye: eyes[(r() * eyes.length) | 0], hp: r() < .15 ? '#58c59a' : '' });
})();
const COP = 8, TOWN0 = 9;
function drawChar(g, s, dir, f) {
  const p = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const side = dir === 2, back = dir === 1, stp = f === 1 || f === 3, hy = stp ? 1 : 0;
  const PT = s.pants, PD = shade(s.pants, .72), SH = s.shoe, SD = shade(s.shoe, .76), TE = s.tee, TD = shade(s.tee, .8);
  if (side) {
    if (stp) { const a = f === 1; p(3, 17, 4, 2, a ? PT : PD); p(9, 17, 4, 2, a ? PD : PT); p(2, 19, 5, 1, a ? SH : SD); p(9, 19, 5, 1, a ? SD : SH); }
    else { p(6, 17, 5, 2, PT); p(9, 17, 2, 2, PD); p(5, 19, 6, 1, SH); }
    p(5, 12, 6, 4, TE); p(5, 15, 6, 1, TD); p(5, 16, 6, 1, PT);
    const ax = stp ? (f === 1 ? 5 : 9) : 7; p(7, 12, 2, 2, TD); p(ax, 14, 2, 2, K);
  } else {
    const l = f === 1 ? 1 : 0, r2 = f === 3 ? 1 : 0;
    p(3, 17, 4, 2 - l, PT); p(9, 17, 4, 2 - r2, PT); p(6, 17, 1, 2 - l, PD); p(12, 17, 1, 2 - r2, PD);
    p(3, 19 - l, 4, 1, SH); p(9, 19 - r2, 4, 1, SH); p(3, 19 - l, 1, 1, SD); p(12, 19 - r2, 1, 1, SD);
    p(4, 12, 8, 4, TE); p(4, 15, 8, 1, TD); p(4, 16, 8, 1, PT); p(7, 16, 2, 1, PD);
    p(3, 12, 1, 2, TE); p(12, 12, 1, 2, TE); p(3, 14 - r2, 1, 2, K); p(12, 14 - l, 1, 2, K);
    if (s.logo && !back) p(9, 13, 2, 1, '#ff6a2b');
    if (s.logo && !back) p(12, 15 - l, 1, 1, '#e0352b');
  }
  // head
  if (s.head === 'halo') { p(5, hy, 6, 1, '#e8c04a'); p(4, 1 + hy, 1, 1, '#e8c04a'); p(11, 1 + hy, 1, 1, '#e8c04a'); p(5, 2 + hy, 6, 1, '#ffe27a'); }
  p(3, 4 + hy, 10, 8, K); p(2, 5 + hy, 12, 6, K);
  if (s.head === 'null') {
    p(7, hy, 2, 1, K); p(6, 1 + hy, 4, 3, K);
    if (!side) { p(1, 2 + hy, 2, 1, K); p(1, 3 + hy, 3, 1, K); p(2, 4 + hy, 3, 1, K); }
    p(13, 2 + hy, 2, 1, K); p(12, 3 + hy, 3, 1, K); p(11, 4 + hy, 3, 1, K);
  } else if (s.head === 'ears') { if (!side) { p(3, 2 + hy, 2, 2, K); p(3, 1 + hy, 1, 1, K); } p(11, 2 + hy, 2, 2, K); p(12, 1 + hy, 1, 1, K); }
  else if (s.head === 'one') p(7, 1 + hy, 2, 3, K);
  else if (s.head === 'fuse') { p(7, 1 + hy, 2, 3, K); p(8, hy, 2, 1, '#ff6a2b'); p(9, hy, 1, 1, '#ffd98a'); }
  else if (s.head === 'moth') { p(4, 1 + hy, 1, 3, K); p(3, hy, 1, 1, K); p(11, 1 + hy, 1, 3, K); p(12, hy, 1, 1, K); }
  else if (s.head === 'cap') { p(3, 3 + hy, 10, 3, s.cap); p(4, 2 + hy, 8, 1, s.cap); if (!back) p(side ? 1 : 2, 6 + hy, side ? 7 : 12, 1, shade(s.cap, .65)); if (s.cap === '#2a3a62' && !back) p(side ? 4 : 7, 4 + hy, 2, 1, '#e8c04a'); }
  else if (s.head === 'beanie') { p(3, 3 + hy, 10, 3, s.cap); p(3, 6 + hy, 10, 1, shade(s.cap, .72)); p(7, 2 + hy, 2, 1, CR); }
  if (s.hp) {
    const hd = shade(s.hp, .66);
    if (side) { p(7, 3 + hy, 2, 3, s.hp); p(6, 6 + hy, 4, 5, s.hp); p(7, 7 + hy, 2, 3, hd); }
    else { p(1, 6 + hy, 2, 4, s.hp); p(13, 6 + hy, 2, 4, s.hp); p(1, 9 + hy, 2, 1, hd); p(13, 9 + hy, 2, 1, hd); if (back) p(4, 4 + hy, 8, 1, s.hp); else { p(3, 5 + hy, 1, 1, s.hp); p(12, 5 + hy, 1, 1, s.hp); } }
  }
  const ey = 7 + hy, e = s.eye;
  if (back) return;
  if (side) {
    if (e === 'visor') { p(2, ey, 2, 2, '#e0352b'); p(4, ey, 2, 2, '#e8c04a'); p(6, ey, 1, 2, '#58c59a'); }
    else if (e === 'goggles') { p(2, ey - 1, 4, 4, CR); p(3, ey, 2, 2, '#ff6a2b'); }
    else if (e === 'static') { p(2, ey - 1, 5, 4, '#58c59a'); p(3, ey, 2, 1, K); }
    else if (e === 'x') { p(3, ey, 1, 1, CR); p(5, ey, 1, 1, CR); p(4, ey + 1, 1, 1, CR); p(3, ey + 2, 1, 1, CR); p(5, ey + 2, 1, 1, CR); }
    else if (e === 'sleepy') { p(3, ey + 1, 3, 1, CR); p(3, ey, 3, 1, '#8e97c4'); }
    else { p(3, ey, 3, 2, CR); if (e === 'null') { p(5, ey, 1, 1, K); p(3, ey + 1, 1, 1, K); } else p(3, ey + 1, 1, 1, K); }
    return;
  }
  if (e === 'null') { p(4, ey, 3, 2, CR); p(6, ey, 1, 1, K); p(5, ey + 1, 1, 1, K); p(9, ey, 3, 2, CR); p(9, ey, 1, 1, K); p(10, ey + 1, 1, 1, K); }
  else if (e === 'visor') ['#e0352b', '#ff6a2b', '#e8c04a', '#58c59a', '#3a56c5'].forEach((c, k) => p(3 + k * 2, ey, 2, 2, c));
  else if (e === 'goggles') { p(3, ey - 1, 4, 4, CR); p(9, ey - 1, 4, 4, CR); p(4, ey, 2, 2, '#ff6a2b'); p(10, ey, 2, 2, '#ff6a2b'); }
  else if (e === 'x') { [4, 9].forEach(x => { p(x, ey, 1, 1, CR); p(x + 2, ey, 1, 1, CR); p(x + 1, ey + 1, 1, 1, CR); p(x, ey + 2, 1, 1, CR); p(x + 2, ey + 2, 1, 1, CR); }); }
  else if (e === 'tall') { p(5, ey - 1, 2, 3, CR); p(9, ey - 1, 2, 3, CR); }
  else if (e === 'static') { p(3, ey - 1, 10, 4, '#58c59a'); p(4, ey, 2, 1, K); p(7, ey + 1, 2, 1, K); p(10, ey, 2, 1, K); }
  else if (e === 'sleepy') { p(4, ey + 1, 3, 1, CR); p(9, ey + 1, 3, 1, CR); p(4, ey, 3, 1, '#8e97c4'); p(9, ey, 3, 1, '#8e97c4'); }
  else if (e === 'one') { p(6, ey - 1, 4, 4, CR); p(8, ey, 2, 2, K); }
  else { p(5, ey, 2, 2, CR); p(9, ey, 2, 2, CR); }
}
const SPR = {};
function spr(si, dir, f) {
  const k = si * 100 + dir * 10 + f; if (SPR[k]) return SPR[k];
  const c = mkc(16, 20), g = c.getContext('2d');
  if (dir === 3) { g.translate(16, 0); g.scale(-1, 1); drawChar(g, STY[si], 2, f); } else drawChar(g, STY[si], dir, f);
  return SPR[k] = c;
}

/* ------------------------------ cars ------------------------------ */
const CT = [
  { n: 'BRICK',    w: 10, l: 17, top: 2.2, acc: .05,  turn: .058, hp: 70,  m: .8 },
  { n: 'COMMUTER', w: 11, l: 20, top: 2.45, acc: .05, turn: .054, hp: 90,  m: 1 },
  { n: 'PIXEL GT', w: 11, l: 21, top: 3.2, acc: .075, turn: .06,  hp: 80,  m: .9 },
  { n: 'CRT VAN',  w: 12, l: 23, top: 2.05, acc: .04, turn: .046, hp: 130, m: 1.5 },
  { n: 'NULL CAB', w: 11, l: 20, top: 2.55, acc: .055, turn: .056, hp: 100, m: 1 },
  { n: 'PATROL',   w: 11, l: 21, top: 3.0, acc: .07,  turn: .06,  hp: 140, m: 1.2 },
  { n: 'HAULER',   w: 13, l: 28, top: 1.8, acc: .03,  turn: .038, hp: 200, m: 2.4 },
  { n: 'N-TYPE',   w: 11, l: 22, top: 3.5, acc: .085, turn: .064, hp: 130, m: 1 }
];
const CCOL = ['#e75858', '#3f5486', '#58c59a', '#f2efe8', '#6a2a8a', '#ff6a2b', '#8e97c4', '#c48e7c', '#2f6f7a', '#d64fb0'];
const CSPR = {};
function carSpr(tp, col) {
  const key = tp + col; if (CSPR[key]) return CSPR[key];
  const q = CT[tp], w = q.w, l = q.l, c = mkc(w + 2, l), g = c.getContext('2d');
  const p = (x, y, ww, h, cc) => { g.fillStyle = cc; g.fillRect(x, y, ww, h); };
  const dk = shade(col, .66), lt = shade(col, 1.22), gl = '#232a48', gh = '#7f9fd8', tire = '#131118';
  p(0, 3, 2, 4, tire); p(w, 3, 2, 4, tire); p(0, l - 7, 2, 4, tire); p(w, l - 7, 2, 4, tire);
  p(1, 1, w, l - 2, col); p(2, 0, w - 2, l, col); p(1, 1, 1, l - 2, lt); p(w, 1, 1, l - 2, dk); p(2, l - 1, w - 2, 1, dk);
  const ws = tp === 3 ? 3 : tp === 6 ? 2 : (l * .28) | 0, re = l - 6;
  if (tp === 6) {
    p(2, ws, w - 2, 2, gl); p(3, ws, 2, 1, gh); p(2, ws + 2, w - 2, 3, lt);
    p(1, 8, w, l - 9, '#8e8c96'); p(1, 8, w, 1, '#55535e'); p(1, 8, 1, l - 9, '#b4b2bc'); p(w, 8, 1, l - 9, '#6a6872'); for (let y = 11; y < l - 2; y += 3) p(2, y, w - 2, 1, '#7c7a86');
  } else if (tp === 3) {
    p(2, ws, w - 2, 3, gl); p(3, ws, 2, 1, gh); p(2, ws + 3, w - 2, l - ws - 5, lt); p(3, ws + 5, w - 4, 1, dk); p(3, l - 5, w - 4, 1, dk); p(4, ws + 8, w - 6, 5, shade(col, 1.08));
  } else {
    const rf = tp === 5 ? '#f2efe8' : lt;
    if (tp === 5) p(1, ws + 2, w, re - ws, '#f2efe8');
    p(2, ws, w - 2, 3, gl); p(3, ws, 2, 1, gh); p(2, ws + 3, w - 2, re - ws - 3, rf);
    p(2, ws + 3, 1, re - ws - 3, gl); p(w - 1, ws + 3, 1, re - ws - 3, gl); p(3, re, w - 4, 2, gl);
    if (tp === 2 || tp === 7) { const sx = w >> 1; p(sx, 0, 2, ws, '#f2efe8'); p(sx, ws + 3, 2, re - ws - 3, '#f2efe8'); p(sx, re + 2, 2, l - re - 2, '#f2efe8'); p(1, l - 3, w, 1, dk); }
    if (tp === 7) { p(3, 1, 1, 3, '#ff6a2b'); p(4, 2, 1, 1, '#ff6a2b'); p(5, 1, 1, 3, '#ff6a2b'); }
    if (tp === 4) { for (let k = 0; k < w; k += 2) p(1 + k, ws + 4, 1, 1, '#1d1d1a'); p((w >> 1) - 1, ws + 6, 4, 3, '#1d1d1a'); p(w >> 1, ws + 7, 2, 1, '#ffe27a'); }
    if (tp === 5) p(3, ws + 5, w - 4, 2, '#1d1d1a');
  }
  p(2, 0, 2, 1, '#fff6c8'); p(w - 2, 0, 2, 1, '#fff6c8'); p(2, l - 1, 2, 1, '#e0352b'); p(w - 2, l - 1, 2, 1, '#e0352b');
  return CSPR[key] = c;
}

/* ------------------------------ state ------------------------------ */
let st = 'title', tick = 0, mi = 0, g = null, save = null, cars = [], peds = [], picks = [], parts = [], floats = [], skids = [];
let P = null, banner = null, dlg = null, over = null, ms = null, MIS = [], confirmNew = false, pauseI = 0, helpFrom = 'title', shake = 0, flashT = 0, distName = '', distT = 0, msCool = 0, offMark = true, sprayT = 0, hitStop = 0;
const cam = { x: 0, y: 0 }, heli = { x: 0, y: 0, a: 0 };

function load() { save = A.store.get('city', null); }
function persist() { if (g) { save = { cash: g.cash, mi: g.mi, pogs: g.pogs, st: g.st, clock: g.clock, ntype: g.ntype }; A.store.set('city', save); } }
function onScreen(x, y, m) { m = m === undefined ? 24 : m; return x > cam.x - m && x < cam.x + W + m && y > cam.y - m && y < cam.y + VH + m; }
function say(s, t) { banner = { s, t: t || 130, big: false }; }
function bigMsg(s, sub, col) { banner = { s, sub, t: 180, big: true, col }; }
function part(x, y, vx, vy, life, col, sz) { if (parts.length < 240) parts.push({ x, y, vx, vy, life, col, sz: sz || 2 }); }
function fl(x, y, s, col) { floats.push({ x, y, s, col: col || C.cream, t: 55 }); }

function newGame(cont) {
  if (!artReady) { gen(); paintArt(); buildMissions(); }
  const s = cont && save ? save : {};
  g = { cash: s.cash || 0, mi: s.mi || 0, pogs: (s.pogs || []).slice(), st: Object.assign({ jobs: 0, cars: 0, ko: 0, bust: 0, lost: 0, dist: 0, time: 0 }, s.st || {}), clock: s.clock === undefined ? .7 : s.clock, heatPts: 0, heat: 0, coolT: 0, bustT: 0, ntype: !!s.ntype };
  cars = []; peds = []; picks = []; parts = []; floats = []; skids = []; ms = null; dlg = null; over = null; banner = null; msCool = 0; offMark = true;
  spots.forEach(q => { q.car = null; q.gone = 0; });
  P = { x: PL.HOME.x, y: PL.HOME.y, sd: 0, wt: 0, hp: 100, car: null, punch: 0, combo: 0, comboT: 0, hitDone: true, queue: false, inv: 0, idle: 0, aT: 0, mv: false };
  cam.x = clamp(P.x - W / 2, 0, PW - W); cam.y = clamp(P.y - VH / 2, 0, PH - VH);
  pogSpots.forEach((q, i) => { if (!g.pogs.includes(i)) picks.push({ x: q.x, y: q.y, k: 'pog', i }); });
  if (g.ntype) spawnNType();
  parkedTick();
  for (let i = 0; i < 60; i++) { spawnTraffic(true); spawnPed(true); }
  st = 'play'; distName = ''; say(g.mi === 0 && !cont ? 'WELCOME TO NULL CITY' : 'WELCOME BACK', 160);
}

/* ------------------------------ cars ------------------------------ */
function addCar(tp, col, x, y, ang, ai) {
  const c = { tp, col, x, y, ang, vx: 0, vy: 0, sp: 0, hp: CT[tp].hp, ai, drv: ai > 0, i: 0, j: 0, d: 0, ph: 0, lane: 0, stuck: 0, jam: 0, rev: 0, ghost: 0, fire: 0, dead: 0, hitT: 0, spot: null, cruise: rnd(1.2, 1.7), mine: false, keep: false, out: false, direct: false };
  cars.push(c); return c;
}
function spawnNType() {
  const x = PL.HOME.lx + 16, y = PL.HOME.ly;
  spots.forEach(s => { if (dist(s.x, s.y, x, y) < 10) s.gone = 1e9; });
  if (!cars.some(c => c.tp === 7 && !c.dead)) addCar(7, '#3a1a5a', x, y, 0, 0).keep = true;
}
function parkedTick() {
  for (const s of spots) {
    const d = dist(s.x, s.y, P.x, P.y);
    if (s.car) {
      const c = s.car;
      if (c.mine || c.dead || dist(c.x, c.y, s.x, s.y) > 6) { c.spot = null; s.car = null; s.gone = 3600; }
      else if (d > 430) { cars.splice(cars.indexOf(c), 1); s.car = null; }
    } else if (s.gone > 0) { if (d > 300) s.gone -= 30; }
    else if (d < 340) { const c = addCar(s.tp, CCOL[s.col], s.x, s.y, s.ang, 0); c.spot = s; s.car = c; }
  }
}
const CORN = [[-1, 1], [1, 1], [-1, -1], [1, -1], [0, 1], [0, -1]];
function carHit(c, x, y, ang) {
  const s = Math.sin(ang), co = Math.cos(ang), hw = CT[c.tp].w / 2 - 1, hl = CT[c.tp].l / 2 - 1;
  for (let k = 0; k < 6; k++) { const lx = CORN[k][0] * hw, lf = CORN[k][1] * hl; if (solidPx(x + co * lx + s * lf, y + s * lx - co * lf)) return true; }
  return false;
}
function unstick(c) {
  for (let r = 2; r <= 24; r += 2) for (let a = 0; a < 8; a++) { const x = c.x + Math.cos(a * TAU / 8) * r, y = c.y + Math.sin(a * TAU / 8) * r; if (!carHit(c, x, y, c.ang)) { c.x = x; c.y = y; return; } }
}
function dmgCar(c, d) {
  if (c.dead || d <= 0) return;
  c.hp -= d;
  if (c.hp <= 0 && !c.fire) { c.fire = 1; if (c.ai && c.drv) ejectPed(c, c.ai === 2 ? COP : -1, true); c.ai = c === P.car ? c.ai : 0; if (c === P.car) say('CAR ON FIRE - BAIL OUT! PRESS B', 200); }
}
function bump(c, f) {
  if (c.hitT > 0 || f < 1.1) return;
  c.hitT = 14; dmgCar(c, (f - .9) * 9);
  if (onScreen(c.x, c.y)) { A.noise(.12, .2, 1600); A.tone(120, .1, 'square', .07, 60); for (let k = 0; k < 4; k++) part(c.x + Math.sin(c.ang) * 8, c.y - Math.cos(c.ang) * 8, rnd(-1, 1), rnd(-1, 1), 12, '#ffd98a', 1); }
  if (c === P.car) shake = Math.max(shake, 5);
}
function carPhys(c, thr, sv, brake, piv) {
  const q = CT[c.tp];
  if (carHit(c, c.x, c.y, c.ang)) unstick(c);
  let fx = Math.sin(c.ang), fy = -Math.cos(c.ang);
  const fs0 = c.vx * fx + c.vy * fy, k = Math.max(clamp(Math.abs(fs0) / 1.1, 0, 1), piv || 0) * (fs0 < (piv ? -.05 : 0) ? -1 : 1), na = c.ang + sv * q.turn * k * (brake ? 1.3 : 1);
  if (sv && k && !carHit(c, c.x, c.y, na)) c.ang = na;
  fx = Math.sin(c.ang); fy = -Math.cos(c.ang);
  const rx = -fy, ry = fx;
  let fs = c.vx * fx + c.vy * fy, ls = c.vx * rx + c.vy * ry;
  const surf = tPx(c.x, c.y), top = q.top * (surf === GRASS || surf === SAND ? .62 : 1) * (c.hp < q.hp * .3 ? .78 : 1);
  if (thr > 0 && fs < top) fs += q.acc * thr; else if (thr < 0 && fs > -top * .45) fs += q.acc * 1.1 * thr;
  if (brake) fs *= .94;
  fs *= thr ? .996 : .978; if (fs > top) fs -= (fs - top) * .08;
  if (Math.abs(fs) < .012 && !thr) fs = 0;
  if (Math.abs(ls) > .55 && onScreen(c.x, c.y)) { if (skids.length > 260) skids.shift(); skids.push({ x: c.x - fx * 7, y: c.y - fy * 7 }); if (c === P.car && tick % 6 === 0) A.noise(.06, .05, 3200); }
  ls *= brake ? .9 : .55;
  c.vx = fx * fs + rx * ls; c.vy = fy * fs + ry * ls; c.sp = fs;
  const sp0 = Math.hypot(c.vx, c.vy); if (sp0 < .001) return;
  if (!carHit(c, c.x + c.vx, c.y + c.vy, c.ang)) { c.x += c.vx; c.y += c.vy; return; }
  if (!carHit(c, c.x + c.vx, c.y, c.ang)) { c.x += c.vx; c.vy *= -.25; } else if (!carHit(c, c.x, c.y + c.vy, c.ang)) { c.y += c.vy; c.vx *= -.25; } else { c.vx *= -.3; c.vy *= -.3; }
  c.vx *= .7; c.vy *= .7; bump(c, sp0);
}
function playerDrive(c) {
  const d = A.down, ix = (d.right ? 1 : 0) - (d.left ? 1 : 0), iy = (d.down ? 1 : 0) - (d.up ? 1 : 0);
  let thr = 0, sv = 0, brake = !!d.a, piv = 0;
  if (ix || iy) {
    // the arrow is where the car should go: it swings its nose that way (even from a standstill) and drives;
    // an arrow pointing behind the car means brake, then back up
    const da = Math.atan2(ix, -iy), df = angd(da, c.ang), ad = Math.abs(df);
    if (ad > 2.3) { if (c.sp > .4) brake = true; else { thr = -1; sv = -clamp(angd(da, c.ang + Math.PI) * 3, -1, 1); } }
    else { thr = ad > 1.5 ? .25 : ad > .8 ? .6 : 1; sv = clamp(df * 4, -1.5, 1.5); piv = .6; }
  }
  // nose against a wall with the stick still held: back out a little on its own, swinging toward where the player points
  if (c.rev > 0) { c.rev--; if (ix || iy) { thr = -1; sv = -clamp(angd(Math.atan2(ix, -iy), c.ang) * 3, -1, 1); } }
  else if (thr > 0 && Math.abs(c.sp) < .12) { if (++c.jam > 16) { c.jam = 0; c.rev = 26; } } else c.jam = 0;
  carPhys(c, thr, sv, brake, piv);
  g.st.dist += Math.abs(c.sp);
  if (tick % 7 === 0) A.tone(46 + Math.abs(c.sp) * 30, .1, 'triangle', .035 + Math.abs(c.sp) * .006);
  if (A.hit.b) { if (Math.abs(c.sp) < 1.7) leaveCar(); else say('TOO FAST TO JUMP OUT - HOLD A TO BRAKE', 90); }
}
/* lane waypoints: cars keep right */
const laneOff = (rw, lane) => rw === 4 ? (lane ? 24 : 8) : 8;
function entryPt(i, j, d, lane) {
  const rx = DX[(d + 1) & 3], ry = DY[(d + 1) & 3];
  if (!(d & 1)) return [vcx(i) + rx * laneOff(VX[i][1], lane), d === 0 ? (HY[j][0] + HY[j][1]) * T + 6 : HY[j][0] * T - 6];
  return [d === 1 ? VX[i][0] * T - 6 : (VX[i][0] + VX[i][1]) * T + 6, hcy(j) + ry * laneOff(HY[j][1], lane)];
}
function exitPt(i, j, d, lane) {
  const rx = DX[(d + 1) & 3], ry = DY[(d + 1) & 3];
  if (!(d & 1)) return [vcx(i) + rx * laneOff(VX[i][1], lane), d === 0 ? HY[j][0] * T - 6 : (HY[j][0] + HY[j][1]) * T + 6];
  return [d === 1 ? (VX[i][0] + VX[i][1]) * T + 6 : VX[i][0] * T - 6, hcy(j) + ry * laneOff(HY[j][1], lane)];
}
const wpOf = c => c.ph === 0 ? entryPt(c.i, c.j, c.d, c.lane) : exitPt(c.i, c.j, c.d, c.lane);
function nextDir(c, greedy) {
  const back = (c.d + 2) & 3, o = [];
  for (let d = 0; d < 4; d++) if (d !== back && exitOK(c.i, c.j, d)) o.push(d);
  if (!o.length) return back;
  if (greedy) {
    let bd = o[0], bs = 1e9;
    (exitOK(c.i, c.j, back) ? o.concat(back) : o).forEach(d => { const s = dist(vcx(clamp(c.i + DX[d], 0, NV - 1)), hcy(clamp(c.j + DY[d], 0, NH - 1)), P.x, P.y) + (d === back ? 70 : 0); if (s < bs) { bs = s; bd = d; } });
    return bd;
  }
  return o.includes(c.d) && Math.random() < .5 ? c.d : pick(o);
}
function aiNav(c, greedy) {
  let w = wpOf(c);
  const ddx = w[0] - c.x, ddy = w[1] - c.y;
  if (Math.hypot(ddx, ddy) < 9 || ddx * DX[c.d] + ddy * DY[c.d] < 0) {
    if (c.ph === 0) { c.d = nextDir(c, greedy); c.lane = (c.d & 1 ? HY[c.j][1] : VX[c.i][1]) === 4 && Math.random() < .5 ? 1 : 0; c.ph = 1; }
    else { c.i = clamp(c.i + DX[c.d], 0, NV - 1); c.j = clamp(c.j + DY[c.d], 0, NH - 1); c.ph = 0; }
    w = wpOf(c);
  }
  if (c.ph === 0) {
    if (c.d & 1) { const tx = c.x + DX[c.d] * 26; return [DX[c.d] > 0 ? Math.min(tx, w[0]) : Math.max(tx, w[0]), w[1]]; }
    const ty = c.y + DY[c.d] * 26; return [w[0], DY[c.d] > 0 ? Math.min(ty, w[1]) : Math.max(ty, w[1])];
  }
  return w;
}
function snapRoad(c) {
  let bi = 0, bj = 0, bd = 1e9;
  for (let i = 0; i < NV; i++) for (let j = 0; j < NH; j++) { const d = dist(c.x, c.y, vcx(i), hcy(j)); if (d < bd) { bd = d; bi = i; bj = j; } }
  const dx = vcx(bi) - c.x, dy = hcy(bj) - c.y;
  c.i = bi; c.j = bj; c.ph = 0; c.lane = 0; c.d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
}
function ahead(c, range) {
  const fx = Math.sin(c.ang), fy = -Math.cos(c.ang), rx = -fy, ry = fx;
  const see = (x, y, wd, rg) => { const dx = x - c.x, dy = y - c.y, f = dx * fx + dy * fy; return f > 3 && f < rg && Math.abs(dx * rx + dy * ry) < wd; };
  for (const o of cars) if (o !== c && see(o.x, o.y, 11, range)) return true;
  for (const p of peds) if (!(p.ko > 0) && see(p.x, p.y - 3, 9, range - 6)) return true;
  return !P.car && see(P.x, P.y - 3, 9, range - 6);
}
function aiDrive(c) {
  const tg = aiNav(c, false), df = angd(Math.atan2(tg[0] - c.x, -(tg[1] - c.y)), c.ang);
  if (c.rev > 0) { c.rev--; carPhys(c, -1, -clamp(df * 3, -1, 1), false); return; }
  let want = c.cruise * (Math.abs(df) > .45 ? .6 : 1) * (c.ph ? .78 : 1);
  if (c.ghost > 0) c.ghost--;
  else if (ahead(c, 30 + c.sp * 9)) { want = 0; if (++c.stuck > 260) { c.ghost = 110; c.stuck = 0; if (onScreen(c.x, c.y)) A.tone(392, .18, 'square', .04); } }
  else if (c.stuck > 0) c.stuck--;
  carPhys(c, c.sp < want ? .8 : 0, clamp(df * 2.6, -1, 1), c.sp > want + .25);
  if (want > 0 && Math.abs(c.sp) < .12) { if (++c.jam > 90) { c.jam = 0; c.rev = 45; } } else c.jam = 0;
}
function copDrive(c) {
  if (g.heat <= 0) { c.ai = 1; c.direct = false; c.out = false; snapRoad(c); return; }
  const d = dist(c.x, c.y, P.x, P.y), pc = P.car;
  let tg;
  if (d < 115) { c.direct = true; tg = [P.x + (pc ? pc.vx * 10 : 0), P.y + (pc ? pc.vy * 10 : 0)]; }
  else { if (c.direct) { c.direct = false; snapRoad(c); } tg = aiNav(c, true); }
  const df = angd(Math.atan2(tg[0] - c.x, -(tg[1] - c.y)), c.ang);
  if (c.rev > 0) { c.rev--; carPhys(c, -1, -clamp(df * 3, -1, 1), false); return; }
  if (d < 46 && (!pc || Math.abs(pc.sp) < .5)) {
    carPhys(c, 0, 0, true);
    if (!c.out && Math.abs(c.sp) < .3 && peds.filter(p => p.cop && !p.ko).length < 4) { c.out = true; ejectPed(c, COP, false); }
    if (pc && d < 36 && !over) g.bustT += 2;
    return;
  }
  const want = CT[5].top * (Math.abs(df) > .7 ? .5 : 1) * (g.heat >= 3 ? 1 : .86);
  carPhys(c, c.sp < want ? 1 : 0, clamp(df * 3, -1, 1), Math.abs(df) > 1.2 && c.sp > 1.4);
  if (Math.abs(c.sp) < .15) { if (++c.jam > 50) { c.jam = 0; c.rev = 40; } } else c.jam = 0;
}
function roadSpot(px, py) {
  let bi = 0, bj = 0;
  for (let i = 1; i < NV; i++) if (Math.abs(vcx(i) - px) < Math.abs(vcx(bi) - px)) bi = i;
  for (let j = 1; j < NH; j++) if (Math.abs(hcy(j) - py) < Math.abs(hcy(bj) - py)) bj = j;
  if (Math.abs(vcx(bi) - px) < Math.abs(hcy(bj) - py)) {
    for (let j = 0; j < NH - 1; j++) { const ya = (HY[j][0] + HY[j][1]) * T + 22, yb = HY[j + 1][0] * T - 22; if (py > ya && py < yb && vseg[bi][j]) { const d = Math.random() < .5 ? 0 : 2, lane = VX[bi][1] === 4 && Math.random() < .5 ? 1 : 0, jj = d === 0 ? j : j + 1; return { x: entryPt(bi, jj, d, lane)[0], y: py, d, i: bi, j: jj, lane }; } }
  } else {
    for (let i = 0; i < NV - 1; i++) { const xa = (VX[i][0] + VX[i][1]) * T + 22, xb = VX[i + 1][0] * T - 22; if (px > xa && px < xb && hseg[bj][i]) { const d = Math.random() < .5 ? 1 : 3, lane = HY[bj][1] === 4 && Math.random() < .5 ? 1 : 0, ii = d === 1 ? i + 1 : i; return { x: px, y: entryPt(ii, bj, d, lane)[1], d, i: ii, j: bj, lane }; } }
  }
  return null;
}
function spawnOnRoad(tp, col, ai, any) {
  const a = Math.random() * TAU, R = any ? rnd(110, 330) : rnd(215, 330), s = roadSpot(P.x + Math.cos(a) * R, P.y + Math.sin(a) * R);
  if (!s || (!any && onScreen(s.x, s.y, 34)) || cars.some(c => dist(c.x, c.y, s.x, s.y) < 46)) return null;
  const c = addCar(tp, col, s.x, s.y, s.d * Math.PI / 2, ai);
  c.i = s.i; c.j = s.j; c.d = s.d; c.lane = s.lane; c.vx = Math.sin(c.ang) * 1.2; c.vy = -Math.cos(c.ang) * 1.2;
  return c;
}
function spawnTraffic(any) {
  if (cars.filter(c => c.ai === 1).length >= 11) return;
  const tp = [0, 0, 0, 1, 1, 1, 1, 2, 3, 3, 4, 4, 6][(Math.random() * 13) | 0];
  spawnOnRoad(tp, tp === 4 ? '#e8c04a' : pick(CCOL), 1, any);
}
function explode(c) {
  c.dead = 1; c.fire = 0; c.ai = 0; c.drv = false; c.deadT = 1500; c.vx = c.vy = 0;
  const near = dist(c.x, c.y, P.x, P.y) < 260;
  if (near) { A.sfx.boom(); shake = 14; flashT = 6; }
  for (let k = 0; k < 26; k++) { const a = Math.random() * TAU, s = rnd(.5, 3); part(c.x, c.y, Math.cos(a) * s, Math.sin(a) * s, rnd(18, 40), pick(['#ff6a2b', '#ffd98a', '#e0352b', '#3a3648']), 3); }
  for (const p of peds) { const d = dist(p.x, p.y, c.x, c.y); if (d < 46) koPed(p, (p.x - c.x) / (d || 1) * 3, (p.y - c.y) / (d || 1) * 3, true, c.mine); }
  if (P.car === c) { P.car = null; P.x = c.x; P.y = c.y; P.inv = 0; hurt(200); }
  else if (!P.car && dist(P.x, P.y, c.x, c.y) < 44) hurt(45);
  for (const o of cars) if (o !== c && !o.dead && dist(o.x, o.y, c.x, c.y) < 44) { dmgCar(o, 55); const d = dist(o.x, o.y, c.x, c.y) || 1; o.vx += (o.x - c.x) / d * 2; o.vy += (o.y - c.y) / d * 2; }
  scare(c.x, c.y, 130); if (c.mine) crime(8);
}
function nearCar(c, x, y, r) { const q = CT[c.tp], fx = Math.sin(c.ang), fy = -Math.cos(c.ang), dx = x - c.x, dy = y - c.y; return Math.abs(dx * fx + dy * fy) < q.l / 2 + r && Math.abs(-dx * fy + dy * fx) < q.w / 2 + r; }
function pushOut(o, c) {
  const q = CT[c.tp], fx = Math.sin(c.ang), fy = -Math.cos(c.ang), dx = o.x - c.x, dy = o.y - 2 - c.y, f = dx * fx + dy * fy, l = -dx * fy + dy * fx, pf = q.l / 2 + 3 - Math.abs(f), pl = q.w / 2 + 3 - Math.abs(l);
  if (pf <= 0 || pl <= 0) return;
  if (pl < pf) { const s = l < 0 ? -1 : 1; mv(o, -fy * s * pl, fx * s * pl); } else { const s = f < 0 ? -1 : 1; mv(o, fx * s * pf, fy * s * pf); }
}
function carsStep() {
  for (let n = cars.length - 1; n >= 0; n--) {
    const c = cars[n];
    if (c.hitT > 0) c.hitT--;
    if (c.dead) { if (--c.deadT <= 0 || dist(c.x, c.y, P.x, P.y) > 480) cars.splice(n, 1); else if (tick % 9 === 0 && c.deadT > 1100) part(c.x + rnd(-4, 4), c.y + rnd(-4, 4), rnd(-.2, .2), -rnd(.3, .7), 40, '#3a3648', 3); continue; }
    if (c.fire) { c.fire++; if (tick % 2 === 0) part(c.x + rnd(-4, 4), c.y + rnd(-5, 5), rnd(-.3, .3), -rnd(.4, 1), 22, pick(['#ff6a2b', '#ffd98a', '#e0352b']), 3); if (c.fire > 170) { explode(c); continue; } }
    else if (c.hp < CT[c.tp].hp * .4 && tick % 6 === 0) part(c.x + Math.sin(c.ang) * 7, c.y - Math.cos(c.ang) * 7, rnd(-.2, .2), -rnd(.3, .6), 34, c.hp < CT[c.tp].hp * .2 ? '#3a3648' : '#b9b4c8', 2);
    if (c === P.car) { if (!over) playerDrive(c); else carPhys(c, 0, 0, true); }
    else if (c.ai === 1 && c.drv) aiDrive(c);
    else if (c.ai === 2 && c.drv) copDrive(c);
    else carPhys(c, 0, 0, true);
    if (c !== P.car && !c.keep && !c.spot && dist(c.x, c.y, P.x, P.y) > (c.ai === 2 && g.heat > 0 ? 620 : 470)) cars.splice(n, 1);
  }
  // car vs car
  for (let a = 0; a < cars.length; a++) for (let b = a + 1; b < cars.length; b++) {
    const ca = cars[a], cb = cars[b];
    if (Math.abs(ca.x - cb.x) > 34 || Math.abs(ca.y - cb.y) > 34) continue;
    const qa = CT[ca.tp], qb = CT[cb.tp], ra = qa.w / 2 + 1, rb = qb.w / 2 + 1;
    for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2) {
      const ax = ca.x + Math.sin(ca.ang) * qa.l * .25 * i, ay = ca.y - Math.cos(ca.ang) * qa.l * .25 * i, bx = cb.x + Math.sin(cb.ang) * qb.l * .25 * j, by = cb.y - Math.cos(cb.ang) * qb.l * .25 * j;
      const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || .01, o = ra + rb - d;
      if (o <= 0) continue;
      const nx = dx / d, ny = dy / d, ma = ca.dead ? 8 : qa.m, mb = cb.dead ? 8 : qb.m, ta = mb / (ma + mb), tb = 1 - ta;
      if (!carHit(ca, ca.x - nx * o * ta, ca.y - ny * o * ta, ca.ang)) { ca.x -= nx * o * ta; ca.y -= ny * o * ta; }
      if (!carHit(cb, cb.x + nx * o * tb, cb.y + ny * o * tb, cb.ang)) { cb.x += nx * o * tb; cb.y += ny * o * tb; }
      const rv = (ca.vx - cb.vx) * nx + (ca.vy - cb.vy) * ny;
      if (rv > 0) {
        ca.vx -= nx * rv * ta * 1.3; ca.vy -= ny * rv * ta * 1.3; cb.vx += nx * rv * tb * 1.3; cb.vy += ny * rv * tb * 1.3;
        if (rv > 1.1 && !ca.hitT && !cb.hitT) {
          const mine = ca === P.car || cb === P.car;
          ca.hitT = cb.hitT = 14; dmgCar(ca, (rv - .9) * 8 * tb * 2); dmgCar(cb, (rv - .9) * 8 * ta * 2);
          if (onScreen(ca.x, ca.y)) { A.noise(.14, .24, 1500); A.tone(110, .12, 'square', .08, 55); for (let k = 0; k < 5; k++) part(ax + nx * ra, ay + ny * ra, rnd(-1.2, 1.2), rnd(-1.2, 1.2), 12, '#ffd98a', 1); }
          if (mine) { shake = Math.max(shake, 6); if (ca.ai === 2 || cb.ai === 2) crime(12); else if ((ca.ai === 1 || cb.ai === 1) && rv > 2) crime(3); }
        }
      }
    }
  }
  // cars vs people
  for (const c of cars) {
    if (c.dead) continue;
    const s = Math.hypot(c.vx, c.vy);
    if (s > .7) for (const p of peds) {
      if (p.ko > 0 || !nearCar(c, p.x, p.y - 3, 4)) continue;
      if (s > 1.5) koPed(p, c.vx * 1.3, c.vy * 1.3, s > 2.5, c === P.car);
      else { mv(p, c.vx * 2, c.vy * 2); p.flee = 150; p.fx = c.x; p.fy = c.y; if (c === P.car) crime(2); }
    }
    if (!P.car && !over && nearCar(c, P.x, P.y - 2, 3)) { if (s > 1.2) { hurt(s * 10); mv(P, c.vx * 3, c.vy * 3); } pushOut(P, c); }
  }
}

/* ----------------------------- people ----------------------------- */
const PEDOK = t => t === WALK || t === PLAZA || t === GRASS || t === SAND || t === WOOD || t === YARD;
function free(x, y) { return !(solidPx(x - 3, y - 3) || solidPx(x + 3, y - 3) || solidPx(x - 3, y + 1) || solidPx(x + 3, y + 1)); }
function mv(o, dx, dy) { let m = false; if (dx && free(o.x + dx, o.y)) { o.x += dx; m = true; } if (dy && free(o.x, o.y + dy)) { o.y += dy; m = true; } return m; }
function addPed(x, y, si) {
  const mood = si === COP ? 1 : (m => m < .55 ? 0 : m < .85 ? 1 : 2)(Math.random()), hp0 = si === COP ? 5 : 2 + mood + (Math.random() < .5 ? 1 : 0);   // 0 runs away, 1 fights back, 2 fights back hard
  const p = { x, y, si, mood, hp: hp0, maxhp: hp0, stun: 0, atk: 0, fight: 0, flash: 0, showHp: 0, dir: (Math.random() * 4) | 0, sd: 0, wt: Math.random() * 100, ko: 0, out: false, flee: 0, fx: 0, fy: 0, cop: si === COP, vx: 0, vy: 0, zt: -1, ti: -1, cross: false, sp: rnd(.36, .52), cash: Math.random() < .55, mv: false, dead: false };
  peds.push(p); return p;
}
function spawnPed(any) {
  if (peds.length >= 16) return;
  const a = Math.random() * TAU, R = any ? rnd(50, 300) : rnd(200, 300), x = P.x + Math.cos(a) * R, y = P.y + Math.sin(a) * R;
  if (tPx(x, y) !== WALK || (!any && onScreen(x, y, 20))) return;
  addPed(Math.floor(x / T) * T + 4 + Math.random() * 8, Math.floor(y / T) * T + 6 + Math.random() * 7, TOWN0 + ((Math.random() * 16) | 0));
}
function ejectPed(c, si, flee) {
  const q = CT[c.tp], rx = Math.cos(c.ang), ry = Math.sin(c.ang);
  let x = c.x - rx * (q.w / 2 + 7), y = c.y - ry * (q.w / 2 + 7) + 2;
  if (!free(x, y)) { x = c.x + rx * (q.w / 2 + 7); y = c.y + ry * (q.w / 2 + 7) + 2; }
  if (!free(x, y)) { x = c.x; y = c.y; }
  const p = addPed(x, y, si < 0 ? TOWN0 + ((Math.random() * 16) | 0) : si);
  if (flee) { p.flee = 320; p.fx = c.x; p.fy = c.y; }
  return p;
}
function scare(x, y, r) { for (const q of peds) if (!q.cop && !(q.ko > 0) && !(q.fight > 0) && dist(q.x, q.y, x, y) < r) { q.flee = 200; q.fx = x; q.fy = y; } }
function koPed(p, vx, vy, hard, byPlayer) {
  if (p.ko > 0) return;
  p.ko = hard ? 420 : 210; p.out = hard && Math.random() < .5; p.vx = vx; p.vy = vy; p.stun = 0; p.atk = 0; p.fight = 0; p.hp = 0;
  if (byPlayer) { g.st.ko++; crime(p.cop ? 45 : 18); if (p.cash && !p.cop) { picks.push({ x: p.x + rnd(-6, 6), y: p.y + rnd(-4, 4), k: 'cash', v: 5 + ((Math.random() * 5) | 0) * 5, t: 700 }); p.cash = false; } }
  if (onScreen(p.x, p.y)) A.sfx.stomp();
  scare(p.x, p.y, 70);
}
function pedStep(p) {
  if (p.ko > 0) { mv(p, p.vx, p.vy); p.vx *= .86; p.vy *= .86; p.mv = false; if (--p.ko <= 0) { if (p.out) p.dead = true; else { p.hp = 1; p.showHp = 0; p.flee = 260; p.fx = P.x; p.fy = P.y; } } return; }
  if (p.flash > 0) p.flash--;
  if (p.showHp > 0) p.showHp--;
  if (p.stun > 0) { p.stun--; mv(p, p.vx, p.vy); p.vx *= .8; p.vy *= .8; p.mv = false; return; }   // reeling from a hit
  let mx = 0, my = 0, sp = p.sp;
  const cur = tPx(p.x, p.y);
  if (p.fight > 0 && !(p.cop && g.heat > 0)) {
    // squares up to the player: close in, wind up (shown as a "!"), swing, recover
    const d = dist(p.x, p.y, P.x, P.y) || 1;
    if (P.car || d > 170 || over) { p.fight = 0; p.atk = 0; return; }
    p.fight--; faceTo(p, P.x, P.y);
    if (p.atk > 0) {
      p.mv = false;
      if (--p.atk === 10 && d < 19) { hurt(p.mood === 2 ? 14 : 8); mv(P, (P.x - p.x) / d * 6, (P.y - p.y) / d * 6); for (let k = 0; k < 4; k++) part(P.x, P.y - 8, rnd(-1, 1), rnd(-1, 1), 10, CR, 1); }
      return;
    }
    if (d <= 14) { p.atk = 38; p.mv = false; return; }
    mx = (P.x - p.x) / d; my = (P.y - p.y) / d; sp = p.mood === 2 ? 1 : 1.15;
    p.mv = mv(p, mx * sp, my * sp); p.wt += sp; return;
  }
  if (p.cop && g.heat > 0 && !over) {
    const d = dist(p.x, p.y, P.x, P.y);
    if (d > 7) { mx = (P.x - p.x) / d; my = (P.y - p.y) / d; }
    sp = 1.42;
    if (!P.car && d < 11) g.bustT += 3; else if (P.car && d < 22 && Math.abs(P.car.sp) < .4) g.bustT += 3;
  } else if (p.flee > 0) { p.flee--; const d = dist(p.x, p.y, p.fx, p.fy) || 1; mx = (p.x - p.fx) / d; my = (p.y - p.fy) / d; sp = 1.5; }
  else if (!PEDOK(cur) && cur !== ZEBRA) {
    const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T); let best = -1;
    for (let k = 1; k < 8 && best < 0; k++) for (let d = 0; d < 4; d++) if (PEDOK(tAt(tx + DX[d] * k, ty + DY[d] * k))) { best = d; break; }
    if (best < 0) best = p.dir;
    p.dir = best; mx = DX[best]; my = DY[best]; sp = 1.1;
  } else {
    const ti = Math.floor(p.x / T) + Math.floor(p.y / T) * MW;
    const ok = dd => {
      const ax = p.x + DX[dd] * 10, ay = p.y - 1 + DY[dd] * 10, q = tPx(ax, ay);
      if (q !== ZEBRA) return PEDOK(q);
      if (cur === ZEBRA) return true;
      const zi = Math.floor(ax / T) + Math.floor(ay / T) * MW;
      if (p.zt !== zi) { p.zt = zi; p.cross = Math.random() < .4; }
      return p.cross;
    };
    if (ti !== p.ti) { p.ti = ti; if (cur !== ZEBRA && Math.random() < .14) { const nd = (p.dir + (Math.random() < .5 ? 1 : 3)) & 3; if (ok(nd)) p.dir = nd; } }
    if (!ok(p.dir)) {
      let f = false;
      for (const k of (Math.random() < .5 ? [1, 3, 2] : [3, 1, 2])) { const nd = (p.dir + k) & 3; if (ok(nd)) { p.dir = nd; f = true; break; } }
      if (!f) { p.mv = false; return; }
    }
    mx = DX[p.dir]; my = DY[p.dir];
  }
  p.mv = !!(mx || my) && mv(p, mx * sp, my * sp);
  if (mx || my) { p.wt += sp; p.sd = Math.abs(mx) > Math.abs(my) ? (mx < 0 ? 2 : 3) : (my < 0 ? 1 : 0); }
}

/* ----------------------------- player ----------------------------- */
function hurt(d) {
  if (P.inv > 0 || over) return;
  P.hp -= d; P.inv = 50; A.sfx.hurt(); shake = Math.max(shake, 6);
  if (P.hp <= 0) { P.hp = 0; over = { k: 'lost', t: 0 }; g.st.lost++; A.sfx.die(); if (ms) failMission('SIGNAL LOST', true); }
}
function bust() {
  if (over) return;
  over = { k: 'bust', t: 0 }; g.st.bust++; A.sfx.hurt(); A.sfx.die(); if (ms) failMission('BUSTED', true);
}
function overStep() {
  if (++over.t < 170) return;
  const pl = over.k === 'lost' ? PL.CLINIC : PL.STATION, fee = over.k === 'lost' ? 100 : 60 + 40 * g.heat;
  g.cash -= Math.min(g.cash, fee);
  if (P.car) { P.car.drv = false; P.car = null; }
  P.x = pl.x; P.y = pl.y; P.hp = 100; P.inv = 90; P.sd = 0;
  clearHeat(); cars = cars.filter(c => c.ai !== 2); peds = peds.filter(p => !p.cop);
  cam.x = clamp(P.x - W / 2, 0, PW - W); cam.y = clamp(P.y - VH / 2, 0, PH - VH);
  say(over.k === 'lost' ? 'PATCHED UP AT THE CLINIC  -$' + fee : 'RELEASED  -$' + fee, 170);
  over = null; persist();
}
function enterCar() {
  let best = null, bd = 1e9;
  for (const c of cars) { if (c.dead) continue; const d = dist(c.x, c.y, P.x, P.y - 3); if (d < CT[c.tp].l / 2 + 13 && d < bd) { bd = d; best = c; } }
  if (!best) return;
  const c = best;
  if (c.fire) { say('THAT ONE IS ABOUT TO BLOW'); return; }
  if (c.drv && c.ai) { ejectPed(c, c.ai === 2 ? COP : -1, c.ai !== 2); crime(c.ai === 2 ? 45 : 12); }
  if (c.spot) { c.spot.car = null; c.spot.gone = 3600; c.spot = null; }
  P.car = c; c.ai = 0; c.drv = true; c.mine = true; c.out = false; g.st.cars++;
  A.hit.b = false;   // otherwise the same press would also count as "get out" this frame
  A.noise(.06, .12, 900); A.tone(180, .06, 'square', .06);
  say(CT[c.tp].n, 80);
}
function leaveCar() {
  const c = P.car, q = CT[c.tp], rx = Math.cos(c.ang), ry = Math.sin(c.ang), o = q.w / 2 + 7;
  const tryAt = [[c.x - rx * o, c.y - ry * o + 2], [c.x + rx * o, c.y + ry * o + 2], [c.x - Math.sin(c.ang) * (q.l / 2 + 7), c.y + Math.cos(c.ang) * (q.l / 2 + 7)], [c.x, c.y]];
  const s = tryAt.find(a => free(a[0], a[1])) || tryAt[3];
  P.x = s[0]; P.y = s[1]; P.car = null; c.drv = false; P.aT = 0; P.sd = Math.abs(rx) > .7 ? (s[0] < c.x ? 2 : 3) : 0;
  A.noise(.06, .12, 900);
}
/* ---- melee: three-hit combo for the player, one shared hit routine for everyone ---- */
const COMBO = [{ t: 13, dmg: 1, kb: 2.2, stun: 14 }, { t: 13, dmg: 1, kb: 2.6, stun: 16 }, { t: 22, dmg: 2, kb: 5.2, stun: 30 }];
const FDX = [0, 0, -1, 1], FDY = [1, -1, 0, 0];
function faceTo(o, x, y) { const dx = x - o.x, dy = y - o.y; o.sd = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0); }
function hitPed(p, fx, fy, c, byPlayer) {
  p.hp -= c.dmg; p.flash = 8; p.showHp = 170; p.stun = c.stun; p.vx = fx * c.kb; p.vy = fy * c.kb; p.atk = 0;
  for (let k = 0; k < 5; k++) part(p.x - fx * 4, p.y - 8 - fy * 4, fx * 1.2 + rnd(-1, 1), fy * 1.2 + rnd(-1, 1), 11, k & 1 ? CR : '#ffe27a', c.dmg > 1 ? 2 : 1);
  A.sfx.stomp(); if (c.dmg > 1) A.tone(140, .12, 'sawtooth', .09, 60);
  if (p.hp <= 0) { fl(p.x, p.y - 24, 'KO!', C.or); koPed(p, fx * (c.kb + 1), fy * (c.kb + 1), false, byPlayer); return; }
  if (!byPlayer) return;
  if (p.cop || p.mood) { p.fight = 720; p.flee = 0; } else { p.flee = 280; p.fx = P.x; p.fy = P.y; }
  crime(p.cop ? 30 : 5); scare(p.x, p.y, 60);
}
function startPunch() {
  P.combo = P.comboT > 0 ? (P.combo + 1) % 3 : 0; P.punch = COMBO[P.combo].t; P.hitDone = false; P.queue = false;
  let best = null, bd = 26;   // aim assist: turn to whoever is closest
  for (const p of peds) { if (p.ko > 0) continue; const d = dist(p.x, p.y, P.x, P.y); if (d < bd) { bd = d; best = p; } }
  if (best) faceTo(P, best.x, best.y);
  mv(P, FDX[P.sd] * 3, FDY[P.sd] * 3);
  A.noise(.05, .05 + P.combo * .02, 5200 - P.combo * 1300);
}
function playerStrike() {
  const c = COMBO[P.combo], fx = FDX[P.sd], fy = FDY[P.sd], hx = P.x + fx * 10, hy = P.y - 5 + fy * 9;
  let tgt = null, bd = 14;
  for (const p of peds) { if (p.ko > 0) continue; const d = dist(p.x, p.y - 5, hx, hy); if (d < bd) { bd = d; tgt = p; } }
  if (tgt) { hitPed(tgt, fx, fy, c, true); P.comboT = 36; hitStop = P.combo === 2 ? 5 : 2; shake = Math.max(shake, P.combo === 2 ? 5 : 2); if (P.combo === 2 && tgt.hp > 0) fl(tgt.x, tgt.y - 24, 'POW!', CR); return; }
  const car = cars.find(q => nearCar(q, hx, hy, 2));
  if (car) { A.tone(160, .07, 'square', .08, 90); dmgCar(car, 1 + c.dmg); P.comboT = 36; for (let k = 0; k < 3; k++) part(hx, hy, rnd(-1, 1), rnd(-1, 1), 9, '#ffd98a', 1); }
}
function playerFoot() {
  const d = A.down, h = A.hit, ix = (d.right ? 1 : 0) - (d.left ? 1 : 0), iy = (d.down ? 1 : 0) - (d.up ? 1 : 0);
  if (P.comboT > 0) P.comboT--;
  const busy = P.punch > 0;
  if (busy) {
    P.punch--;
    if (!P.hitDone && P.punch <= COMBO[P.combo].t - 4) { P.hitDone = true; playerStrike(); }
    if (h.a) P.queue = true;                       // tap again during a swing: the next hit of the combo follows
    if (P.punch === 0 && P.queue) startPunch();
  } else if (h.a) startPunch();
  P.aT = d.a ? P.aT + 1 : 0;
  if (ix || iy) {
    const n = ix && iy ? .7071 : 1, run = P.aT > 12 && !busy, sp = busy ? .35 : run ? 1.95 : 1.3;
    P.mv = mv(P, ix * n * sp, iy * n * sp); P.wt += sp; if (!busy) P.sd = ix ? (ix < 0 ? 2 : 3) : (iy < 0 ? 1 : 0); P.idle = 0;
    if (run && tick % 7 === 0) part(P.x, P.y, rnd(-.2, .2), -.2, 12, '#d8d4e0', 1);
  } else { P.mv = false; P.wt = 0; P.idle++; }
  if (h.b) enterCar();
}

/* ------------------------------ heat ------------------------------ */
const HEATLV = [15, 45, 90, 140, 200];
function crime(pts) {
  if (over || !g) return;
  g.heatPts = Math.min(240, g.heatPts + pts);
  const lv = HEATLV.filter(v => g.heatPts >= v).length;
  if (lv > g.heat) { g.heat = lv; A.tone(880, .12, 'square', .07); A.tone(660, .14, 'square', .07, 0, 0); }
  g.coolT = 0;
}
function clearHeat() { g.heat = 0; g.heatPts = 0; g.coolT = 0; g.bustT = 0; }
function heatStep() {
  if (g.bustT > 0) { if (g.bustT >= 90 && g.heat > 0) bust(); g.bustT = Math.max(0, g.bustT - 1); }
  if (g.heat <= 0) { g.heatPts = Math.max(0, g.heatPts - .012); g.bustT = 0; return; }
  let near = false, n = 0;
  for (const c of cars) if (c.ai === 2 && !c.dead) { n++; if (dist(c.x, c.y, P.x, P.y) < 150) near = true; }
  for (const p of peds) if (p.cop && !(p.ko > 0) && dist(p.x, p.y, P.x, P.y) < 110) near = true;
  if (near) g.coolT = 0;
  else if (++g.coolT > 380 + g.heat * 140) { clearHeat(); say('HEAT LOST'); A.sfx.check(); return; }
  if (tick % 50 === 0 && n < Math.min(5, g.heat + (g.heat > 2 ? 1 : 0))) spawnOnRoad(5, '#1d1d1a', 2, false);
  if (near && tick % 26 === 0) A.tone((tick / 26) & 1 ? 740 : 560, .22, 'square', .028);
}

/* --------------------------- places, pickups --------------------------- */
function placesStep() {
  if (sprayT > 0) sprayT--;
  const c = P.car, r = PL.RESPRAY, k = PL.CLINIC;
  if (c && sprayT <= 0 && dist(c.x, c.y, r.rx, r.ry) < 18 && Math.abs(c.sp) < 1.2 && (g.heat > 0 || c.hp < CT[c.tp].hp * .9) && !(ms && ms.m.steps[ms.k].clear)) {
    sprayT = 200;
    if (g.cash >= 100) { g.cash -= 100; respray(c); say('RESPRAY + REPAIR  -$100', 150); } else say('RESPRAY COSTS $100', 120);
  }
  if (!c && sprayT <= 0 && P.hp < 100 && dist(P.x, P.y, k.x, k.y) < 13) {
    sprayT = 200;
    if (g.cash >= 50) { g.cash -= 50; P.hp = 100; say('PATCHED UP  -$50', 130); A.sfx.life(); } else { P.hp = Math.max(P.hp, 50); say('CLINIC: $50 FOR A FULL PATCH', 130); }
  }
  for (let n = picks.length - 1; n >= 0; n--) {
    const q = picks[n], px = c ? c.x : P.x, py = c ? c.y : P.y - 3;
    if (q.t !== undefined && --q.t <= 0) { picks.splice(n, 1); continue; }
    if (dist(px, py, q.x, q.y) > (c ? 15 : 11)) continue;
    picks.splice(n, 1);
    if (q.k === 'cash') { g.cash += q.v; fl(q.x, q.y - 8, '+$' + q.v, '#7dff8a'); A.sfx.ember(); }
    else { g.pogs.push(q.i); g.cash += 100; A.sfx.life(); const n2 = g.pogs.length; if (n2 >= pogSpots.length) { g.cash += 2000; bigMsg('ALL POGS!', '+$2000', C.or); } else say('POG ' + n2 + '/' + pogSpots.length + '  +$100', 150); persist(); }
  }
}
function respray(c) {
  let col = c.col; while (col === c.col) col = pick(CCOL);
  if (c.tp !== 5 && c.tp !== 7) c.col = col;
  c.hp = CT[c.tp].hp; c.fire = 0; clearHeat(); flashT = 8; A.sfx.shield();
  for (let k = 0; k < 16; k++) part(c.x + rnd(-8, 8), c.y + rnd(-8, 8), rnd(-.6, .6), rnd(-.6, .6), 24, pick(CCOL), 2);
}

/* ----------------------------- missions ----------------------------- */
function buildMissions() {
  const R = id => [PL[id].rx, PL[id].ry];
  MIS = [
    { n: 'WAKE UP CALL', by: 1, at: 'HOME', pay: 150,
      intro: ['NULL! YOU ARE UP. GOOD.', 'THE NULLSCADE ARCADE NEEDS A DRIVER.', 'GRAB A CAR: STAND NEXT TO ONE, PRESS B.'],
      steps: [{ t: 'car', tx: 'GET IN A CAR - PRESS B NEXT TO ONE' }, { t: 'go', at: R('ARCADE'), in: 'car', tx: 'DRIVE TO THE NULLSCADE ARCADE' }] },
    { n: 'CART RUN', by: 2, at: 'ARCADE', pay: 300,
      intro: ['FOUR GAME CARTS FELL OFF MY TRAIN.', 'THEY ARE SCATTERED ALL OVER TOWN.', 'BRING THEM BACK BEFORE THE SHOW!'],
      steps: [{ t: 'collect', pts: [IX(1, 0), IX(6, 1), IX(5, 4), IX(2, 5)], timer: 150, tx: 'COLLECT THE 4 LOST CARTS' }, { t: 'go', at: R('ARCADE'), tx: 'BRING THE CARTS TO THE ARCADE' }] },
    { n: 'SLEEPY FARE', by: 3, at: 'CLINIC', pay: 400, fragile: 28, failTx: 'XED WOKE UP',
      intro: ['...ZZZ... OH. HEY, NULL.', 'I NEED A RIDE TO THE HOTEL. GENTLY.', 'IF I WAKE UP, I WALK.'],
      steps: [{ t: 'go', at: R('CLINIC'), in: 'car', lock: 1, tx: 'BRING A CAR TO THE CLINIC DOOR' }, { t: 'go', at: R('HOTEL'), in: 'target', tx: 'DRIVE XED TO THE HOTEL - NO CRASHES' }] },
    { n: 'HOT PIXEL', by: 4, at: 'RESPRAY', pay: 700,
      intro: ['SEE THAT YELLOW PIXEL GT AT CARGO BAY?', 'IT IS MINE NOW. YOU JUST FETCH IT.', 'COPS WILL NOTICE. RESPRAY IT, THEN PARK IT AT THE ARCADE.'],
      cars: [{ tp: 2, col: '#ffd23a', at: [104 * T + 8, 52 * T], ang: 0 }],
      steps: [{ t: 'car', target: 1, tx: 'TAKE THE PIXEL GT AT CARGO BAY' }, { t: 'go', at: R('RESPRAY'), in: 'target', heat: 2, clear: 1, tx: 'COPS! GET IT TO THE RESPRAY SHOP' }, { t: 'go', at: R('ARCADE'), in: 'target', tx: 'CLEAN. DELIVER IT TO THE ARCADE' }] },
    { n: 'NO SIGNAL', by: 5, at: 'TOWER', pay: 600,
      intro: ['...KSSHH... THE RELAYS ARE DOWN.', 'TOUCH EVERY RELAY BEFORE THE SIGNAL DIES.', 'FAST. ...KSSHH...'],
      steps: [IX(4, 1), IX(6, 1), IX(7, 2), IX(6, 4), IX(4, 5), IX(2, 4), IX(1, 2), IX(3, 1)].map((p, i) => ({ t: 'go', at: p, timer: i ? undefined : 100, tx: 'RELAY ' + (i + 1) + '/8' })) },
    { n: 'LAMP LIGHT', by: 6, at: 'DINER', pay: 800, fragile: 45, failTx: 'THE LAMPS BROKE',
      intro: ['THE LAMPS. THE BEAUTIFUL LAMPS.', 'TAKE MY VAN TO CARGO BAY AND LOAD UP.', 'THEN LIGHT UP THE PIER. DO NOT BREAK THEM.'],
      cars: [{ tp: 3, col: '#d8c8a8', at: [PL.DINER.x + 44, PL.DINER.y], ang: Math.PI / 2 }],
      steps: [{ t: 'car', target: 1, tx: 'GET IN THE CRT VAN' }, { t: 'go', at: IX(8, 2), in: 'target', lockhp: 1, tx: 'DRIVE THE VAN TO CARGO BAY' }, { t: 'go', at: PIER, in: 'target', tx: 'LAMPS LOADED! GENTLY TO THE PIER' }] },
    { n: 'HEAT CHECK', by: 4, at: 'ARCADE', pay: 1000,
      intro: ['THE COPS ARE WATCHING THE ARCADE.', 'PULL THEM AWAY. GET LOUD: HEAT 3.', 'KEEP THEM BUSY, THEN VANISH.'],
      steps: [{ t: 'heat', n: 3, tx: 'CAUSE TROUBLE: REACH HEAT 3' }, { t: 'survive', sec: 45, tx: 'STAY FREE FOR 45 SECONDS' }, { t: 'cool', tx: 'NOW LOSE THE HEAT' }] },
    { n: 'SAVE FILE 00', by: 7, at: 'HOTEL', pay: 2500,
      intro: ['SOMEONE WIPED THE CITY SAVE FILE.', 'FIVE BACKUP CHIPS ARE STILL OUT THERE.', 'THE COPS WANT THEM TOO. BRING THEM TO THE PIER.'],
      outro: ['SAVED. THE CITY REMEMBERS YOU NOW.', 'THE N-TYPE IS PARKED AT YOUR PAD. IT IS YOURS.', 'NULL CITY IS YOURS. GO ANYWHERE.'],
      steps: [{ t: 'collect', pts: [IX(7, 6), IX(8, 3), IX(5, 0), IX(1, 1), IX(0, 5)], heat: 3, timer: 210, tx: 'GRAB THE 5 BACKUP CHIPS' }, { t: 'go', at: PIER, tx: 'GET TO THE END OF THE PIER' }] }
  ];
}
function startMission(m) {
  ms = { m, k: -1, timer: -1, got: [], car: null, hp0: 0, sT: 0 };
  (m.cars || []).forEach(q => { ms.car = addCar(q.tp, q.col, q.at[0], q.at[1], q.ang, 0); ms.car.keep = true; });
  nextStep();
}
function nextStep() {
  ms.k++;
  if (ms.k >= ms.m.steps.length) return passMission();
  const s = ms.m.steps[ms.k];
  if (s.timer !== undefined) ms.timer = s.timer ? s.timer * 60 : -1;
  if (s.heat) { g.heatPts = Math.max(g.heatPts, HEATLV[s.heat - 1]); g.heat = Math.max(g.heat, s.heat); g.coolT = 0; }
  ms.got = []; ms.sT = 0; say(s.tx, 190); if (ms.k) A.sfx.check();
}
function passMission() {
  const m = ms.m;
  g.cash += m.pay; g.mi++; g.st.jobs++; if (ms.car) ms.car.keep = false; ms = null; msCool = 200; offMark = false;
  bigMsg('JOB DONE', '+$' + m.pay, C.or); A.sfx.clear();
  if (g.mi >= MIS.length) { g.ntype = true; spawnNType(); }
  if (m.outro) dlg = { by: m.by, lines: m.outro, k: 0, wait: 150 };
  persist();
}
function failMission(why, quiet) {
  if (ms.car) ms.car.keep = false;
  ms = null; msCool = 200; offMark = false;
  if (!quiet) { bigMsg('JOB FAILED', why, C.red); A.sfx.die(); }
}
function target() {
  if (!ms) return null;
  const s = ms.m.steps[ms.k];
  if (s.t === 'go') return s.at;
  if (s.t === 'car' && s.target && ms.car) return [ms.car.x, ms.car.y];
  if (s.t === 'collect') { let b = null, bd = 1e9; s.pts.forEach((q, i) => { if (ms.got[i]) return; const d = dist(q[0], q[1], P.x, P.y); if (d < bd) { bd = d; b = q; } }); return b; }
  return null;
}
function missionStep() {
  if (msCool > 0) msCool--;
  if (!ms) {
    if (g.mi >= MIS.length || over) return;
    const m = MIS[g.mi], pl = PL[m.at], d = dist(P.x, P.y, pl.x, pl.y);
    if (d > 26) offMark = true;
    if (!P.car && offMark && msCool <= 0 && d < 12) { offMark = false; A.sfx.ok(); dlg = { by: m.by, lines: m.intro, k: 0, title: m.n, then: () => startMission(m) }; }
    return;
  }
  const s = ms.m.steps[ms.k], c = P.car, px = c ? c.x : P.x, py = c ? c.y : P.y;
  let done = false;
  if (ms.timer > 0 && --ms.timer === 0) return failMission('OUT OF TIME');
  if (ms.car && (ms.car.dead || ms.car.fire)) return failMission('CAR WRECKED');
  if (ms.m.fragile && ms.hp0 && ms.car && ms.car.hp < ms.hp0 - ms.m.fragile) return failMission(ms.m.failTx || 'TOO ROUGH');
  if (s.t === 'car') done = !!c && (!s.target || c === ms.car);
  else if (s.t === 'go') done = dist(px, py, s.at[0], s.at[1]) < 20 && (!s.in || (s.in === 'car' ? !!c : s.in === 'target' ? c === ms.car : !c));
  else if (s.t === 'collect') { s.pts.forEach((q, i) => { if (!ms.got[i] && dist(px, py, q[0], q[1]) < 19) { ms.got[i] = 1; A.sfx.ember(); fl(q[0], q[1] - 10, ms.got.filter(Boolean).length + '/' + s.pts.length, C.or); } }); done = s.pts.every((q, i) => ms.got[i]); }
  else if (s.t === 'heat') done = g.heat >= s.n;
  else if (s.t === 'survive') { g.heatPts = Math.max(g.heatPts, HEATLV[2]); if (g.heat < 3) g.heat = 3; g.coolT = 0; done = ++ms.sT >= s.sec * 60; }
  else if (s.t === 'cool') done = g.heat === 0;
  if (!done) return;
  if (s.lock && c) { ms.car = c; c.keep = true; ms.hp0 = c.hp; }
  if (s.lockhp && ms.car) ms.hp0 = ms.car.hp;
  if (s.clear && ms.car) { respray(ms.car); sprayT = 200; }
  nextStep();
}

/* ------------------------------ step ------------------------------ */
function worldStep() {
  if (hitStop > 0) { hitStop--; return; }   // a few frozen frames sell the impact
  g.clock = (g.clock + 1 / (60 * 60 * 7)) % 1; g.st.time++;
  if (shake > 0) shake--; if (flashT > 0) flashT--;
  if (P.inv > 0) P.inv--;
  if (over) overStep(); else if (!P.car) playerFoot();
  carsStep();
  if (P.car) { P.x = P.car.x; P.y = P.car.y; }
  for (let n = peds.length - 1; n >= 0; n--) { const p = peds[n]; pedStep(p); if (p.dead || dist(p.x, p.y, P.x, P.y) > (p.cop && g.heat > 0 ? 520 : 400)) peds.splice(n, 1); }
  if (!over) { heatStep(); placesStep(); missionStep(); }
  if (tick % 12 === 0) { spawnTraffic(false); spawnPed(false); }
  if (tick % 30 === 0) parkedTick();
  for (let n = parts.length - 1; n >= 0; n--) { const q = parts[n]; q.x += q.vx; q.y += q.vy; q.vx *= .95; q.vy *= .95; if (--q.life <= 0) parts.splice(n, 1); }
  for (let n = floats.length - 1; n >= 0; n--) { floats[n].y -= .4; if (--floats[n].t <= 0) floats.splice(n, 1); }
  if (banner && --banner.t <= 0) banner = null;
  const c = P.car, lx = c ? c.vx * 18 : 0, ly = c ? c.vy * 14 : 0;
  cam.x += (clamp(P.x + lx - W / 2, 0, PW - W) - cam.x) * .12; cam.y += (clamp(P.y + ly - VH / 2 - 4, 0, PH - VH) - cam.y) * .12;
  if (tick % 20 === 0) { const dn = DNAME[districtAt(P.x, P.y)]; if (dn !== distName) { distName = dn; distT = 170; } }
  if (distT > 0) distT--;
  if (g.heat >= 4) { heli.a += .02; heli.x += (P.x + Math.cos(heli.a) * 26 - heli.x) * .04; heli.y += (P.y + Math.sin(heli.a) * 18 - heli.y) * .04; if (tick % 5 === 0) A.noise(.04, .025, 500); }
  else { heli.x = P.x - 200; heli.y = P.y - 160; }
  if (tick % 1800 === 0) persist();
}
const TMENU = () => save ? ['CONTINUE', 'NEW GAME', 'HOW TO PLAY', 'EJECT CART'] : ['NEW GAME', 'HOW TO PLAY', 'EJECT CART'];
const PMENU = ['RESUME', 'CITY MAP', 'STATS', 'HOW TO PLAY', 'SAVE + QUIT'];
function step() {
  tick++;
  const h = A.hit;
  if (st === 'title') {
    const m = TMENU();
    if (confirmNew) { if (h.a || h.start) { confirmNew = false; A.sfx.ok(); newGame(false); persist(); } else if (h.b || h.select) { confirmNew = false; A.sfx.sel(); } return; }
    if (h.up) { mi = (mi + m.length - 1) % m.length; A.sfx.sel(); }
    if (h.down) { mi = (mi + 1) % m.length; A.sfx.sel(); }
    if (h.select || h.b) { A.sfx.sel(); A.exit(); return; }
    if (h.a || h.start) {
      A.sfx.ok(); const it = m[mi];
      if (it === 'CONTINUE') newGame(true);
      else if (it === 'NEW GAME') { if (save) confirmNew = true; else newGame(false); }
      else if (it === 'HOW TO PLAY') { st = 'help'; helpFrom = 'title'; }
      else A.exit();
    }
  } else if (st === 'help' || st === 'stats' || st === 'map') {
    if (h.a || h.b || h.start || h.select) { A.sfx.sel(); st = st === 'help' ? helpFrom : st === 'map' && helpFrom === 'play' ? 'play' : 'pause'; }
  } else if (st === 'pause') {
    if (h.up) { pauseI = (pauseI + PMENU.length - 1) % PMENU.length; A.sfx.sel(); }
    if (h.down) { pauseI = (pauseI + 1) % PMENU.length; A.sfx.sel(); }
    if (h.select || h.b) { st = 'play'; A.sfx.sel(); }
    else if (h.a || h.start) {
      A.sfx.ok();
      if (pauseI === 0) st = 'play'; else if (pauseI === 1) { st = 'map'; helpFrom = 'pause'; } else if (pauseI === 2) st = 'stats'; else if (pauseI === 3) { st = 'help'; helpFrom = 'pause'; }
      else { if (ms) failMission('', true); persist(); load(); st = 'title'; mi = 0; }
    }
  } else {
    if (dlg) {
      if (dlg.wait > 0) { dlg.wait--; worldStep(); return; }
      if (h.a || h.start || h.b) { A.sfx.sel(); if (++dlg.k >= dlg.lines.length) { const t = dlg.then; dlg = null; if (t) t(); } }
      return;
    }
    if (h.select) { st = 'pause'; pauseI = 0; A.sfx.sel(); return; }
    if (h.start) { st = 'map'; helpFrom = 'play'; A.sfx.sel(); return; }
    worldStep();
  }
}

/* ------------------------------ render ------------------------------ */
const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x | 0, y | 0, w, h); };
function sky() {
  const h = g.clock * 24; let dark = 0, warm = 0;
  if (h >= 16 && h < 19) warm = (h - 16) / 3;
  else if (h >= 19 && h < 21) { warm = 1 - (h - 19) / 2; dark = (h - 19) / 2; }
  else if (h >= 21 || h < 5) dark = 1;
  else if (h < 7) { dark = 1 - (h - 5) / 2; warm = Math.sin((h - 5) / 2 * Math.PI) * .6; }
  return { dark, warm };
}
function ring(x, y, col, ph) {
  const k = ((tick + (ph || 0)) % 40) / 40, r = 6 + k * 9;
  ctx.globalAlpha = 1 - k; ctx.fillStyle = col;
  ctx.fillRect(x - r, y - r * .6, r * 2, 1); ctx.fillRect(x - r, y + r * .6, r * 2 + 1, 1); ctx.fillRect(x - r, y - r * .6, 1, r * 1.2); ctx.fillRect(x + r, y - r * .6, 1, r * 1.2);
  ctx.globalAlpha = .18; ctx.fillRect(x - 5, y - 46, 10, 46); ctx.globalAlpha = .12; ctx.fillRect(x - 3, y - 60, 6, 60);
  ctx.globalAlpha = 1; ctx.fillRect(x - 6, y - 4, 12, 1); ctx.fillRect(x - 6, y + 3, 12, 1); ctx.fillRect(x - 6, y - 4, 1, 8); ctx.fillRect(x + 5, y - 4, 1, 8);
}
function drawPerson(o, si, isP) {
  const x = Math.round(o.x), y = Math.round(o.y);
  if (o.ko > 0) {
    if (o.out && o.ko < 70 && (tick >> 2) & 1) return;
    R(x - 7, y - 2, 14, 3, 'rgba(16,10,30,.28)');
    ctx.save(); ctx.translate(x, y - 3); ctx.rotate(Math.PI / 2); ctx.drawImage(spr(si, 0, 0), -10, -10); ctx.restore();
    if (!o.out) for (let k = 0; k < 3; k++) { const a = tick * .12 + k * 2.1; R(x - 6 + Math.cos(a) * 6, y - 13 + Math.sin(a) * 2, 2, 2, '#ffe27a'); }
    return;
  }
  R(x - 4, y - 1, 8, 2, 'rgba(16,10,30,.28)');
  if (isP && P.inv > 0 && (tick >> 2) & 1) return;
  const f = o.mv ? (Math.floor(o.wt / 5) & 3) : 0, fx = FDX[o.sd], fy = FDY[o.sd];
  const fist = (reach, big) => { const s = big ? 4 : 3; R(x + fx * (reach - 3) - 1, y - 9 + fy * (reach - 4), 3, 3, K); R(x + fx * reach - (s >> 1), y - 9 + fy * (reach - 2) - (big ? 1 : 0), s, s, CR); if (big) for (let k = 1; k < 4; k++) R(x + fx * (reach - k * 3) - (fy ? 3 : 0), y - 8 + fy * (reach - 2 - k * 3) - (fx ? 3 : 0), fy ? 7 : 2, fx ? 7 : 2, 'rgba(242,239,232,.35)'); };
  if (!isP) {
    const sh = o.flash > 0 ? ((tick & 1) * 2 - 1) : 0, swing = o.atk > 0 && o.atk <= 10 && o.atk > 4;
    ctx.drawImage(spr(si, o.sd, f), x - 8 + sh + (swing ? fx * 2 : 0), y - 19 + (swing ? fy * 2 : 0));
    if (o.flash > 4) { R(x - 5, y - 15, 3, 3, CR); R(x + 3, y - 11, 2, 2, '#ffe27a'); }
    if (swing) fist(10, o.mood === 2);
    else if (o.atk > 10) { R(x - 1, y - 28, 3, 5, C.or); R(x - 1, y - 22, 3, 2, C.or); R(x + fx * 3 - 1, y - 14, 3, 3, CR); }   // winding up
    if (o.showHp > 0 && o.maxhp) { R(x - 7, y - 24, 14, 4, C.ink); R(x - 6, y - 23, Math.max(0, Math.round(12 * o.hp / o.maxhp)), 2, o.hp * 2 <= o.maxhp ? C.hp : '#7dff8a'); }
    return;
  }
  const pc = COMBO[P.combo], act = P.punch > 0 && P.punch <= pc.t - 2 && P.punch >= pc.t - 9;
  ctx.drawImage(spr(si, o.sd, P.punch > 0 ? 0 : f), x - 8 + (act ? fx * 2 : 0), y - 19 + (act ? fy * 2 : 0));
  if (isP) {
    if (act) fist(P.combo === 2 ? 12 : 10, P.combo === 2);
    else if (P.idle > 200 && P.sd === 0) { R(x + 3, y - 9, 3, 4, '#e0352b'); R(x + 4, y - 8, 1, 2, '#ffd0d0'); }
  }
}
function drawCar(c) {
  const q = CT[c.tp], a = Math.round(c.ang / (TAU / 32)) * (TAU / 32), s = carSpr(c.tp, c.dead ? '#2e2a34' : c.col), x = Math.round(c.x), y = Math.round(c.y), ox = -Math.ceil((q.w + 2) / 2), oy = -Math.ceil(q.l / 2);
  ctx.save(); ctx.translate(x + 2, y + 3); ctx.rotate(a); ctx.fillStyle = 'rgba(16,10,30,.3)'; ctx.fillRect(ox + 1, oy, q.w, q.l); ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  if (c.tp === 7 && !c.dead) { ctx.fillStyle = 'rgba(255,106,43,.35)'; ctx.fillRect(ox - 1, oy + 2, q.w + 4, q.l - 4); }
  ctx.drawImage(s, ox, oy);
  if (c.tp === 5 && !c.dead) { const on = c.ai === 2 && g.heat > 0, f = (tick >> 3) & 1; ctx.fillStyle = on && f ? '#ff3a3a' : '#8a2a2a'; ctx.fillRect(ox + 3, oy + 10, 3, 2); ctx.fillStyle = on && !f ? '#5a8aff' : '#2a3a8a'; ctx.fillRect(ox + 7, oy + 10, 3, 2); }
  if (c.dead) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(ox + 1, oy, q.w, q.l); }
  ctx.restore();
}
function drawWheel(d, night) {
  const x = d.x, y = d.y, cy2 = y - 36, r = 28, a0 = tick * .004;
  ctx.strokeStyle = '#6a2a8a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, cy2); ctx.lineTo(x - 15, y); ctx.moveTo(x, cy2); ctx.lineTo(x + 15, y); ctx.stroke();
  ctx.strokeStyle = '#d64fb0'; ctx.lineWidth = 1; ctx.beginPath();
  for (let k = 0; k < 8; k++) { const a = a0 + k * TAU / 8; ctx.moveTo(x, cy2); ctx.lineTo(x + Math.cos(a) * r, cy2 + Math.sin(a) * r); }
  ctx.stroke();
  for (let k = 0; k < 32; k++) { const a = k * TAU / 32; R(x + Math.cos(a) * r - 1, cy2 + Math.sin(a) * r - 1, 2, 2, '#f09ac4'); }
  for (let k = 0; k < 8; k++) { const a = a0 + k * TAU / 8, bx = x + Math.cos(a) * r, by = cy2 + Math.sin(a) * r; R(bx - 2, by, 5, 5, CCOL[k]); R(bx - 2, by, 5, 1, '#f2efe8'); if (night) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * .5; R(bx - 4, by - 2, 9, 9, CCOL[k]); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; } }
  R(x - 3, cy2 - 3, 6, 6, '#f2efe8'); R(x - 17, y - 1, 34, 3, '#6a2a8a');
}
function drawWorld() {
  const sx = shake ? ((Math.random() * shake) | 0) - (shake >> 1) : 0;
  const cx = clamp(Math.round(cam.x) + sx, 0, PW - W), cy = clamp(Math.round(cam.y), 0, PH - VH), sk = sky();
  ctx.save(); ctx.beginPath(); ctx.rect(0, TOP, W, VH); ctx.clip();
  ctx.drawImage(gnd, cx, cy, W, VH, 0, TOP, W, VH);
  ctx.translate(-cx, TOP - cy);
  // water shimmer
  const tx0 = cx >> 4, ty0 = cy >> 4;
  for (let ty = ty0; ty <= ty0 + 12; ty++) for (let tx = tx0; tx <= tx0 + 20; tx++) if (tAt(tx, ty) === WATER) { const hv = hash(tx, ty); if (hv < .6) R(tx * 16 + ((hv * 64 + tick / 7) % 13), ty * 16 + 2 + ((hv * 977) % 12 | 0), 3, 1, '#6f9cf0'); }
  ctx.fillStyle = 'rgba(20,16,30,.3)'; for (const s of skids) ctx.fillRect(s.x - 1, s.y - 1, 2, 2);
  // place markers
  const mk = [];
  if (PL.RESPRAY && (g.heat > 0 || P.car)) mk.push([PL.RESPRAY.rx, PL.RESPRAY.ry, '#ff7ad8']);
  if (P.hp < 100) mk.push([PL.CLINIC.x, PL.CLINIC.y, '#7dff8a']);
  const tg = target();
  if (ms) { const s = ms.m.steps[ms.k]; if (s.t === 'collect') s.pts.forEach((q, i) => { if (!ms.got[i]) mk.push([q[0], q[1], C.or, i * 9]); }); else if (tg && s.t === 'go') mk.push([tg[0], tg[1], C.or]); }
  else if (g.mi < MIS.length && msCool <= 0) { const pl = PL[MIS[g.mi].at]; mk.push([pl.x, pl.y, '#ffe27a']); }
  for (const q of mk) if (onScreen(q[0], q[1], 30)) ring(q[0], q[1], q[2], q[3]);
  for (const q of picks) if (onScreen(q.x, q.y)) {
    const b = Math.round(Math.sin(tick / 9 + q.x) * 2);
    R(q.x - 3, q.y + 3, 7, 2, 'rgba(16,10,30,.3)');
    if (q.k === 'cash') { if (q.t > 120 || (tick >> 2) & 1) { R(q.x - 4, q.y - 4 + b, 9, 6, '#2f8a5a'); R(q.x - 3, q.y - 3 + b, 7, 4, '#7dff8a'); R(q.x, q.y - 2 + b, 1, 2, '#2f8a5a'); } }
    else { const w = Math.round(Math.abs(Math.cos(tick / 14 + q.i)) * 5) + 1, y = q.y - 3 + b; ell(ctx, q.x, y, w + 1, 7, C.ink); ell(ctx, q.x, y, w, 6, C.or); if (w > 2) { ell(ctx, q.x, y, w - 2, 4, '#ffb27a'); R(q.x - 1, y - 1, 2, 2, C.ink); R(q.x - w + 1, y - 3, 1, 2, '#fff0c8'); } }
  }
  // people + cars, back to front
  const list = [];
  for (const c of cars) if (onScreen(c.x, c.y, 30)) list.push([c.y + 3, 1, c]);
  for (const p of peds) if (onScreen(p.x, p.y)) list.push([p.y, 0, p]);
  if (!P.car && !(over && over.k === 'bust' && over.t > 120)) list.push([P.y, 2, P]);
  if (!ms && g.mi < MIS.length) { const m = MIS[g.mi], pl = PL[m.at]; if (onScreen(pl.x, pl.y)) list.push([pl.y - 9, 3, { x: pl.x + 10, y: pl.y - 8, sd: 0, wt: 0, mv: false, si: m.by }]); }
  list.sort((a, b) => a[0] - b[0]);
  for (const e of list) { if (e[1] === 1) drawCar(e[2]); else drawPerson(e[2], e[1] === 2 ? 0 : e[2].si, e[1] === 2); }
  for (const q of parts) R(q.x - (q.sz >> 1), q.y - (q.sz >> 1), q.sz, q.sz, q.col);
  ctx.drawImage(top, cx, cy, W, VH, cx, cy, W, VH);
  for (const d of deco) if (d.k === 'wheel' && onScreen(d.x, d.y - 30, 60)) drawWheel(d, sk.dark);
  // light and weather
  if (sk.warm > 0) R(cx, cy, W, VH, 'rgba(255,92,120,' + (sk.warm * .2).toFixed(3) + ')');
  if (sk.dark > 0) R(cx, cy, W, VH, 'rgba(14,10,62,' + (sk.dark * .56).toFixed(3) + ')');
  ctx.globalCompositeOperation = 'lighter';
  if (sk.dark > 0) { ctx.globalAlpha = sk.dark; ctx.drawImage(lit, cx, cy, W, VH, cx, cy, W, VH); ctx.globalAlpha = 1; }
  for (const c of cars) {
    if (c.dead || !onScreen(c.x, c.y, 60)) continue;
    const fx = Math.sin(c.ang), fy = -Math.cos(c.ang), rx = -fy, ry = fx, hl = CT[c.tp].l / 2;
    if (sk.dark > .15 && c.drv) {
      ctx.fillStyle = 'rgba(255,236,170,' + (sk.dark * .2).toFixed(3) + ')'; ctx.beginPath();
      ctx.moveTo(c.x + fx * hl - rx * 4, c.y + fy * hl - ry * 4); ctx.lineTo(c.x + fx * hl + rx * 4, c.y + fy * hl + ry * 4); ctx.lineTo(c.x + fx * (hl + 44) + rx * 15, c.y + fy * (hl + 44) + ry * 15); ctx.lineTo(c.x + fx * (hl + 44) - rx * 15, c.y + fy * (hl + 44) - ry * 15); ctx.fill();
      R(c.x - fx * hl - rx * 3 - 1, c.y - fy * hl - ry * 3 - 1, 2, 2, 'rgba(255,40,40,.8)'); R(c.x - fx * hl + rx * 3 - 1, c.y - fy * hl + ry * 3 - 1, 2, 2, 'rgba(255,40,40,.8)');
    }
    if (c.ai === 2 && g.heat > 0) glow(ctx, c.x, c.y, 26, (tick >> 3) & 1 ? '#ff3030' : '#3060ff', .5);
    if (c.fire) glow(ctx, c.x, c.y, 30, '#ff8a2a', .5 + Math.random() * .2);
  }
  if (flashT > 0) R(cx, cy, W, VH, 'rgba(255,240,200,' + (flashT / 14).toFixed(2) + ')');
  if (g.heat >= 4) glow(ctx, heli.x, heli.y, 40, '#fff6d0', .4);
  ctx.globalCompositeOperation = 'source-over';
  if (g.heat >= 4) {
    const hx = Math.round(heli.x + 34), hy = Math.round(heli.y - 44);
    R(hx - 6, hy + 30, 18, 6, 'rgba(10,6,24,.3)');
    R(hx - 5, hy - 3, 12, 7, '#1d1d1a'); R(hx + 7, hy - 1, 9, 2, '#1d1d1a'); R(hx + 15, hy - 3, 2, 5, '#1d1d1a'); R(hx - 4, hy - 2, 5, 3, '#7f9fd8'); R(hx - 3, hy + 4, 9, 1, '#6f6d68');
    const a = tick * .9; ctx.strokeStyle = 'rgba(240,240,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx + 1 - Math.cos(a) * 13, hy - 4 - Math.sin(a) * 3); ctx.lineTo(hx + 1 + Math.cos(a) * 13, hy - 4 + Math.sin(a) * 3); ctx.stroke();
  }
  for (const f of floats) A.txt(f.s, f.x, f.y, f.col, 8, 'center', true);
  // bouncing arrows over job things
  if (!ms && g.mi < MIS.length && msCool <= 0) { const pl = PL[MIS[g.mi].at]; if (onScreen(pl.x, pl.y)) { const b = Math.round(Math.sin(tick / 8) * 2); R(pl.x - 3, pl.y - 40 + b, 6, 8, C.ink); R(pl.x - 2, pl.y - 39 + b, 4, 4, '#ffe27a'); R(pl.x - 2, pl.y - 34 + b, 4, 2, '#ffe27a'); } }
  if (ms && ms.m.steps[ms.k].t === 'car' && ms.car && !P.car) { const b = Math.round(Math.sin(tick / 8) * 2), q = ms.car; for (let k = 0; k < 4; k++) R(q.x - 3 + k, q.y - 26 + b + k, 7 - k * 2, 1, C.or); }
  ctx.restore();
  // off-screen pointer to the current objective
  const pt = tg || (!ms && g.mi < MIS.length ? [PL[MIS[g.mi].at].x, PL[MIS[g.mi].at].y] : null);
  if (pt && !onScreen(pt[0], pt[1], -8)) {
    const a = Math.atan2(pt[1] - (cy + VH / 2), pt[0] - (cx + W / 2)), ex = clamp(W / 2 + Math.cos(a) * 200, 10, W - 10), ey = clamp(TOP + VH / 2 + Math.sin(a) * 120, TOP + 18, TOP + VH - 10), col = ms ? C.or : '#ffe27a';
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -6); ctx.lineTo(-5, 6); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3, -4); ctx.lineTo(-3, 4); ctx.fill(); ctx.restore();
  }
}
function wrap(s, n) { const out = []; let line = ''; s.split(' ').forEach(w => { if ((line + ' ' + w).trim().length > n) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); }); if (line) out.push(line); return out; }
const pad2 = n => String(n).padStart(2, '0');
function drawRadar() {
  const S = 46, x0 = 4, y0 = TOP + VH - S - 4, px = P.x / T, py = P.y / T, sx = Math.round(px - S / 2), sy = Math.round(py - S / 2);
  R(x0 - 2, y0 - 2, S + 4, S + 4, C.ink); R(x0, y0, S, S, '#1f4a3a');
  const ax = Math.max(0, sx), ay = Math.max(0, sy), bx = Math.min(MW, sx + S), by = Math.min(MH, sy + S);
  if (bx > ax && by > ay) ctx.drawImage(mini, ax, ay, bx - ax, by - ay, x0 + ax - sx, y0 + ay - sy, bx - ax, by - ay);
  const blip = (wx, wy, col, sz, edge) => { let bx2 = wx / T - sx, by2 = wy / T - sy; if (!edge && (bx2 < 0 || by2 < 0 || bx2 >= S || by2 >= S)) return; bx2 = clamp(bx2, 1, S - 2); by2 = clamp(by2, 1, S - 2); R(x0 + bx2 - (sz >> 1), y0 + by2 - (sz >> 1), sz, sz, col); };
  blip(PL.RESPRAY.rx, PL.RESPRAY.ry, '#ff7ad8', 3); blip(PL.CLINIC.x, PL.CLINIC.y, '#7dff8a', 3); blip(PL.HOME.x, PL.HOME.y, '#9fd8f2', 3);
  for (const c of cars) if (c.ai === 2 && g.heat > 0) blip(c.x, c.y, (tick >> 3) & 1 ? '#ff3a3a' : '#5a8aff', 3);
  const tg = target();
  if (ms) { const s = ms.m.steps[ms.k]; if (s.t === 'collect') s.pts.forEach((q, i) => { if (!ms.got[i]) blip(q[0], q[1], C.or, 3, true); }); else if (tg && (tick >> 3) & 3) blip(tg[0], tg[1], C.or, 4, true); }
  else if (g.mi < MIS.length && (tick >> 3) & 3) { const pl = PL[MIS[g.mi].at]; blip(pl.x, pl.y, '#ffe27a', 4, true); }
  R(x0 + S / 2 - 2, y0 + S / 2 - 2, 4, 4, C.ink); R(x0 + S / 2 - 1, y0 + S / 2 - 1, 2, 2, CR);
}
function drawHud() {
  R(0, 0, W, TOP, C.ink);
  A.txt('$' + g.cash, 6, 9, '#7dff8a', 8, 'left', true);
  A.txt('HEAT', 88, 9, g.heat ? C.or : C.mid);
  for (let i = 0; i < 5; i++) R(120 + i * 9, 3, 6, 6, i < g.heat ? (g.coolT > 60 && (tick >> 3) & 1 ? C.mid : C.or) : '#3a3a36');
  const hh = g.clock * 24; A.txt(pad2(hh | 0) + ':' + pad2(((hh % 1) * 6 | 0) * 10), 206, 9, C.l2, 8, 'center');
  A.txt('HP', 236, 9, C.l2); R(252, 3, 60, 6, '#3a3a36'); R(252, 3, Math.round(60 * P.hp / 100), 6, P.hp < 30 && (tick >> 3) & 1 ? CR : C.hp);
  R(0, H - 12, W, 12, C.ink);
  A.txt('ESC MENU  ENTER MAP', 8, H - 3, C.l2);
  A.txt(P.car ? 'A BRAKE  B GET OUT' : 'A PUNCH/RUN  B GET IN', W - 8, H - 3, C.cream, 8, 'right');
  // objective strip
  R(0, TOP, W, 11, 'rgba(20,18,26,.8)');
  if (ms) {
    const s = ms.m.steps[ms.k]; A.txt(s.tx, 5, TOP + 8, C.cream);
    let r = '';
    if (s.t === 'survive') r = Math.ceil(s.sec - ms.sT / 60) + 'S'; else if (ms.timer > 0) { const sec = Math.ceil(ms.timer / 60); r = ((sec / 60) | 0) + ':' + pad2(sec % 60); }
    if (r && (ms.timer > 600 || ms.timer < 0 || (tick >> 3) & 1)) A.txt(r, W - 5, TOP + 8, C.or, 8, 'right', true);
  } else if (g.mi < MIS.length) A.txt('JOB ' + (g.mi + 1) + '/' + MIS.length + ': WALK TO THE YELLOW MARKER', 5, TOP + 8, '#ffe27a');
  else A.txt('ALL JOBS DONE - THE CITY IS YOURS', 5, TOP + 8, C.l2);
  if (distT > 0 && !banner) { ctx.globalAlpha = Math.min(1, distT / 30); A.txt(distName, W - 5, TOP + 22, C.ink, 8, 'right', true); A.txt(distName, W - 6, TOP + 21, C.cream, 8, 'right', true); ctx.globalAlpha = 1; }
  drawRadar();
  if (P.car) { const q = CT[P.car.tp], k = clamp(P.car.hp / q.hp, 0, 1); R(54, TOP + VH - 20, 66, 16, 'rgba(20,18,26,.8)'); A.txt(q.n, 58, TOP + VH - 12, C.cream); R(58, TOP + VH - 9, 58, 3, '#3a3a36'); R(58, TOP + VH - 9, Math.round(58 * k), 3, k < .3 ? C.hp : k < .6 ? C.or : '#7dff8a'); }
  if (g.bustT > 4 && !over) { R(W / 2 - 42, TOP + VH - 22, 84, 14, C.ink); R(W / 2 - 40, TOP + VH - 12, clamp(g.bustT / 90, 0, 1) * 80, 2, C.hp); A.txt('COPS ON YOU - MOVE!', W / 2, TOP + VH - 14, (tick >> 2) & 1 ? C.hp : CR, 8, 'center'); }
  if (banner) {
    if (banner.big) { R(0, TOP + 58, W, 46, 'rgba(20,18,26,.86)'); R(0, TOP + 58, W, 2, banner.col); R(0, TOP + 102, W, 2, banner.col); A.big(banner.s, W / 2 + 4, TOP + 86, 24, banner.col); if (banner.sub) A.txt(banner.sub, W / 2, TOP + 98, C.cream, 8, 'center', true); }
    else { ctx.font = '700 8px Silkscreen, monospace'; const w = Math.min(W - 8, (ctx.measureText(banner.s).width || banner.s.length * 6) + 14); R((W - w) / 2, TOP + 28, w, 13, 'rgba(20,18,26,.86)'); A.txt(banner.s, W / 2, TOP + 37, C.cream, 8, 'center', true); }
  }
  if (over) {
    R(0, TOP, W, VH, 'rgba(20,18,26,' + Math.min(.7, over.t / 60).toFixed(2) + ')');
    if (over.k === 'lost') { A.big('SIGNAL', W / 2 + 4, TOP + 84, 32, C.hp); A.big('LOST', W / 2 + 4, TOP + 116, 32, C.hp); }
    else { A.big('BUSTED', W / 2 + 4, TOP + 100, 32, '#5a8aff'); R(0, TOP + 60, W, 3, (tick >> 3) & 1 ? '#ff3a3a' : '#5a8aff'); R(0, TOP + 112, W, 3, (tick >> 3) & 1 ? '#5a8aff' : '#ff3a3a'); }
  }
  if (dlg && !(dlg.wait > 0)) {
    const y = TOP + VH - 64;
    R(4, y, W - 8, 60, C.ink); R(6, y + 2, W - 12, 56, C.bg); ctx.fillStyle = C.l1; for (let yy = y + 4; yy < y + 58; yy += 4) ctx.fillRect(6, yy, W - 12, 1);
    R(10, y + 6, 52, 48, C.ink); R(12, y + 8, 48, 44, STY[dlg.by].tee); ctx.drawImage(spr(dlg.by, 0, 0), 0, 0, 16, 15, 12, y + 8, 48, 45);
    A.txt(STY[dlg.by].n, 68, y + 14, C.or, 8, 'left', true); if (dlg.title && dlg.k === 0) A.txt('JOB: ' + dlg.title, W - 12, y + 14, C.mid, 8, 'right');
    wrap(dlg.lines[dlg.k], 36).forEach((l, i) => A.txt(l, 68, y + 27 + i * 10, C.ink));
    if ((tick >> 4) & 1) A.tri(W - 18, y + 48, C.or); A.txt((dlg.k + 1) + '/' + dlg.lines.length, W - 24, y + 53, C.mid, 8, 'right');
  }
}
function paper() { R(0, TOP, W, VH, C.bg); ctx.fillStyle = C.l1; for (let y = TOP + 2; y < TOP + VH; y += 4) ctx.fillRect(0, y, W, 1); }
function bars(l, r, t) { R(0, 0, W, TOP, C.ink); A.big(t || 'NULL CITY', 40, 9, 8, C.cream); R(W - 28, 2, 1, 8, C.or); A.txt('01', W - 8, 9, C.cream, 8, 'right'); R(0, H - 12, W, 12, C.ink); A.txt(l, 8, H - 3, C.l2); A.txt(r, W - 8, H - 3, C.cream, 8, 'right'); }
let titleArt = null, heroArt = null;
function mkHero() {
  const c = mkc(96, 160), q = c.getContext('2d'), p = (x, y, w, h, col) => { q.fillStyle = col; q.fillRect(x, y, w, h); }, o = 8;
  const J = '#3f5486', JD = '#2f4170', JL = '#5a70a8', TE = '#f2efe8', TS = '#d8d2c2', SH = '#e9e2d0', RD = '#e0352b';
  // baggy jeans
  poly(q, [[22, 96 + o], [47, 96 + o], [46, 138 + o], [16, 138 + o]], J); poly(q, [[49, 96 + o], [74, 96 + o], [80, 138 + o], [50, 138 + o]], J);
  p(22, 96 + o, 52, 5, J); p(46, 100 + o, 4, 38, JD); p(22, 96 + o, 52, 1, JD); p(44, 97 + o, 8, 3, JD);
  poly(q, [[23, 102 + o], [26, 102 + o], [20, 136 + o], [17, 136 + o]], JL); poly(q, [[52, 102 + o], [55, 102 + o], [54, 136 + o], [51, 136 + o]], JL);
  [[20, 118, 20], [24, 126, 18], [18, 132, 26], [54, 114, 18], [58, 124, 20], [52, 131, 26]].forEach(([x, y, w]) => p(x, y + o, w, 1, JD));
  p(15, 134 + o, 32, 5, JD); p(49, 134 + o, 32, 5, JD); p(16, 134 + o, 30, 1, JL); p(50, 134 + o, 30, 1, JL);
  // sneakers
  poly(q, [[12, 139 + o], [46, 139 + o], [47, 150 + o], [8, 150 + o]], SH); poly(q, [[50, 139 + o], [84, 139 + o], [88, 150 + o], [49, 150 + o]], SH);
  p(8, 147 + o, 39, 3, '#b8b0a0'); p(49, 147 + o, 39, 3, '#b8b0a0'); p(8, 150 + o, 39, 1, K); p(49, 150 + o, 39, 1, K);
  [[18, 141], [58, 141]].forEach(([x, y]) => { p(x, y + o, 14, 1, '#c8c0ae'); p(x + 1, y + 3 + o, 12, 1, '#c8c0ae'); p(x + 5, y - 1 + o, 4, 5, '#ffffff'); });
  // tee
  poly(q, [[24, 60 + o], [72, 60 + o], [77, 99 + o], [19, 99 + o]], TE);
  poly(q, [[26, 60 + o], [10, 70 + o], [8, 86 + o], [23, 86 + o]], TE); poly(q, [[70, 60 + o], [86, 70 + o], [88, 86 + o], [73, 86 + o]], TE);
  ell(q, 48, 62 + o, 21, 6, TS); p(8, 84 + o, 15, 2, TS); p(73, 84 + o, 15, 2, TS); p(22, 70 + o, 1, 26, TS); p(73, 70 + o, 1, 26, TS);
  poly(q, [[62, 66 + o], [76, 66 + o], [77, 99 + o], [66, 99 + o]], '#e6e0d2'); p(28, 92 + o, 30, 1, TS); p(19, 97 + o, 58, 2, TS);
  p(30, 74 + o, 3, 10, '#ff6a2b'); p(38, 74 + o, 3, 10, '#ff6a2b'); poly(q, [[30, 74 + o], [33, 74 + o], [41, 84 + o], [38, 84 + o]], '#ff6a2b');
  // left arm down, right arm up with the phone
  poly(q, [[9, 86 + o], [21, 86 + o], [20, 106 + o], [11, 106 + o]], K); ell(q, 15, 108 + o, 6, 5, K);
  poly(q, [[74, 86 + o], [87, 86 + o], [80, 102 + o], [68, 97 + o]], K);
  p(58, 76 + o, 13, 22, '#8a1a14'); p(59, 77 + o, 11, 20, RD); p(61, 79 + o, 7, 13, '#ffd0d0'); p(61, 79 + o, 7, 3, '#ffffff'); ell(q, 71, 98 + o, 6, 5, K); p(64, 95 + o, 5, 3, K);
  // head: blob, three spikes, headphones, heavy-lidded eyes
  poly(q, [[23, 30 + o], [36, 16 + o], [6, 2 + o]], K); poly(q, [[73, 30 + o], [60, 16 + o], [90, 2 + o]], K); poly(q, [[38, 20 + o], [58, 20 + o], [48, -8 + o]], K);
  ell(q, 48, 38 + o, 31, 25, K);
  poly(q, [[19, 28 + o], [25, 21 + o], [29, 24 + o], [23, 31 + o]], RD); poly(q, [[77, 28 + o], [71, 21 + o], [67, 24 + o], [73, 31 + o]], RD);
  ell(q, 16, 42 + o, 8, 12, '#8a1a14'); ell(q, 15, 42 + o, 7, 11, RD); ell(q, 14, 42 + o, 4, 7, '#a8241c'); ell(q, 80, 42 + o, 8, 12, '#8a1a14'); ell(q, 81, 42 + o, 7, 11, RD); ell(q, 82, 42 + o, 4, 7, '#a8241c');
  p(11, 36 + o, 2, 5, '#ff8a80'); p(83, 36 + o, 2, 5, '#ff8a80');
  poly(q, [[27, 35 + o], [45, 42 + o], [45, 52 + o], [29, 52 + o]], CR); poly(q, [[69, 35 + o], [51, 42 + o], [51, 52 + o], [67, 52 + o]], CR);
  p(38, 43 + o, 6, 9, K); p(52, 43 + o, 6, 9, K); p(39, 45 + o, 2, 2, CR); p(53, 45 + o, 2, 2, CR); p(29, 51 + o, 16, 1, '#c8c2b4'); p(51, 51 + o, 16, 1, '#c8c2b4');
  p(46, 2 + o, 2, 9, '#2a2732'); p(33, 24 + o, 6, 1, '#2a2732');
  return c;
}
function mkTitle() {
  const c = mkc(W, VH), q = c.getContext('2d'), p = (x, y, w, h, col) => { q.fillStyle = col; q.fillRect(x, y, w, h); }, r = rng(777);
  const bands = ['#2a1458', '#3f1a70', '#6a2488', '#a03090', '#d84a84', '#f0707a', '#ff9a6a', '#ffc46b'];
  bands.forEach((col, i) => { p(0, i * 14, W, 14, col); if (i) for (let x = i & 1; x < W; x += 2) p(x, i * 14, 1, 2, bands[i - 1]); });
  for (let i = 0; i < 30; i++) p(r() * W | 0, r() * 34 | 0, 1, 1, '#f7c4d4');
  for (let y = -46; y <= 0; y++) { const w = Math.floor(Math.sqrt(46 * 46 - y * y)); if ((y + 46) % 8 < 6 || y < -30) p(150 - w, 112 + y, w * 2, 1, y < -26 ? '#fff0b0' : y < -12 ? '#ffe27a' : '#ffc46b'); }
  [['#8a2a86', 14, 40], ['#4a1668', 8, 26]].forEach((L, li) => { let x = -4; while (x < W) { const w = 10 + (r() * 16 | 0), h = L[1] + (r() * (L[2] - L[1]) | 0); p(x, 112 - h, w, h, L[0]); if (r() < .3) p(x + (w >> 1), 112 - h - 6, 1, 6, L[0]); for (let k = 0; k < 5; k++) if (r() < .6) p(x + 2 + (r() * (w - 4) | 0), 112 - h + 3 + (r() * (h - 6) | 0), 2, 2, li ? '#ffd98a' : '#f0707a'); x += w + (r() * 3 | 0); } });
  p(0, 112, W, 80, '#33125e'); for (let y = 114; y < 150; y += 3) { const w = 44 - (y - 114) * .7; p(150 - w + (r() * 8 | 0), y, w * 2, 1, y % 2 ? '#ff9a6a' : '#f0707a'); if (r() < .7) p(r() * W | 0, y, 10 + (r() * 30 | 0), 1, '#5a2488'); }
  p(0, 150, W, 42, '#1c0b33'); p(0, 150, W, 2, '#6a2488'); for (let x = 6; x < W; x += 22) p(x, 172, 12, 2, '#4a1e78');
  [[14, 150, -1], [300, 150, 1], [282, 150, -1]].forEach(([x, y, lean], n) => { for (let k = 0; k < 62 - n * 8; k++) p(x + Math.round(lean * k * k / 420), y - k, 3, 1, '#12061f'); const tx = x + Math.round(lean * (62 - n * 8) * (62 - n * 8) / 420), ty = y - 62 + n * 8; [[-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1]].forEach(([dx, dy]) => { for (let k = 1; k < 13; k++) p(tx + dx * k * 2, ty + dy * k + ((k * k) >> 4), 4, 2, '#12061f'); }); });
  return c;
}
function drawTitle() {
  if (!titleArt) titleArt = mkTitle();
  ctx.drawImage(titleArt, 0, TOP);
  const b = TOP;
  // the ride
  R(34, b + 168, 190, 4, 'rgba(8,3,18,.5)');
  R(40, b + 148, 176, 18, '#2a1244'); R(36, b + 152, 6, 10, '#2a1244'); R(214, b + 151, 8, 12, '#2a1244'); R(86, b + 134, 76, 15, '#2a1244'); R(78, b + 141, 10, 8, '#2a1244'); R(160, b + 139, 14, 10, '#2a1244');
  R(92, b + 137, 30, 10, '#7a4ab0'); R(126, b + 137, 30, 10, '#7a4ab0'); R(94, b + 138, 10, 2, '#c8a8f0'); R(40, b + 148, 176, 2, '#d64fb0'); R(86, b + 134, 76, 1, '#d64fb0'); R(44, b + 158, 168, 2, '#12061f');
  R(214, b + 153, 6, 4, '#ffe9b0'); R(36, b + 153, 4, 4, '#e0352b'); R(198, b + 152, 8, 1, C.or);
  [70, 186].forEach(x => { disc(ctx, x, b + 166, 10, '#0c0514'); disc(ctx, x, b + 166, 5, '#6f6d68'); disc(ctx, x, b + 166, 2, '#1d1d1a'); });
  ctx.globalAlpha = .35; ctx.fillStyle = '#ffe9b0'; ctx.beginPath(); ctx.moveTo(220, b + 153); ctx.lineTo(300, b + 146); ctx.lineTo(300, b + 170); ctx.lineTo(220, b + 158); ctx.fill(); ctx.globalAlpha = 1;
  // NULL, leaning on the hood
  const bob = Math.round(Math.sin(tick / 30));
  if (!heroArt) heroArt = mkHero();
  R(10, b + 186, 84, 4, 'rgba(8,3,18,.5)');
  ctx.drawImage(heroArt, 4, b + 30 + bob);
  if ((tick >> 5) & 1) R(65, b + 117 + bob, 7, 13, '#fff0f0');
  A.big('NULL', 226, b + 44, 32, C.ink); A.big('NULL', 224, b + 42, 32, C.cream);
  A.big('CITY', 244, b + 74, 32, C.ink); A.big('CITY', 242, b + 72, 32, C.or);
  A.txt('OPEN CITY  -  CART 01', 234, b + 86, '#f7c4d4', 8, 'center');
  const m = TMENU();
  R(176, b + 94, 136, m.length * 13 + 8, 'rgba(20,10,40,.78)');
  m.forEach((it, i) => { const y = b + 108 + i * 13; if (i === mi) { R(180, y - 9, 128, 12, C.cream); A.tri(184, y - 6, C.or); A.txt(it, 192, y, C.ink, 8, 'left', true); } else A.txt(it, 192, y, C.cream); });
  if (save) A.txt('SAVE: $' + save.cash + '  JOBS ' + Math.min(save.mi, 8) + '/8  POGS ' + (save.pogs || []).length + '/20', W - 6, b + 186, '#f7c4d4', 8, 'right');
  if (confirmNew) { R(50, b + 66, 220, 60, C.ink); R(52, b + 68, 216, 56, C.bg); A.big('ERASE SAVE?', W / 2 + 3, b + 90, 16, C.ink); A.txt('A = YES, START OVER', W / 2, b + 104, C.hp, 8, 'center', true); A.txt('B = NO, GO BACK', W / 2, b + 116, C.ink, 8, 'center'); }
  bars('B CARTS', 'A SELECT');
}
function drawHelp() {
  paper(); A.big('HOW TO PLAY', W / 2 + 3, TOP + 20, 16, C.ink);
  const rows = [['ON FOOT', ''], ['ARROWS / WASD', 'WALK'], ['HOLD A (SPACE)', 'RUN'], ['TAP A', 'PUNCH - TAP 3 TIMES FOR A COMBO'], ['B', 'GET IN THE NEAREST CAR'], ['IN A CAR', ''], ['ARROWS', 'POINT WHERE YOU WANT TO GO'], ['A', 'BRAKE - HOLD IN A TURN TO DRIFT'], ['B', 'GET OUT'], ['THE CITY', ''], ['YELLOW / ORANGE', 'YOUR JOB'], ['PINK', 'RESPRAY: LOSE HEAT, FIX CAR $100'], ['GREEN', 'CLINIC: HEAL $50'], ['HEAT', 'TROUBLE BRINGS COPS. HIDE OR RESPRAY']];
  let y = TOP + 34;
  rows.forEach(r => { if (!r[1]) { R(10, y - 8, W - 20, 10, C.ink); A.txt(r[0], 14, y, C.or, 8, 'left', true); y += 12; } else { A.txt(r[0], 14, y, C.ink, 8, 'left', true); A.txt(r[1], 120, y, C.mid); y += 10; } });
  bars('BACK', 'OK');
}
function drawMap() {
  R(0, TOP, W, VH, C.ink);
  const s = 2, x0 = 4, y0 = TOP + 2;
  ctx.drawImage(mini, 0, 0, MW, MH, x0, y0, MW * s, MH * s);
  const dot = (wx, wy, col, sz) => { R(x0 + wx / T * s - sz / 2, y0 + wy / T * s - sz / 2, sz, sz, C.ink); R(x0 + wx / T * s - sz / 2 + 1, y0 + wy / T * s - sz / 2 + 1, sz - 2, sz - 2, col); };
  const L = [['#9fd8f2', "NULL'S PAD", PL.HOME], [C.or, 'NULLSCADE', PL.ARCADE], ['#ff7ad8', 'RESPRAY', PL.RESPRAY], ['#7dff8a', 'CLINIC', PL.CLINIC], ['#8fb4ff', 'POLICE', PL.STATION]];
  L.forEach(q => dot(q[2].x, q[2].y, q[0], 6));
  const tg = target(); let jl = '';
  if (tg) { if ((tick >> 3) & 1) dot(tg[0], tg[1], '#ffe27a', 8); jl = 'OBJECTIVE'; } else if (!ms && g.mi < MIS.length) { const pl = PL[MIS[g.mi].at]; if ((tick >> 3) & 1) dot(pl.x, pl.y, '#ffe27a', 8); jl = 'NEXT JOB'; }
  if ((tick >> 2) & 3) dot(P.x, P.y, CR, 6);
  const lx = 232; A.big('CITY MAP', lx + 44, TOP + 14, 8, C.cream);
  R(lx, TOP + 22, 6, 6, CR); A.txt('YOU', lx + 10, TOP + 28, C.cream);
  if (jl) { R(lx, TOP + 34, 6, 6, '#ffe27a'); A.txt(jl, lx + 10, TOP + 40, '#ffe27a'); }
  L.forEach((q, i) => { R(lx, TOP + 46 + i * 12, 6, 6, q[0]); A.txt(q[1], lx + 10, TOP + 52 + i * 12, C.l2); });
  A.txt('YOU ARE IN', lx, TOP + 124, C.mid); A.txt(distName || '', lx, TOP + 135, C.or, 8, 'left', true);
  A.txt('JOBS ' + Math.min(g.mi, MIS.length) + '/' + MIS.length, lx, TOP + 154, C.l2); A.txt('POGS ' + g.pogs.length + '/' + pogSpots.length, lx, TOP + 166, C.l2); A.txt('$' + g.cash, lx, TOP + 178, '#7dff8a', 8, 'left', true);
  bars('BACK', 'OK');
}
function drawStats() {
  paper(); A.big('STATS', W / 2 + 3, TOP + 24, 16, C.ink);
  const s = g.st, mins = (s.time / 3600) | 0;
  const rows = [['CASH', '$' + g.cash], ['JOBS DONE', Math.min(g.mi, MIS.length) + '/' + MIS.length], ['POGS FOUND', g.pogs.length + '/' + pogSpots.length], ['CARS BORROWED', s.cars], ['DISTANCE DRIVEN', ((s.dist / 1600) | 0) + ' BLOCKS'], ['KNOCKOUTS', s.ko], ['TIMES BUSTED', s.bust], ['SIGNALS LOST', s.lost], ['TIME PLAYED', ((mins / 60) | 0) + 'H ' + pad2(mins % 60) + 'M']];
  rows.forEach((r, i) => { const y = TOP + 46 + i * 14; if (i & 1) R(40, y - 9, W - 80, 13, C.l1); A.txt(r[0], 48, y, C.mid); A.txt(String(r[1]), W - 48, y, C.ink, 8, 'right', true); });
  bars('BACK', 'OK');
}
function render() {
  if (st === 'title') return drawTitle();
  if (st === 'help') return drawHelp();
  if (st === 'map') return drawMap();
  if (st === 'stats') return drawStats();
  drawWorld(); drawHud();
  if (st === 'pause') {
    const w = 150, hh = 104, x = (W - w) >> 1, y = TOP + ((VH - hh) >> 1);
    R(x - 2, y - 2, w + 4, hh + 4, C.ink); R(x, y, w, hh, C.bg); ctx.fillStyle = C.l1; for (let yy = y + 2; yy < y + hh; yy += 4) ctx.fillRect(x, yy, w, 1);
    A.big('PAUSED', W / 2 + 3, y + 22, 16, C.ink);
    PMENU.forEach((m, i) => { const yy = y + 42 + i * 13; if (i === pauseI) { R(x + 10, yy - 9, w - 20, 12, C.ink); A.tri(x + 15, yy - 6, C.or); A.txt(m, x + 24, yy, C.cream, 8, 'left', true); } else A.txt(m, x + 24, yy, C.ink); });
  }
}

window.NullCity = {
  init(api) { A = api; ctx = api.ctx; W = api.W; H = api.H; TOP = api.TOP; VH = api.VH; C = api.C; load(); },
  enter() { load(); st = 'title'; mi = 0; confirmNew = false; },
  pause() { if (st === 'play' && !dlg) { st = 'pause'; pauseI = 0; } },
  step, render,
  hero() { return heroArt || (heroArt = mkHero()); },   // big NULL portrait, used on the cart cover
  get state() { return st; },
  dbg: {
    get g() { return g; }, get P() { return P; }, get cars() { return cars; }, get peds() { return peds; }, get ms() { return ms; }, get MIS() { return MIS; }, get PL() { return PL; }, get dlg() { return dlg; }, get over() { return over; },
    newGame, tAt, solidPx, addPed, startMission(i) { g.mi = i; startMission(MIS[i]); }, target, crime,
    tp(x, y) { if (P.car) { P.car.x = x; P.car.y = y; P.car.vx = P.car.vy = 0; } P.x = x; P.y = y; cam.x = clamp(x - W / 2, 0, PW - W); cam.y = clamp(y - VH / 2, 0, PH - VH); },
    drive(tp) { const c = addCar(tp, CCOL[0], P.x, P.y, 0, 0); P.car = c; c.drv = true; c.mine = true; return c; },
    clock(v) { g.clock = v; }, blds, spots, pogSpots, map, MW, MH
  }
};
})();

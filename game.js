(() => {
'use strict';

/* =====================================================================
   NULL RUN — an original crate-smashing platformer on a pocket LCD
   ===================================================================== */

const cv = document.getElementById('lcd');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

const W = 320, H = 216, TOP = 12, VH = 192, T = 16, ROWS = 12;
const C = { bg:'#d8d6cf', l1:'#c6c3bb', l2:'#aaa79f', mid:'#6f6d68', ink:'#1d1d1a', or:'#ff6a2b', red:'#e75858', cream:'#f2efe8', blue:'#3f5486', blueD:'#2a3a62', shade:'#cfc8b6', hp:'#e0352b' };

/* ---------------------------- storage ---------------------------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('nullrun.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('nullrun.' + k, JSON.stringify(v)); } catch (e) {} }
};

/* ----------------------------- audio ----------------------------- */
let ac = null, master = null, musicBus = null, musicLP = null, muted = false;
let musicTimer = null, nextNote = 0, mStep = 0;
const STEP = 60 / 132 / 4;
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

function initAudio() {
  if (ac) { if (ac.state === 'suspended' && !document.hidden) ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ac.destination);
  // everything musical runs through a low-pass: dark, dusty, almost no top end
  musicLP = ac.createBiquadFilter(); musicLP.type = 'lowpass'; musicLP.frequency.value = 20000; musicLP.Q.value = 0.4; musicLP.connect(master);
  musicBus = ac.createGain(); musicBus.gain.value = 0.0001; musicBus.connect(musicLP);
  nextNote = ac.currentTime + 0.1;
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = setInterval(scheduleMusic, 30);
}
// leaving the tab (another tab, a link opened from the page, minimised window) silences everything; coming back resumes
if (document.addEventListener) {
  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) { ac.suspend(); if (active && state === 'play') { state = 'pause'; menuI = 0; if (menuBtn) menuBtn.classList.add('open'); } Object.keys(down).forEach(release); }
    else { ac.resume(); nextNote = ac.currentTime + 0.1; }
  });
  window.addEventListener('pagehide', () => { if (ac) ac.suspend(); });
}
function tone(f, dur, type, vol, slide, when, bus) {
  if (!ac) return;
  const t = (when || ac.currentTime), o = ac.createOscillator(), g = ac.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  g.gain.setValueAtTime(vol || 0.12, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(bus || master);
  o.start(t); o.stop(t + dur + 0.02);
}
let noiseBuf = null;
function noise(dur, vol, lp, when, bus) {
  if (!ac) return;
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = (when || ac.currentTime), s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
  s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.setValueAtTime(lp || 4000, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(80, (lp || 4000) / 8), t + dur);
  g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(bus || master);
  s.start(t); s.stop(t + dur + 0.02);
}
/* in-game chiptune (A minor, 132 BPM) */
const _ = 0;
const LEAD = [
  69,_,72,_,76,_,72,_,69,_,_,72,_,76,_,_,
  77,_,76,_,72,_,69,_,72,_,_,_,65,_,69,_,
  67,_,72,_,76,_,79,_,76,_,_,72,_,_,67,_,
  74,_,71,_,67,_,71,_,74,_,76,_,74,_,71,_
];
const BASS = [45, 41, 48, 43];
/* home-screen loop: slow, soft, late-night room — Am7 / Fmaj7 / Cmaj7 / G6 */
const HSTEP = 60 / 74 / 4;
const HCH = [[57, 60, 64, 67], [53, 57, 60, 64], [60, 64, 67, 71], [55, 59, 62, 64]];
const HARP = [0, 2, 1, 3, 2, 1, 3, 2];
const HMEL = { 0: 76, 6: 72, 12: 74, 16: 72, 22: 69, 32: 79, 38: 76, 44: 72, 48: 74, 54: 71, 60: 67 };
let musicMode = '';
function scheduleMusic() {
  if (!ac) return;
  const mode = active ? 'game' : 'home';
  if (mode !== musicMode) { musicMode = mode; mStep = 0; nextNote = ac.currentTime + 0.12; }
  // if the timer was throttled (background tab, long frame) skip ahead instead of firing a burst of late notes on top of each other
  if (nextNote < ac.currentTime - 0.03) nextNote = ac.currentTime + 0.05;
  let guard = 0;
  if (mode === 'home') {
    musicBus.gain.setTargetAtTime(0.55, ac.currentTime, 0.4);
    while (nextNote < ac.currentTime + 0.14 && guard++ < 4) {
      const s = mStep, bar = (s >> 4) & 3, i = s & 15, ch = HCH[bar];
      if (i === 0 || i === 10) tone(hz(ch[0] - 24), HSTEP * 5, 'triangle', 0.22, 0, nextNote, musicBus);
      if (i % 2 === 0) tone(hz(ch[HARP[(i >> 1) & 7]]), HSTEP * 3.4, 'triangle', 0.075, 0, nextNote, musicBus);
      if (i === 0) ch.forEach(n => tone(hz(n - 12), HSTEP * 15, 'sine', 0.035, 0, nextNote, musicBus));
      if (HMEL[s]) tone(hz(HMEL[s]), HSTEP * 4.5, 'sine', 0.085, 0, nextNote + 0.012, musicBus);
      if (i % 8 === 0) tone(92, 0.16, 'sine', 0.2, 38, nextNote, musicBus);
      if (i % 8 === 4) noise(0.06, 0.035, 2600, nextNote, musicBus);
      if (i % 2 === 1) noise(0.02, 0.012, 7000, nextNote, musicBus);
      nextNote += HSTEP * (i % 2 ? 0.92 : 1.08);   // light swing
      mStep = (mStep + 1) % 64;
    }
    return;
  }
  const on = state === 'play' || state === 'title' || state === 'clear' || state === 'win' || state === 'carts' || state === 'kart' || state === 'rsel' || state === 'ssel' || state === 'recs';
  musicBus.gain.setTargetAtTime(on ? (state === 'play' ? 0.5 : 0.3) : (state !== 'boot' ? 0.08 : 0), ac.currentTime, 0.1);
  while (nextNote < ac.currentTime + 0.12 && guard++ < 4) {
    const s = mStep, bar = (s >> 4) & 3, i = s & 15;
    const root = BASS[bar];
    if (i % 2 === 0) tone(hz(root + (i % 8 === 4 || i === 14 ? 12 : 0)), STEP * 1.7, 'triangle', 0.2, 0, nextNote, musicBus);
    if (LEAD[s]) tone(hz(LEAD[s]), STEP * 1.6, 'square', 0.045, 0, nextNote, musicBus);
    if (i % 4 === 2) noise(0.03, 0.05, 9000, nextNote, musicBus);
    if (i % 8 === 4) noise(0.07, 0.07, 3000, nextNote, musicBus);
    nextNote += STEP; mStep = (mStep + 1) % 64;
  }
}
const sfx = {
  jump()  { tone(330, 0.13, 'square', 0.09, 660); },
  djump() { tone(520, 0.12, 'square', 0.09, 990); },
  spin()  { noise(0.16, 0.12, 2400); tone(200, 0.16, 'sawtooth', 0.05, 90); },
  crate() { noise(0.12, 0.25, 1800); tone(180, 0.08, 'square', 0.1, 70); },
  ember(n){ tone(1175, 0.06, 'square', 0.07); tone(1568, 0.1, 'square', 0.07, 0, ac ? ac.currentTime + 0.05 : 0); },
  bounce(){ tone(220, 0.2, 'triangle', 0.25, 880); },
  tick()  { tone(1400, 0.05, 'square', 0.1); },
  boom()  { noise(0.55, 0.5, 1400); tone(110, 0.45, 'sawtooth', 0.22, 30); },
  stomp() { tone(260, 0.1, 'square', 0.12, 80); noise(0.06, 0.12, 3000); },
  hurt()  { tone(300, 0.25, 'sawtooth', 0.14, 90); },
  die()   { [440, 370, 311, 233, 175].forEach((f, i) => tone(f, 0.16, 'square', 0.12, 0, ac ? ac.currentTime + i * 0.11 : 0)); },
  life()  { [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.12, 'square', 0.1, 0, ac ? ac.currentTime + i * 0.08 : 0)); },
  check() { [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'triangle', 0.2, 0, ac ? ac.currentTime + i * 0.07 : 0)); },
  shield(){ tone(392, 0.3, 'triangle', 0.2, 784); },
  clear() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'square', 0.1, 0, ac ? ac.currentTime + i * 0.1 : 0)); },
  sel()   { tone(880, 0.05, 'square', 0.08); },
  boot()  { tone(55, 0.5, 'sine', 0.35, 30); noise(0.25, 0.12, 900); [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'square', 0.07, 0, ac ? ac.currentTime + 0.35 + i * 0.09 : 0)); },
  ok()    { tone(660, 0.07, 'square', 0.09); tone(990, 0.1, 'square', 0.09, 0, ac ? ac.currentTime + 0.06 : 0); }
};
function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.55, ac.currentTime, 0.02);
  const on = document.getElementById('sndOn'), off = document.getElementById('sndOff');
  if (on && off) { on.style.display = m ? 'none' : ''; off.style.display = m ? '' : 'none'; }
}

/* ----------------------------- input ----------------------------- */
const down = {}, hit = {};
let active = false; // false while the home screen is showing
const KEYS = {
  ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right', ArrowUp:'up', KeyW:'up', ArrowDown:'down', KeyS:'down',
  Space:'a', KeyZ:'a', KeyK:'a', KeyB:'b', KeyX:'b', KeyJ:'b',
  Enter:'start', Escape:'select', KeyP:'select'
};
function press(b) {
  if (!active) return;
  initAudio();
  if (!down[b]) hit[b] = true;
  down[b] = true;
  document.querySelectorAll('[data-btn="' + b + '"]').forEach(e => e.classList.add('on'));
}
function release(b) {
  down[b] = false;
  document.querySelectorAll('[data-btn="' + b + '"]').forEach(e => e.classList.remove('on'));
}
window.addEventListener('keydown', e => {
  const b = KEYS[e.code]; if (!b) return;
  e.preventDefault(); if (!e.repeat) press(b);
});
window.addEventListener('keyup', e => { const b = KEYS[e.code]; if (b) { e.preventDefault(); release(b); } });
window.addEventListener('blur', () => { Object.keys(down).forEach(release); });
document.querySelectorAll('[data-btn]').forEach(el => {
  const b = el.dataset.btn;
  el.addEventListener('pointerdown', e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) {} press(b); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => el.addEventListener(n, () => release(b)));
  el.addEventListener('contextmenu', e => e.preventDefault());
});
const sndBtn = document.getElementById('sndBtn'), menuBtn = document.getElementById('menuBtn');
if (sndBtn) sndBtn.addEventListener('click', () => { const fresh = !ac; initAudio(); if (!fresh || muted) setMuted(!muted); sndBtn.blur(); });
if (menuBtn) menuBtn.addEventListener('click', () => { menuBtn.blur(); if (!active) return; initAudio(); hit.select = true; });
cv.addEventListener('pointerdown', () => { if (!active) return; initAudio(); if (state !== 'play') hit.start = true; });

/* ----------------------------- levels ----------------------------- */
function mk(name, width, fn) {
  const g = []; for (let r = 0; r < ROWS; r++) g.push(new Array(width).fill(' '));
  const L = { name, w: width, g, ents: [], start: { x: 2, y: 9 } };
  const set = (x, y, ch) => { if (x >= 0 && x < width && y >= 0 && y < ROWS) g[y][x] = ch; };
  const api = {
    ground(x0, x1, top) { top = top === undefined ? 10 : top; for (let x = x0; x <= x1; x++) for (let r = top; r < ROWS; r++) set(x, r, '#'); },
    block(x, y, w, h) { for (let i = 0; i < (w || 1); i++) for (let j = 0; j < (h || 1); j++) set(x + i, y + j, '#'); },
    plat(x, y, w) { for (let i = 0; i < w; i++) set(x + i, y, '='); },
    spikes(x, y, w) { for (let i = 0; i < (w || 1); i++) set(x + i, y, '^'); },
    put(t, x, y) { L.ents.push({ t, x, y }); },
    row(t, x, y, n) { for (let i = 0; i < n; i++) L.ents.push({ t, x: x + i, y }); },
    col(t, x, y, n) { for (let i = 0; i < n; i++) L.ents.push({ t, x, y: y - i }); },
    stack(x, y, s) { [...s].forEach((t, i) => L.ents.push({ t, x, y: y - i, stacked: i > 0 })); },
    start(x, y) { L.start = { x, y }; },
    goal(x, y) { L.goal = { x, y }; }
  };
  fn(api);
  return L;
}

/* entity letters: c crate · q bonus crate · b bounce crate · t timer crate · v volatile crate
   k checkpoint · l life · s shield · i iron · o ember · e walker · h spiked walker · f flyer */
const LEVEL_DEFS = [
  ['BACK ALLEY', 134, a => {
    a.ground(0, 24); a.start(2, 9);
    a.row('o', 5, 9, 4); a.put('c', 11, 9); a.put('c', 12, 9); a.stack(13, 9, 'cq'); a.put('e', 20, 9);
    a.ground(27, 48);
    a.row('o', 25, 7, 2);
    a.put('b', 30, 9); a.col('o', 30, 6, 3);
    a.plat(33, 7, 4); a.row('o', 33, 6, 3); a.put('q', 36, 6);
    a.put('e', 40, 9); a.put('c', 43, 9); a.put('t', 44, 9); a.put('c', 45, 9);
    a.ground(51, 75);
    a.row('o', 49, 7, 2);
    a.put('k', 54, 9); a.spikes(58, 9, 1); a.row('o', 57, 6, 3);
    a.put('h', 64, 9);
    a.stack(68, 9, 'ccc'); a.stack(69, 9, 'cl'); a.put('s', 72, 9);
    a.ground(78, 100);
    a.put('c', 77, 6); a.row('o', 76, 8, 2);
    a.put('v', 84, 9); a.row('o', 83, 6, 3); a.put('f', 89, 6);
    a.put('b', 94, 9); a.plat(96, 5, 4); a.put('q', 97, 4); a.put('q', 98, 4); a.put('o', 99, 4);
    a.ground(103, 133);
    a.row('o', 101, 7, 2);
    a.put('k', 106, 9); a.put('e', 110, 9); a.put('e', 114, 9);
    a.put('c', 117, 9); a.stack(118, 9, 'tc'); a.put('c', 119, 9);
    a.put('h', 123, 9); a.row('o', 124, 9, 3);
    a.goal(129, 9);
  }],
  ['SUBWAY LINE', 178, a => {
    a.ground(0, 15); a.start(2, 9);
    a.row('o', 5, 9, 4); a.put('c', 10, 9); a.stack(11, 9, 'cq');
    a.ground(18, 30, 9);
    a.row('o', 16, 6, 2);
    a.put('e', 22, 8); a.put('c', 25, 8); a.put('t', 26, 8); a.put('c', 27, 8);
    a.plat(33, 8, 3); a.row('o', 33, 7, 3);
    a.ground(38, 58);
    a.put('k', 40, 9); a.put('v', 44, 9); a.put('o', 44, 6); a.put('o', 45, 6); a.put('c', 47, 9); a.put('o', 46, 6);
    a.put('f', 49, 5); a.spikes(52, 9, 1); a.put('b', 55, 9);
    a.plat(57, 4, 4); a.put('q', 58, 3); a.put('q', 59, 3); a.put('l', 60, 3);
    a.ground(61, 72);
    a.put('h', 66, 9); a.block(70, 9, 1, 1); a.block(71, 8, 1, 2); a.block(72, 7, 1, 3);
    a.ground(73, 84, 7);
    a.put('e', 77, 6); a.put('c', 79, 6); a.stack(80, 6, 'ccq'); a.put('s', 82, 6);
    a.ground(89, 110);
    a.row('o', 85, 5, 4);
    a.put('k', 91, 9); a.put('t', 95, 9); a.put('c', 96, 9); a.put('c', 97, 9); a.put('v', 98, 9);
    a.put('f', 101, 7); a.put('f', 104, 5); a.row('o', 101, 9, 4); a.spikes(106, 9, 1);
    a.plat(112, 9, 3); a.row('o', 112, 8, 3);
    a.ground(116, 140);
    a.put('h', 119, 9); a.put('e', 123, 9);
    a.put('b', 127, 9); a.col('o', 127, 6, 4);
    a.stack(130, 9, 'cc'); a.stack(131, 9, 'ii'); a.put('q', 134, 9); a.put('k', 136, 9);
    a.plat(143, 9, 2); a.put('o', 143, 8); a.put('o', 144, 8);
    a.plat(147, 8, 2); a.put('c', 148, 7);
    a.plat(151, 9, 2); a.put('o', 151, 8); a.put('o', 152, 8);
    a.ground(155, 177);
    a.put('e', 160, 9); a.put('t', 164, 9); a.put('c', 165, 9); a.put('q', 166, 9);
    a.goal(172, 9);
  }],
  ['MIDNIGHT ROOFS', 192, a => {
    a.ground(0, 13); a.start(2, 9);
    a.put('c', 6, 9); a.put('s', 8, 9);
    a.ground(16, 37);
    a.row('o', 14, 7, 2);
    a.spikes(19, 9, 1); a.put('h', 22, 9); a.spikes(25, 9, 1);
    a.stack(28, 9, 'tc'); a.put('t', 29, 9); a.put('c', 30, 9); a.put('e', 32, 9);
    a.put('f', 38, 4); a.row('o', 37, 6, 3);
    a.ground(40, 62); a.block(61, 9, 2, 1);
    a.put('k', 42, 9); a.put('v', 46, 9); a.put('c', 47, 9); a.put('c', 48, 9); a.row('o', 46, 6, 3);
    a.stack(52, 9, 'ii'); a.put('i', 53, 9); a.stack(54, 9, 'cq');
    a.put('b', 57, 9); a.plat(59, 5, 3); a.put('q', 60, 4); a.put('l', 61, 4);
    a.ground(65, 92, 8);
    a.put('h', 68, 7); a.put('f', 72, 4);
    a.put('t', 75, 7); a.stack(76, 7, 'cq'); a.put('c', 77, 7);
    a.spikes(81, 7, 1); a.row('o', 80, 4, 2); a.put('e', 84, 7); a.put('k', 87, 7);
    a.plat(95, 8, 2); a.put('o', 95, 7); a.put('o', 96, 7);
    a.plat(99, 7, 2); a.put('q', 100, 6);
    a.plat(103, 8, 2); a.put('o', 103, 7); a.put('o', 104, 7);
    a.ground(107, 138);
    a.put('e', 110, 9); a.put('h', 113, 9); a.put('e', 116, 9);
    a.stack(120, 9, 'c'); a.stack(121, 9, 'cc'); a.stack(122, 9, 'ccq');
    a.put('t', 125, 9); a.put('v', 126, 9);
    a.put('b', 129, 9); a.col('o', 129, 6, 4); a.put('s', 131, 9); a.put('k', 133, 9);
    a.put('f', 139, 5);
    a.ground(141, 160, 9);
    a.spikes(144, 8, 1); a.put('o', 146, 8); a.put('o', 147, 8); a.spikes(149, 8, 1);
    a.put('o', 151, 8); a.put('o', 152, 8);
    a.put('h', 155, 8); a.put('t', 158, 8); a.put('c', 159, 8);
    a.ground(164, 191);
    a.put('e', 168, 9); a.put('e', 171, 9); a.put('q', 175, 9); a.put('q', 176, 9); a.row('o', 178, 9, 4);
    a.goal(185, 9);
  }]
];

/* ------------------------------ state ------------------------------ */
let state = 'title', tick = 0, stT = 0;
let li = 0, L = null, crates = [], embersE = [], enemies = [], parts = [], booms = [], floats = [];
let p = null, camX = 0, lives = 4, embers = 0, shield = 0, broken = 0, totalCrates = 0, levelTime = 0, levelEmbers = 0;
let checkpoint = null, banner = 0, menuI = 0, shake = 0, flash = 0, cartI = 0;
const MENU = ['RESUME', 'RESTART LEVEL', 'SOUND', 'QUIT TO TITLE'];
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), c = k => Math.max(0, Math.min(255, Math.round(((n >> k) & 255) * f))); return '#' + [16, 8, 0].map(k => c(k).toString(16).padStart(2, '0')).join(''); };
/* the Nulls crew: same silhouettes as NULL KART, each with their own feel. need = stages you must have cleared */
const RUNNERS = [
  { n: 'NULL',    tag: 'ALL-ROUNDER',      tee: '#f2efe8', pants: '#3f5486', shoe: '#f2efe8', run: 1.95, jump: 5.5,  dj: 4.9, spin: 26, sp: 3, jp: 3, sn: 3, need: 0 },
  { n: 'VISOR',   tag: 'QUICK FEET',       tee: '#4a3566', pants: '#2e2440', shoe: '#f2efe8', run: 2.2,  jump: 5.3,  dj: 4.7, spin: 26, sp: 5, jp: 2, sn: 3, need: 0 },
  { n: 'GOGGLES', tag: 'LONG JUMPER',      tee: '#a8322e', pants: '#55535a', shoe: '#b5443c', run: 2.05, jump: 5.85, dj: 5.0, spin: 22, sp: 4, jp: 4, sn: 2, need: 0 },
  { n: 'XED',     tag: 'SPIN MACHINE',     tee: '#b5522e', pants: '#55535a', shoe: '#b5443c', run: 1.85, jump: 5.4,  dj: 4.9, spin: 38, sp: 2, jp: 3, sn: 5, need: 0 },
  { n: 'FUSE',    tag: 'HIGH BOUNCE',      tee: '#ff6a2b', pants: '#33322e', shoe: '#f2efe8', run: 1.9,  jump: 6.0,  dj: 5.2, spin: 24, sp: 3, jp: 5, sn: 2, need: 0 },
  { n: 'STATIC',  tag: 'FLOATY JUMPS',     tee: '#58c59a', pants: '#33322e', shoe: '#f2efe8', run: 2.0,  jump: 5.4,  dj: 5.2, spin: 28, grav: 0.29, sp: 3, jp: 4, sn: 3, need: 1 },
  { n: 'MOTH',    tag: 'STARTS SHIELDED',  tee: '#d8c8a8', pants: '#6a4a3a', shoe: '#f2efe8', run: 1.95, jump: 5.6,  dj: 5.0, spin: 28, shield: 1, sp: 3, jp: 3, sn: 3, need: 2 },
  { n: 'HALO',    tag: 'ONE EXTRA LIFE',   tee: '#e8c04a', pants: '#3f5486', shoe: '#f2efe8', run: 2.1,  jump: 5.7,  dj: 5.0, spin: 30, lives: 5, sp: 4, jp: 4, sn: 4, need: 3 }
];
let runner = Math.min(RUNNERS.length - 1, store.get('runner', 0)), RC = RUNNERS[runner];
let score = 0, kills = 0, deaths = 0, stageRes = null, newHi = false, titleI = 0, rselI = 0, sselI = 0, flowPlay = false;
const TMENU = ['PLAY', 'RUNNERS', 'RECORDS', 'EJECT CART'];
const getRec = () => { const r = store.get('run', null) || {}; r.hi = r.hi || 0; r.st = r.st || []; return r; };
const cleared = () => store.get('best', 0);
const liveScore = () => score + levelEmbers * 10 + broken * 25 + kills * 50;
function calcStage() {
  const sec = (levelTime / 60) | 0, e = levelEmbers * 10, c = broken * 25, k = kills * 50, t = Math.max(0, 150 - sec) * 5;
  const nd = deaths === 0 ? 500 : 0, pf = broken >= totalCrates ? 1000 : 0, ratio = totalCrates ? broken / totalCrates : 1;
  const grade = pf && !deaths ? 'S' : ratio >= 0.8 && deaths <= 1 ? 'A' : ratio >= 0.5 ? 'B' : 'C';
  return { sec, e, c, k, t, nd, pf, grade, total: e + c + k + t + nd + pf };
}
function bankScore(final) {
  const r = getRec(); newHi = false;
  if (score > r.hi) { r.hi = score; r.hiBy = RC.n; newHi = final || newHi; }
  store.set('run', r);
}

function newPlayer(x, y) {
  return { x, y, w: 10, h: 14, vx: 0, vy: 0, face: 1, ground: false, coyote: 0, jbuf: 0, jumps: 0, spin: 0, spinCd: 0, inv: 0, run: 0 };
}
function loadLevel(i) {
  li = i; const d = LEVEL_DEFS[i]; L = mk(d[0], d[1], d[2]);
  crates = []; embersE = []; enemies = []; parts = []; booms = []; floats = [];
  for (const e of L.ents) {
    const x = e.x * T, y = e.y * T;
    if ('cqbtvklsi'.includes(e.t)) crates.push({ t: e.t, x, y, vy: 0, stacked: !!e.stacked, dead: false, fuse: 0, chain: 0, hits: 0, sq: 0 });
    else if (e.t === 'o') embersE.push({ x: x + 5, y: y + 4, dead: false, ph: (e.x * 7) % 20 });
    else if (e.t === 'e' || e.t === 'h') enemies.push({ t: e.t, x: x + 2, y: y + 4, w: 12, h: 12, dir: -1, dead: false, vy: 0 });
    else if (e.t === 'f') enemies.push({ t: 'f', x: x + 2, y: y + 2, by: y + 2, w: 12, h: 11, ph: e.x, dead: false, vy: 0 });
  }
  totalCrates = crates.filter(c => c.t !== 'i').length; broken = 0; levelTime = 0; levelEmbers = 0; kills = 0; deaths = 0; stageRes = null;
  checkpoint = { x: L.start.x * T + 3, y: L.start.y * T + 2 };
  p = newPlayer(checkpoint.x, checkpoint.y);
  camX = 0; shield = RC.shield || 0; banner = 150; state = 'play';
}
function startGame(i) { RC = RUNNERS[runner]; lives = RC.lives || 4; embers = 0; score = 0; loadLevel(i); sfx.ok(); }

/* ---------------------------- collisions ---------------------------- */
function tile(c, r) {
  if (c < 0 || c >= L.w) return '#';
  if (r < 0 || r >= ROWS) return ' ';
  return L.g[r][c];
}
function rectSolid(x, y, w, h) {
  const c0 = Math.floor(x / T), c1 = Math.floor((x + w - 0.001) / T), r0 = Math.floor(y / T), r1 = Math.floor((y + h - 0.001) / T);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (tile(c, r) === '#') return true;
  return false;
}
const overlap = (a, bx, by, bw, bh) => a.x < bx + bw && a.x + a.w > bx && a.y < by + bh && a.y + a.h > by;
function crateAt(x, y, w, h, skip) {
  for (const c of crates) if (!c.dead && c !== skip && x < c.x + T && x + w > c.x && y < c.y + T && y + h > c.y) return c;
  return null;
}

/* ------------------------------ effects ------------------------------ */
function burst(x, y, n, col, sp) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = (sp || 2) * (0.4 + Math.random());
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.2, life: 22 + Math.random() * 16, col: col || C.ink, sz: 1 + (Math.random() * 3 | 0) });
  }
}
function floatText(s, x, y, col) { floats.push({ s, x, y, life: 40, col: col || C.ink }); }
function addEmber(n, x, y) {
  embers += n; levelEmbers += n; sfx.ember();
  if (x !== undefined) floatText('+' + n, x, y, C.or);
  if (embers >= 100) { embers -= 100; lives++; sfx.life(); floatText('1UP', p.x - 4, p.y - 10, C.ink); }
}

/* ------------------------------ crates ------------------------------ */
function breakCrate(c) {
  if (c.dead) return;
  c.dead = true; broken++;
  const cx = c.x + 8, cy = c.y + 8;
  burst(cx, cy, 9, C.ink, 2.2); burst(cx, cy, 5, C.mid, 1.6); sfx.crate();
  switch (c.t) {
    case 'c': addEmber(1, c.x + 2, c.y); break;
    case 'q': addEmber(5, c.x + 2, c.y); break;
    case 'b': addEmber(1, c.x + 2, c.y); break;
    case 'k': checkpoint = { x: c.x + 3, y: c.y + 2 }; sfx.check(); floatText('CHECK', c.x - 8, c.y, C.ink); break;
    case 'l': lives++; sfx.life(); floatText('1UP', c.x, c.y, C.ink); break;
    case 's': shield = Math.min(2, shield + 1); sfx.shield(); floatText('SHIELD', c.x - 10, c.y, C.ink); break;
  }
}
function explode(c) {
  if (c.dead) return;
  c.dead = true; broken++;
  const cx = c.x + 8, cy = c.y + 8;
  booms.push({ x: cx, y: cy, life: 18 }); burst(cx, cy, 16, C.or, 3.4); burst(cx, cy, 10, C.ink, 2.8);
  sfx.boom(); shake = 12; flash = 3;
  for (const o of crates) if (!o.dead && o.t !== 'i' && Math.hypot(o.x + 8 - cx, o.y + 8 - cy) < 36 && !o.chain) o.chain = 7;
  for (const e of enemies) if (!e.dead && Math.hypot(e.x + 6 - cx, e.y + 6 - cy) < 38) killEnemy(e);
  if (Math.hypot(p.x + 5 - cx, p.y + 7 - cy) < 27) hurt();
}
function hitCrate(c, how) {
  if (c.dead || c.t === 'i') return;
  if (c.t === 'v') return explode(c);
  if (c.t === 't') {
    if (how === 'top' || how === 'bottom') { if (!c.fuse) { c.fuse = 180; sfx.tick(); } c.sq = 6; return; }
    return explode(c);
  }
  if (c.t === 'b' && (how === 'top' || how === 'bottom')) {
    c.sq = 8; c.hits++;
    if (c.hits >= 5) breakCrate(c); else addEmber(1, c.x + 2, c.y - 4);
    return;
  }
  breakCrate(c);
}
function updateCrates() {
  for (const c of crates) {
    if (c.dead) continue;
    if (c.sq > 0) c.sq--;
    if (c.chain > 0 && --c.chain === 0) { hitCrate(c, 'boom'); continue; }
    if (c.fuse > 0) {
      c.fuse--;
      if (c.fuse % 60 === 0 && c.fuse > 0) sfx.tick();
      if (c.fuse === 0) { explode(c); continue; }
    }
    if (c.stacked) {
      const sup = rectSolid(c.x, c.y + T, T, 1) || crateAt(c.x, c.y + T, T, 1, c);
      if (!sup) {
        c.vy = Math.min(5, c.vy + 0.3); c.y += c.vy;
        const below = crateAt(c.x, c.y + T - 0.5, T, 1, c);
        if (rectSolid(c.x, c.y, T, T)) { c.y = Math.floor((c.y + T - 0.001) / T) * T - T; c.vy = 0; }
        else if (below) { c.y = below.y - T; c.vy = 0; }
        if (state === 'play' && c.vy > 0 && overlap(p, c.x, c.y, T, T)) hitCrate(c, 'bottom');
      } else c.vy = 0;
    }
  }
}

/* ------------------------------ enemies ------------------------------ */
function killEnemy(e) {
  if (e.dead) return;
  e.dead = true; kills++; floatText('+50', e.x - 2, e.y - 10, C.or); burst(e.x + 6, e.y + 6, 10, C.ink, 2.4); burst(e.x + 6, e.y + 6, 4, C.red, 2);
}
function updateEnemies() {
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.x > camX + W + 40 || e.x < camX - 60) continue;
    if (e.t === 'f') { e.y = e.by + Math.sin((tick + e.ph * 9) * 0.045) * 22; }
    else {
      const nx = e.x + e.dir * 0.45;
      const front = e.dir > 0 ? nx + e.w : nx;
      const fc = Math.floor(front / T), fr = Math.floor((e.y + e.h + 2) / T);
      const under = tile(fc, fr);
      const underCrate = crateAt(front, e.y + e.h + 1, 1, 2);
      if (rectSolid(nx, e.y, e.w, e.h) || crateAt(nx, e.y, e.w, e.h) || tile(fc, Math.floor((e.y + e.h - 1) / T)) === '^' ||
          (under !== '#' && under !== '=' && !underCrate)) e.dir *= -1;
      else e.x = nx;
      // gravity if support vanished
      if (!rectSolid(e.x, e.y + e.h, e.w, 1) && !crateAt(e.x, e.y + e.h, e.w, 1) && tile(Math.floor((e.x + 6) / T), Math.floor((e.y + e.h) / T)) !== '=') {
        e.vy = Math.min(5, e.vy + 0.3); e.y += e.vy;
        if (rectSolid(e.x, e.y, e.w, e.h)) { e.y = Math.floor((e.y + e.h - 0.001) / T) * T - e.h; e.vy = 0; }
        if (e.y > VH + 30) e.dead = true;
      } else e.vy = 0;
    }
    if (state !== 'play' || !overlap(p, e.x, e.y, e.w, e.h)) continue;
    if (p.spin > 0) { killEnemy(e); sfx.stomp(); floatText('POW', e.x - 2, e.y - 4); }
    else if (e.t !== 'h' && p.vy > 0.5 && p.y + p.h - p.vy <= e.y + 6) {
      killEnemy(e); sfx.stomp(); p.vy = down.a ? -5.6 : -4.2; p.jumps = 1;
    } else hurt();
  }
}

/* ------------------------------ player ------------------------------ */
function hurt() {
  if (state !== 'play' || p.inv > 0) return;
  if (shield > 0) { shield--; p.inv = 110; p.vy = -3.2; sfx.hurt(); burst(p.x + 5, p.y + 7, 10, C.or, 2.5); shake = 6; }
  else die();
}
function die() {
  if (state !== 'play') return;
  state = 'dying'; stT = 85; lives--; deaths++; shield = 0; p.vy = -5.2; p.vx = 0; p.spin = 0; sfx.die(); shake = 8;
}
function respawn() {
  p = newPlayer(checkpoint.x, checkpoint.y); p.inv = 90; state = 'play'; shield = RC.shield || 0;
  for (const c of crates) if (!c.dead) { c.fuse = 0; }
}

function updatePlayer() {
  // direction: if both keys are down the one pressed last wins (no more freezing or facing the wrong way)
  if (hit.left) p.lastDir = -1; if (hit.right) p.lastDir = 1;
  const ax = down.left && down.right ? (p.lastDir || 1) : (down.right ? 1 : 0) - (down.left ? 1 : 0);
  if (ax) {
    if (p.vx * ax < 0) p.vx += ax * (p.ground ? 0.34 : 0.16);     // turning round: brake first, no skating
    p.vx += ax * (p.ground ? 0.17 : 0.12); p.face = ax;
  } else { const f = p.ground ? 0.42 : 0.13; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; }
  const mx = RC.run * 0.88;                                        // calmer top speed, same for spinning
  p.vx = Math.max(-mx, Math.min(mx, p.vx));

  // jump
  if (hit.a || hit.up) p.jbuf = 7;
  if (p.jbuf > 0) {
    if (p.ground || p.coyote > 0) { p.vy = -RC.jump; p.jumps = 1; p.coyote = 0; p.jbuf = 0; p.ground = false; sfx.jump(); burst(p.x + 5, p.y + 14, 3, C.mid, 0.8); }
    else if (p.jumps < 2) { p.vy = -RC.dj; p.jumps = 2; p.jbuf = 0; sfx.djump(); burst(p.x + 5, p.y + 14, 5, C.or, 1); }
  }
  if (p.jbuf > 0) p.jbuf--;
  if (!(down.a || down.up) && p.vy < -2 && !p.bounced) p.vy = -2;
  if (p.vy >= 0) p.bounced = false;

  // spin
  if (hit.b && p.spinCd <= 0) { p.spin = RC.spin; p.spinCd = RC.spin + 14; sfx.spin(); }
  if (p.spin > 0) p.spin--;
  if (p.spinCd > 0) p.spinCd--;
  if (p.spin > 0) {
    for (const c of crates) if (!c.dead && c.t !== 'i' && p.x - 5 < c.x + T && p.x + p.w + 5 > c.x && p.y - 1 < c.y + T && p.y + p.h + 1 > c.y) hitCrate(c, 'spin');
    if (state !== 'play') return;
  }

  p.vy = Math.min(6, p.vy + (RC.grav || 0.34));

  // ---- X ----
  p.x += p.vx;
  if (rectSolid(p.x, p.y, p.w, p.h)) {
    if (p.vx > 0) p.x = Math.floor((p.x + p.w - 0.001) / T) * T - p.w; else p.x = Math.floor(p.x / T) * T + T;
    p.vx = 0;
  }
  let c = crateAt(p.x, p.y, p.w, p.h);
  if (c) {
    if (c.t === 'v') { explode(c); if (state !== 'play') return; }
    else { if (p.x + p.w / 2 < c.x + 8) p.x = c.x - p.w; else p.x = c.x + T; p.vx = 0; }
  }

  // ---- Y ----
  const prevBottom = p.y + p.h, wasGround = p.ground;
  p.y += p.vy; p.ground = false;
  if (rectSolid(p.x, p.y, p.w, p.h)) {
    if (p.vy > 0) { p.y = Math.floor((p.y + p.h - 0.001) / T) * T - p.h; p.ground = true; }
    else p.y = Math.floor(p.y / T) * T + T;
    p.vy = 0;
  }
  if (p.vy >= 0 && !p.ground) {
    const r = Math.floor((p.y + p.h - 0.001) / T);
    const c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - 0.001) / T);
    for (let cc = c0; cc <= c1; cc++) if (tile(cc, r) === '=' && prevBottom <= r * T + 0.01) { p.y = r * T - p.h; p.vy = 0; p.ground = true; break; }
  }
  // crates (vertical)
  let best = null, bestO = 0;
  for (const k of crates) {
    if (k.dead || !overlap(p, k.x, k.y, T, T)) continue;
    const o = Math.min(p.x + p.w, k.x + T) - Math.max(p.x, k.x);
    if (o > bestO) { bestO = o; best = k; }
  }
  if (best) {
    const k = best;
    if (p.vy >= 0 && prevBottom <= k.y + 6) {
      p.y = k.y - p.h;
      if (k.t === 'i') { p.vy = 0; p.ground = true; }
      else {
        const bouncy = k.t === 'b';
        hitCrate(k, 'top');
        if (state !== 'play') return;
        if (!k.dead && k.t !== 'b' && k.t !== 't') { p.vy = 0; p.ground = true; }
        else {
          p.vy = bouncy ? -7.7 : ((down.a || down.up) ? -5.9 : -4.4);
          p.bounced = true; p.jumps = 1; p.jbuf = 0;
          if (bouncy) sfx.bounce();
        }
      }
    } else if (p.vy < 0) {
      p.y = k.y + T; p.vy = 0.5; hitCrate(k, 'bottom');
      if (state !== 'play') return;
    } else if (k.t === 'v') { explode(k); if (state !== 'play') return; }
  }

  if (p.ground) { p.coyote = 7; p.jumps = 0; if (!wasGround && prevBottom < p.y + p.h + 9) burst(p.x + 5, p.y + 14, 2, C.mid, 0.6); }
  else if (p.coyote > 0) p.coyote--;
  if (p.ground && Math.abs(p.vx) > 0.3) p.run++; else p.run = 0;
  if (p.inv > 0) p.inv--;

  // spikes
  const c0 = Math.floor(p.x / T), c1 = Math.floor((p.x + p.w - 0.001) / T), r0 = Math.floor(p.y / T), r1 = Math.floor((p.y + p.h - 0.001) / T);
  for (let r = r0; r <= r1; r++) for (let cc = c0; cc <= c1; cc++)
    if (tile(cc, r) === '^' && p.y + p.h > r * T + 7 && p.x + p.w > cc * T + 2 && p.x < cc * T + 14) { hurt(); if (state === 'play' && p.inv > 100) p.vy = -4.5; }

  // embers
  for (const e of embersE) if (!e.dead && overlap(p, e.x - 2, e.y - 2, 10, 12)) { e.dead = true; addEmber(1); burst(e.x + 3, e.y + 4, 4, C.or, 1.2); }

  // pit
  if (p.y > VH + 24) { p.inv = 0; shield = 0; die(); return; }

  // goal
  if (L.goal) {
    const gx = L.goal.x * T, gy = (L.goal.y - 1) * T;
    if (overlap(p, gx + 4, gy, 16, 32)) { state = 'clear'; stT = 0; sfx.clear(); store.set('best', Math.max(store.get('best', 0), li + 1));
      stageRes = calcStage(); score += stageRes.total;
      const r = getRec(), old = r.st[li] || { s: 0, g: '' }; if (stageRes.total > old.s) r.st[li] = { s: stageRes.total, g: stageRes.grade, by: RC.n }; store.set('run', r); bankScore(li + 1 >= LEVEL_DEFS.length); }
  }
}

function updateWorld() {
  for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.x += q.vx; q.y += q.vy; q.vy += 0.18; if (--q.life <= 0) parts.splice(i, 1); }
  for (let i = booms.length - 1; i >= 0; i--) if (--booms[i].life <= 0) booms.splice(i, 1);
  for (let i = floats.length - 1; i >= 0; i--) { floats[i].y -= 0.4; if (--floats[i].life <= 0) floats.splice(i, 1); }
  if (shake > 0) shake--; if (flash > 0) flash--;
}
function updateCamera() {
  p.look = (p.look || 0) + (p.face * 16 - (p.look || 0)) * 0.04;   // camera eases to the facing side instead of snapping
  const target = p.x - 128 + p.look;
  camX += (target - camX) * 0.12;
  camX = Math.max(0, Math.min(L.w * T - W, camX));
}

function step() {
  tick++;
  if (state === 'boot') {
    stT++;
    if (hit.select) { if (window.__nullhome) window.__nullhome.goHome(); for (const k in hit) hit[k] = false; return; }
    if (stT > 170 || (stT > 40 && (hit.start || hit.a))) { state = 'carts'; sfx.ok(); }
  } else if (state === 'carts') {
    if (hit.select) { sfx.sel(); if (window.__nullhome) window.__nullhome.goHome(); for (const k in hit) hit[k] = false; return; }
    if (hit.left || hit.right || hit.up || hit.down) { cartI ^= 1; sfx.sel(); }
    if (hit.a || hit.start) { sfx.ok(); if (cartI === 1 && window.NullKart) { window.NullKart.enter(); state = 'kart'; } else state = 'title'; }
  } else if (state === 'kart') {
    window.NullKart.step();
  } else if (state === 'title') {
    if (hit.up) { titleI = (titleI + TMENU.length - 1) % TMENU.length; sfx.sel(); }
    if (hit.down) { titleI = (titleI + 1) % TMENU.length; sfx.sel(); }
    if (hit.select || hit.b) { state = 'carts'; sfx.sel(); }
    else if (hit.start || hit.a) {
      sfx.ok(); flowPlay = titleI === 0;
      if (titleI <= 1) { state = 'rsel'; rselI = runner; } else if (titleI === 2) state = 'recs'; else state = 'carts';
    }
  } else if (state === 'rsel') {
    const v = rselI; if (hit.left) rselI--; if (hit.right) rselI++; if (hit.up) rselI -= 4; if (hit.down) rselI += 4; rselI = (rselI + 8) % 8; if (v !== rselI) sfx.sel();
    if (hit.a || hit.start) {
      if (RUNNERS[rselI].need > cleared()) sfx.hurt();
      else { runner = rselI; RC = RUNNERS[runner]; store.set('runner', runner); sfx.ok(); if (flowPlay) { state = 'ssel'; sselI = Math.min(cleared(), LEVEL_DEFS.length - 1); } else state = 'title'; }
    } else if (hit.b || hit.select) { state = 'title'; sfx.sel(); }
  } else if (state === 'ssel') {
    const n = LEVEL_DEFS.length, v = sselI; if (hit.up) sselI = (sselI + n - 1) % n; if (hit.down) sselI = (sselI + 1) % n; if (v !== sselI) sfx.sel();
    if (hit.a || hit.start) { if (sselI > cleared()) sfx.hurt(); else startGame(sselI); }
    else if (hit.b || hit.select) { state = 'rsel'; sfx.sel(); }
  } else if (state === 'recs') {
    if (hit.a || hit.b || hit.start || hit.select) { state = 'title'; sfx.sel(); }
  } else if (state === 'play') {
    if (hit.select || hit.start) { state = 'pause'; menuI = 0; sfx.sel(); if (menuBtn) menuBtn.classList.add('open'); }
    else {
      levelTime++; if (banner > 0) banner--;
      updatePlayer(); updateCrates(); updateEnemies(); updateWorld(); if (state !== 'dying' || true) updateCamera();
    }
  } else if (state === 'pause') {
    if (hit.up) { menuI = (menuI + MENU.length - 1) % MENU.length; sfx.sel(); }
    if (hit.down) { menuI = (menuI + 1) % MENU.length; sfx.sel(); }
    let close = hit.select;
    if (hit.a || hit.start) {
      sfx.ok();
      if (menuI === 0) close = true;
      else if (menuI === 1) { loadLevel(li); close = true; }
      else if (menuI === 2) setMuted(!muted);
      else { state = 'title'; if (menuBtn) menuBtn.classList.remove('open'); }
    }
    if (close && state !== 'title') { state = 'play'; if (menuBtn) menuBtn.classList.remove('open'); }
  } else if (state === 'dying') {
    p.vy = Math.min(6, p.vy + 0.3); p.y += p.vy;
    updateCrates(); updateWorld();
    if (--stT <= 0) { if (lives < 0) { state = 'over'; stT = 0; } else respawn(); }
  } else if (state === 'clear') {
    stT++; updateWorld();
    if (stT > 110 && (hit.a || hit.start)) { sfx.ok(); if (li + 1 < LEVEL_DEFS.length) loadLevel(li + 1); else { state = 'win'; stT = 0; } }
    else if (stT > 20 && stT < 110 && (hit.a || hit.start)) stT = 110;
  } else if (state === 'over') {
    stT++;
    if (stT === 1) { const keep = score; score = liveScore(); bankScore(true); score = keep; }
    if (stT > 30 && (hit.a || hit.start)) { lives = RC.lives || 4; embers = 0; score = 0; loadLevel(li); sfx.ok(); }
    else if (hit.select) state = 'title';
  } else if (state === 'win') {
    stT++;
    if (stT > 45 && (hit.a || hit.start || hit.select)) state = 'title';
  }
  for (const k in hit) hit[k] = false;
}

/* ============================== render ============================== */
const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x | 0, y | 0, w, h); };
function txt(s, x, y, col, size, align, bold) {
  ctx.font = (bold ? '700 ' : '') + (size || 8) + 'px Silkscreen, monospace';
  ctx.fillStyle = col; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x | 0, y | 0);
}
function big(s, cx, y, size, col) {
  ctx.save(); ctx.translate(cx | 0, y | 0); ctx.transform(1, 0, -0.3, 1, 0, 0);
  txt(s, 0, 0, col, size, 'center', true); ctx.restore();
}
function tri(x, y, col) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 5); ctx.fillRect(x + 1, y + 1, 1, 3); ctx.fillRect(x + 2, y + 2, 1, 1); }

const PAL = { k: C.ink, m: C.mid, w: C.bg, o: C.or, r: C.red, g: C.l2, c: C.cream, b: C.blue, d: C.blueD, s: C.shade };
function mkSpr(rows) {
  const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
  const x = c.getContext('2d');
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (PAL[ch]) { x.fillStyle = PAL[ch]; x.fillRect(i, j, 1, 1); } }));
  return c;
}
const SPR = {
  walker: mkSpr([
    '.kkkkkkkkkk.', 'kmmmmmmmmmmk', 'kmkkmmmmkkmk', 'kmwkmmmmwkmk', 'kmmmmmmmmmmk', 'kmmkkkkkkmmk',
    'kmmkrrrrkmmk', 'kmmmmmmmmmmk', '.kkkkkkkkkk.', '............', '............', '............']),
  flyer: mkSpr([
    '.....kk.....', '....kook....', '...kooook...', 'kkkkoccokkkk', '.kooccccook.', '..kooccook..',
    '..kooooook..', '.kookkkkook.', '.kok....kok.', 'kk........kk', '............']),
  ember: mkSpr(['..o...', '.oo...', '.ooo..', 'ooooo.', 'oocoo.', 'occco.', '.ooo..'])
};

const HEADS = [
  ['.k....kk....k.', '.kk...kk...kk.', '.kkk.kkkk.kkk.', '.rkkkkkkkkkkr.', '.rkkkkkkkkkkr.', 'rrkkkkkkkkkkrr', 'rrkkkkkkkkkkrr', '.rkkkkkkkkkkr.', '...kkkkkkkk...'],
  ['.kk........kk.', '.kek......kek.', '.kkkk....kkkk.', '..kkkkkkkkkk..', '.kkkkkkkkkkkk.', 'ckkkkkkkkkkkk.', 'ckkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '...kkkkkkkk...'],
  ['k............k', 'kk..........kk', '.kkk......kkk.', '..kkkkkkkkkk..', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '.cckkkkkkkkcc.'],
  ['..c...cc...c..', '..k...kk...k..', 'c.kk.kkkk.kk.c', 'kkkkkkkkkkkkkk', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '...kkkkkkkk...'],
  ['.oo...........', '..ok..........', '...kkkkkkkk...', '..kkkkkkkkkk..', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '...kkkkkkkk...'],
  ['..k........k..', '...k......k...', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.'],
  ['..............', '....kkkkkk....', '..kkkkkkkkkk..', 'kkkkkkkkkkkkkk', 'kkkkkkkkkkkkkk', 'kkkkkkkkkkkkkk', 'kkkkkkkkkkkkkk', 'kk.kkkkkkkk.kk', 'kk..kkkkkk..kk'],
  ['...yyyyyyyy...', '..............', '....kkkkkk....', '..kkkkkkkkkk..', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '.kkkkkkkkkkkk.', '...kkkkkkkk...']
];
const SPRH = RUNNERS.map((r, i) => {
  const rows = HEADS[i].concat(['..tttttttttt..', '.kttttttttthk.', '..tttttthhhh..']);
  const pal = { k: '#0b0b0d', r: C.hp, c: C.cream, e: '#e2b89a', o: C.or, y: '#e8c04a', t: r.tee, h: shade(r.tee, 0.82) };
  const c = document.createElement('canvas'); c.width = 14; c.height = rows.length; const x = c.getContext('2d');
  rows.forEach((row, j) => [...row].forEach((ch, k) => { if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(k, j, 1, 1); } }));
  return c;
});
function hash(n) { n = Math.imul((n | 0) ^ ((n | 0) >>> 15), 2246822519); n = Math.imul(n ^ (n >>> 13), 3266489917); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }

/* three stages, three moods: grey LCD afternoon / green subway platform / indigo night rooftops */
const THEMES = [
  { sky: '#d8d6cf', g: '#6f6d68', gd: '#1d1d1a', gt: '#1d1d1a', gl: '#aaa79f', plat: '#1d1d1a', plat2: '#6f6d68', spike: '#1d1d1a', gate: '#1d1d1a' },
  { sky: '#b9cdbb', g: '#4f6b5c', gd: '#22332a', gt: '#1a261f', gl: '#8fb09a', plat: '#22332a', plat2: '#6f8f7c', spike: '#1a261f', gate: '#1a261f' },
  { sky: '#2f2a6b', g: '#55508f', gd: '#211d4d', gt: '#c9c4ee', gl: '#8e86d0', plat: '#c9c4ee', plat2: '#8e86d0', spike: '#f2efe8', gate: '#c9c4ee' }
];
let TH = THEMES[0];
function drawBackdrop() {
  TH = THEMES[li % THEMES.length];
  const base = TOP + VH - 32;
  if (li === 1) {
    /* SUBWAY LINE — a train slides past behind the platform, strip lights overhead, benches along the wall */
    R(0, TOP, W, VH, TH.sky);
    R(0, TOP, W, 46, '#93ab98'); R(0, TOP + 46, W, 3, '#5d7a69');
    const tx = (tick * 3.2 + camX * 0.6) % 172;                       // train body + warm windows
    R(0, TOP + 52, W, 78, '#a9bda9'); R(0, TOP + 52, W, 3, '#7d9684'); R(0, TOP + 118, W, 12, '#c0633a'); R(0, TOP + 116, W, 2, '#7d9684');
    for (let x = -172 - tx; x < W + 172; x += 172) {
      R(x + 8, TOP + 62, 70, 40, '#ffcf96'); R(x + 8, TOP + 62, 70, 4, '#ffe6bf'); R(x + 41, TOP + 62, 3, 40, '#a9bda9');
      R(x + 92, TOP + 60, 34, 56, '#8fa596'); R(x + 96, TOP + 64, 12, 30, '#ffcf96'); R(x + 110, TOP + 64, 12, 30, '#ffcf96');
      R(x + 138, TOP + 62, 26, 40, '#ffcf96'); R(x + 138, TOP + 62, 26, 4, '#ffe6bf');
    }
    R(0, TOP + 130, W, 4, '#5d7a69'); R(0, TOP + 134, W, VH - 134, '#9fb8a4');
    const o2 = camX * 0.35;                                            // far benches
    for (let i = Math.floor(o2 / 64) - 1; i < Math.floor(o2 / 64) + 7; i++) { const x = (i * 64 - o2) | 0; R(x + 6, TOP + 138, 50, 12, '#6f8f7c'); R(x + 6, TOP + 138, 50, 2, '#86a892'); R(x + 30, TOP + 138, 2, 12, '#55705f'); R(x + 10, TOP + 150, 3, 8, '#3d5245'); R(x + 49, TOP + 150, 3, 8, '#3d5245'); }
    const o3 = camX * 0.55;                                            // pillars + strip lights
    for (let i = Math.floor(o3 / 150) - 1; i < Math.floor(o3 / 150) + 4; i++) {
      const x = (i * 150 - o3) | 0;
      R(x + 20, TOP, 16, VH, '#3f5a4b'); R(x + 20, TOP, 4, VH, '#587a67'); R(x + 14, TOP + 40, 28, 6, '#2c4136'); R(x + 23, TOP + 70, 10, 14, '#c0633a');
      const fl = (tick + i * 37) % 240 < 4 ? '#93ab98' : '#f1ffe8';
      R(x + 76, TOP + 8, 46, 6, '#2c4136'); R(x + 78, TOP + 14, 42, 3, fl); if (fl !== '#93ab98') { ctx.globalAlpha = 0.16; R(x + 70, TOP + 17, 58, 22, '#f1ffe8'); ctx.globalAlpha = 1; }
    }
    return;
  }
  if (li === 2) {
    /* MIDNIGHT ROOFS — indigo sky, moon, blinking beacons, lit windows */
    for (let k = 0; k < 8; k++) R(0, TOP + k * 24, W, 24, ['#221d57', '#27215f', '#2c2568', '#322a70', '#3a2d78', '#44307c', '#4f327c', '#5a3478'][k]);
    for (let k = 0; k < 34; k++) { const sx = (hash(k * 91) * 400 - camX * 0.03) % W, sy = TOP + 4 + hash(k * 53 + 7) * 96; if ((tick + k * 13) % 90 > 8) R((sx + W) % W, sy, 1, 1, k % 5 ? '#aab4ff' : '#f2efe8'); }
    const mx = 70 - camX * 0.03, my = TOP + 40;
    ctx.fillStyle = '#f2efe8'; for (let y = -15; y <= 15; y++) { const hw = Math.sqrt(225 - y * y) | 0; ctx.fillRect((mx - hw) | 0, my + y, hw * 2, 1); }
    ctx.fillStyle = '#27215f'; for (let y = -12; y <= 12; y++) { const hw = Math.sqrt(144 - y * y) | 0; ctx.fillRect((mx + 7 - hw) | 0, my - 4 + y, hw * 2, 1); }
    for (let layer = 0; layer < 2; layer++) {
      const par = layer ? 0.42 : 0.2, bw = layer ? 28 : 36, col = layer ? '#15123c' : '#1e1a52';
      const off = camX * par, i0 = Math.floor(off / bw) - 1;
      for (let i = i0; i < i0 + W / bw + 3; i++) {
        const h = (layer ? 30 : 60) + hash(i * 31 + 194 + layer * 1000) * (layer ? 52 : 70), x = (i * bw - off) | 0, y = (base - h) | 0;
        R(x, y, bw - 2, h + 34, col);
        if (hash(i * 7 + 5 + layer) > 0.55) { R(x + (bw >> 1) - 1, y - 12, 2, 12, col); if ((tick + i * 23) % 80 < 40) R(x + (bw >> 1) - 2, y - 15, 4, 4, '#ff4a3a'); }
        for (let wy = y + 5; wy < base - 4; wy += 8) for (let wx = x + 4; wx < x + bw - 7; wx += 7) { const hv = hash(wx * 13 + wy * 57 + i * 3 + 11); if (hv > 0.62) R(wx, wy, 3, 4, hv > 0.9 ? '#ffd98a' : layer ? '#ffb657' : '#c98a52'); }
      }
    }
    return;
  }
  /* BACK ALLEY — the grey pocket-LCD afternoon */
  R(0, TOP, W, VH, C.bg);
  const sx = 232 - camX * 0.04, sy = TOP + 44;
  ctx.fillStyle = C.l1;
  for (let y = -26; y <= 26; y++) { const hw = Math.sqrt(676 - y * y) | 0; if ((y & 3) !== 3 || y < 0) ctx.fillRect((sx - hw) | 0, sy + y, hw * 2, 1); }
  for (let layer = 0; layer < 2; layer++) {
    const par = layer ? 0.42 : 0.2, bw = layer ? 26 : 34, col = layer ? C.l2 : C.l1;
    const off = camX * par, i0 = Math.floor(off / bw) - 1;
    for (let i = i0; i < i0 + W / bw + 3; i++) {
      const h = (layer ? 28 : 54) + hash(i * 31 + layer * 1000) * (layer ? 46 : 58);
      const x = (i * bw - off) | 0, y = (base - h) | 0;
      R(x, y, bw - (layer ? 3 : 2), h + 34, col);
      for (let wy = y + 5; wy < base - 4; wy += 8) for (let wx = x + 4; wx < x + bw - 7; wx += 7)
      { const hv = hash(wx * 13 + wy * 57 + i * 3); if (hv > 0.55) R(wx, wy, 3, 4, hv > 0.965 ? C.or : (layer ? C.l1 : C.bg)); }
    }
  }
}

function drawTiles(ox) {
  const c0 = Math.max(0, Math.floor(camX / T)), c1 = Math.min(L.w - 1, c0 + W / T + 1);
  for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) {
    const t = L.g[r][c]; if (t === ' ') continue;
    const x = c * T - ox, y = TOP + r * T;
    if (t === '#') {
      const topOpen = r === 0 || L.g[r - 1][c] !== '#';
      R(x, y, T, T, TH.g);
      ctx.fillStyle = TH.gd;
      if (li === 1) { ctx.fillRect(x, y + 7, T, 1); ctx.fillRect(x + ((r & 1) ? 4 : 12), y, 1, 7); ctx.fillRect(x + ((r & 1) ? 12 : 4), y + 8, 1, 8); }          // station tiles
      else for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (((i + j + c + r) & 1) === 0) ctx.fillRect(x + i * 4 + ((j & 1) ? 2 : 0), y + j * 4 + 1, 1, 1);
      if (topOpen) { R(x, y, T, 3, TH.gt); R(x, y + 3, T, 1, TH.gl); if (li === 1) { if ((c & 1) === 0) R(x, y + 1, 8, 1, '#e8c04a'); } else if ((c & 1) === 0) R(x + 5, y + 5, 6, 1, TH.gd); }
      if (c === 0 || L.g[r][c - 1] !== '#') R(x, y, 1, T, TH.gd);
      if (c === L.w - 1 || L.g[r][c + 1] !== '#') R(x + T - 1, y, 1, T, TH.gd);
    } else if (t === '=') {
      R(x, y, T, 5, TH.plat); R(x, y + 1, T, 1, TH.plat2); R(x + 2, y + 5, 2, 3, TH.plat); R(x + 12, y + 5, 2, 3, TH.plat); R(x + 7, y + 5, 2, 2, TH.plat2);
    } else if (t === '^') {
      ctx.fillStyle = TH.spike;
      for (let s = 0; s < 2; s++) for (let j = 0; j < 8; j++) ctx.fillRect(x + s * 8 + 4 - (j >> 1), y + 8 + j, ((j >> 1) + 1) * 2 - (j < 2 ? 1 : 0), 1);
      ctx.fillStyle = C.or; ctx.fillRect(x + 3, y + 8, 1, 1); ctx.fillRect(x + 11, y + 8, 1, 1);
    }
  }
}

function drawCrate(c, ox) {
  const sq = c.sq > 0 ? Math.ceil(c.sq / 2) : 0;
  const x = (c.x - ox) | 0, y = (TOP + c.y + sq) | 0, h = T - sq;
  const lit = c.t === 't' && c.fuse > 0 && ((c.fuse / 6) | 0) % 2 === 0;
  if (c.t === 'i') {
    R(x, y, T, h, C.ink); R(x + 2, y + 2, 12, h - 4, C.mid); R(x + 4, y + 4, 8, h - 8, C.ink);
    R(x + 2, y + 2, 2, 2, C.bg); R(x + 12, y + 2, 2, 2, C.bg); R(x + 2, y + h - 4, 2, 2, C.bg); R(x + 12, y + h - 4, 2, 2, C.bg);
    return;
  }
  const face = c.t === 'v' ? C.or : c.t === 't' ? (lit ? C.or : C.red) : C.cream;
  R(x, y, T, h, C.ink); R(x + 1, y + 1, 14, h - 2, face);
  R(x + 1, y + 1, 14, 1, c.t === 'v' || c.t === 't' ? C.cream : C.bg);
  if (c.t === 'c' || c.t === 'q' || c.t === 'k' || c.t === 'l' || c.t === 's') { R(x + 3, y + 3, 10, h - 6, C.l1); R(x + 3, y + 3, 10, 1, C.mid); R(x + 3, y + h - 4, 10, 1, C.mid); R(x + 3, y + 3, 1, h - 6, C.mid); R(x + 12, y + 3, 1, h - 6, C.mid); }
  const cy = y + (h >> 1);
  ctx.fillStyle = C.ink;
  switch (c.t) {
    case 'c': for (let i = 0; i < 8; i++) { ctx.fillRect(x + 4 + i, cy - 4 + i, 1, 1); ctx.fillRect(x + 11 - i, cy - 4 + i, 1, 1); } break;
    case 'q': R(x + 6, cy - 4, 4, 1, C.or); R(x + 9, cy - 3, 2, 2, C.or); R(x + 7, cy - 1, 3, 1, C.or); R(x + 7, cy, 2, 1, C.or); R(x + 7, cy + 2, 2, 2, C.or); break;
    case 'b': R(x + 3, cy + 2, 10, 2, C.mid); for (let i = 0; i < 4; i++) R(x + 7 - i, cy - 4 + i, 2 + i * 2, 1, C.ink); R(x + 7, cy, 2, 2, C.ink); break;
    case 't': {
      const n = c.fuse > 0 ? String(Math.ceil(c.fuse / 60)) : '!';
      R(x + 4, cy - 5, 8, 10, C.ink); txt(n, x + 8, cy + 3, lit ? C.cream : C.or, 8, 'center', true); break;
    }
    case 'v': R(x + 4, cy - 5, 3, 6, C.ink); R(x + 9, cy - 5, 3, 6, C.ink); R(x + 4, cy + 3, 3, 2, C.ink); R(x + 9, cy + 3, 3, 2, C.ink);
      if ((tick >> 3) & 1) R(x + 1, y + h - 2, 14, 1, C.cream); break;
    case 'k': R(x + 5, cy - 4, 6, 1, C.ink); R(x + 4, cy - 3, 2, 6, C.ink); R(x + 5, cy + 3, 6, 1, C.ink); R(x + 10, cy - 3, 1, 1, C.ink); R(x + 10, cy + 2, 1, 1, C.ink); break;
    case 'l': R(x + 4, cy - 2, 8, 6, C.ink); R(x + 4, cy - 5, 1, 3, C.ink); R(x + 5, cy - 4, 1, 2, C.ink); R(x + 7, cy - 5, 2, 3, C.ink); R(x + 11, cy - 5, 1, 3, C.ink); R(x + 10, cy - 4, 1, 2, C.ink); R(x + 3, cy - 1, 1, 3, C.hp); R(x + 12, cy - 1, 1, 3, C.hp); R(x + 5, cy, 2, 1, C.cream); R(x + 9, cy, 2, 1, C.cream); break;
    case 's': R(x + 5, cy - 4, 6, 1, C.or); R(x + 5, cy + 3, 6, 1, C.or); R(x + 4, cy - 3, 1, 6, C.or); R(x + 11, cy - 3, 1, 6, C.or); R(x + 7, cy - 1, 2, 2, C.ink); break;
  }
}

/* hero: 14x18 sprite — spiky black head, white glare, red headphones, cream tee, baggy blue jeans, cream kicks */
function drawHero(x, y, face, o) {
  const ci = o.ci === undefined ? runner : o.ci, rc = RUNNERS[ci], PT = rc.pants, PD = shade(rc.pants, 0.68), SH = rc.shoe, SO = shade(rc.shoe, 0.8);
  ctx.save();
  ctx.translate((x | 0) + (face < 0 ? 14 : 0), y | 0); ctx.scale(face < 0 ? -1 : 1, 1);
  const bob = o.ground && o.run > 0 && ((o.run >> 2) & 1) ? 1 : 0;
  ctx.drawImage(SPRH[ci], 0, bob);
  if (ci === 0) R(12, 8 + bob, 1, 3, C.hp);                       // headphone cable
  const ey = 5 + bob, cr = C.cream;
  if (o.dead || ci === 3) {                                       // X eyes (XED always wears them)
    for (let i = 0; i < 3; i++) { R(3 + i, ey - 1 + i, 1, 1, cr); R(5 - i, ey - 1 + i, 1, 1, cr); R(8 + i, ey - 1 + i, 1, 1, cr); R(10 - i, ey - 1 + i, 1, 1, cr); }
  } else if (ci === 1) {                                          // rainbow visor
    ['#e0352b', '#ff6a2b', '#e8c04a', '#58c59a', '#3a56c5'].forEach((c, k) => R(3 + k * 2, ey - 1, 2, 3, c));
    if (!o.blink) { R(6, ey, 2, 1, cr); R(10, ey, 2, 1, cr); }
  } else if (ci === 2) {                                          // round orange goggles
    R(4, ey - 1, 4, 4, cr); R(9, ey - 1, 4, 4, cr); R(5, ey, 2, 2, C.or); R(10, ey, 2, 2, C.or);
  } else if (ci === 4) { if (o.blink) { R(5, ey + 1, 2, 1, cr); R(10, ey + 1, 2, 1, cr); } else { R(5, ey - 1, 2, 3, cr); R(10, ey - 1, 2, 3, cr); } }
  else if (ci === 5) { R(3, ey - 2, 9, 5, '#58c59a'); R(4, ey, 2, 1, C.ink); R(6, ey - 1, 2, 1, C.ink); R(8, ey, 2, 1, C.ink); R(10, ey - 1, 1, 1, C.ink); }
  else if (ci === 6) { R(4, ey + 1, 3, 1, cr); R(9, ey + 1, 3, 1, cr); if (!o.blink) { R(4, ey, 3, 1, '#8e97c4'); R(9, ey, 3, 1, '#8e97c4'); } }
  else if (ci === 7) { if (o.blink) R(6, ey + 1, 4, 1, cr); else { R(6, ey - 1, 4, 4, cr); R(8, ey, 2, 2, C.ink); } }
  else if (o.blink) { R(5, ey + 1, 2, 1, cr); R(9, ey + 1, 2, 1, cr); }
  else { R(4, ey, 2, 1, cr); R(5, ey + 1, 2, 1, cr); R(10, ey, 2, 1, cr); R(9, ey + 1, 2, 1, cr); R(6, ey + 1, 1, 1, C.ink); R(10, ey + 1, 1, 1, C.ink); }
  // legs
  const Y = 13;
  R(2, Y - 1, 10, 2, PT); R(11, Y - 1, 1, 2, PD);
  if (!o.ground) {
    const up = o.vy < 0;
    R(1, Y + 1, 5, up ? 1 : 2, PT); R(8, Y + 1, 5, 2, PT); R(5, Y + 1, 1, 1, PD); R(12, Y + 1, 1, 2, PD);
    R(0, Y + (up ? 2 : 3), 5, 2, SH); R(9, Y + 3, 5, 2, SH); R(0, Y + (up ? 3 : 4), 5, 1, SO); R(9, Y + 4, 5, 1, SO);
  } else if (o.run > 0 && !bob) {
    R(0, Y + 1, 5, 2, PT); R(9, Y + 1, 5, 2, PT); R(4, Y + 1, 1, 2, PD); R(13, Y + 1, 1, 2, PD);
    R(-1, Y + 3, 5, 2, SH); R(-1, Y + 4, 5, 1, SO); R(10, Y + 2, 5, 2, SH); R(10, Y + 3, 5, 1, SO);
  } else if (o.run > 0) {
    R(3, Y + 1, 8, 2, PT); R(10, Y + 1, 1, 2, PD);
    R(3, Y + 3, 8, 2, SH); R(3, Y + 4, 8, 1, SO);
  } else {
    R(1, Y + 1, 5, 2, PT); R(8, Y + 1, 5, 2, PT); R(5, Y + 1, 1, 2, PD); R(12, Y + 1, 1, 2, PD);
    R(0, Y + 3, 6, 2, SH); R(8, Y + 3, 6, 2, SH); R(0, Y + 4, 6, 1, SO); R(8, Y + 4, 6, 1, SO);
  }
  ctx.restore();
}
function heroBig(ci, x, y, sc, run) { ctx.save(); ctx.translate(x | 0, y | 0); ctx.scale(sc, sc); drawHero(0, 0, 1, { ground: true, run: run || 0, vy: 0, ci, blink: tick % 170 < 6 }); ctx.restore(); }
function drawPlayer(ox) {
  const x = (p.x - ox - 2) | 0, y = (TOP + p.y - 4) | 0;
  if (state === 'play' && p.inv > 0 && ((p.inv >> 2) & 1)) return;
  if (shield > 0 && state === 'play') {
    const a = tick * 0.12;
    for (let s = 0; s < shield; s++) {
      const b = a + s * 3.14159;
      R(x + 7 + Math.cos(b) * 12 - 1, y + 9 + Math.sin(b) * 6 - 1, 3, 3, C.or);
      R(x + 7 + Math.cos(b - 0.5) * 12, y + 9 + Math.sin(b - 0.5) * 6, 1, 1, C.or);
    }
  }
  if (p.spin > 0) {
    const f = (p.spin >> 1) & 3;
    drawHero(x, y, p.face, { ground: false, run: 0, vy: (p.spin >> 2) & 1 ? 1 : -1 });   // keeps facing where you steer
    R(x - 5 + f * 2, y + 5, 5, 1, C.ink); R(x + 14 - f * 2, y + 7, 5, 1, C.ink);
    R(x - 6 + f * 3, y + 11, 6, 1, C.cream); R(x + 13 - f * 3, y + 10, 6, 1, C.shade);
    R(x - 5 + f * 2, y + 15, 6, 1, RC.pants); R(x + 13 - f * 2, y + 14, 6, 1, RC.pants);
    R(x - 7, y + 9 + (f & 1), 3, 1, C.or); R(x + 18, y + 12 - (f & 1), 3, 1, C.or);
    return;
  }
  drawHero(x, y, p.face, { ground: p.ground, run: p.run, vy: p.vy, dead: state === 'dying', blink: tick % 170 < 6 });
}

function drawEnemies(ox) {
  for (const e of enemies) {
    if (e.dead) continue;
    const x = (e.x - ox) | 0, y = (TOP + e.y) | 0;
    if (x < -20 || x > W + 20) continue;
    if (e.t === 'f') {
      ctx.drawImage(SPR.flyer, x, y);
      const fl = (tick >> 3) & 1; R(x - 3, y + 3 + fl * 2, 3, 1, C.ink); R(x + 12, y + 3 + fl * 2, 3, 1, C.ink);
    } else {
      ctx.drawImage(SPR.walker, x, y);
      const f = (tick >> 3) & 1;
      R(x + 2 + f, y + 9, 2, 3, C.ink); R(x + 8 - f, y + 9, 2, 3, C.ink);
      if (e.t === 'h') for (let s = 0; s < 3; s++) { R(x + 1 + s * 4, y - 2, 2, 2, C.or); R(x + 1 + s * 4 + (s === 1 ? 0 : 0), y - 4, 1, 2, C.or); R(x + 2 + s * 4, y - 3, 1, 1, C.ink); }
    }
  }
}

function drawGoal(ox) {
  if (!L.goal) return;
  const x = (L.goal.x * T - ox) | 0, y = TOP + (L.goal.y - 1) * T;
  if (x < -30 || x > W + 10) return;
  R(x, y, 4, 32, TH.gate); R(x + 20, y, 4, 32, TH.gate); R(x, y - 3, 24, 4, TH.gate); R(x + 2, y - 5, 20, 2, TH.gate); R(x + 4, y, 16, 32, '#0b0b0d');
  for (let j = 0; j < 30; j += 2) {
    const wv = Math.sin((tick * 0.15) + j * 0.5) * 3;
    R(x + 5 + ((j + (tick >> 2)) & 3), y + 1 + j, 14 - ((j + (tick >> 2)) & 3) * 2 + wv, 1, (j + (tick >> 1)) % 6 < 3 ? C.or : C.cream);
  }
  R(x + 9, y - 10, 6, 6, C.or); R(x + 11, y - 12, 2, 10, C.or); R(x + 7, y - 8, 10, 2, C.or);
}

function drawHUD() {
  // top bar
  R(0, 0, W, TOP, C.ink);
  const inMenu = state === 'title' || state === 'rsel' || state === 'ssel' || state === 'recs';
  if (inMenu) big('NULL RUN', 30, 9, 8, C.cream); else txt(String(state === 'clear' || state === 'win' || state === 'over' ? score : liveScore()).padStart(6, '0'), 8, 9, C.or, 8, 'left', true);
  if (!inMenu) {
    ctx.drawImage(SPR.ember, 70, 2); txt(String(embers).padStart(2, '0'), 79, 9, C.cream);
    R(104, 3, 7, 7, C.cream); R(105, 4, 5, 5, C.ink); R(106, 5, 3, 3, C.cream);
    txt(broken + '/' + totalCrates, 114, 9, C.cream);
    // lives
    R(169, 4, 8, 6, C.cream); R(168, 1, 1, 3, C.cream); R(169, 2, 1, 2, C.cream); R(172, 1, 2, 3, C.cream); R(177, 1, 1, 3, C.cream); R(176, 2, 1, 2, C.cream); R(167, 5, 1, 3, C.hp); R(178, 5, 1, 3, C.hp); R(170, 6, 2, 1, C.ink); R(174, 6, 2, 1, C.ink);
    txt('x' + Math.max(0, lives), 180, 9, C.cream);
    for (let s = 0; s < shield; s++) { R(206 + s * 9, 3, 6, 6, C.or); R(208 + s * 9, 5, 2, 2, C.ink); }
    const sec = (levelTime / 60) | 0;
    txt(((sec / 60) | 0) + ':' + String(sec % 60).padStart(2, '0'), 262, 9, C.l2, 8, 'right');
  }
  R(W - 28, 2, 1, 8, C.or);
  txt(String(inMenu ? 1 : li + 1).padStart(2, '0'), W - 8, 9, C.cream, 8, 'right');
  // bottom bar
  R(0, H - 12, W, 12, C.ink);
  let l = 'MENU', r = 'A JUMP  B SPIN';
  if (state === 'title') { l = 'B CARTS'; r = 'SELECT'; }
  else if (state === 'rsel') { l = 'BACK'; r = flowPlay ? 'NEXT' : 'CHOOSE'; }
  else if (state === 'ssel') { l = 'BACK'; r = 'START'; }
  else if (state === 'recs') { l = 'BACK'; r = 'OK'; }
  else if (state === 'pause') { l = 'BACK'; r = 'SELECT'; }
  else if (state === 'clear') { l = 'MENU'; r = li + 1 < LEVEL_DEFS.length ? 'NEXT STAGE' : 'CONTINUE'; }
  else if (state === 'over') { l = 'QUIT'; r = 'TRY AGAIN'; }
  else if (state === 'win') { l = ''; r = 'TITLE'; }
  if (state === 'play' || state === 'dying') {
    // key in orange, action in cream — the same keys work on the console buttons
    const seg = [['ESC', 1], [' MENU', 0], ['    ', 0], ['< >', 1], [' MOVE', 0], ['   ', 0], ['SPACE', 1], [' JUMP', 0], ['   ', 0], ['B', 1], [' SPIN', 0]];
    ctx.font = '700 8px Silkscreen, monospace';
    let tw = 0; seg.forEach(g => tw += ctx.measureText(g[0]).width);
    let x = Math.round((W - tw) / 2);
    seg.forEach(g => { txt(g[0], x, H - 3, g[1] ? C.or : C.cream, 8, 'left', true); ctx.font = '700 8px Silkscreen, monospace'; x += ctx.measureText(g[0]).width; });
  } else {
    txt(l, 8, H - 3, C.l2);
    ctx.font = '8px Silkscreen, monospace';
    const rw = ctx.measureText(r).width;
    tri(W - 14 - rw, H - 10, C.cream);
    txt(r, W - 8, H - 3, C.cream, 8, 'right');
  }
}

function panel(lines, title, sub) {
  R(0, TOP, W, VH, C.bg);
  ctx.fillStyle = C.l1; for (let y = TOP + 2; y < TOP + VH; y += 4) ctx.fillRect(0, y, W, 1);
  if (title) {
    const parts2 = title.split('\n'); let y = TOP + (parts2.length > 1 ? 62 : 78) - (lines ? lines.length * 5 : 0);
    for (const t of parts2) { big(t, W / 2 + 6, y, 32, C.ink); y += 34; }
    if (sub) txt(sub, W / 2, y - 14, C.mid, 8, 'center');
    return y;
  }
  return TOP + 40;
}

function paper() { R(0, TOP, W, VH, C.bg); ctx.fillStyle = C.l1; for (let y = TOP + 2; y < TOP + VH; y += 4) ctx.fillRect(0, y, W, 1); }
function pts(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function drawTitle() {
  paper();
  big('NULL', 96, TOP + 44, 32, C.ink); big('RUN', 92, TOP + 74, 32, C.ink);
  txt('@ LAST TRAIN HOME.', 16, TOP + 90, C.mid);
  TMENU.forEach((m, i) => { const y = TOP + 112 + i * 14; if (i === titleI) { R(14, y - 9, 110, 12, C.ink); tri(19, y - 6, C.or); txt(m, 28, y, C.cream, 8, 'left', true); } else txt(m, 28, y, C.ink); });
  txt('HI ' + pts(getRec().hi), 16, TOP + 180, C.or, 8, 'left', true);
  // showcase: the chosen runner on a rooftop strip
  R(190, TOP + 14, 116, 164, C.ink); R(192, TOP + 16, 112, 160, C.bg);
  ctx.save(); ctx.beginPath(); ctx.rect(192, TOP + 16, 112, 160); ctx.clip();
  for (let i = 0; i < 7; i++) { const hh = 40 + hash(i * 9 + 3) * 60, bx = 176 + ((i * 22 - (tick >> 2)) % 154 + 154) % 154; R(bx, TOP + 150 - hh, 18, hh, C.l1); }
  ctx.restore();
  R(192, TOP + 150, 112, 26, C.mid); R(192, TOP + 150, 112, 3, C.ink);
  for (let k = 0; k < 4; k++) R(192 + ((k * 32 - tick) % 112 + 112) % 112, TOP + 160, 10, 2, C.ink);
  heroBig(runner, 227, TOP + 78, 4, tick);
  R(192, TOP + 16, 112, 12, C.ink); txt(RC.n, 248, TOP + 25, C.cream, 8, 'center', true);
}
function statBar(label, v, x, y) { txt(label, x, y, C.mid); for (let k = 0; k < 5; k++) R(x + 40 + k * 9, y - 6, 7, 6, k < v ? C.ink : C.l2); }
function drawRsel() {
  paper(); big(flowPlay ? 'PICK YOUR RUNNER' : 'RUNNERS', W / 2 + 3, TOP + 20, 16, C.ink);
  RUNNERS.forEach((c, i) => {
    const x = 22 + (i % 4) * 72, y = TOP + 28 + ((i / 4) | 0) * 54, locked = c.need > cleared(), on = i === rselI;
    R(x - 2, y - 2, 64, 50, on ? C.or : C.ink); R(x, y, 60, 46, on ? C.cream : C.l1);
    if (locked) { R(x + 22, y + 14, 16, 14, C.mid); R(x + 25, y + 7, 10, 9, C.mid); R(x + 27, y + 9, 6, 6, C.l1); }
    else heroBig(i, x + 16, y - 1, 2, on ? tick : 0);
    R(x, y + 36, 60, 10, on ? C.ink : C.l2); txt(locked ? 'STAGE ' + c.need : c.n, x + 30, y + 44, on ? C.cream : C.ink, 8, 'center', on);
  });
  const c = RUNNERS[rselI], locked = c.need > cleared(); R(14, TOP + 140, W - 28, 46, C.ink); R(16, TOP + 142, W - 32, 42, C.bg);
  big(c.n, 72, TOP + 160, 16, C.ink); txt(locked ? 'CLEAR STAGE ' + c.need + ' TO UNLOCK' : c.tag, 24, TOP + 176, locked ? '#e0352b' : C.mid);
  statBar('SPEED', c.sp, 196, TOP + 154); statBar('JUMP', c.jp, 196, TOP + 166); statBar('SPIN', c.sn, 196, TOP + 178);
}
function gradeBox(g, x, y, sz) { R(x, y, sz, sz, g === 'S' ? C.or : C.ink); if (g) big(g, x + sz / 2 + 2, y + sz - 4, sz - 4, g === 'S' ? C.ink : C.cream); }
function drawSsel() {
  paper(); big('PICK A STAGE', W / 2 + 3, TOP + 24, 16, C.ink); const rec = getRec();
  LEVEL_DEFS.forEach((d, i) => {
    const y = TOP + 40 + i * 46, on = i === sselI, locked = i > cleared(), b = rec.st[i];
    R(20, y - 2, W - 40, 40, on ? C.or : C.ink); R(22, y, W - 44, 36, on ? C.cream : C.l1);
    const th = THEMES[i]; R(26, y + 4, 56, 28, th.sky);
    if (i === 1) { R(26, y + 10, 56, 10, '#a9bda9'); for (let k = 0; k < 3; k++) R(30 + k * 18, y + 12, 12, 6, '#ffcf96'); R(46, y + 4, 4, 20, '#3f5a4b'); }
    else for (let k = 0; k < 4; k++) { R(28 + k * 14, y + 24 - 6 - hash(k + i * 5) * 10, 11, 16, i === 2 ? '#15123c' : C.l2); if (i === 2) R(31 + k * 14, y + 16, 2, 2, '#ffb657'); }
    if (i === 2) R(70, y + 7, 5, 5, '#f2efe8');
    R(26, y + 24, 56, 8, th.g); R(26, y + 24, 56, 2, th.gt);
    txt('0' + (i + 1), 92, y + 14, C.or, 8, 'left', true); txt(locked ? '? ? ?' : d[0], 110, y + 14, C.ink, 8, 'left', true);
    txt(locked ? 'CLEAR STAGE ' + i + ' FIRST' : 'BEST ' + (b ? pts(b.s) : '------'), 92, y + 28, locked ? '#e0352b' : C.mid);
    if (b && b.g) gradeBox(b.g, W - 60, y + 6, 24);
  });
}
function drawRecs() {
  paper(); big('RECORDS', W / 2 + 3, TOP + 22, 16, C.ink); const rec = getRec();
  R(20, TOP + 32, W - 40, 44, C.ink); txt('HIGH SCORE', 32, TOP + 48, C.l2); big(pts(rec.hi), 118, TOP + 68, 24, C.or);
  if (rec.hiBy) { const k = RUNNERS.findIndex(r => r.n === rec.hiBy); if (k >= 0) heroBig(k, W - 66, TOP + 36, 2, 0); txt('BY ' + rec.hiBy, W - 78, TOP + 48, C.cream, 8, 'right'); }
  LEVEL_DEFS.forEach((d, i) => {
    const y = TOP + 96 + i * 26, b = rec.st[i];
    txt('0' + (i + 1), 24, y, C.or, 8, 'left', true); txt(d[0], 44, y, C.ink, 8, 'left', true);
    txt(b ? pts(b.s) + (b.by ? '  ' + b.by : '') : '------', 44, y + 11, C.mid);
    gradeBox(b ? b.g : '', W - 46, y - 10, 22);
  });
  txt('STAGES CLEARED ' + cleared() + '/' + LEVEL_DEFS.length + '   RUNNERS ' + RUNNERS.filter(r => r.need <= cleared()).length + '/8', W / 2, TOP + 180, C.mid, 8, 'center');
}

function drawWorld() {
  const sx = shake > 0 ? ((Math.random() * 4) | 0) - 2 : 0, sy = shake > 0 ? ((Math.random() * 4) | 0) - 2 : 0;
  const ox = Math.round(camX) + sx;
  drawBackdrop();
  ctx.save(); ctx.beginPath(); ctx.rect(0, TOP, W, VH); ctx.clip(); ctx.translate(0, sy);
  drawTiles(ox);
  drawGoal(ox);
  for (const e of embersE) {
    if (e.dead) continue; const x = (e.x - ox) | 0; if (x < -8 || x > W) continue;
    ctx.drawImage(SPR.ember, x, (TOP + e.y + Math.sin((tick + e.ph * 9) * 0.1) * 1.6) | 0);
  }
  for (const c of crates) if (!c.dead && c.x - ox > -T && c.x - ox < W) drawCrate(c, ox);
  drawEnemies(ox);
  drawPlayer(ox);
  for (const q of parts) R(q.x - ox, TOP + q.y, q.sz, q.sz, q.col);
  for (const b of booms) {
    const r = (18 - b.life) * 2.4 + 6, x = b.x - ox, y = TOP + b.y;
    ctx.fillStyle = b.life > 10 ? C.cream : C.or;
    for (let j = -r; j <= r; j += 2) { const hw = Math.sqrt(r * r - j * j) | 0; if (b.life > 6 || ((j >> 1) & 1)) ctx.fillRect((x - hw) | 0, (y + j) | 0, hw * 2, b.life > 6 ? 2 : 1); }
  }
  for (const f of floats) txt(f.s, f.x - ox, TOP + f.y, li === 2 && f.col === C.ink ? C.cream : f.col, 8, 'left', true);
  ctx.restore();
  if (flash > 0) { ctx.fillStyle = C.cream; ctx.globalAlpha = 0.7; ctx.fillRect(0, TOP, W, VH); ctx.globalAlpha = 1; }
  if (banner > 0 && state === 'play') {
    const a = Math.min(1, banner / 20), w = 170 * a;
    R(W / 2 - w / 2, TOP + 26, w, 26, C.ink);
    if (banner > 20) {
      txt('STAGE ' + String(li + 1).padStart(2, '0'), W / 2, TOP + 36, C.or, 8, 'center');
      txt(L.name, W / 2, TOP + 47, C.cream, 8, 'center', true);
    }
  }
}

function drawBox(w, h) {
  const x = (W - w) >> 1, y = TOP + ((VH - h) >> 1);
  R(x - 2, y - 2, w + 4, h + 4, C.ink); R(x, y, w, h, C.bg);
  ctx.fillStyle = C.l1; for (let yy = y + 2; yy < y + h; yy += 4) ctx.fillRect(x, yy, w, 1);
  return [x, y];
}

function drawBoot() {
  const bg = '#cfdc5a', ink = '#2a3312';
  R(0, 0, W, H, bg);
  if (stT < 10) { ctx.globalAlpha = 1 - stT / 10; R(0, 0, W, H, '#f8ffd0'); ctx.globalAlpha = 1; }
  const rise = Math.max(0, 24 - stT);
  if (window.NullsBomb) window.NullsBomb(ctx, W / 2 + 6, 96 + rise + Math.round(Math.sin(tick / 22) * 2), 5, tick, ink, bg);
  if (stT > 24) txt('LOADING' + '.'.repeat(1 + ((stT / 22) | 0) % 3), W / 2, 186, ink, 16, 'center');
  // power-on wipe
  if (stT < 18) { const h = (H / 2) * (1 - stT / 18); R(0, 0, W, h, C.ink); R(0, H - h, W, h, C.ink); }
}

function drawCarts() {
  R(0, TOP, W, VH, C.bg); ctx.fillStyle = C.l1; for (let y = TOP + 2; y < TOP + VH; y += 4) ctx.fillRect(0, y, W, 1);
  big('INSERT A CART', W / 2 + 3, TOP + 24, 16, C.ink);
  [['NULL RUN', 'PLATFORMER', '01'], ['NULL KART', 'RACING', '02']].forEach((c, i) => {
    const on = i === cartI, x = 52 + i * 128, y = TOP + 40 - (on ? 5 + ((tick >> 4) & 1) : 0), body = on ? C.or : C.l2;
    R(x - 2, y - 2, 92, 108, C.ink); R(x, y, 88, 104, body); R(x, y, 5, 5, C.ink); R(x + 83, y, 5, 5, C.ink); R(x, y, 88, 3, on ? '#ff9a5a' : C.l1);
    for (let k = 0; k < 4; k++) R(x + 41 - k * 3, y + 10 + k * 3, 6 + k * 6, 3, C.ink);
    R(x - 2, y + 44, 6, 4, C.ink); R(x - 2, y + 54, 6, 4, C.ink); R(x + 84, y + 44, 6, 4, C.ink); R(x + 84, y + 54, 6, 4, C.ink);
    R(x + 8, y + 34, 72, 50, C.ink); R(x + 10, y + 36, 68, 46, C.cream);
    if (i === 0) drawHero(x + 37, y + 40, 1, { ground: true, run: on ? tick : 0, vy: 0 });
    else { R(x + 30, y + 50, 28, 8, C.blue); R(x + 26, y + 48, 7, 12, C.ink); R(x + 55, y + 48, 7, 12, C.ink); R(x + 38, y + 40, 12, 11, C.ink); R(x + 37, y + 37, 3, 4, C.ink); R(x + 48, y + 37, 3, 4, C.ink); R(x + 40, y + 44, 3, 2, C.cream); R(x + 46, y + 44, 3, 2, C.cream); }
    txt(c[0], x + 44, y + 68, C.ink, 8, 'center', true); txt(c[1], x + 44, y + 78, C.mid, 8, 'center');
    R(x + 12, y + 90, 64, 10, C.ink); for (let k = 0; k < 8; k++) R(x + 15 + k * 7.6, y + 92, 4, 6, '#e8c04a');
    txt('CART ' + c[2], x + 44, TOP + 164, on ? C.ink : C.mid, 8, 'center', on);
    if (on) tri(x + 40, TOP + 170, C.or);
  });
  R(0, 0, W, TOP, C.ink); big('NULLBOY', 30, 9, 8, C.cream); R(W - 28, 2, 1, 8, C.or); txt('0' + (cartI + 1), W - 8, 9, C.cream, 8, 'right');
  R(0, H - 12, W, 12, C.ink); txt('ESC HOME', 8, H - 3, C.l2); tri(W - 52, H - 10, C.cream); txt('INSERT', W - 8, H - 3, C.cream, 8, 'right');
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (state === 'boot') { drawBoot(); return; }
  if (state === 'kart') { window.NullKart.render(); return; }
  if (state === 'carts') { drawCarts(); return; }
  if (state === 'title') drawTitle();
  else if (state === 'rsel') drawRsel();
  else if (state === 'ssel') drawSsel();
  else if (state === 'recs') drawRecs();
  else if (state === 'win') {
    paper(); big('HOME SAFE', W / 2 + 4, TOP + 30, 24, C.ink); txt('@ ALL STAGES CLEARED AS ' + RC.n, W / 2, TOP + 44, C.mid, 8, 'center');
    R(20, TOP + 54, 84, 96, C.ink); R(22, TOP + 56, 80, 92, C.l1); R(22, TOP + 138, 80, 10, C.mid); heroBig(runner, 34, TOP + 66, 4, tick);
    txt('FINAL SCORE', 120, TOP + 68, C.mid); big(pts(score), 200, TOP + 96, 32, C.or);
    const rec = getRec();
    LEVEL_DEFS.forEach((d, i) => { const b = rec.st[i]; gradeBox(b ? b.g : '', 128 + i * 60, TOP + 104, 26); txt('STAGE ' + (i + 1), 141 + i * 60, TOP + 142, C.mid, 8, 'center'); });
    if (newHi) { if ((tick >> 4) & 1) { R(60, TOP + 156, 200, 16, C.or); txt('NEW HIGH SCORE!', W / 2, TOP + 167, C.ink, 8, 'center', true); } }
    else txt('HIGH SCORE ' + pts(rec.hi), W / 2, TOP + 167, C.ink, 8, 'center', true);
    txt('LIVES LEFT ' + Math.max(0, lives) + '   EMBERS ' + embers, W / 2, TOP + 182, C.mid, 8, 'center');
  } else {
    drawWorld();
    if (state === 'pause') {
      const [x, y] = drawBox(170, 108);
      big('PAUSED', W / 2 + 3, y + 24, 16, C.ink);
      MENU.forEach((m, i) => {
        const yy = y + 46 + i * 15, label = i === 2 ? 'SOUND: ' + (muted ? 'OFF' : 'ON') : m;
        if (i === menuI) { R(x + 12, yy - 9, 146, 12, C.ink); tri(x + 17, yy - 6, C.or); txt(label, x + 26, yy, C.cream, 8, 'left', true); }
        else txt(label, x + 26, yy, C.ink);
      });
    } else if (state === 'clear' && stageRes) {
      const [x, y] = drawBox(252, 172), r = stageRes;
      big('STAGE CLEAR', x + 96, y + 22, 16, C.ink);
      R(x + 196, y + 6, 46, 46, C.ink); if (stT > 96) { gradeBox(r.grade, x + 199, y + 9, 40); } else txt('RANK', x + 219, y + 32, C.mid, 8, 'center');
      const rows = [['EMBERS', levelEmbers + ' x 10', r.e], ['CRATES', broken + '/' + totalCrates + ' x 25', r.c], ['ENEMIES', kills + ' x 50', r.k],
        ['TIME ' + ((r.sec / 60) | 0) + ':' + String(r.sec % 60).padStart(2, '0'), 'BONUS', r.t], ['NO DEATHS', deaths ? 'x' + deaths : 'BONUS', r.nd], ['ALL CRATES', r.pf ? 'PERFECT' : '-' + (totalCrates - broken), r.pf]];
      rows.forEach((w, i) => { if (stT < 10 + i * 12) return; const yy = y + 40 + i * 13; txt(w[0], x + 12, yy, C.mid); txt(w[1], x + 128, yy, C.mid, 8, 'right'); txt('+' + pts(w[2]), x + 186, yy, w[2] ? C.ink : C.l2, 8, 'right', true); });
      if (stT > 84) { R(x + 10, y + 120, 232, 1, C.ink); txt('STAGE SCORE', x + 12, y + 134, C.ink, 8, 'left', true); txt(pts(r.total), x + 240, y + 134, C.ink, 8, 'right', true); }
      if (stT > 96) { R(x + 8, y + 142, 236, 22, C.ink); txt('TOTAL SCORE', x + 16, y + 157, C.cream, 8, 'left', true); big(pts(score), x + 190, y + 159, 16, C.or); }
    } else if (state === 'over') {
      const [x, y] = drawBox(200, 118);
      big('SIGNAL', W / 2 + 4, y + 28, 24, C.ink); big('LOST', W / 2 + 4, y + 52, 24, C.ink);
      txt('SCORE', x + 24, y + 72, C.mid); txt(pts(score + levelEmbers * 10 + broken * 25 + kills * 50), x + 176, y + 72, C.ink, 8, 'right', true);
      txt('HIGH SCORE', x + 24, y + 85, C.mid); txt(pts(getRec().hi), x + 176, y + 85, C.or, 8, 'right', true);
      if ((tick >> 5) & 1) txt('PRESS START TO RETRY', W / 2, y + 106, C.or, 8, 'center', true);
    }
  }
  drawHUD();
}

/* ------------------------------ main loop ------------------------------ */
let last = 0, acc = 0;
function frame(t) {
  if (!last) last = t;
  acc += Math.min(100, t - last); last = t;
  let n = 0;
  while (acc >= 1000 / 60 && n < 5) { if (active) step(); acc -= 1000 / 60; n++; }
  if (active) render();   // nothing to draw while the room is showing
  requestAnimationFrame(frame);
}
setMuted(muted);
if (window.NullKart) window.NullKart.init({ ctx, W, H, TOP, VH, C, down, hit, R, txt, big, tri, sfx, tone, noise, store, exit() { state = 'carts'; } });
loadLevel(0); state = 'title'; // warm up so title has valid world state
let started = false;
const go = () => { if (started) return; started = true; requestAnimationFrame(frame); };
if (document.fonts && document.fonts.load) {
  Promise.all([document.fonts.load('8px Silkscreen'), document.fonts.load('700 32px Silkscreen')]).then(go, go);
  setTimeout(go, 1500);
} else go();

// test hook (used by automated smoke tests only)
window.__nullrun = {
  wake() { initAudio(); return !!ac && ac.state === 'running'; },
  get audioOn() { return !!ac && ac.state === 'running'; },
  boot() {
    active = true; initAudio();
    // coming back from the room with a game in progress: pick up where it was left instead of rebooting the console
    if (state === 'kart' || state === 'pause' || state === 'clear' || state === 'over' || state === 'win') { if (state === 'pause' && menuBtn) menuBtn.classList.add('open'); return; }
    state = 'boot'; stT = 0; sfx.boot();
  },
  kart: window.NullKart,
  get world() { return { L, crates, enemies, lives, score, shield }; }, setRunner(i) { runner = i; RC = RUNNERS[i]; }, startGame,
  sleep() { if (state === 'play' || state === 'dying') state = 'pause'; if (state === 'kart' && window.NullKart.pause) window.NullKart.pause(); if (state === 'boot') state = 'carts'; active = false; Object.keys(down).forEach(release); if (menuBtn) menuBtn.classList.remove('open'); if (state === 'pause') { menuI = 0; } },
  step, press, release, get state() { return state; }, get p() { return p; }, get level() { return li; }, loadLevel, LEVEL_DEFS, render };
})();

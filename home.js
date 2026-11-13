(() => {
'use strict';

/* Pixel bomb mascot — shared by the home attract screen and the in-game boot screen */
window.NullsBomb = function (ctx, cx, cy, s, t, ink, bg) {
  const P = (x, y, w, h, c) => { ctx.fillStyle = c || ink; ctx.fillRect(Math.round(cx + x * s), Math.round(cy + y * s), Math.ceil((w || 1) * s), Math.ceil((h || 1) * s)); };
  for (let y = -9; y <= 9; y++) { const hw = Math.floor(Math.sqrt(90 - y * y)); P(-hw, y, hw * 2 + 1, 1); }
  P(-8, -10, 4, 2); P(-9, -9, 3, 2);                 // cap
  P(-10, -11); P(-11, -12);                           // fuse
  const f = (t >> 3) & 1;                             // spark
  P(-13, -16, 1, 5); P(-15, -14, 5, 1);
  if (f) { P(-15, -16); P(-11, -16); P(-15, -12); P(-11, -12); } else { P(-14, -15); P(-12, -15); P(-14, -13); P(-12, -13); }
  if (t % 200 < 8) { P(-6, 3, 5, 1, bg); P(2, 3, 5, 1, bg); }
  else { P(-6, 1, 1, 2, bg); P(-5, 3, 3, 1, bg); P(-2, 1, 1, 2, bg); P(2, 1, 1, 2, bg); P(3, 3, 3, 1, bg); P(6, 1, 1, 2, bg); }
};

const home = document.getElementById('home');
if (!home) return;
const hero = document.getElementById('hero'), tilt = document.getElementById('tilt');
const stage = document.querySelector('.stage');
let visible = true, T0 = performance.now();

/* ---------------- mini console: clone of the real one, portrait ---------------- */
const src = document.querySelector('.stage .console');
const mini = src.cloneNode(true);
mini.classList.add('portrait', 'mini');
mini.querySelectorAll('[data-btn]').forEach(b => { b.removeAttribute('data-btn'); b.tabIndex = -1; });
mini.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
const acv = mini.querySelector('canvas');
acv.width = 320; acv.height = 216;
const a = acv.getContext('2d'); a.imageSmoothingEnabled = false;
tilt.appendChild(mini);

function attract(t) {
  const f = (t / 16.7) | 0, phase = ((t / 1000) % 11) < 6.5 ? 0 : 1;
  const font = (sz, bold) => { a.font = (bold ? '700 ' : '') + sz + 'px Silkscreen, monospace'; a.textAlign = 'center'; a.textBaseline = 'alphabetic'; };
  if (phase === 0) {
    a.fillStyle = '#cfdc5a'; a.fillRect(0, 0, 320, 216);
    a.fillStyle = 'rgba(255,255,220,.25)'; a.fillRect(0, 0, 320, 216 * (0.5 + 0.5 * Math.sin(t / 900)) * 0.15);
    window.NullsBomb(a, 166, 92 + Math.round(Math.sin(t / 420) * 3), 5, f, '#2a3312', '#cfdc5a');
    font(16, false); a.fillStyle = '#2a3312';
    a.fillText('LOADING' + '.'.repeat(1 + ((t / 400) | 0) % 3), 160, 186);
  } else {
    a.fillStyle = '#d8d6cf'; a.fillRect(0, 0, 320, 216);
    a.fillStyle = '#c6c3bb'; for (let y = 2; y < 216; y += 4) a.fillRect(0, y, 320, 1);
    a.fillStyle = '#1d1d1a'; a.fillRect(0, 0, 320, 24); a.fillRect(0, 192, 320, 24);
    a.fillStyle = '#ff6a2b'; a.fillRect(270, 5, 2, 14);
    font(16, false); a.fillStyle = '#f2efe8'; a.textAlign = 'left'; a.fillText('NULLS', 12, 18); a.textAlign = 'right'; a.fillText('01', 308, 18);
    a.save(); a.translate(168, 0); a.transform(1, 0, -0.3, 1, 0, 0);
    font(56, true); a.fillStyle = '#1d1d1a'; a.fillText('NULL', 0, 92); a.fillText('RUN', 0, 144); a.restore();
    if ((f >> 5) & 1) { font(16, true); a.fillStyle = '#ff6a2b'; a.fillText('PRESS START', 160, 176); }
    font(16, false); a.fillStyle = '#aaa79f'; a.textAlign = 'left'; a.fillText('BACK', 12, 210);
    a.fillStyle = '#f2efe8'; a.textAlign = 'right'; a.fillText('▸ PLAY', 308, 210);
  }
}

/* ---------------- pog art (used for the pile on the floor) ---------------- */
const rim = '#ead9bf';
const POGS = [
  `<circle cx="50" cy="50" r="46" fill="#e2632c"/><path fill="#f7b944" d="${(() => { let d = ''; for (let i = 0; i < 24; i++) { const r = i % 2 ? 16 : 38, an = i * Math.PI / 12; d += (i ? 'L' : 'M') + (50 + Math.cos(an) * r).toFixed(1) + ' ' + (50 + Math.sin(an) * r).toFixed(1); } return d + 'Z'; })()}"/>`,
  `<circle cx="50" cy="50" r="46" fill="#3a56c5"/><path fill="none" stroke="${rim}" stroke-width="9" stroke-linecap="round" d="M50 50c0-8 12-8 12 2s-16 16-26 4-2-34 18-32 28 22 22 40"/>`,
  `<circle cx="50" cy="50" r="46" fill="#c9412f"/><path fill="#f7b944" d="M30 70c-10-16 6-26 12-40 4 10 2 14 8 14 6-2 4-14 0-22 22 8 34 30 22 48-8 10-34 12-42 0z"/>`,
  `<circle cx="50" cy="50" r="46" fill="#3a56c5"/><path fill="${rim}" d="M58 14 28 54h18L38 86l34-44H54z"/>`,
  `<circle cx="50" cy="50" r="46" fill="url(#ck)"/>`,
  `<circle cx="50" cy="50" r="46" fill="${rim}"/><path d="M8 34a46 46 0 0 1 84 0z" fill="#8f7f7c"/>`
];
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------------- the game room (1600x900 flat-shaded scene) ---------------- */
const room = document.getElementById('room');
function buildRoom() {
  const r = rng(482706);
  const R = (x, y, w, h, f, o) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${o || ''}/>`;
  const P = (pts, f, o) => `<polygon points="${pts}" fill="${f}" ${o || ''}/>`;
  const E = (cx, cy, rx, ry, f, o) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${o || ''}/>`;
  const tw = () => `class="tw" style="animation-delay:-${(r() * 6).toFixed(1)}s;animation-duration:${(2.5 + r() * 5).toFixed(1)}s"`;
  let s = `<defs>
    <linearGradient id="gWall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b123f"/><stop offset=".55" stop-color="#231038"/><stop offset="1" stop-color="#2e1230"/></linearGradient>
    <linearGradient id="gFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f0d2e"/><stop offset="1" stop-color="#0d0513"/></linearGradient>
    <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10107a"/><stop offset=".6" stop-color="#2420b4"/><stop offset="1" stop-color="#4a22a0"/></linearGradient>
    <linearGradient id="gLava" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a3a"/><stop offset=".6" stop-color="#ff8a2a"/><stop offset="1" stop-color="#ffc24a"/></linearGradient>
    <radialGradient id="gLamp"><stop offset="0" stop-color="#ff9a40" stop-opacity=".75"/><stop offset=".35" stop-color="#ff5a30" stop-opacity=".28"/><stop offset="1" stop-color="#ff5a30" stop-opacity="0"/></radialGradient>
    <radialGradient id="gCrt"><stop offset="0" stop-color="#7fe0d0" stop-opacity=".5"/><stop offset="1" stop-color="#3a8aa0" stop-opacity="0"/></radialGradient>
    <radialGradient id="gTv"><stop offset="0" stop-color="#9a7cff" stop-opacity=".5"/><stop offset="1" stop-color="#5a3cff" stop-opacity="0"/></radialGradient>
    <clipPath id="cWin"><rect x="602" y="42" width="396" height="246"/></clipPath>
    <clipPath id="cTv"><rect x="738" y="320" width="164" height="120" rx="7"/></clipPath>
    <clipPath id="cLava"><polygon points="648,372 664,372 674,432 638,432"/></clipPath>
    <pattern id="ck" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="24" height="24" fill="${rim}"/><rect width="12" height="12" fill="#1b1719"/><rect x="12" y="12" width="12" height="12" fill="#1b1719"/></pattern>
    <pattern id="scanp" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity=".3"/></pattern>
  </defs>`;

  /* --- walls & floor --- */
  s += R(0, 0, 1600, 602, 'url(#gWall)');
  for (let x = 180; x < 1600; x += 236) s += R(x, 0, 2, 592, '#000', 'opacity=".13"');
  s += R(0, 590, 1600, 12, '#13071f') + R(0, 602, 1600, 298, 'url(#gFloor)');
  [636, 676, 730, 800].forEach(y => s += R(0, y, 1600, 2, '#000', 'opacity=".2"'));
  for (let i = 0; i < 9; i++) s += `<line x1="${i * 200}" y1="602" x2="${i * 200 - 240 + i * 60}" y2="900" stroke="#000" stroke-opacity=".16" stroke-width="2"/>`;

  /* --- window with night city --- */
  s += R(588, 28, 424, 274, '#12061a') + R(602, 42, 396, 246, 'url(#gSky)') + '<g clip-path="url(#cWin)">';
  for (let i = 0; i < 26; i++) s += R(602 + r() * 396 | 0, 44 + r() * 110 | 0, 2, 2, '#aab4ff', tw());
  [['#27219a', 90, 190], ['#1b156e', 50, 150], ['#110c48', 24, 96]].forEach((L, li) => {
    let x = 596; while (x < 1000) {
      const w = 26 + r() * 44 | 0, h = L[1] + r() * (L[2] - L[1]) | 0, y = 288 - h;
      s += R(x, y, w, h, L[0]);
      if (r() > 0.55) s += R(x + (w >> 1) - 1, y - 16, 2, 16, L[0]) + R(x + (w >> 1) - 2, y - 19, 4, 4, '#ff4a3a', tw());
      for (let k = 0, n = 2 + r() * 6 | 0; k < n; k++) { const wx = x + 4 + (r() * (w - 12) | 0), wy = y + 6 + (r() * Math.max(4, h - 20) | 0); s += R(wx, wy, 5, 6, r() > 0.5 ? '#ffb657' : '#ffd98a', r() > 0.6 ? tw() : ''); if (r() > 0.5) s += R(wx, wy + 9, 5, 6, '#ffb657'); }
      x += w + (r() * 5 | 0);
    }
  });
  s += '</g>' + R(796, 42, 8, 246, '#12061a') + R(602, 158, 396, 8, '#12061a') + R(602, 42, 3, 246, '#3a1640') + R(804, 42, 2, 246, '#3a1640');
  s += P('576,302 1024,302 1034,316 566,316', '#3c1528') + R(566, 316, 468, 6, '#1a0a1c');

  /* --- string lights --- */
  let pl = ''; const sag = x => 22 + 20 * Math.sin(Math.PI * (x % 400) / 400);
  for (let x = 0; x <= 1600; x += 20) pl += x + ',' + sag(x).toFixed(1) + ' ';
  s += `<polyline points="${pl}" fill="none" stroke="#0c0410" stroke-width="2"/>`;
  const bulbs = ['#ffc46b', '#ff6a2b', '#e75858', '#8e97c4', '#ffd98a'];
  for (let x = 40, i = 0; x < 1600; x += 66, i++) s += `<circle cx="${x}" cy="${(sag(x) + 6).toFixed(1)}" r="14" fill="${bulbs[i % 5]}" opacity=".16" ${tw()}/><circle cx="${x}" cy="${(sag(x) + 6).toFixed(1)}" r="5" fill="${bulbs[i % 5]}" ${tw()}/>`;

  /* --- posters (left wall) --- */
  s += R(100, 96, 132, 172, '#15101d') + R(104, 100, 124, 164, '#1b1526') + R(150, 90, 30, 10, '#d8c8a8', 'opacity=".7"');
  s += `<circle cx="166" cy="196" r="40" fill="#d9b0ac"/>` + P('134,160 150,146 160,158 144,170', '#d9b0ac') + `<path d="M140 152 128 138" stroke="#d9b0ac" stroke-width="4"/>` +
       P('124,120 128,131 139,128 132,137 140,145 129,144 127,155 121,146 111,150 116,140 107,133 118,131', '#d9b0ac') +
       P('140,190 162,200 160,210 142,204', '#1b1526') + P('192,190 170,200 172,210 190,204', '#1b1526');
  /* holographic N sticker (replaces the green N poster) */
  s += `<g transform="translate(256 130) rotate(-3 62 62)">
    <defs>
      <linearGradient id="gHolo" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f3b6dc"/><stop offset=".22" stop-color="#b7b4f0"/><stop offset=".45" stop-color="#9fd8f2"/>
        <stop offset=".62" stop-color="#b9a8ef"/><stop offset=".8" stop-color="#c7f0c8"/><stop offset="1" stop-color="#a99be6"/>
      </linearGradient>
      <linearGradient id="gSheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <clipPath id="cHolo"><rect x="0" y="0" width="124" height="124" rx="14"/></clipPath>
    </defs>
    <rect x="5" y="7" width="124" height="124" rx="14" fill="#000" opacity=".32"/>
    <g clip-path="url(#cHolo)">
      <rect width="124" height="124" fill="url(#gHolo)"/>
      <polygon points="0,30 70,0 124,0 124,8 0,62" fill="#fff" opacity=".18"/>
      <polygon points="0,96 124,40 124,58 0,124" fill="#ffd9f2" opacity=".22"/>
      <polygon points="40,124 124,82 124,104 82,124" fill="#d6fff0" opacity=".28"/>
      <polygon points="0,0 34,0 0,20" fill="#ff9ad5" opacity=".25"/>
      <path d="M18 34 52 18M70 104 108 88M86 30 104 22" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
      <rect class="holo-sheen" x="-60" y="-20" width="40" height="170" fill="url(#gSheen)" transform="rotate(24 62 62)"/>
    </g>
    <g transform="translate(24 24) scale(.76)">
      <path d="M14 14V86M14 14L86 86M86 14V86" fill="none" stroke="#121014" stroke-width="19" stroke-linecap="round" stroke-linejoin="round"/>
      <polygon points="23,94 23,68 52,52" fill="#121014"/>
      <polygon points="77,6 77,32 48,48" fill="#121014"/>
    </g>
    <rect x="1.5" y="1.5" width="121" height="121" rx="13" fill="none" stroke="#f4ecd0" stroke-width="3" stroke-dasharray="22 3 9 2 30 4 14 2" opacity=".9"/>
    <path d="M124 104 L124 124 L104 124 Z" fill="#7d6aa8" opacity=".55"/>
    <path d="M124 104 Q112 108 104 124 L110 118 Q118 112 124 104Z" fill="#f4ecd0"/>
    <path d="M104 124 Q114 110 124 104 Q116 116 110 124Z" fill="#e6dcc0"/>
  </g>`;
  s += R(404, 92, 108, 70, '#3a1a5a') + `<text x="458" y="136" text-anchor="middle" font-family="Silkscreen,monospace" font-weight="700" font-size="24" fill="#ead9bf" transform="skewX(-14)" style="transform-box:fill-box;transform-origin:center">NULLS</text>`;
  s += R(420, 186, 34, 40, '#5a2a7a') + R(462, 196, 30, 36, '#44206a') + R(430, 236, 38, 30, '#6a2a5a') + R(36, 150, 40, 52, '#3a1a52');

  /* --- desk, CRT computer, chair (left) --- */
  s += R(30, 508, 16, 300, '#35122a') + R(510, 508, 16, 200, '#35122a') + R(46, 508, 464, 70, '#1c0a1e') + R(396, 508, 114, 160, '#44182a') +
       R(404, 518, 98, 40, '#5a2030') + R(404, 566, 98, 40, '#5a2030') + R(404, 614, 98, 44, '#5a2030') + R(440, 534, 26, 5, '#b8502a') + R(440, 582, 26, 5, '#b8502a') + R(440, 632, 26, 5, '#b8502a');
  s += P('30,468 530,468 548,496 12,496', '#8e3c30') + P('330,468 530,468 548,496 360,496', '#b5522e') + R(12, 496, 536, 12, '#58202e');
  s += R(140, 418, 280, 52, '#c48e7c') + R(140, 458, 280, 12, '#8b5c60') + R(330, 434, 62, 6, '#5a3a44') + R(160, 436, 40, 4, '#8b5c60') + R(398, 446, 8, 4, '#7dff8a', tw());
  s += P('122,282 172,250 172,418 122,402', '#8a5562') + P('172,250 402,262 402,418 172,418', '#d39c82') + P('172,250 402,262 402,274 172,264', '#e6b494');
  for (let y = 300; y < 390; y += 12) s += `<line x1="130" y1="${y}" x2="162" y2="${y - 6}" stroke="#5c3444" stroke-width="3"/>`;
  s += R(190, 280, 192, 124, '#4a2f3c', 'rx="6"') + R(200, 288, 172, 108, '#1c3b3a', 'rx="4"') + R(224, 308, 124, 66, '#cbc6ca') + R(224, 308, 124, 12, '#3a56c5') + R(332, 310, 6, 6, '#cbc6ca') + R(340, 310, 6, 6, '#cbc6ca') +
       R(246, 328, 14, 12, '#6a8ae7') + R(310, 328, 14, 12, '#6a8ae7') + [0, 1, 2, 3].map(k => R(268 + k * 9, 333, 4, 3, '#444', `class="pg" style="animation-delay:${k * .25}s"`)).join('') +
       `<text x="286" y="354" text-anchor="middle" font-family="Geist Mono,monospace" font-size="10" fill="#333">Connecting...</text>` + R(262, 360, 48, 8, '#9a959a') + [0, 1, 2].map(k => R(265 + k * 11, 362, 8, 4, '#3a56c5', `class="pg" style="animation-delay:${k * .3}s"`)).join('') +
       R(200, 288, 172, 108, 'url(#scanp)', 'rx="4"');
  s += P('300,470 520,470 536,492 290,492', '#dcbca4') + P('290,492 536,492 536,498 290,498', '#9a7468');
  for (let ry = 0; ry < 3; ry++) for (let k = 0; k < 13; k++) s += R(306 + k * 16.4 - ry * 3, 473 + ry * 6, 12 + ry, 4, '#b99484');
  s += R(62, 424, 46, 46, '#e9dac8') + R(62, 424, 14, 46, '#bfa9a0') + E(85, 425, 23, 6, '#3a1c1c') + `<path d="M108 434c16 0 16 26 0 26" fill="none" stroke="#e9dac8" stroke-width="6"/>` +
       P('126,474 158,472 162,488 128,490', '#e8c04a') + P('244,476 270,474 274,488 248,490', '#e8c04a') + R(176, 474, 70, 8, '#3a1a5a') + R(180, 466, 66, 8, '#6a2a5a') + R(184, 458, 60, 8, '#2a3a8a');
  /* easel with the "Grand Theft Nullscade" canvas (replaces the chair) */
  s += E(306, 872, 150, 12, '#000', 'opacity=".45"') +
       P('300,500 312,500 320,846 292,846', '#35122a') +                                   /* back leg */
       P('296,496 312,496 214,872 196,872', '#8e3c30') + P('304,496 312,496 214,872 206,872', '#b5522e') +   /* left leg */
       P('300,496 316,496 418,872 400,872', '#8e3c30') + P('300,496 308,496 408,872 400,872', '#b5522e') +   /* right leg */
       R(234, 780, 140, 10, '#58202e') + R(234, 780, 140, 4, '#8e3c30') +                /* lower brace */
       R(284, 492, 44, 22, '#58202e') + R(288, 494, 36, 6, '#b5522e');                    /* top clamp */
  s += `<g transform="rotate(-1.2 306 618)">
    <rect x="166" y="526" width="284" height="174" fill="#000" opacity=".4" transform="translate(6 8)"/>
    <rect x="166" y="526" width="284" height="174" fill="#1c0a1e"/>
    <rect x="170" y="530" width="276" height="166" fill="#58202e"/>
    <rect x="176" y="536" width="264" height="154" fill="#ead9bf"/>
    <image href="assets/grand-theft-nullscade.jpg" x="182" y="542" width="252" height="142" preserveAspectRatio="xMidYMid slice"/>
    <polygon points="182,542 300,542 182,620" fill="#fff" opacity=".07"/>
    <rect x="182" y="542" width="252" height="142" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="2"/>
  </g>`;
  s += R(150, 690, 312, 14, '#58202e') + R(150, 688, 312, 6, '#b5522e') + R(150, 704, 312, 3, '#000', 'opacity=".3"');   /* ledge */
  s += R(176, 680, 34, 8, '#ff6a2b') + R(206, 682, 8, 4, '#c8b89a') + R(392, 682, 46, 5, '#1d1d1a') + R(432, 680, 10, 9, '#ead9bf') + R(388, 681, 8, 7, '#d64fb0');   /* paint tube + brush */

  /* --- rug --- */
  s += P('420,640 1240,640 1400,892 280,892', '#2f1552') + P('450,656 1214,656 1352,876 322,876', 'none', 'stroke="#8a2a3c" stroke-width="5"') + P('482,672 1184,672 1306,860 366,860', 'none', 'stroke="#4a2480" stroke-width="3"');
  [[520, 690], [1110, 690], [430, 830], [1200, 830], [820, 684], [800, 846]].forEach(([x, y]) => { s += R(x, y, 44, 8, '#8a2a3c') + R(x + 8, y - 8, 28, 8, '#8a2a3c') + R(x + 16, y - 16, 12, 8, '#8a2a3c') + R(x + 16, y + 8, 12, 8, '#4a2480'); });

  /* --- TV cabinet, CRT TV, lava lamp --- */
  s += R(612, 470, 400, 118, '#4a1c30') + P('604,458 1020,458 1012,472 612,472', '#7c3238') + P('820,458 1020,458 1012,472 826,472', '#a8482e') + R(630, 490, 170, 82, '#190a1c') + R(824, 490, 170, 82, '#190a1c') + R(622, 588, 14, 12, '#2a0e1e') + R(988, 588, 14, 12, '#2a0e1e');
  const spine = ['#e75858', '#3a56c5', '#e8c04a', '#58c59a', '#ead9bf', '#8e97c4', '#ff6a2b', '#6a2a5a'];
  for (let x = 636, k = 0; x < 760; k++) { const w = 9 + (r() * 7 | 0), h = 54 + (r() * 20 | 0); s += R(x, 572 - h, w, h, spine[k % 8]) + R(x, 572 - h + 8, w, 3, '#000', 'opacity=".3"'); x += w + 1; }
  s += P('762,572 776,506 786,508 774,572', '#e75858') + R(840, 536, 136, 36, '#8a7a88') + R(840, 536, 136, 6, '#a898a6') + R(856, 550, 70, 6, '#2a1a2a') + R(940, 552, 6, 4, '#7dff8a', tw()) + R(952, 552, 14, 4, '#ff6a2b') +
       R(846, 520, 90, 8, '#3a56c5') + R(852, 512, 84, 8, '#ead9bf') + R(848, 504, 80, 8, '#e75858');
  s += P('732,288 950,288 966,300 716,300', '#96828c') + R(716, 300, 250, 160, '#7b6774') + R(716, 446, 250, 14, '#5c4a5a') + R(730, 312, 180, 136, '#2a1a2a', 'rx="9"') + R(738, 320, 164, 120, '#2b1a6e', 'rx="7"');
  s += '<g clip-path="url(#cTv)">' + R(738, 320, 164, 120, '#2b1a6e') + E(870, 346, 18, 18, '#ffb657', 'opacity=".9"');
  for (let x = 738; x < 902; x += 20) s += R(x, 392 - ((x * 7) % 28), 17, 60, '#1b1160');
  s += R(738, 414, 164, 26, '#12081c') + R(738, 414, 164, 3, '#ead9bf') + R(840, 400, 14, 14, '#ead9bf') + R(842, 402, 10, 10, '#b8a898') + R(856, 400, 14, 14, '#ff6a2b') + R(848, 386, 14, 14, '#ead9bf') +
       `<g class="hop">` + P('772,398 774,392 777,396 780,391 783,396 786,392 788,398 788,404 772,404', '#0b0b0d') + R(770, 398, 2, 5, '#e0352b') + R(788, 398, 2, 5, '#e0352b') + R(775, 400, 3, 2, '#fff') + R(782, 400, 3, 2, '#fff') + R(773, 404, 14, 5, '#ead9bf') + R(773, 409, 14, 3, '#3f5486') + R(772, 412, 6, 2, '#ead9bf') + R(782, 412, 6, 2, '#ead9bf') + `</g>` +
       `<text x="816" y="350" text-anchor="middle" font-family="Silkscreen,monospace" font-weight="700" font-size="17" fill="#ead9bf">NULL RUN</text><text class="tw" x="816" y="364" text-anchor="middle" font-family="Silkscreen,monospace" font-size="8" fill="#ff6a2b">PRESS START</text>` +
       R(738, 320, 164, 120, 'url(#scanp)') + R(738, 320, 164, 120, '#fff', 'class="flick" opacity=".05"') + '</g>';
  s += `<circle cx="938" cy="338" r="10" fill="#3a2a38"/><circle cx="938" cy="368" r="10" fill="#3a2a38"/><rect x="936" y="330" width="4" height="9" fill="#96828c"/><rect x="936" y="360" width="4" height="9" fill="#96828c"/>` + [0, 1, 2, 3, 4].map(k => R(922, 396 + k * 9, 32, 4, '#4a3a4a')).join('') + R(924, 316, 8, 4, '#ff4a3a', tw());
  s += `<circle cx="656" cy="400" r="150" fill="url(#gLamp)" class="lampglow"/>` + P('650,362 662,362 666,372 646,372', '#2a1626') + P('648,372 664,372 674,432 638,432', 'url(#gLava)') +
       `<g clip-path="url(#cLava)"><circle cx="656" cy="424" r="8" fill="#ffe27a"><animate attributeName="cy" values="426;384;426" dur="8s" repeatCount="indefinite"/></circle><circle cx="660" cy="400" r="5" fill="#ffd05a"><animate attributeName="cy" values="380;424;380" dur="11s" repeatCount="indefinite"/></circle><circle cx="651" cy="410" r="4" fill="#ffe27a"><animate attributeName="cy" values="428;390;428" dur="6s" repeatCount="indefinite"/></circle></g>` +
       P('640,432 672,432 664,444 674,458 638,458 648,444', '#7a2a22') + P('656,432 672,432 664,444 674,458 656,458', '#b8481f');

  /* --- shelves (right wall) --- */
  s += R(1150, 150, 410, 10, '#5a2434') + R(1150, 160, 410, 4, '#2a0e1e') + R(1170, 164, 8, 22, '#2a0e1e') + R(1530, 164, 8, 22, '#2a0e1e');
  for (let x = 1160, k = 0; x < 1400; k++) { const w = 10 + (r() * 10 | 0), h = 46 + (r() * 36 | 0); s += R(x, 150 - h, w, h, spine[(k * 3 + 1) % 8], 'opacity=".9"') + R(x, 150 - h + 6, w, 3, '#000', 'opacity=".25"'); x += w + 1 + (k % 6 === 5 ? 14 : 0); }
  s += P('1404,150 1424,84 1436,88 1418,150', '#8e97c4') + P('1470,112 1532,112 1524,150 1478,150', '#a8482a') + P('1500,112 1532,112 1524,150 1500,150', '#7a2f24');
  [[1484, 100, -30], [1500, 86, 0], [1518, 96, 28], [1474, 120, -50], [1536, 124, 60], [1464, 150, -20], [1546, 160, 30], [1456, 184, 10], [1552, 196, -10], [1460, 216, 24]].forEach(([x, y, a], k) => s += `<path transform="translate(${x} ${y}) rotate(${a})" d="M0 0c-12-12-14-24 0-22 14-2 12 10 0 22z" fill="${k % 2 ? '#5d7c3a' : '#86a04a'}"/>`);
  s += `<path d="M1476 116 1462 150 1458 214M1528 118 1548 160 1552 196" fill="none" stroke="#4a6030" stroke-width="2"/>`;
  s += R(1150, 286, 300, 10, '#5a2434') + R(1150, 296, 300, 4, '#2a0e1e') + R(1168, 300, 8, 20, '#2a0e1e') + R(1424, 300, 8, 20, '#2a0e1e');
  [0, 1, 2, 3, 4].forEach(k => s += R(1164 + (k % 2) * 4, 276 - k * 10, 84, 9, spine[(k * 2) % 8]) + R(1170 + (k % 2) * 4, 279 - k * 10, 30, 3, '#000', 'opacity=".25"'));
  s += R(1274, 236, 44, 50, '#b3262f', 'rx="4" opacity=".92"') + R(1280, 242, 32, 22, '#cfdc5a') + R(1284, 270, 8, 8, '#ead9bf') + `<circle cx="1304" cy="274" r="4" fill="#ead9bf"/>` +
       `<circle cx="1362" cy="262" r="24" fill="#0b0b0d"/>` + R(1352, 256, 5, 9, '#ead9bf') + R(1366, 256, 5, 9, '#ead9bf') + P('1346,242 1356,236 1360,244', '#0b0b0d') + R(1338, 228, 6, 6, '#ff6a2b', tw()) +
       R(1402, 250, 40, 36, '#3a2a48') + R(1408, 256, 28, 14, '#ead9bf') + `<circle cx="1414" cy="277" r="3" fill="#0b0b0d"/><circle cx="1430" cy="277" r="3" fill="#0b0b0d"/>`;

  /* --- couch (right) --- */
  s += P('1110,392 1600,372 1600,560 1110,560', '#7a1826') + P('1110,392 1600,372 1600,386 1110,406', '#b42c36') + `<line x1="1350" y1="396" x2="1352" y2="548" stroke="#4a0e1a" stroke-width="4"/>`;
  s += P('1296,368 1420,360 1436,470 1400,500 1330,476 1290,440', '#9a8a2c') + P('1296,368 1420,360 1408,410 1320,420', '#b8a83a') + P('1330,476 1400,500 1408,410 1320,420', '#7a6c22');
  s += P('1150,548 1600,540 1600,606 1136,612', '#b5272f') + P('1150,548 1600,540 1600,552 1146,562', '#d2403c') + `<line x1="1360" y1="546" x2="1356" y2="608" stroke="#6a1420" stroke-width="4"/>` + R(1136, 610, 464, 62, '#5c1220') + R(1150, 672, 16, 14, '#2a0a14') + R(1560, 672, 16, 14, '#2a0a14');
  s += P('1076,470 1150,462 1150,670 1076,670', '#9c2230') + P('1076,470 1150,462 1162,450 1092,456', '#d03c3e') + P('1076,470 1092,456 1092,650 1076,670', '#6a1622');
  s += P('1180,470 1272,452 1292,540 1196,554', '#e2cdb8') + P('1232,461 1272,452 1292,540 1244,548', '#bfa49a') + P('1440,440 1544,452 1532,550 1428,540', '#5a2a8a') + P('1492,446 1544,452 1532,550 1482,546', '#40206a');
  s += `<path d="M1332 568c-6-34 54-40 56-8" fill="none" stroke="#a8261e" stroke-width="6"/><ellipse cx="1332" cy="572" rx="12" ry="14" fill="#e0352b"/><ellipse cx="1388" cy="564" rx="12" ry="14" fill="#e0352b"/><ellipse cx="1332" cy="572" rx="6" ry="8" fill="#7a1a16"/>`;

  /* --- beanbag --- */
  s += E(1300, 880, 130, 14, '#000', 'opacity=".45"') + P('1176,806 1226,734 1336,716 1404,772 1414,852 1344,886 1214,882', '#1e2a70') + P('1226,734 1336,716 1404,772 1340,790 1250,786', '#3a52b8') + P('1176,806 1226,734 1250,786 1230,850', '#2b3f9a') + P('1250,786 1340,790 1344,886 1230,850', '#27388a');

  /* --- PS-style console, controller, memory card, discs --- */
  s += `<path d="M560 642C556 612 600 604 640 588" fill="none" stroke="#0c0410" stroke-width="4"/><path d="M703 754C700 735 662 746 634 730" fill="none" stroke="#0c0410" stroke-width="3"/>`;
  s += E(572, 738, 116, 12, '#000', 'opacity=".45"') + P('486,640 650,640 672,700 470,700', '#bbacba') + P('570,640 650,640 672,700 580,700', '#cdbfca') + R(470, 700, 202, 36, '#8a7a8c') + R(470, 700, 202, 4, '#a898a8') +
       E(571, 668, 54, 22, '#a898a8', 'stroke="#7a6a7c" stroke-width="2"') + E(571, 668, 17, 7, '#8a7a8c') + `<circle cx="500" cy="690" r="6" fill="#8a7a8c"/><circle cx="642" cy="688" r="7" fill="#8a7a8c"/>` + R(512, 688, 8, 3, '#7dff8a', tw()) +
       R(486, 708, 54, 7, '#4a3c50') + R(604, 708, 54, 7, '#4a3c50') + R(486, 721, 54, 9, '#5c4c60') + R(604, 721, 54, 9, '#5c4c60') + R(492, 705, 38, 9, '#ff6a2b') + R(560, 712, 22, 4, '#5c4c60');
  s += E(703, 806, 62, 8, '#000', 'opacity=".4"') + `<ellipse cx="668" cy="790" rx="20" ry="27" fill="#a898a8" transform="rotate(14 668 790)"/><ellipse cx="738" cy="790" rx="20" ry="27" fill="#bbacba" transform="rotate(-14 738 790)"/>` + R(658, 752, 90, 38, '#bbacba', 'rx="16"') + R(696, 748, 14, 8, '#8a7a8c') +
       R(672, 760, 6, 18, '#3a2e40') + R(666, 766, 18, 6, '#3a2e40') + `<circle cx="730" cy="762" r="4" fill="#58c59a"/><circle cx="738" cy="770" r="4" fill="#e75858"/><circle cx="722" cy="770" r="4" fill="#e7588a"/><circle cx="730" cy="778" r="4" fill="#6a8ae7"/><circle cx="692" cy="788" r="8" fill="#4a3c50"/><circle cx="714" cy="788" r="8" fill="#4a3c50"/>` + R(697, 768, 5, 3, '#4a3c50') + R(705, 768, 5, 3, '#4a3c50');
  s += `<g transform="rotate(-16 608 800)">` + R(590, 776, 38, 46, '#ff6a2b', 'rx="4"') + R(590, 776, 38, 8, '#ff9a5a', 'rx="4"') + R(595, 794, 28, 18, '#f4ecd0') + `<circle cx="609" cy="803" r="5" fill="#0b0b0d"/>` + R(594, 822, 30, 6, '#3a2010') + [0, 1, 2, 3, 4].map(k => R(596 + k * 5.6, 823, 3, 4, '#e8c04a')).join('') + `</g>`;
  s += P('424,812 500,806 508,826 430,832', '#2a1a3a') + P('424,812 430,832 430,838 424,818', '#e75858') + P('430,800 506,794 512,812 436,818', '#3a2a5a') + P('430,800 436,818 436,824 430,806', '#e8c04a') +
       E(540, 826, 40, 15, '#8f9bc4') + `<path d="M540 826 506 818A40 15 0 0 1 530 811.500z" fill="#ead9bf"/><path d="M540 826 578 822A40 15 0 0 1 566 837z" fill="#e75858"/>` + E(540, 826, 10, 4, '#d8d8e8') + E(540, 826, 4, 1.6, '#1a0a24');

  /* --- manual on the rug --- */
  s += P('716,828 800,820 806,872 712,880', '#e6d6c4') + P('800,820 886,828 892,880 806,872', '#d7c4b2') + `<line x1="800" y1="820" x2="806" y2="872" stroke="#8a6a5a" stroke-width="2"/>` +
       R(734, 842, 48, 18, '#9a8a8c', 'rx="8"') + `<circle cx="746" cy="851" r="3" fill="#5a4a50"/><circle cx="770" cy="851" r="3" fill="#5a4a50"/><path d="M758 826v12M740 866v-4M776 866v-4" stroke="#c9412f" stroke-width="2"/>` +
       R(816, 858, 26, 8, '#9a8a8c') + R(856, 858, 26, 8, '#9a8a8c') + R(824, 848, 6, 10, '#3a2e40') + R(864, 848, 6, 10, '#3a2e40') + `<path d="M830 844Q848 826 864 842" fill="none" stroke="#c9412f" stroke-width="2" stroke-dasharray="4 3"/>`;

  /* --- pile of pogs in the corner --- */
  const pog = (x, y, sc, k, rot) => `<g transform="translate(${x} ${y})"><ellipse cy="${5 * sc}" rx="${46 * sc}" ry="${20 * sc}" fill="#b29c86"/><g transform="scale(${sc} ${sc * 0.43}) rotate(${rot}) translate(-50 -50)">${POGS[k]}<circle cx="50" cy="50" r="46" fill="none" stroke="${rim}" stroke-width="5"/></g></g>`;
  /* pogs scattered on the floor, bottom-left (kept small and dim so they don't pull focus) */
  const pogShadow = (x, y, sc) => E(x + 3, y + 8 * sc, 48 * sc, 18 * sc, '#000', 'opacity=".35"');
  const pogBack = (x, y, sc) => `<g transform="translate(${x} ${y})"><ellipse cy="${5 * sc}" rx="${46 * sc}" ry="${20 * sc}" fill="#8a7464"/><ellipse rx="${46 * sc}" ry="${20 * sc}" fill="#cdb79c"/><ellipse rx="${30 * sc}" ry="${13 * sc}" fill="none" stroke="#a8907a" stroke-width="2"/></g>`;
  s += '<g opacity=".8">' +
       [[110, 792, .6], [62, 822, .55], [160, 816, .5], [88, 750, .5], [172, 762, .45], [262, 824, .5], [352, 818, .5]].map(([x, y, sc]) => pogShadow(x, y, sc)).join('') +
       pog(110, 792, 0.6, 2, 15) + pog(113, 786, 0.6, 5, 70) + pog(62, 822, 0.55, 0, 40) + pog(160, 816, 0.5, 3, -60) +
       pogBack(88, 750, 0.5) + pog(172, 762, 0.45, 1, 120) + pog(262, 824, 0.5, 4, -25) + pogBack(352, 818, 0.5) + '</g>';

  /* --- light pools --- */
  s += `<g style="mix-blend-mode:screen"><circle cx="656" cy="420" r="420" fill="url(#gLamp)" class="lampglow"/><circle cx="286" cy="350" r="230" fill="url(#gCrt)"/><circle cx="820" cy="400" r="250" fill="url(#gTv)" class="flick2"/></g>`;
  const svg = `<svg class="room-art" viewBox="0 0 1600 900" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
  room.insertAdjacentHTML('afterbegin', svg);
  for (let i = 0; i < 16; i++) { const d = document.createElement('i'); d.className = 'mote'; d.style.cssText = `left:${(r() * 100).toFixed(1)}%;top:${(20 + r() * 70).toFixed(1)}%;animation-duration:${(9 + r() * 12).toFixed(1)}s;animation-delay:-${(r() * 12).toFixed(1)}s`; room.appendChild(d); }
}
buildRoom();

/* ---------------- interaction ---------------- */
let tx = 0, ty = 0, cx = 0, cy = 0;
window.addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2; });
function layout() {}

function loop(t) {
  if (!visible) return;
  const dt = t - T0;
  attract(dt);
  cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
  tilt.style.transform = `rotateZ(${(-7 + Math.sin(dt / 1700) * 1.2).toFixed(2)}deg) rotateY(${(cx * 12 - 6).toFixed(2)}deg) rotateX(${(-cy * 8 + 3).toFixed(2)}deg) translateY(${(Math.sin(dt / 900) * 7).toFixed(1)}px)`;
  room.style.transform = `translate(calc(-50% + ${(-cx * 10).toFixed(1)}px), calc(-50% + ${(-cy * 6).toFixed(1)}px)) scale(1.025)`;
  requestAnimationFrame(loop);
}

let busy = false;
function launch() {
  if (busy || !visible) return; busy = true;
  const G = window.__nullrun;
  if (G && G.wake) G.wake();
  home.classList.add('launching');
  setTimeout(() => {
    stage.classList.remove('asleep'); stage.classList.add('enter');
    home.classList.add('gone');
    if (G && G.boot) G.boot();
  }, 560);
  setTimeout(() => { home.hidden = true; visible = false; busy = false; home.classList.remove('launching', 'gone'); stage.classList.remove('enter'); }, 1300);
}
function goHome() {
  if (visible || busy) return;
  const G = window.__nullrun; if (G && G.sleep) G.sleep();
  home.hidden = false; visible = true; stage.classList.add('asleep');
  home.classList.add('arrive'); setTimeout(() => home.classList.remove('arrive'), 700);
  T0 = performance.now(); layout(); requestAnimationFrame(loop);
}
hero.addEventListener('click', launch);
window.addEventListener('keydown', e => {
  if (e.target && e.target.closest && e.target.closest('a,button')) return;   // let links and buttons handle their own keys
  if (visible && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); launch(); }
});
const hb = document.getElementById('homeBtn'); if (hb) hb.addEventListener('click', goHome);
const mb = document.getElementById('menuBtn'); if (mb) mb.addEventListener('click', () => { if (visible) launch(); });
window.addEventListener('resize', () => { if (visible) layout(); });

// Sound: browsers block audio until the visitor clicks, taps or presses a key. Try right away (works when the
// browser already trusts the page), otherwise show a small prompt until the first gesture starts the room music.
const sb = document.getElementById('sndBtn');
const audioState = () => { const G = window.__nullrun, on = !!(G && G.audioOn); if (sb) sb.classList.toggle('needs-tap', !on); return on; };
const wakeAudio = () => { const G = window.__nullrun; if (G && G.wake) G.wake(); setTimeout(audioState, 120); };
['pointerdown', 'pointerup', 'click', 'keydown', 'touchend'].forEach(ev => window.addEventListener(ev, wakeAudio, { passive: true }));
window.addEventListener('load', () => { wakeAudio(); setTimeout(audioState, 400); });
// back on the tab: if the browser did not resume sound by itself, show the prompt again (any click resumes it)
document.addEventListener('visibilitychange', () => { if (!document.hidden) { setTimeout(audioState, 600); setTimeout(audioState, 2000); } });

stage.classList.add('asleep');
layout();
requestAnimationFrame(loop);
window.__nullhome = { launch, goHome };
})();

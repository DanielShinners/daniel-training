/* Yappers Cup — The Ground.
   A hand-drawn 2.5D MCG: pick your team, then pick your position on the ground and claim it with a donation to Movember.
   No libraries: a small perspective camera projects the stadium onto a 2D canvas.
   Data: Supabase RPCs yc_board() (read) and yc_claim() (write). A claim holds the position for 7 days ('pending')
   until the Movember donation is matched and the row is marked 'confirmed' in Supabase. */

const CFG = window.YC_CONFIG || {};
const SUPA = CFG.supabaseUrl, KEY = CFG.supabaseKey;
const DONATE_URL = CFG.donateUrl || 'https://au.movember.com/';
const PRICE = { key: 25, field: 25, bench: 25 };          // every position is $25 minimum (matches yc_claim in Supabase)
const TERMS_VERSION = '2026-11-22', TERMS_URL = 'terms.html';

const TEAMS = {
  mudguts: { name: 'Mudguts', s: 1, body: '#8A2412', yoke: '#0E5A2C', trim: '#0E5A2C', ui: '#8A2412', shield: 'assets/shield-mudguts.png', line: 'Green & maroon. Big moustache energy.' },
  pissants: { name: 'Pissants', s: -1, body: '#1C3B83', yoke: '#E2600F', trim: '#E2600F', ui: '#1C3B83', shield: 'assets/shield-pissants.png', line: 'Blue & orange. Small, fast, relentless.' },
};
// positions for a team kicking towards +x (Mudguts). Pissants are the same shape turned 180°. x along the ground, z across it, metres.
const LINES = [
  ['Forwards', [['FPL', 'Forward pocket', 60, -24], ['FF', 'Full forward', 66, 0], ['FPR', 'Forward pocket', 60, 24]]],
  ['Half-forwards', [['HFFL', 'Half-forward flank', 36, -36], ['CHF', 'Centre half-forward', 38, 0], ['HFFR', 'Half-forward flank', 36, 36]]],
  ['Centre line', [['WL', 'Wing', 0, -48], ['C', 'Centre', 0, -13], ['WR', 'Wing', 0, 48]]],
  ['Followers', [['RK', 'Ruck', 0, 0], ['RR', 'Ruck rover', -7, 12], ['R', 'Rover', 7, 12]]],
  ['Half-backs', [['HBFL', 'Half-back flank', -36, -36], ['CHB', 'Centre half-back', -38, 0], ['HBFR', 'Half-back flank', -36, 36]]],
  ['Backs', [['BPL', 'Back pocket', -60, -24], ['FB', 'Full back', -66, 0], ['BPR', 'Back pocket', -60, 24]]],
  ['Interchange', [['I1', 'Interchange 1', -5, 71.5], ['I2', 'Interchange 2', -13, 71.5], ['I3', 'Interchange 3', -21, 71.5], ['I4', 'Interchange 4', -29, 71.5]]],
];
const KEY_POS = ['FF', 'CHF', 'RK', 'C', 'CHB', 'FB'];
const BLURB = {
  FF: 'The glory spot. Kick the sausage, soak up the applause.',
  CHF: 'The key target up forward. Big hands, bigger leads.',
  HFF: 'Crumb it, snap it, celebrate like it\'s a grand final.',
  FP: 'Small-forward energy. Lurk at the feet and pounce.',
  C: 'Run all day and touch it every second minute.',
  W: 'Hug the boundary, give the run, look good doing it.',
  RK: 'Tall timber. Tap it down and start the yap.',
  RR: 'First to the footy at every stoppage.',
  R: 'Get it out of the pack and get going.',
  CHB: 'The general of the defence. Calm, loud, in charge.',
  HBF: 'Rebound and run, with a licence to bomb it long.',
  BP: 'Lock down the small forward. No mercy (but be nice).',
  FB: 'Last line. Nobody kicks a goal on your watch.',
  I: 'Fresh legs off the bench. Every team needs an engine room.',
};
const blurbFor = c => BLURB[c] || BLURB[c.replace(/[LR]$/, '')] || BLURB[c.replace(/\d$/, '')];

const POSITIONS = [];
for (const [line, list] of LINES) for (const [code, label, x, z] of list) {
  for (const id of Object.keys(TEAMS)) {
    const T = TEAMS[id], bench = code[0] === 'I';
    const wx = bench ? (T.s > 0 ? x : -x) : x * T.s, wz = bench ? z : z * T.s;
    POSITIONS.push({ id: `${id}-${code}`, team: id, code, label, line, x: wx, z: wz, tier: bench ? 'bench' : KEY_POS.includes(code) ? 'key' : 'field', state: 'free', who: '' });
  }
}
const short = p => p.code[0] === 'I' ? 'INT' : p.code.replace(/^(HBF|HFF|BP|FP)[LR]$/, '$1').replace(/^W[LR]$/, 'W');
const money = n => '$' + Math.round(n).toLocaleString('en-AU');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rpc = (fn, body) => fetch(`${SUPA}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
  .then(r => r.ok ? r.json() : r.text().then(t => Promise.reject(new Error(t))));
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---------- the ground ----------
const A = 80, B = 68;                                   // boundary half-length / half-width (MCG is about 160 × 140)
const FENCE = 6;
const ell = (th, o, y) => [(A + o) * Math.cos(th), y, (B + o) * Math.sin(th)];
// the bowl's cross-section, inside to outside: [offset from boundary, height]
function profile() {
  const P = [[FENCE + 2, 0], [FENCE + 2, 1.6]], kinds = ['riser'];
  const steps = (o0, y0, o1, y1, n, tier) => { const dO = (o1 - o0) / n, dY = (y1 - y0) / n; for (let i = 0; i < n; i++) { P.push([o0 + dO * (i + 1), y0 + dY * i]); kinds.push('tread' + tier); P.push([o0 + dO * (i + 1), y0 + dY * (i + 1)]); kinds.push('riser'); } };
  steps(FENCE + 2, 1.6, 27, 11.5, 7, 1);
  P.push([29, 11.5]); kinds.push('walk'); P.push([29, 15.5]); kinds.push('facade');
  steps(29, 15.5, 42, 24.5, 6, 2);
  P.push([44, 24.5]); kinds.push('walk'); P.push([44, 29]); kinds.push('facade');
  steps(44, 29, 60, 43, 7, 3);
  P.push([60, 48]); kinds.push('back');
  return { P, kinds };
}
const TOWER_TH = [0.55, Math.PI / 2, Math.PI - 0.55, Math.PI + 0.55, Math.PI * 1.5, Math.PI * 2 - 0.55];

export async function openGround({ team, onClose } = {}) {
  try { await Promise.all([document.fonts.load('40px Anton'), document.fonts.load('600 14px Archivo')]); } catch (e) {}
  const img = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  const [badge] = await Promise.all([img('assets/badge-cream.png')]);

  // ---------- page layer ----------
  const root = document.createElement('div'); root.className = 'yg'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'The ground: pick your position');
  root.innerHTML = `
    <canvas class="yg-stage" aria-hidden="true"></canvas>
    <div class="yg-grain"></div>
    <button type="button" class="yg-x" data-a="close" aria-label="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <div class="yg-head"><p class="yg-k"></p><h2 class="yg-t"></h2><p class="yg-s"></p></div>
    <div class="yg-tools" hidden>
      <button type="button" class="yg-chip yg-team" data-a="switch"></button>
      <button type="button" class="yg-chip" data-a="list">List view</button>
    </div>
    <div class="yg-legend" hidden><span><i class="free"></i>Available</span><span><i class="held"></i>Held</span><span><i class="taken"></i>Taken</span></div>
    <div class="yg-stats"></div>
    <div class="yg-pick" hidden></div>
    <div class="yg-tip" hidden></div>
    <div class="yg-sheet" hidden></div>`;
  document.body.appendChild(root); document.documentElement.classList.add('yg-open');
  const $ = s => root.querySelector(s), canvas = $('.yg-stage'), ctx = canvas.getContext('2d');
  const bg = document.createElement('canvas'), bgx = bg.getContext('2d');

  // ---------- camera ----------
  let W = 0, H = 0, DPR = 1, F = 1;
  const cam = { tx: 0, tz: 0, d: 260, yaw: 0, pitch: 0.92 }, FOV = 48 * Math.PI / 180, NEAR = 2;
  let E, Fw, Rt, Up;
  function setupCam() {
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    E = [cam.tx + cam.d * cp * Math.sin(cam.yaw), cam.d * sp, cam.tz + cam.d * cp * Math.cos(cam.yaw)];
    Fw = norm([cam.tx - E[0], -E[1], cam.tz - E[2]]);
    Rt = norm(cross(Fw, [0, 1, 0])); Up = cross(Rt, Fw);
    F = (H / 2) / Math.tan(FOV / 2);
  }
  const portrait = () => W < H * 0.9;
  function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function view(p) { const v = [p[0] - E[0], p[1] - E[1], p[2] - E[2]]; return [v[0] * Rt[0] + v[1] * Rt[1] + v[2] * Rt[2], v[0] * Up[0] + v[1] * Up[1] + v[2] * Up[2], v[0] * Fw[0] + v[1] * Fw[1] + v[2] * Fw[2]]; }
  const scr = v => [W / 2 + v[0] * F / v[2], H / 2 - v[1] * F / v[2], v[2]];
  const proj = p => { const v = view(p); return v[2] < NEAR ? null : scr(v); };
  function clipPoly(pts) {                                   // world polygon -> screen polygon, clipped at the near plane
    const vs = pts.map(view), out = [];
    for (let i = 0; i < vs.length; i++) {
      const a = vs[i], b = vs[(i + 1) % vs.length], ain = a[2] >= NEAR, bin = b[2] >= NEAR;
      if (ain) out.push(scr(a));
      if (ain !== bin) { const t = (NEAR - a[2]) / (b[2] - a[2]); out.push(scr([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR])); }
    }
    return out;
  }
  const pathPoly = (c, s) => { c.beginPath(); c.moveTo(s[0][0], s[0][1]); for (let i = 1; i < s.length; i++) c.lineTo(s[i][0], s[i][1]); c.closePath(); };

  // ---------- static geometry ----------
  const N = 120, TH = Array.from({ length: N + 1 }, (_, i) => i / N * Math.PI * 2);
  const { P: PROF, kinds: KINDS } = profile();
  const R = rng(7), CROWD = ['#FFF0D7', '#CD2A2D', '#0E5A2C', '#1C3B83', '#E2600F', '#d9c7a6', '#2c3a2e', '#8A2412', '#f2e2c2'];
  const quads = [];
  for (let i = 0; i < N; i++) {
    const a0 = TH[i], a1 = TH[i + 1];
    for (let k = 1; k < PROF.length; k++) {
      const [o0, y0] = PROF[k - 1], [o1, y1] = PROF[k], kind = KINDS[k - 1];
      const q = { pts: [ell(a0, o0, y0), ell(a1, o0, y0), ell(a1, o1, y1), ell(a0, o1, y1)], kind, a: (a0 + a1) / 2, dots: null };
      const mid = ell(q.a, (o0 + o1) / 2, (y0 + y1) / 2); q.c = mid;
      q.n = kind === 'riser' || kind === 'facade' || kind === 'back' ? norm([-Math.cos(q.a) / (A + o0), 0, -Math.sin(q.a) / (B + o0)]) : [0, 1, 0];
      if (kind.startsWith('tread')) {
        q.dots = []; const n = 7;
        for (let d = 0; d < n; d++) { const u = R(), v = 0.25 + R() * 0.5, th = a0 + (a1 - a0) * u; q.dots.push({ p: ell(th, o0 + (o1 - o0) * v, y0 + 0.5), c: R() < 0.16 ? null : CROWD[(R() * CROWD.length) | 0] }); }
      }
      quads.push(q);
    }
    // roof over the upper deck
    const ro = [ell(a0, 40, 47), ell(a1, 40, 47), ell(a1, 63, 52), ell(a0, 63, 52)];
    quads.push({ pts: ro, kind: 'roof', a: (a0 + a1) / 2, c: ell((a0 + a1) / 2, 52, 50), n: [0, 1, 0] });
    // fence signage
    quads.push({ pts: [ell(a0, FENCE, 0), ell(a1, FENCE, 0), ell(a1, FENCE, 1.3), ell(a0, FENCE, 1.3)], kind: 'sign', i, a: (a0 + a1) / 2, c: ell((a0 + a1) / 2, FENCE, 0.6), n: norm([-Math.cos((a0 + a1) / 2) / A, 0, -Math.sin((a0 + a1) / 2) / B]) });
  }
  const COLORS = { riser: '#0c110d', tread1: '#1b241d', tread2: '#19211b', tread3: '#172019', walk: '#262e27', facade: '#0f1410', back: '#0a0d0b', roof: '#1d2420' };

  // fence signage strip
  const SIGN = document.createElement('canvas'); SIGN.width = 2400; SIGN.height = 40;
  { const c = SIGN.getContext('2d'); c.fillStyle = '#101611'; c.fillRect(0, 0, 2400, 40); c.font = '28px Anton'; c.textBaseline = 'middle';
    const words = [['YAPPERS CUP', '#FFF0D7', '#CD2A2D'], ['MOVEMBER', '#101611', '#FFF0D7'], ['MUDGUTS', '#FFF0D7', '#8A2412'], ['KICKING GOALS FOR MEN\'S HEALTH', '#FFF0D7', '#101611'], ['PISSANTS', '#FFF0D7', '#1C3B83'], ['MOVEMBER', '#101611', '#FFF0D7']];
    let x = 0, k = 0; while (x < 2400) { const [t, fg, bgc] = words[k++ % words.length]; const w = c.measureText(t).width + 50; c.fillStyle = bgc; c.fillRect(x, 0, w, 40); c.fillStyle = fg; c.fillText(t, x + 25, 21); x += w; } }

  // scoreboards
  const BOARD = document.createElement('canvas'); BOARD.width = 640; BOARD.height = 360;
  let stats = null;
  function drawBoard() {
    const c = BOARD.getContext('2d'); c.fillStyle = '#070a08'; c.fillRect(0, 0, 640, 360);
    c.fillStyle = '#CD2A2D'; c.fillRect(0, 0, 640, 70); c.fillStyle = '#FFF0D7'; c.font = '52px Anton'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('YAPPERS CUP 2026', 320, 38);
    const taken = POSITIONS.filter(p => p.state !== 'free'), mud = taken.filter(p => p.team === 'mudguts').length, pis = taken.length - mud;
    c.font = '40px Anton'; c.fillStyle = '#6fbf83'; c.fillText('MUDGUTS', 165, 120); c.fillStyle = '#ff8a3d'; c.fillText('PISSANTS', 475, 120);
    c.font = '110px Anton'; c.fillStyle = '#FFF0D7'; c.fillText(String(mud), 165, 210); c.fillText(String(pis), 475, 210);
    c.font = '30px Anton'; c.fillStyle = 'rgba(255,240,215,.55)'; c.fillText('VS', 320, 200);
    c.font = '26px Archivo'; c.fillStyle = 'rgba(255,240,215,.75)'; c.fillText('PLAYERS SIGNED · OF 22 EACH', 320, 282);
    c.font = '34px Anton'; c.fillStyle = '#FFF0D7'; c.fillText(`${money(stats ? stats.pledged : 0)} PLEDGED FOR MOVEMBER`, 320, 330);
  }
  drawBoard();

  function addTowerGlow(c, s, r) {
    const g = c.createRadialGradient(s[0], s[1], 0, s[0], s[1], r);
    g.addColorStop(0, 'rgba(255,248,230,.55)'); g.addColorStop(0.25, 'rgba(255,240,215,.18)'); g.addColorStop(1, 'rgba(255,240,215,0)');
    c.fillStyle = g; c.fillRect(s[0] - r, s[1] - r, r * 2, r * 2);
  }

  // ---------- render the stadium ----------
  function renderStatic() {
    setupCam();
    const c = bgx; c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const sky = c.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#060807'); sky.addColorStop(1, '#121813'); c.fillStyle = sky; c.fillRect(0, 0, W, H);

    // apron + ground
    const ringPts = o => TH.slice(0, N).map(t => ell(t, o, 0));
    const apron = clipPoly(ringPts(FENCE + 2)); if (apron.length > 2) { pathPoly(c, apron); c.fillStyle = '#1f4a26'; c.fill(); }
    const field = clipPoly(ringPts(0));
    if (field.length > 2) {
      c.save(); pathPoly(c, field); c.clip();
      c.fillStyle = '#2f6b33'; c.fillRect(0, 0, W, H);
      for (let x = -A, k = 0; x < A; x += 10, k++) {             // mowing stripes
        const s = clipPoly([[x, 0, -B - 2], [x + 10, 0, -B - 2], [x + 10, 0, B + 2], [x, 0, B + 2]]); if (s.length < 3) continue;
        pathPoly(c, s); c.fillStyle = k % 2 ? '#2a6430' : '#357538'; c.fill();
      }
      const o = proj([0, 0, 0]);                                // floodlight wash
      if (o) { const r = 120 * F / Math.max(o[2], 1); const g = c.createRadialGradient(o[0], o[1], 0, o[0], o[1], r * 1.2); g.addColorStop(0, 'rgba(255,250,225,.16)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); c.fillStyle = g; c.fillRect(0, 0, W, H); }
      c.restore();
    }
    // markings
    c.strokeStyle = 'rgba(255,255,255,.82)'; c.lineCap = 'round'; c.lineJoin = 'round';
    const line = (pts, closed, wm = 0.45) => {
      c.beginPath(); let pen = false, wsum = 0, n = 0;
      const seq = closed ? [...pts, pts[0]] : pts;
      for (const p of seq) { const s = proj(p); if (!s) { pen = false; continue; } wsum += wm * F / s[2]; n++; if (!pen) { c.moveTo(s[0], s[1]); pen = true; } else c.lineTo(s[0], s[1]); }
      if (n) { c.lineWidth = clamp(wsum / n, 0.6, 4); c.stroke(); }
    };
    line(TH.slice(0, N).map(t => ell(t, 0, 0.02)), true, 0.6);
    line([[-25, 0, -25], [25, 0, -25], [25, 0, 25], [-25, 0, 25]], true);
    const circ = (cx, cz, r, n = 40, a0 = 0, a1 = Math.PI * 2) => Array.from({ length: n + 1 }, (_, i) => { const t = a0 + (a1 - a0) * i / n; return [cx + r * Math.cos(t), 0, cz + r * Math.sin(t)]; });
    line(circ(0, 0, 5), false); line(circ(0, 0, 1.5, 20), false);
    line([[-5, 0, 0], [5, 0, 0]], false);
    for (const sx of [1, -1]) {
      const arc = circ(sx * A, 0, 50, 48, 0, Math.PI * 2).filter(p => (p[0] / A) ** 2 + (p[2] / B) ** 2 < 0.995 && Math.sign(p[0]) === sx);
      arc.sort((p, q) => Math.atan2(p[2], -sx * (p[0] - sx * A)) - Math.atan2(q[2], -sx * (q[0] - sx * A))); line(arc, false);
      line([[sx * A, 0, -3.2], [sx * (A - 9), 0, -3.2], [sx * (A - 9), 0, 3.2], [sx * A, 0, 3.2]], false);
    }

    // everything with height, back to front
    const items = [];
    const dir = q => [E[0] - q.c[0], E[1] - q.c[1], E[2] - q.c[2]];
    for (const q of quads) {
      const d = dir(q), facing = q.n[0] * d[0] + q.n[1] * d[1] + q.n[2] * d[2];
      if (facing <= 0 && q.kind !== 'roof') continue;
      const v = view(q.c); if (v[2] < -20) continue;
      items.push({ z: v[2], q });
    }
    for (const sx of [1, -1]) for (const [pz, h] of [[-9.6, 9], [-3.2, 15], [3.2, 15], [9.6, 9]]) {
      const b = [sx * A, 0, pz]; items.push({ z: view(b)[2] - 0.5, post: [b, [sx * A, h, pz]], h });
    }
    TOWER_TH.forEach((t, i) => { const base = ell(t, 61, 51), top = ell(t, 57, 92); items.push({ z: view(top)[2] - 30, tower: [base, top, t], i }); });
    for (const t of [0, Math.PI]) {
      const cx = ell(t, 50, 0), sx = Math.sign(cx[0]);
      const tl = [cx[0], 66, -17], tr = [cx[0], 66, 17], bl = [cx[0], 46, -17], br = [cx[0], 46, 17];
      items.push({ z: view([cx[0], 56, 0])[2] - 25, board: sx > 0 ? [tl, tr, bl] : [tr, tl, br], back: [cx[0] + sx * 1.5, 0, 0], sx });
    }
    items.sort((a, b) => b.z - a.z);

    const glows = [];
    for (const it of items) {
      if (it.q) {
        const q = it.q, s = clipPoly(q.pts); if (s.length < 3) continue;
        if (q.kind === 'sign') {
          pathPoly(c, s); c.fillStyle = '#101611'; c.fill();
          const a = proj(q.pts[0]), b = proj(q.pts[1]), d = proj(q.pts[3]);
          if (a && b && d) { const sw = SIGN.width / N; c.save(); pathPoly(c, s); c.clip(); c.setTransform(DPR * (b[0] - a[0]) / sw, DPR * (b[1] - a[1]) / sw, DPR * (d[0] - a[0]) / 40, DPR * (d[1] - a[1]) / 40, DPR * a[0], DPR * a[1]); c.drawImage(SIGN, q.i * sw, 0, sw + 0.6, 40, 0, 0, sw + 0.6, 40); c.restore(); c.setTransform(DPR, 0, 0, DPR, 0, 0); }
          continue;
        }
        pathPoly(c, s); c.fillStyle = COLORS[q.kind] || '#1b241d'; c.fill();
        if (q.kind === 'roof') { c.strokeStyle = 'rgba(255,240,215,.05)'; c.lineWidth = 1; c.stroke(); }
        if (q.kind === 'facade') { c.strokeStyle = 'rgba(205,42,45,.55)'; c.lineWidth = 1; c.beginPath(); const p0 = proj(q.pts[3]), p1 = proj(q.pts[2]); if (p0 && p1) { c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke(); } }
        if (q.dots) for (const dt of q.dots) {
          if (!dt.c) continue; const p = proj(dt.p); if (!p) continue;
          const r = clamp(0.42 * F / p[2], 0.5, 6); c.fillStyle = dt.c; c.fillRect(p[0] - r / 2, p[1] - r, r, r * 1.1);
        }
      } else if (it.post) {
        const a = proj(it.post[0]), b = proj(it.post[1]); if (!a || !b) continue;
        c.strokeStyle = '#f4ead6'; c.lineWidth = clamp(0.5 * F / a[2], 1, 6); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
        c.strokeStyle = it.h > 10 ? '#CD2A2D' : '#f4ead6'; c.beginPath(); const m = proj([it.post[0][0], 1.6, it.post[0][2]]); if (m) { c.moveTo(a[0], a[1]); c.lineTo(m[0], m[1]); c.stroke(); }
      } else if (it.tower) {
        const [base, top, t] = it.tower, a = proj(base), b = proj(top); if (!a || !b) continue;
        const nx = -Math.cos(t), nz = -Math.sin(t), tx = -nz, tz = nx;          // panel faces the ground
        if (nx * (E[0] - top[0]) + nz * (E[2] - top[2]) <= 0) continue;         // towers on our side of the ground are behind us
        c.strokeStyle = '#2d362f'; c.lineWidth = clamp(2.2 * F / a[2], 1, 10); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
        const hp = (u, v) => [top[0] + tx * u, top[1] + v, top[2] + tz * u];
        const panel = clipPoly([hp(-8, -5), hp(8, -5), hp(8, 6), hp(-8, 6)]);
        const facing = nx * (E[0] - top[0]) + nz * (E[2] - top[2]) > 0;
        if (!facing) continue;
        if (panel.length > 2) {
          pathPoly(c, panel); c.fillStyle = facing ? '#fff6e2' : '#2a322c'; c.fill();
          if (facing) { c.fillStyle = 'rgba(16,22,17,.35)'; for (let u = -6; u <= 6; u += 3) for (let v = -3; v <= 4; v += 3.5) { const p = proj(hp(u, v)); if (p) { const r = clamp(0.5 * F / p[2], 0.4, 3); c.fillRect(p[0] - r / 2, p[1] - r / 2, r, r); } } glows.push([proj(hp(0, 0)), facing]); }
        }
      } else if (it.board) {
        const [p0, p1, p2] = it.board.map(proj); if (!p0 || !p1 || !p2) continue;
        const facing = -it.sx * (E[0] - it.back[0]) > 0 || Math.abs(E[0]) < Math.abs(it.back[0]);
        if (!facing) continue;
        const pB = proj([it.back[0], 46, 0]); const corner = [p0, p1, [p1[0] + p2[0] - p0[0], p1[1] + p2[1] - p0[1]], p2];
        c.fillStyle = '#050605'; pathPoly(c, corner.map(p => [p[0], p[1]])); c.fill();
        c.save(); c.setTransform(DPR * (p1[0] - p0[0]) / 640, DPR * (p1[1] - p0[1]) / 640, DPR * (p2[0] - p0[0]) / 360, DPR * (p2[1] - p0[1]) / 360, DPR * p0[0], DPR * p0[1]); c.drawImage(BOARD, 0, 0); c.restore();
        c.setTransform(DPR, 0, 0, DPR, 0, 0);
        void pB;
      }
    }
    c.globalCompositeOperation = 'lighter';
    for (const [p] of glows) if (p) addTowerGlow(c, p, clamp(40 * F / p[2], 18, 220));
    c.globalCompositeOperation = 'source-over';
    // vignette
    const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  }

  // ---------- players (markers) ----------
  function guernsey(c, cx, cy, h, T, alpha) {
    const u = h;
    const shape = () => {
      c.beginPath();
      c.moveTo(cx - 0.15 * u, cy - 0.5 * u); c.quadraticCurveTo(cx, cy - 0.36 * u, cx + 0.15 * u, cy - 0.5 * u);
      c.lineTo(cx + 0.3 * u, cy - 0.46 * u); c.lineTo(cx + 0.37 * u, cy - 0.38 * u);
      c.quadraticCurveTo(cx + 0.24 * u, cy - 0.22 * u, cx + 0.3 * u, cy - 0.02 * u); c.lineTo(cx + 0.32 * u, cy + 0.5 * u);
      c.lineTo(cx - 0.32 * u, cy + 0.5 * u); c.lineTo(cx - 0.3 * u, cy - 0.02 * u);
      c.quadraticCurveTo(cx - 0.24 * u, cy - 0.22 * u, cx - 0.37 * u, cy - 0.38 * u); c.lineTo(cx - 0.3 * u, cy - 0.46 * u); c.closePath();
    };
    c.save(); c.globalAlpha = alpha;
    shape(); c.fillStyle = T.body; c.fill();
    c.save(); shape(); c.clip(); c.fillStyle = T.yoke;
    if (T.s > 0) { c.beginPath(); c.moveTo(cx - 0.5 * u, cy - 0.6 * u); c.lineTo(cx + 0.5 * u, cy - 0.6 * u); c.lineTo(cx + 0.5 * u, cy - 0.22 * u); c.lineTo(cx, cy + 0.08 * u); c.lineTo(cx - 0.5 * u, cy - 0.22 * u); c.closePath(); c.fill(); }
    else { c.fillRect(cx - 0.075 * u, cy - 0.6 * u, 0.15 * u, 1.2 * u); }
    c.restore();
    shape(); c.lineWidth = Math.max(1.2, u * 0.035); c.strokeStyle = '#0b0f0c'; c.stroke();
    c.restore();
  }
  function pill(c, x, y, text, bgc, fg, size) {
    c.font = `${size}px Anton`; const w = c.measureText(text).width + size * 0.9, h = size * 1.45;
    c.fillStyle = bgc; c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, h / 2); c.fill();
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, y + size * 0.04);
    return w;
  }
  let hits = [], hover = null, picked = null, curTeam = null, mode = 'team', T0 = performance.now();
  function renderMarkers(now) {
    hits = [];
    if (!curTeam) return;
    const c = ctx, list = POSITIONS.filter(p => p.team === curTeam).map(p => ({ p, s: proj([p.x, 0, p.z]) })).filter(o => o.s).sort((a, b) => b.s[2] - a.s[2]);
    const T = TEAMS[curTeam], pulse = (Math.sin((now - T0) / 420) + 1) / 2;
    for (const { p, s } of list) {
      const k = F / s[2], h = clamp(6.4 * k, 28, 96), sel = picked === p, hov = hover === p;
      const lift = clamp(1.2 * k, 3, 12), cx = s[0], cy = s[1] - h * 0.5 - lift;
      // shadow + ring on the grass
      const rx = clamp(2.6 * k, 6, 40), ry = rx * Math.max(0.25, Math.sin(cam.pitch));
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(s[0], s[1], rx * 0.8, ry * 0.8, 0, 0, Math.PI * 2); c.fill();
      if (p.state === 'free') { c.strokeStyle = sel ? '#FFF0D7' : `rgba(255,240,215,${0.35 + pulse * 0.5})`; c.lineWidth = sel ? 3 : 1.8; c.beginPath(); c.ellipse(s[0], s[1], rx * (1 + pulse * 0.35), ry * (1 + pulse * 0.35), 0, 0, Math.PI * 2); c.stroke(); }
      if (sel) { c.strokeStyle = '#CD2A2D'; c.lineWidth = 3; c.beginPath(); c.ellipse(s[0], s[1], rx * 1.15, ry * 1.15, 0, 0, Math.PI * 2); c.stroke(); }
      const scale = sel ? 1.18 : hov ? 1.1 : 1, hh = h * scale;
      guernsey(c, cx, s[1] - hh * 0.5 - lift, hh, T, p.state === 'held' ? 0.55 : 1);
      // code on the chest
      c.font = `${Math.round(hh * (short(p).length > 2 ? 0.22 : 0.28))}px Anton`; c.fillStyle = '#FFF0D7'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.globalAlpha = p.state === 'held' ? 0.7 : 1; c.fillText(short(p), cx, s[1] - hh * 0.38 - lift); c.globalAlpha = 1;
      const top = s[1] - hh - lift;
      if (p.state === 'taken') pill(c, cx, top - 9, p.who, '#FFF0D7', '#101611', clamp(hh * 0.2, 10, 15));
      else if (p.state === 'held') pill(c, cx, top - 9, 'HELD', 'rgba(16,22,17,.85)', 'rgba(255,240,215,.8)', clamp(hh * 0.18, 9, 13));
      else if (sel || hov || h > 44) pill(c, cx, top - 9, money(PRICE[p.tier]), 'rgba(16,22,17,.85)', '#FFF0D7', clamp(hh * 0.18, 9, 13));
      hits.push({ p, x0: cx - hh * 0.4, x1: cx + hh * 0.4, y0: top - 16, y1: s[1] + 4 });
    }
  }

  // ---------- loop ----------
  let dirty = true, anim = null, idle = true, lastInput = 0, alive = true;
  function resize() {
    W = root.clientWidth; H = root.clientHeight; DPR = Math.min(devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.75 : 2);
    for (const cv of [canvas, bg]) { cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); }
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px'; dirty = true;
  }
  window.addEventListener('resize', resize); resize();
  function frame(now) {
    if (!alive) return;
    if (anim) {
      const t = clamp((now - anim.t0) / anim.dur, 0, 1), e = ease(t);
      for (const k in anim.to) cam[k] = lerp(anim.from[k], anim.to[k], e);
      dirty = true; if (t >= 1) { const d = anim.done; anim = null; d && d(); }
    } else if (idle && mode === 'team' && now - lastInput > 1500) { cam.yaw += 0.0009; dirty = true; }
    if (dirty) { renderStatic(); dirty = false; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bg, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); renderMarkers(now);
    requestAnimationFrame(frame);
  }
  function fly(to, dur = 1400, done) {
    const from = { ...cam }; if ('yaw' in to) { let dy = to.yaw - from.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); to = { ...to, yaw: from.yaw + dy }; }
    anim = { from, to, t0: performance.now(), dur, done };
  }
  const homeYaw = () => portrait() ? Math.PI / 2 : 0;
  const fitD = () => { const t = Math.tan(FOV / 2), a = W / H, need = portrait() ? Math.max(118 / t, 96 / (t * a)) : Math.max(92 / t, 128 / (t * a)); return need * 1.05; };

  // ---------- input ----------
  let drag = null; const pts = new Map();
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); drag = { x: e.clientX, y: e.clientY, moved: 0, yaw: cam.yaw, pitch: cam.pitch, d: cam.d, pinch: pts.size === 2 ? dist() : 0 }; lastInput = performance.now(); idle = false; anim = null; });
  const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    if (!drag) { const h = hitAt(mx, my); if (h !== hover) { hover = h; canvas.style.cursor = h ? 'pointer' : 'grab'; showTip(h, mx, my); } else if (h) showTip(h, mx, my); return; }
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { if (!drag.pinch) drag.pinch = dist(); cam.d = clamp(drag.d * drag.pinch / dist(), 50, 340); drag.moved = 99; dirty = true; return; }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    if (drag.moved > 5) { cam.yaw = drag.yaw - dx * 0.006; cam.pitch = clamp(drag.pitch + dy * 0.004, 0.42, 1.38); dirty = true; canvas.style.cursor = 'grabbing'; }
  });
  const up = e => {
    pts.delete(e.pointerId); if (!drag) return;
    const r = canvas.getBoundingClientRect();
    if (drag.moved <= 5 && pts.size === 0) { const h = hitAt(e.clientX - r.left, e.clientY - r.top); if (h) select(h); }
    if (pts.size === 0) { drag = null; canvas.style.cursor = 'grab'; }
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); anim = null; cam.d = clamp(cam.d * Math.exp(e.deltaY * 0.0012), 50, 340); dirty = true; idle = false; }, { passive: false });
  function hitAt(x, y) { for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) return h.p; } return null; }
  const tip = $('.yg-tip');
  function showTip(p, x, y) {
    if (!p || matchMedia('(pointer: coarse)').matches) { tip.hidden = true; return; }
    tip.hidden = false; tip.style.left = x + 'px'; tip.style.top = y + 'px';
    tip.innerHTML = `<b>${esc(p.label)}</b><span>${p.state === 'taken' ? esc(p.who) : p.state === 'held' ? 'Held' : money(PRICE[p.tier])}</span>`;
  }

  // ---------- data ----------
  async function load() {
    try {
      const b = await rpc('yc_board');
      for (const p of POSITIONS) { p.state = 'free'; p.who = ''; }
      for (const r of b.positions || []) { const p = POSITIONS.find(q => q.id === r.id); if (p) { p.state = r.status === 'confirmed' ? 'taken' : 'held'; p.who = r.name; } }
      stats = { raised: b.raised || 0, pledged: b.pledged || 0 };
    } catch (e) { console.warn('yc board', e); }
    drawBoard(); dirty = true; setStats(); if (mode === 'list') listView();
  }
  function setStats() {
    const n = POSITIONS.filter(p => p.state !== 'free').length;
    $('.yg-stats').innerHTML = `<b>${n}</b> of ${POSITIONS.length} positions filled${stats ? ` · <b>${money(stats.pledged)}</b> pledged for Movember` : ''}`;
  }
  setStats(); load(); const poll = setInterval(load, 30000);

  // ---------- flow ----------
  function setHead(k, t, s) { $('.yg-k').textContent = k; $('.yg-t').textContent = t; $('.yg-s').textContent = s || ''; }
  const sheet = $('.yg-sheet');
  function showSheet(html) { sheet.innerHTML = html; sheet.hidden = false; sheet.scrollTop = 0; root.classList.add('sheet-open'); }
  function hideSheet() { sheet.hidden = true; sheet.innerHTML = ''; root.classList.remove('sheet-open'); }

  function teamPicker() {
    mode = 'team'; curTeam = null; picked = null; hideSheet(); idle = true;
    $('.yg-tools').hidden = true; $('.yg-legend').hidden = true;
    setHead('Yappers Cup · Sunday 29 November', 'Choose your team', 'Then pick your spot on the ground. Every position is a donation to Movember.');
    const pick = $('.yg-pick'); pick.hidden = false;
    const free = id => POSITIONS.filter(p => p.team === id && p.state === 'free').length;
    pick.innerHTML = Object.entries(TEAMS).map(([id, T]) => `<button type="button" class="yg-tm" data-team="${id}" style="--tc:${T.ui}"><img src="${T.shield}" alt=""><span class="n">${T.name}</span><span class="l">${T.line}</span><span class="f">${free(id)} of 22 spots left</span></button>`).join('<span class="yg-vs">vs</span>');
    fly({ tx: 0, tz: 0, d: fitD() * 1.15, pitch: 0.62, yaw: cam.yaw }, 1600);
  }
  function chooseTeam(id) {
    curTeam = id; mode = 'field'; picked = null; idle = false; hideSheet();
    const T = TEAMS[id]; $('.yg-pick').hidden = true; $('.yg-tools').hidden = false; $('.yg-legend').hidden = false;
    $('.yg-team').innerHTML = `<img src="${T.shield}" alt="">${T.name}<em>Switch</em>`;
    setHead(`${T.name} · ${POSITIONS.filter(p => p.team === id && p.state === 'free').length} spots left`, 'Pick your position', 'Tap a guernsey on the ground. Drag to look around.');
    fly({ tx: 0, tz: 0, d: fitD() * 0.92, pitch: 1.08, yaw: homeYaw() }, 1500);
  }
  function select(p) {
    picked = p; mode = 'pos';
    const s = PRICE[p.tier], line = p.code[0] === 'I' ? 'On the bench' : p.line;
    // frame the guernsey where the sheet won't cover it: left of centre on desktop, top half on a phone
    const d = portrait() ? 125 : 150, y = cam.yaw, mobile = W <= 720;
    const right = [Math.cos(y), -Math.sin(y)], toward = [Math.sin(y), Math.cos(y)];
    const off = mobile ? [toward[0] * d * 0.42, toward[1] * d * 0.42] : [right[0] * d * 0.26, right[1] * d * 0.26];
    fly({ tx: p.x + off[0], tz: p.z + off[1], d, pitch: 0.98 }, 1100);
    if (p.state !== 'free') {
      showSheet(`<p class="yg-sk">${TEAMS[p.team].name} · ${esc(line)}</p><h3>${esc(p.label)}</h3>
        <p class="yg-note">${p.state === 'taken' ? `<b>${esc(p.who)}</b> has this spot locked in.` : `This spot is held for <b>${esc(p.who)}</b> while their donation comes through.`} Pick another guernsey.</p>
        <div class="yg-btns"><button type="button" class="yg-btn ghost" data-a="field">Back to the ground</button></div>`);
      return;
    }
    showSheet(`<p class="yg-sk">${TEAMS[p.team].name} · ${esc(line)}</p><h3>${esc(p.label)}</h3>
      <p class="yg-blurb">${esc(blurbFor(p.code))}</p>
      <div class="yg-price"><b>${money(s)}</b><span>minimum donation to Movember · same for every position</span></div>
      <ol class="yg-steps"><li><b>Hold this spot</b> with your details. We keep it for 7 days.</li><li><b>Donate</b> on the Yappers Cup Movember page using the same email.</li><li>Once it lands, <b>your name goes on the team sheet</b> and the back of your guernsey.</li></ol>
      <div class="yg-btns"><button type="button" class="yg-btn" data-a="claim">Claim ${esc(p.label.toLowerCase())}</button><button type="button" class="yg-btn ghost" data-a="field">Back</button></div>`);
  }
  function claimForm(p) {
    const min = PRICE[p.tier], opts = [min, min * 2, min * 4];
    showSheet(`<p class="yg-sk">${TEAMS[p.team].name} · ${esc(p.label)}</p><h3>Lock in your spot</h3>
      <form class="yg-form" novalidate>
        <label>Full name<input name="full" autocomplete="name" maxlength="120" required></label>
        <label>Name on your guernsey<input name="name" maxlength="16" required placeholder="e.g. BIG KEV" style="text-transform:uppercase"></label>
        <div class="yg-row"><label>Email<input name="email" type="email" autocomplete="email" required placeholder="Same as on Movember"></label><label>Mobile<input name="mobile" type="tel" autocomplete="tel" maxlength="40"></label></div>
        <label>Your donation<span class="yg-amts" role="radiogroup">${opts.map((v, i) => `<button type="button" role="radio" aria-checked="${i === 0}" data-v="${v}" class="${i === 0 ? 'on' : ''}">${money(v)}</button>`).join('')}<span class="yg-other">Other $<input name="amount" type="number" inputmode="numeric" min="${min}" step="1" value="${min}"></span></span></label>
        <label class="yg-terms"><input type="checkbox" name="terms" required><span>I've read and accept the <a href="${TERMS_URL}" target="_blank" rel="noopener">terms &amp; conditions</a>, including that I take part at my own risk.</span></label>
        <p class="yg-err" role="alert"></p>
        <div class="yg-btns"><button type="submit" class="yg-btn">Hold my spot</button><button type="button" class="yg-btn ghost" data-a="back">Back</button></div>
      </form>`);
    const f = sheet.querySelector('form'), amt = f.elements.amount;
    f.querySelectorAll('.yg-amts button').forEach(b => b.onclick = () => { f.querySelectorAll('.yg-amts button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); }); amt.value = b.dataset.v; });
    amt.oninput = () => f.querySelectorAll('.yg-amts button').forEach(x => { const on = x.dataset.v === amt.value; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); });
    f.elements.full.focus({ preventScroll: true });
    f.onsubmit = async e => {
      e.preventDefault(); const err = f.querySelector('.yg-err'), btn = f.querySelector('[type=submit]'); err.textContent = '';
      const body = { p_position: p.id, p_name: f.elements.name.value, p_full_name: f.elements.full.value, p_email: f.elements.email.value, p_mobile: f.elements.mobile.value, p_amount: Math.round(+amt.value || 0), p_terms: f.elements.terms.checked, p_terms_version: TERMS_VERSION };
      if (!body.p_full_name.trim()) return void (err.textContent = 'Add your full name.');
      if (!body.p_name.trim()) return void (err.textContent = 'Add the name for the back of your guernsey.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.p_email.trim())) return void (err.textContent = 'Add a valid email so we can match your donation.');
      if (body.p_amount < min) return void (err.textContent = `Every position starts at ${money(min)}.`);
      if (!body.p_terms) return void (err.textContent = 'Tick the box to accept the terms and conditions.');
      btn.disabled = true; btn.textContent = 'Holding…';
      try {
        const r = await rpc('yc_claim', body);
        if (!r.ok) { err.textContent = r.error || 'That didn\'t go through. Try again.'; btn.disabled = false; btn.textContent = 'Hold my spot'; if (/grabbed/.test(r.error || '')) load(); return; }
        p.state = 'held'; p.who = r.name; if (stats) stats.pledged += body.p_amount; drawBoard(); dirty = true; setStats();
        showSheet(`<p class="yg-sk">Spot held · ${TEAMS[p.team].name} · ${esc(p.label)}</p><h3>One last step</h3>
          <p class="yg-note">Donate <b>${money(body.p_amount)}</b> on the Yappers Cup Movember page using <b>${esc(body.p_email.trim())}</b>. Once it comes through, <b>${esc(r.name)}</b> goes on the team sheet. We'll hold the spot for 7 days.</p>
          <div class="yg-btns"><a class="yg-btn" href="${DONATE_URL}" target="_blank" rel="noopener">Donate to Movember</a><button type="button" class="yg-btn ghost" data-a="field">Done</button></div>`);
      } catch (x) { err.textContent = 'That didn\'t go through. Check your connection and try again.'; btn.disabled = false; btn.textContent = 'Hold my spot'; }
    };
  }
  function listView() {
    mode = 'list'; const T = TEAMS[curTeam];
    showSheet(`<p class="yg-sk">${T.name} · team sheet</p><h3>All positions</h3>` + LINES.map(([line, list]) => `<div class="yg-line"><p>${line}</p>${list.map(([code]) => {
      const p = POSITIONS.find(q => q.id === `${curTeam}-${code}`);
      return `<button type="button" class="yg-li ${p.state}" data-pos="${p.id}" ${p.state === 'free' ? '' : 'aria-disabled="true"'}><span>${esc(p.label)}</span><em>${p.state === 'taken' ? esc(p.who) : p.state === 'held' ? 'Held' : money(PRICE[p.tier])}</em></button>`;
    }).join('')}</div>`).join('') + `<div class="yg-btns"><button type="button" class="yg-btn ghost" data-a="field">Back to the ground</button></div>`);
  }
  function backToField() {
    picked = null; mode = 'field'; hideSheet();
    fly({ tx: 0, tz: 0, d: fitD() * 0.92, pitch: 1.08 }, 1100);
  }

  root.addEventListener('click', e => {
    const b = e.target.closest('[data-a],[data-team],[data-pos]'); if (!b) return;
    if (b.dataset.team) return chooseTeam(b.dataset.team);
    if (b.dataset.pos) { const p = POSITIONS.find(q => q.id === b.dataset.pos); if (p && p.state === 'free') { select(p); } return; }
    const a = b.dataset.a;
    if (a === 'close') close();
    else if (a === 'switch') teamPicker();
    else if (a === 'list') listView();
    else if (a === 'field') backToField();
    else if (a === 'claim' && picked) claimForm(picked);
    else if (a === 'back' && picked) select(picked);
  });
  const onKey = e => { if (e.key === 'Escape') { if (!sheet.hidden && mode !== 'team') backToField(); else close(); } };
  document.addEventListener('keydown', onKey);
  function close() {
    alive = false; clearInterval(poll); window.removeEventListener('resize', resize); document.removeEventListener('keydown', onKey);
    root.classList.add('out'); setTimeout(() => { root.remove(); document.documentElement.classList.remove('yg-open'); onClose && onClose(); }, 280);
  }

  cam.yaw = homeYaw() - 0.6; cam.d = fitD() * 1.6; cam.pitch = 0.5;
  requestAnimationFrame(frame);
  if (team && TEAMS[team]) { setTimeout(() => chooseTeam(team), 50); } else teamPicker();
  void badge;
  return { close };
}

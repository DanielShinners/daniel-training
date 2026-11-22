/* Yappers Cup — goal-kicking practice.
   Pick Mudguts or Pissants, then drag back from the ball to aim (the dotted arc shows the flight) and let go to kick.
   6 points for a goal, 1 for a behind. Two goals from straight in front, then the angles get harder; after 3 goals the wind picks up. */

const ASSET = p => ((window.YC_CONFIG && window.YC_CONFIG.assetBase) || '') + p;
const TEAMS = {
  mudguts: { name: 'Mudguts', shield: 'assets/shield-mudguts.png', col: '#8A2412' },
  pissants: { name: 'Pissants', shield: 'assets/shield-pissants.png', col: '#1C3B83' },
};
const CFG = window.YC_CONFIG || {};
const rpc = (fn, body) => fetch(`${CFG.supabaseUrl}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: CFG.supabaseKey, Authorization: `Bearer ${CFG.supabaseKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
  .then(r => r.ok ? r.json() : r.text().then(t => Promise.reject(new Error(t))));
const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10] || 'th');
export const loadBoard = () => rpc('yc_kick_board');
export function boardHTML(b, meId) {
  const rows = (b && b.top) || [];
  if (!rows.length) return '<p class="kk-empty">No scores yet. Be the first on the board.</p>';
  return '<ol class="kk-board">' + rows.map((r, i) => `<li class="${r.id === meId ? 'me' : ''}"><span class="kk-rank">${i + 1}</span><img src="${ASSET(TEAMS[r.team].shield)}" alt="${TEAMS[r.team].name}"><span class="kk-nm">${esc(r.name)}</span><span class="kk-sc">${r.goals}.${r.behinds} <b>${r.score}</b></span></li>`).join('') + '</ol>';
}
export function teamsHTML(b) {
  const t = (b && b.teams) || { mudguts: 0, pissants: 0 };
  return `<div class="kk-tt"><span><img src="${ASSET(TEAMS.mudguts.shield)}" alt="">Mudguts <b>${t.mudguts}</b></span><em>v</em><span><b>${t.pissants}</b> Pissants<img src="${ASSET(TEAMS.pissants.shield)}" alt=""></span></div>`;
}

/* Full-screen launcher: the game takes over the screen (no page scroll underneath) and has its own exit. */
export function openKick() {
  if (document.querySelector('.kk-full')) return;
  const full = document.createElement('div'); full.className = 'kk-full'; full.setAttribute('role', 'dialog'); full.setAttribute('aria-label', 'Goal-kicking practice');
  full.innerHTML = '<div class="kick-game"></div><button type="button" class="kk-x" aria-label="Exit goal-kicking practice"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
  document.body.appendChild(full); document.documentElement.classList.add('kk-open');
  const game = startKick(full.querySelector('.kick-game'));
  const close = () => { game.stop(); full.remove(); document.documentElement.classList.remove('kk-open'); removeEventListener('keydown', onKey); document.dispatchEvent(new Event('yc-kick-closed')); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  full.querySelector('.kk-x').addEventListener('click', close); addEventListener('keydown', onKey);
}

const G = 9.8, EL = 0.62, POST = 3.2, BEHIND = 9.6, BALL = 0.32;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

export function startKick(root) {
  root.innerHTML = `
    <canvas class="kk-stage"></canvas>
    <div class="kk-hud" hidden>
      <div class="kk-score"><img alt=""><div><b class="kk-team"></b><span class="kk-tally">0.0 (0)</span></div></div>
      <div class="kk-side"><div class="kk-clock">1:00</div><div class="kk-level"></div><div class="kk-wind" hidden><i>➜</i><span></span></div></div>
    </div>
    <div class="kk-msg" aria-live="polite"></div>
    <div class="kk-hint" hidden>Drag back from the ball to aim · let go to kick</div>
    <div class="kk-meta" hidden><span class="kk-shots"></span><span class="kk-best"></span><button type="button" class="kk-reset">Change team</button></div>
    <div class="kk-over" hidden><div class="kk-card"></div></div>
    <div class="kk-pick">
      <p class="kk-pk">Goal-kicking practice</p>
      <h3>Pick your team</h3>
      <div class="kk-teams">${Object.entries(TEAMS).map(([id, t]) => `<button type="button" data-team="${id}" aria-label="Kick for the ${t.name}"><img src="${ASSET(t.shield)}" alt=""><span>${t.name}</span></button>`).join('')}</div>
      <button type="button" class="kk-lbbtn">View leaderboard</button>
    </div>`;
  const $ = s => root.querySelector(s), canvas = $('.kk-stage'), ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  function resize() {
    W = root.clientWidth; H = root.clientHeight; DPR = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px'; draw();
  }

  // ---------- game state ----------
  const ROUND = 60;
  const S = { team: null, goals: 0, behinds: 0, shots: 0, endAt: 0, over: false, spot: { x: 0, z: -30 }, wind: { x: 0, z: 0 }, level: '', ball: null, aim: null, busy: false, t: 0 };
  const best = () => { try { return +localStorage.getItem('yc-kick-best-' + S.team) || 0; } catch (e) { return 0; } };
  const saveBest = v => { try { localStorage.setItem('yc-kick-best-' + S.team, String(v)); } catch (e) {} };
  const pts = () => S.goals * 6 + S.behinds;

  function setup() {
    const g = S.goals;
    S.wind = { x: 0, z: 0 };
    if (g < 2) { S.spot = { x: 0, z: -30 }; S.level = 'Straight in front · 30m'; }
    else if (g < 3) { const side = Math.random() < 0.5 ? -1 : 1; S.spot = { x: side * 11, z: -34 }; S.level = 'On an angle · 36m'; }
    else {
      const side = Math.random() < 0.5 ? -1 : 1, hard = Math.min(1, (g - 3) / 6);
      S.spot = { x: side * rand(8, 14 + hard * 12), z: -rand(30, 38 + hard * 8) };
      const strength = rand(2.6, 3.6 + hard * 3);
      S.wind = { x: (Math.random() < 0.5 ? -1 : 1) * strength, z: rand(-0.6, 0.6) };
      S.level = `Tough angle · ${Math.round(Math.hypot(S.spot.x, S.spot.z))}m`;
    }
    S.ball = { p: { x: S.spot.x, y: BALL, z: S.spot.z }, v: null, spin: 0, done: false };
    S.aim = null; S.busy = false; hud(); draw();
  }

  function hud() {
    if (!S.team) return;
    const T = TEAMS[S.team];
    $('.kk-hud').hidden = $('.kk-meta').hidden = false; $('.kk-hint').hidden = S.shots > 0;
    $('.kk-score img').src = ASSET(T.shield); $('.kk-team').textContent = T.name;
    $('.kk-tally').textContent = `${S.goals}.${S.behinds} (${pts()})`;
    $('.kk-level').textContent = S.level;
    const w = $('.kk-wind'), wm = Math.hypot(S.wind.x, S.wind.z);
    w.hidden = wm < 0.1;
    if (wm >= 0.1) { w.querySelector('span').textContent = `Wind ${Math.round(wm * 9)} km/h`; camera(); const g0 = P(0, 0, 0), g1 = P(S.wind.x * 4, 0, S.wind.z * 4);   // point the arrow the way the wind pushes the ball on screen
      if (g0 && g1) w.querySelector('i').style.transform = `rotate(${Math.atan2(g1[1] - g0[1], g1[0] - g0[0])}rad)`; }
    $('.kk-shots').textContent = `${S.shots} kick${S.shots === 1 ? '' : 's'}`;
    $('.kk-best').textContent = `Best ${best()} pts in 60s`;
  }
  let msgT = 0;
  function flash(text, kind) {
    const m = $('.kk-msg'); m.textContent = text; m.className = 'kk-msg show ' + (kind || ''); clearTimeout(msgT);
    msgT = setTimeout(() => { m.className = 'kk-msg'; }, 1300);
  }

  // ---------- camera ----------
  let C, f, r, u, F, HZ;
  function camera() {
    const sp = S.spot, gx = 0, gz = 0, dx = sp.x - gx, dz = sp.z - gz, l = Math.hypot(dx, dz);
    C = { x: sp.x + dx / l * 6.5, y: 2.1, z: sp.z + dz / l * 6.5 };
    const T = { x: gx * 0.6 + sp.x * 0.4, y: 2.1, z: gz };       // level camera: posts stay truly vertical, so a high ball lines up with them
    f = norm({ x: T.x - C.x, y: T.y - C.y, z: T.z - C.z });
    r = norm(cross(f, { x: 0, y: 1, z: 0 })); u = cross(r, f);
    // frame the shot: ball fully on screen with room to pull back, and the tops of the goal posts in view.
    // Start zoomed in; if both don't fit, zoom out a step and try again.
    const vb = { x: S.spot.x - C.x, y: BALL - C.y, z: S.spot.z - C.z }, czb = vb.x * f.x + vb.y * f.y + vb.z * f.z;
    const postTop = x => { const v = { x: x - C.x, y: 16 - C.y, z: -C.z }, cz = v.x * f.x + v.y * f.y + v.z * f.z; return cz > 0.2 ? (v.x * u.x + v.y * u.y + v.z * u.z) / cz : 0; };
    const rise = Math.max(postTop(-POST), postTop(POST)), top = Math.max(84, H * 0.11), pad = Math.max(40, H * 0.08);
    F = Math.min(W, H * 1.6) * 0.95;
    for (let i = 0; i < 30; i++) {
      HZ = H * 0.56;
      const drop = czb > 0.2 ? -(vb.x * u.x + vb.y * u.y + vb.z * u.z) * F / czb : 0, s = clamp(BALL * 2.6 * F / Math.max(czb, 0.2), 4, 70);
      const maxY = H - s - pad;
      if (HZ + drop > maxY) HZ = maxY - drop;
      if (HZ - rise * F >= top) break;
      HZ = Math.max(HZ, top + rise * F);                    // posts first; if the ball no longer fits, zoom out
      if (HZ + drop <= maxY) break;
      F *= 0.93;
    }
  }
  function norm(v) { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; }
  function cross(a, b) { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }; }
  function P(x, y, z) {
    const v = { x: x - C.x, y: y - C.y, z: z - C.z }, cz = v.x * f.x + v.y * f.y + v.z * f.z;
    if (cz < 0.2) return null;
    const cx = v.x * r.x + v.y * r.y + v.z * r.z, cy = v.x * u.x + v.y * u.y + v.z * u.z;
    return [W / 2 + cx * F / cz, HZ - cy * F / cz, cz];
  }
  function poly(pts, fill) { const s = pts.map(p => P(...p)); if (s.some(q => !q)) return; ctx.beginPath(); s.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
  function line(a, b, w, col) { const p = P(...a), q = P(...b); if (!p || !q) return; ctx.strokeStyle = col; ctx.lineWidth = clamp(w * F / ((p[2] + q[2]) / 2), 1, 14); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }

  // crowd dots on the stand behind the goals
  const crowd = Array.from({ length: 900 }, () => ({ x: rand(-70, 70), y: rand(2.5, 16), c: ['#FFF0D7', '#CD2A2D', '#0E5A2C', '#1C3B83', '#E2600F', '#cbb894', '#3a463c'][Math.floor(Math.random() * 7)] }));

  // ---------- boundary fence ticker: Yappers Cup · Movember · Kicking goals for men's health · Mudguts vs Pissants ----------
  const FZ = 20, FH = 2.6, PPM = 46;                        // fence sits at the boundary behind the goals; 100px of texture per metre
  const img = src => { const i = new Image(); i.src = ASSET(src); i.onload = buildTicker; return i; };
  const TI = { mo: img('assets/movember-white.png'), mud: img(TEAMS.mudguts.shield), pis: img(TEAMS.pissants.shield) };
  const TICK = document.createElement('canvas'); let TW = 1;
  function buildTicker() {
    const h = 120, pad = 70, c0 = document.createElement('canvas').getContext('2d');
    const ok = i => i.complete && i.naturalWidth;
    const iw = (i, ht) => ok(i) ? ht * i.naturalWidth / i.naturalHeight : 0;
    c0.font = '78px Anton, Impact, sans-serif'; const w1 = c0.measureText('YAPPERS CUP').width;
    c0.font = '58px Anton, Impact, sans-serif'; const w3 = c0.measureText("KICKING GOALS FOR MEN'S HEALTH").width, wvs = c0.measureText('VS').width;
    const segs = [
      { w: w1 + pad * 2, bg: '#CD2A2D', draw: (c, x) => { c.font = '78px Anton, Impact, sans-serif'; c.fillStyle = '#FFF0D7'; c.fillText('YAPPERS CUP', x + pad, h / 2 + 4); } },
      { w: (iw(TI.mo, 84) || 300) + pad * 2, bg: '#000000', draw: (c, x) => { if (ok(TI.mo)) c.drawImage(TI.mo, x + pad, 18, iw(TI.mo, 84), 84); else { c.font = '58px Anton'; c.fillStyle = '#fff'; c.fillText('MOVEMBER', x + pad, h / 2 + 4); } } },
      { w: w3 + pad * 2, bg: '#101611', draw: (c, x) => { c.font = '58px Anton, Impact, sans-serif'; c.fillStyle = '#FFF0D7'; c.fillText("KICKING GOALS FOR MEN'S HEALTH", x + pad, h / 2 + 4); } },
      { w: iw(TI.mud, 104) + iw(TI.pis, 104) + wvs + 60 + pad * 2, bg: '#FFF0D7', draw: (c, x) => {
        let xx = x + pad; if (ok(TI.mud)) { c.drawImage(TI.mud, xx, 8, iw(TI.mud, 104), 104); xx += iw(TI.mud, 104) + 30; }
        c.font = '58px Anton, Impact, sans-serif'; c.fillStyle = '#101611'; c.fillText('VS', xx, h / 2 + 4); xx += wvs + 30;
        if (ok(TI.pis)) c.drawImage(TI.pis, xx, 8, iw(TI.pis, 104), 104); } },
    ];
    TW = Math.ceil(segs.reduce((a, s) => a + s.w, 0));
    TICK.width = TW * 2; TICK.height = h;                    // drawn twice so any slice can be read without wrapping
    const c = TICK.getContext('2d'); c.textBaseline = 'middle';
    for (const off of [0, TW]) { let x = off; for (const s of segs) { c.fillStyle = s.bg; c.fillRect(x, 0, s.w + 1, h); s.draw(c, x); x += s.w; } }
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, TW * 2, 4); c.fillRect(0, h - 4, TW * 2, 4);
  }
  buildTicker(); if (document.fonts) document.fonts.ready.then(buildTicker);
  let tickOff = 0, tickRaf = 0, tickLast = 0;
  function tickLoop(now) {
    tickOff = (tickOff + Math.min(0.05, (now - (tickLast || now)) / 1000) * 3.5 * PPM) % TW; tickLast = now;
    if (!S.busy) draw();                                     // while the ball's in the air, fly() is already drawing every frame
    tickRaf = requestAnimationFrame(tickLoop);
  }
  tickRaf = requestAnimationFrame(tickLoop);
  function drawFence() {
    if (TW < 2) return;
    const STEP = 2;
    for (let x = -90; x < 90; x += STEP) {
      const a = P(x, FH, FZ), b = P(x, 0, FZ), a2 = P(x + STEP, FH, FZ), b2 = P(x + STEP, 0, FZ);
      if (!a || !b || !a2 || !b2) continue;
      const x0 = Math.min(a[0], b[0], a2[0], b2[0]), x1 = Math.max(a[0], b[0], a2[0], b2[0]); if (x1 < 0 || x0 > W) continue;
      const u = (((90 - x - STEP) * PPM + tickOff) % TW + TW) % TW;   // the camera faces the goals, so world +x runs right-to-left on screen
      ctx.drawImage(TICK, u, 0, STEP * PPM, TICK.height, x0, (a[1] + a2[1]) / 2, x1 - x0 + 0.6, (b[1] + b2[1]) / 2 - (a[1] + a2[1]) / 2);
    }
  }

  function draw() {
    if (!W) return;
    camera();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#05080a'); sky.addColorStop(0.55, '#121a14'); sky.addColorStop(1, '#0b0f0c');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // stand + crowd behind the goals
    poly([[-90, 0, 22], [90, 0, 22], [90, 18, 40], [-90, 18, 40]], '#141b16');
    for (const d of crowd) { const p = P(d.x, d.y, 22 + (d.y / 18) * 18); if (!p) continue; const s = clamp(0.5 * F / p[2], 1, 4); ctx.fillStyle = d.c; ctx.fillRect(p[0], p[1], s, s); }
    // light towers
    for (const lx of [-55, 55]) { const p = P(lx, 30, 45); if (!p) continue; const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 120); g.addColorStop(0, 'rgba(225,236,255,.5)'); g.addColorStop(1, 'rgba(200,218,255,0)'); ctx.fillStyle = g; ctx.fillRect(p[0] - 120, p[1] - 120, 240, 240);
      const sc = clamp(F / p[2] * 0.6, 0.6, 2.2), cw = 6 * sc, hw = cw * 3 + 3 * sc, hh = cw * 2 + 3 * sc;
      ctx.fillStyle = '#151a17'; ctx.fillRect(p[0] - hw / 2, p[1] - hh / 2, hw, hh);
      ctx.fillStyle = '#262d29'; ctx.fillRect(p[0] - sc, p[1] + hh / 2, 2 * sc, H);
      for (let rr = 0; rr < 2; rr++) for (let cc = 0; cc < 3; cc++) { const lx2 = p[0] - hw / 2 + 1.5 * sc + cw * (cc + 0.5), ly = p[1] - hh / 2 + 1.5 * sc + cw * (rr + 0.5);
        ctx.fillStyle = '#eef4ff'; ctx.beginPath(); ctx.arc(lx2, ly, cw * 0.4, 0, Math.PI * 2); ctx.fill(); } }
    // grass with mowing stripes
    { const hz = P(S.spot.x, 0, 600) || P(0, 0, 600); const hy = hz ? hz[1] : H * 0.5; ctx.fillStyle = '#2e6b33'; ctx.fillRect(0, hy, W, H - hy); }
    for (let z = -70, k = 0; z < 22; z += 5, k++) for (let x = -90; x < 90; x += 15) poly([[x, 0, z], [x + 15, 0, z], [x + 15, 0, z + 5], [x, 0, z + 5]], k % 2 ? '#2a6430' : '#327236');
    const wash = ctx.createRadialGradient(W / 2, H * 0.6, 0, W / 2, H * 0.6, W * 0.7); wash.addColorStop(0, 'rgba(255,250,225,.08)'); wash.addColorStop(1, 'rgba(0,0,0,.25)'); ctx.fillStyle = wash; ctx.fillRect(0, H * 0.4, W, H);
    drawFence();
    // markings: goal line, goal square, 50m arc hint
    line([-40, 0.01, 0], [40, 0.01, 0], 0.12, 'rgba(255,255,255,.85)');
    line([-POST, 0.01, 0], [-POST, 0.01, -9], 0.1, 'rgba(255,255,255,.85)'); line([POST, 0.01, 0], [POST, 0.01, -9], 0.1, 'rgba(255,255,255,.85)'); line([-POST, 0.01, -9], [POST, 0.01, -9], 0.1, 'rgba(255,255,255,.85)');
    if (S.team && S.ball.p.z > 0) drawBallNow();         // past the goal line: posts draw over the ball
    // posts (behind posts first, they're further out)
    for (const [x, h, pad] of [[-BEHIND, 9, true], [BEHIND, 9, true], [-POST, 16, true], [POST, 16, true]]) {
      line([x, 0, 0], [x, h, 0], 0.22, '#f4ead6'); if (pad) line([x, 0, 0], [x, 1.8, 0], 0.32, '#CD2A2D');
    }
    if (!S.team) return;
    // aim arc
    if (S.aim && S.aim.v) {
      const pts = simulate(S.aim.v, false, 3.2);
      ctx.fillStyle = 'rgba(255,240,215,.85)';
      pts.forEach((p, i) => { if (i % 3) return; const s = P(p.x, p.y, p.z); if (!s) return; const rr = clamp(0.09 * F / s[2], 1.2, 4); ctx.beginPath(); ctx.arc(s[0], s[1], rr, 0, Math.PI * 2); ctx.fill(); });
      const pw = S.aim.power, bx = W / 2 - 60, by = H - 96;
      ctx.fillStyle = 'rgba(16,22,17,.7)'; ctx.fillRect(bx, by, 120, 8); ctx.fillStyle = pw > 0.85 ? '#CD2A2D' : '#FFF0D7'; ctx.fillRect(bx, by, 120 * pw, 8);
    }
    if (S.ball.p.z <= 0) drawBallNow();                  // in front of the goal line: ball draws over the posts
  }
  function drawBallNow() {
    // ball + shadow
    const b = S.ball.p, sh = P(b.x, 0, b.z);
    if (sh) { const rr = clamp(BALL * clamp(2.4 - (b.z - S.spot.z) / Math.max(8, -S.spot.z) * 1.4, 1, 2.4) * F / sh[2], 2, 60); ctx.fillStyle = `rgba(0,0,0,${0.35 * clamp(1 - b.y / 20, 0.1, 1)})`; ctx.beginPath(); ctx.ellipse(sh[0], sh[1], rr, rr * 0.3, 0, 0, Math.PI * 2); ctx.fill(); }
    const bp = P(b.x, b.y, b.z);
    // the ball is drawn larger than life at your feet so it's easy to see, shrinking to true size by the goals so what you see matches the score
    const grow = clamp(2.6 - (b.z - S.spot.z) / Math.max(8, -S.spot.z) * 1.6, 1, 2.6);
    if (bp) drawBall(bp[0], bp[1], clamp(BALL * grow * F / bp[2], 4, 70), S.ball.spin);
  }
  function drawBall(x, y, s, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    const g = ctx.createRadialGradient(-s * 0.25, -s * 0.3, s * 0.1, 0, 0, s); g.addColorStop(0, '#ff6a4a'); g.addColorStop(0.55, '#d8301f'); g.addColorStop(1, '#7a1409');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.62, s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(30,5,3,.55)'; ctx.lineWidth = Math.max(1, s * 0.05); ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.08, 0, 0, s); ctx.stroke();
    ctx.fillStyle = '#f6f1e6'; for (let i = -2; i <= 2; i++) ctx.fillRect(-s * 0.16, i * s * 0.13 - s * 0.03, s * 0.32, Math.max(1, s * 0.05));
    ctx.restore();
  }

  // ---------- flight ----------
  function simulate(v, wind, maxT) {
    const pts = [], p = { x: S.spot.x, y: BALL, z: S.spot.z }, vv = { ...v }, dt = 1 / 60;
    for (let t = 0; t < maxT; t += dt) {
      if (wind) { vv.x += S.wind.x * dt; vv.z += S.wind.z * dt; }
      vv.y -= G * dt; p.x += vv.x * dt; p.y += vv.y * dt; p.z += vv.z * dt;
      pts.push({ ...p }); if (p.y < 0 || p.z > 2) break;
    }
    return pts;
  }
  function velocity(dx, dy) {
    const L = Math.hypot(dx, dy), power = clamp(L / (Math.min(W, H) * 0.42), 0, 1);
    const base = Math.atan2(S.spot.x * 0.4 - S.spot.x, 0 - S.spot.z);   // straight up the screen; on an angle you have to aim
    const yaw = base + clamp(dx / (W * 0.45), -1, 1) * 0.55;
    const sp = 12 + power * 22, h = Math.cos(EL) * sp;
    return { v: { x: Math.sin(yaw) * h, y: Math.sin(EL) * sp, z: Math.cos(yaw) * h }, power };
  }
  let raf = 0, last = 0;
  function fly(now) {
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    const b = S.ball, p = b.p, v = b.v;
    const px = p.x, pz = p.z, py = p.y;
    v.x += S.wind.x * dt; v.z += S.wind.z * dt; v.y -= G * dt;
    p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt; b.spin -= 9 * dt;
    if (!b.done && pz < 0 && p.z >= 0) {                     // crossed the goal line
      const t = -pz / (p.z - pz), x = px + (p.x - px) * t, y = py + (p.y - py) * t;
      if (y > 0) result(x); else result(null);
    }
    if (!b.done && p.y <= 0) { result(null); }
    if (p.y < 0) { p.y = 0; v.y = -v.y * 0.35; v.x *= 0.6; v.z *= 0.6; }
    draw();
    if (now - b.t0 < 3200 && (Math.abs(v.z) > 0.5 || p.y > 0.05)) raf = requestAnimationFrame(fly);
    else { if (!b.done) result(null); setTimeout(() => { if (S.over) { S.busy = false; fullTime(); } else setup(); }, 650); }
  }
  function result(x) {
    const b = S.ball; b.done = true; S.shots++;
    if (x === null) flash(b.p.z < 0 ? 'Short' : 'Out on the full', 'miss');
    else {
      const ax = Math.abs(x);
      if (Math.abs(ax - POST) < 0.14) { S.behinds++; flash('Hit the post · 1 pt', 'behind'); }
      else if (ax < POST) { S.goals++; flash('Goal! · 6 pts', 'goal'); }
      else if (ax < BEHIND) { S.behinds++; flash('Behind · 1 pt', 'behind'); }
      else flash('Out on the full', 'miss');
    }
    if (S.goals === 2 && x !== null && Math.abs(x) < POST && S.goals * 6 + S.behinds > 0) setTimeout(() => flash('Nice. Try it from an angle', ''), 1350);
    if (S.goals === 3 && x !== null && Math.abs(x) < POST) setTimeout(() => flash("Wind's picking up", ''), 1350);
    hud();
  }


  // ---------- 60-second round: the clock starts on your first kick ----------
  let tick = 0;
  function startClock() { S.endAt = performance.now() + ROUND * 1000; clearInterval(tick); tick = setInterval(updClock, 200); updClock(); }
  function updClock() {
    const left = Math.max(0, Math.ceil((S.endAt - performance.now()) / 1000));
    const el = $('.kk-clock'); const sec = S.endAt ? left : ROUND; el.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; el.classList.toggle('low', S.endAt && left <= 10);
    if (S.endAt && left <= 0) { clearInterval(tick); S.over = true; if (!S.busy) fullTime(); }
  }
  function fullTime() {
    S.aim = null; draw();
    const p = pts(), b = best();
    if (p > b) saveBest(p);
    const card = $('.kk-card');
    card.innerHTML = `<p class="kk-pk">Full time</p>
      <div class="kk-final"><img src="${ASSET(TEAMS[S.team].shield)}" alt=""><b>${S.goals}.${S.behinds} (${p})</b></div>
      <p class="kk-sum">${S.goals} goal${S.goals === 1 ? '' : 's'}, ${S.behinds} behind${S.behinds === 1 ? '' : 's'} from ${S.shots} kick${S.shots === 1 ? '' : 's'} for the ${TEAMS[S.team].name}.${p > b ? ' New personal best!' : ''}</p>
      ${p > 0 ? `<form class="kk-form" novalidate>
        <label>Name on the board<input name="name" maxlength="18" autocomplete="nickname" required placeholder="e.g. Big Kev"></label>
        <label>Email<input name="email" type="email" autocomplete="email" inputmode="email" required placeholder="you@example.com"></label>
        <label class="kk-check"><input type="checkbox" name="agree"><span>I agree to the <a href="terms.html" target="_blank" rel="noopener">terms</a>, including my name and score showing on the leaderboard and the Yappers Cup emailing me about the event. My email is never shown.</span></label>
        <p class="kk-err" role="alert"></p>
        <button type="submit" class="kk-btn">Put me on the leaderboard</button>
      </form>` : ''}
      <div class="kk-row"><button type="button" class="kk-btn ghost kk-again">Play again</button><button type="button" class="kk-btn ghost kk-showlb">Leaderboard</button></div>`;
    $('.kk-over').hidden = false; $('.kk-hint').hidden = true; hud();
    if (p > 0) loadBoard().then(bd => { const top = bd && bd.top && bd.top[0] ? bd.top[0].score : 0; if (p > top) celebrate(p); }).catch(() => {});
    const f = card.querySelector('form');
    if (f) f.onsubmit = async e => {
      e.preventDefault(); const err = f.querySelector('.kk-err'), btn = f.querySelector('[type=submit]'); err.textContent = '';
      const name = f.elements.name.value.trim(), email = f.elements.email.value.trim();
      if (!name) return void (err.textContent = 'Add a name for the board.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return void (err.textContent = 'Add a valid email to go on the board.');
      if (!f.elements.agree.checked) return void (err.textContent = 'Tick the box to agree to the terms.');
      btn.disabled = true; btn.textContent = 'Saving…';
      try {
        const r = await rpc('yc_submit_kick', { p_name: name, p_team: S.team, p_goals: S.goals, p_behinds: S.behinds, p_kicks: S.shots, p_email: email, p_opt_in: true, p_terms_version: '2026-11-22' });
        if (!r.ok) { err.textContent = r.error || 'That didn\'t save. Try again.'; btn.disabled = false; btn.textContent = 'Put me on the leaderboard'; return; }
        f.outerHTML = `<p class="kk-place">You're <strong>${ordinal(r.place)}</strong> of ${r.total} on the leaderboard.</p><div class="kk-lbwrap">Loading…</div>`;
        showBoard(card.querySelector('.kk-lbwrap'), r.id);
        if (r.place === 1) celebrate(p);
      } catch (x) { err.textContent = 'That didn\'t save. Check your connection and try again.'; btn.disabled = false; btn.textContent = 'Put me on the leaderboard'; }
    };
  }
  async function showBoard(el, meId) {
    try { const b = await loadBoard(); el.innerHTML = teamsHTML(b) + boardHTML(b, meId); const me = el.querySelector('li.me'); if (me) me.scrollIntoView({ block: 'nearest' }); }
    catch (e) { el.innerHTML = '<p class="kk-empty">Couldn\'t load the leaderboard. Try again in a sec.</p>'; }
  }
  function leaderboard() {
    const card = $('.kk-card');
    card.innerHTML = `<p class="kk-pk">Goal-kicking practice</p><h3 class="kk-lbh">Leaderboard</h3><p class="kk-sum">Top 50 · most points in 60 seconds</p><div class="kk-lbwrap">Loading…</div>
      <div class="kk-row"><button type="button" class="kk-btn kk-lbplay">${S.team ? 'Play again' : 'Pick a team'}</button></div>`;
    $('.kk-over').hidden = false; showBoard(card.querySelector('.kk-lbwrap'));
  }
  function resetRound() { partied = false; root.querySelectorAll('.kk-party').forEach(e => e.remove()); clearInterval(tick); S.goals = S.behinds = S.shots = 0; S.endAt = 0; S.over = false; $('.kk-over').hidden = true; updClock(); setup(); }

  // ---------- top score celebration: confetti + the Yappers Cup trophy ----------
  let partied = false;
  function trophySVG() {
    return `<svg class="kk-trophy" viewBox="0 0 240 300" aria-hidden="true">
      <defs>
        <linearGradient id="kkg" x1="0" x2="1"><stop offset="0" stop-color="#a8781c"/><stop offset=".35" stop-color="#ffe08a"/><stop offset=".55" stop-color="#f4c542"/><stop offset="1" stop-color="#9a6a12"/></linearGradient>
        <linearGradient id="kkb" x1="0" x2="1"><stop offset="0" stop-color="#1a1f1b"/><stop offset=".5" stop-color="#2d352f"/><stop offset="1" stop-color="#121613"/></linearGradient>
      </defs>
      <path d="M58 40 C20 40 14 70 22 92 C30 116 58 124 74 122" fill="none" stroke="url(#kkg)" stroke-width="13" stroke-linecap="round"/>
      <path d="M182 40 C220 40 226 70 218 92 C210 116 182 124 166 122" fill="none" stroke="url(#kkg)" stroke-width="13" stroke-linecap="round"/>
      <path d="M50 26 H190 C190 98 172 146 120 160 C68 146 50 98 50 26 Z" fill="url(#kkg)"/>
      <ellipse cx="120" cy="26" rx="70" ry="10" fill="#ffe9a8"/><ellipse cx="120" cy="27" rx="60" ry="6" fill="#b8861f"/>
      <path d="M78 36 C80 90 92 128 112 146" stroke="rgba(255,255,255,.55)" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle cx="120" cy="86" r="31" fill="#101611" stroke="#ffe08a" stroke-width="4"/>
      <image href="${ASSET('assets/badge-cream.png')}" x="94" y="60" width="52" height="52"/>
      <rect x="108" y="158" width="24" height="34" fill="url(#kkg)"/>
      <path d="M84 192 H156 L164 212 H76 Z" fill="url(#kkg)"/>
      <rect x="52" y="212" width="136" height="70" rx="6" fill="url(#kkb)" stroke="#ffe08a" stroke-width="3"/>
      <text x="120" y="245" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="22" fill="#ffe08a" textLength="108" lengthAdjust="spacingAndGlyphs">YAPPERS CUP</text>
      <text x="120" y="267" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="12" fill="#FFF0D7" textLength="104" lengthAdjust="spacingAndGlyphs">GOAL-KICKING CHAMP</text>
    </svg>`;
  }
  function celebrate(points) {
    if (partied) return; partied = true;
    const el = document.createElement('div'); el.className = 'kk-party';
    el.innerHTML = `<canvas class="kk-confetti"></canvas>
      <div class="kk-party-in">
        <div class="kk-rays"></div>
        <div class="kk-hold kk-hold-${S.team}"><img class="kk-mascot" src="${ASSET('assets/mascot-' + S.team + '.webp')}" alt="">${trophySVG()}</div>
        <p class="kk-party-k">New top score</p>
        <h3 class="kk-party-t">${points} pts!</h3>
        <p class="kk-party-s">You're top of the Yappers Cup leaderboard. Put your name on it.</p>
        <button type="button" class="kk-btn kk-party-go">Claim the cup</button>
      </div>`;
    root.appendChild(el);
    const cv = el.querySelector('canvas'), cx = cv.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2);
    const fit = () => { cv.width = root.clientWidth * dpr; cv.height = root.clientHeight * dpr; }; fit();
    const COLS = ['#FFF0D7', '#CD2A2D', '#0E5A2C', '#1C3B83', '#E2600F', '#f4c542', '#ffe08a'];
    const bits = [], add = (n, x, y, dir) => { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + dir * (0.25 + Math.random() * 0.55), sp = 9 + Math.random() * 13;
      bits.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 7, h: 9 + Math.random() * 9, c: COLS[i % COLS.length], s: Math.random() < 0.25 }); } };
    const Wd = () => cv.width / dpr, Hd = () => cv.height / dpr;
    add(140, 0, Hd(), 1); add(140, Wd(), Hd(), -1);
    let waves = 0; const more = setInterval(() => { add(70, Math.random() * Wd(), -20, 0); add(40, 0, Hd() * 0.7, 1); add(40, Wd(), Hd() * 0.7, -1); if (++waves > 4) clearInterval(more); }, 700);
    let pr = 0, t0 = performance.now();
    const loop = now => {
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, Wd(), Hd());
      for (const b of bits) { b.vy += 0.32; b.vx *= 0.99; b.vy = Math.min(b.vy, 6 + (b.s ? 0 : 2)); b.x += b.vx + Math.sin((now + b.w * 99) / 300) * 0.6; b.y += b.vy; b.r += b.vr;
        if (b.y > Hd() + 30) continue; cx.save(); cx.translate(b.x, b.y); cx.rotate(b.r); cx.fillStyle = b.c;
        if (b.s) { cx.beginPath(); cx.arc(0, 0, b.w / 2, 0, Math.PI * 2); cx.fill(); } else cx.fillRect(-b.w / 2, -b.h / 2 * Math.abs(Math.cos(b.r * 2)), b.w, b.h * Math.abs(Math.cos(b.r * 2)) + 1); cx.restore(); }
      for (let i = bits.length - 1; i >= 0; i--) if (bits[i].y > Hd() + 30) bits.splice(i, 1);
      if (bits.length || now - t0 < 4500) pr = requestAnimationFrame(loop);
    };
    pr = requestAnimationFrame(loop);
    if (navigator.vibrate) try { navigator.vibrate([60, 40, 60, 40, 160]); } catch (e) {}
    const done = () => { cancelAnimationFrame(pr); clearInterval(more); el.classList.add('out'); setTimeout(() => el.remove(), 350); const n = root.querySelector('.kk-form input[name=name]'); if (n) n.focus(); };
    el.querySelector('.kk-party-go').onclick = done;
  }

  // ---------- input ----------
  canvas.addEventListener('pointerdown', e => {
    if (!S.team || S.busy || S.over) return;
    if (!S.endAt) startClock();
    canvas.setPointerCapture(e.pointerId);
    S.aim = { x0: e.clientX, y0: e.clientY, v: null, power: 0 };
  });
  canvas.addEventListener('pointermove', e => {
    if (!S.aim) return;
    const dx = S.aim.x0 - e.clientX, dy = e.clientY - S.aim.y0;   // pull back (down) to kick forward; pull left to aim right
    if (dy < 6) { S.aim.v = null; draw(); return; }
    const k = velocity(dx, dy); S.aim.v = k.v; S.aim.power = k.power; draw();
  });
  const release = () => {
    if (!S.aim) return;
    const a = S.aim; S.aim = null;
    if (!a.v || a.power < 0.08) { draw(); return; }
    S.busy = true; S.ball.v = { ...a.v }; S.ball.t0 = performance.now(); last = performance.now(); $('.kk-hint').hidden = true;
    raf = requestAnimationFrame(fly);
  };
  canvas.addEventListener('pointerup', release); canvas.addEventListener('lostpointercapture', release); addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => { S.aim = null; draw(); });

  root.addEventListener('click', e => {
    const t = e.target.closest('[data-team]');
    if (t) { S.team = t.dataset.team; $('.kk-pick').hidden = true; resetRound(); flash(`Kicking for the ${TEAMS[S.team].name}`, ''); return; }
    if (e.target.closest('.kk-again')) { resetRound(); return; }
    if (e.target.closest('.kk-showlb, .kk-lbbtn')) { leaderboard(); return; }
    if (e.target.closest('.kk-lbplay')) { if (S.team) resetRound(); else { $('.kk-over').hidden = true; } return; }
    if (e.target.closest('.kk-reset')) { cancelAnimationFrame(raf); clearInterval(tick); S.endAt = 0; S.over = false; $('.kk-over').hidden = true; S.team = null; $('.kk-pick').hidden = false; $('.kk-hud').hidden = $('.kk-hint').hidden = $('.kk-meta').hidden = true; draw(); }
  });
  const ro = new ResizeObserver(resize); ro.observe(root); resize();
  setup();
  return { stop() { cancelAnimationFrame(raf); cancelAnimationFrame(tickRaf); clearInterval(tick); ro.disconnect(); removeEventListener('pointerup', release); } };
}

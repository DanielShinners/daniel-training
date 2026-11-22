/* Yappers Cup — goal-kicking practice.
   Pick Mudguts or Pissants, then drag back from the ball to aim (the dotted arc shows the flight) and let go to kick.
   6 points for a goal, 1 for a behind. Two goals from straight in front, then the angles get harder; after 3 goals the wind picks up. */

const ASSET = p => ((window.YC_CONFIG && window.YC_CONFIG.assetBase) || '') + p;
const TEAMS = {
  mudguts: { name: 'Mudguts', shield: 'assets/shield-mudguts.png', col: '#8A2412' },
  pissants: { name: 'Pissants', shield: 'assets/shield-pissants.png', col: '#1C3B83' },
};
const G = 9.8, EL = 0.62, POST = 3.2, BEHIND = 9.6, BALL = 0.32;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

export function startKick(root) {
  root.innerHTML = `
    <canvas class="kk-stage"></canvas>
    <div class="kk-hud" hidden>
      <div class="kk-score"><img alt=""><div><b class="kk-team"></b><span class="kk-tally">0.0 (0)</span></div></div>
      <div class="kk-side"><div class="kk-level"></div><div class="kk-wind" hidden><i>➜</i><span></span></div></div>
    </div>
    <div class="kk-msg" aria-live="polite"></div>
    <div class="kk-hint" hidden>Drag back from the ball to aim · let go to kick</div>
    <div class="kk-meta" hidden><span class="kk-shots"></span><span class="kk-best"></span><button type="button" class="kk-reset">Change team</button></div>
    <div class="kk-pick">
      <p class="kk-pk">Goal-kicking practice</p>
      <h3>Pick your team</h3>
      <div class="kk-teams">${Object.entries(TEAMS).map(([id, t]) => `<button type="button" data-team="${id}" aria-label="Kick for the ${t.name}"><img src="${ASSET(t.shield)}" alt=""><span>${t.name}</span></button>`).join('')}</div>
    </div>`;
  const $ = s => root.querySelector(s), canvas = $('.kk-stage'), ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  function resize() {
    W = root.clientWidth; H = root.clientHeight; DPR = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px'; draw();
  }

  // ---------- game state ----------
  const S = { team: null, goals: 0, behinds: 0, shots: 0, spot: { x: 0, z: -30 }, wind: { x: 0, z: 0 }, level: '', ball: null, aim: null, busy: false, t: 0 };
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
    $('.kk-best').textContent = `Best ${best()} pts`;
  }
  let msgT = 0;
  function flash(text, kind) {
    const m = $('.kk-msg'); m.textContent = text; m.className = 'kk-msg show ' + (kind || ''); clearTimeout(msgT);
    msgT = setTimeout(() => { m.className = 'kk-msg'; }, 1300);
  }

  // ---------- camera ----------
  let C, f, r, u, F;
  function camera() {
    const sp = S.spot, gx = 0, gz = 0, dx = sp.x - gx, dz = sp.z - gz, l = Math.hypot(dx, dz);
    C = { x: sp.x + dx / l * 6.5, y: 2.1, z: sp.z + dz / l * 6.5 };
    const T = { x: gx * 0.6 + sp.x * 0.4, y: 2.4, z: gz };
    f = norm({ x: T.x - C.x, y: T.y - C.y, z: T.z - C.z });
    r = norm(cross(f, { x: 0, y: 1, z: 0 })); u = cross(r, f);
    F = Math.min(W, H * 1.6) * 0.95;
  }
  function norm(v) { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; }
  function cross(a, b) { return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }; }
  function P(x, y, z) {
    const v = { x: x - C.x, y: y - C.y, z: z - C.z }, cz = v.x * f.x + v.y * f.y + v.z * f.z;
    if (cz < 0.2) return null;
    const cx = v.x * r.x + v.y * r.y + v.z * r.z, cy = v.x * u.x + v.y * u.y + v.z * u.z;
    return [W / 2 + cx * F / cz, H * 0.56 - cy * F / cz, cz];
  }
  function poly(pts, fill) { const s = pts.map(p => P(...p)); if (s.some(q => !q)) return; ctx.beginPath(); s.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
  function line(a, b, w, col) { const p = P(...a), q = P(...b); if (!p || !q) return; ctx.strokeStyle = col; ctx.lineWidth = clamp(w * F / ((p[2] + q[2]) / 2), 1, 14); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }

  // crowd dots on the stand behind the goals
  const crowd = Array.from({ length: 900 }, () => ({ x: rand(-70, 70), y: rand(2.5, 16), c: ['#FFF0D7', '#CD2A2D', '#0E5A2C', '#1C3B83', '#E2600F', '#cbb894', '#3a463c'][Math.floor(Math.random() * 7)] }));

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
    for (const lx of [-55, 55]) { const p = P(lx, 30, 45); if (!p) continue; const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 120); g.addColorStop(0, 'rgba(255,248,230,.6)'); g.addColorStop(1, 'rgba(255,248,230,0)'); ctx.fillStyle = g; ctx.fillRect(p[0] - 120, p[1] - 120, 240, 240); ctx.fillStyle = '#fff6e2'; ctx.fillRect(p[0] - 10, p[1] - 6, 20, 12); }
    // grass with mowing stripes
    { const hz = P(S.spot.x, 0, 600) || P(0, 0, 600); const hy = hz ? hz[1] : H * 0.5; ctx.fillStyle = '#2e6b33'; ctx.fillRect(0, hy, W, H - hy); }
    for (let z = -70, k = 0; z < 22; z += 5, k++) for (let x = -90; x < 90; x += 15) poly([[x, 0, z], [x + 15, 0, z], [x + 15, 0, z + 5], [x, 0, z + 5]], k % 2 ? '#2a6430' : '#327236');
    const wash = ctx.createRadialGradient(W / 2, H * 0.6, 0, W / 2, H * 0.6, W * 0.7); wash.addColorStop(0, 'rgba(255,250,225,.08)'); wash.addColorStop(1, 'rgba(0,0,0,.25)'); ctx.fillStyle = wash; ctx.fillRect(0, H * 0.4, W, H);
    // markings: goal line, goal square, 50m arc hint
    line([-40, 0.01, 0], [40, 0.01, 0], 0.12, 'rgba(255,255,255,.85)');
    line([-POST, 0.01, 0], [-POST, 0.01, -9], 0.1, 'rgba(255,255,255,.85)'); line([POST, 0.01, 0], [POST, 0.01, -9], 0.1, 'rgba(255,255,255,.85)'); line([-POST, 0.01, -9], [POST, 0.01, -9], 0.1, 'rgba(255,255,255,.85)');
    // posts (behind posts first, they're further out)
    for (const [x, h, pad] of [[-BEHIND, 7, false], [BEHIND, 7, false], [-POST, 12, true], [POST, 12, true]]) {
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
    // ball + shadow
    const b = S.ball.p, sh = P(b.x, 0, b.z);
    if (sh) { const rr = clamp(BALL * 2.4 * F / sh[2], 2, 60); ctx.fillStyle = `rgba(0,0,0,${0.35 * clamp(1 - b.y / 20, 0.1, 1)})`; ctx.beginPath(); ctx.ellipse(sh[0], sh[1], rr, rr * 0.3, 0, 0, Math.PI * 2); ctx.fill(); }
    const bp = P(b.x, b.y, b.z);
    if (bp) drawBall(bp[0], bp[1], clamp(BALL * 2.6 * F / bp[2], 3, 70), S.ball.spin);
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
    else { if (!b.done) result(null); setTimeout(setup, 650); }
  }
  function result(x) {
    const b = S.ball; b.done = true; S.shots++;
    if (x === null) flash(b.p.z < 0 ? 'Short' : 'Out on the full', 'miss');
    else {
      const ax = Math.abs(x);
      if (Math.abs(ax - POST) < 0.28) { S.behinds++; flash('Hit the post · 1 pt', 'behind'); }
      else if (ax < POST) { S.goals++; flash('Goal! · 6 pts', 'goal'); }
      else if (ax < BEHIND) { S.behinds++; flash('Behind · 1 pt', 'behind'); }
      else flash('Out on the full', 'miss');
    }
    if (pts() > best()) saveBest(pts());
    if (S.goals === 2 && x !== null && Math.abs(x) < POST && S.goals * 6 + S.behinds > 0) setTimeout(() => flash('Nice. Try it from an angle', ''), 1350);
    if (S.goals === 3 && x !== null && Math.abs(x) < POST) setTimeout(() => flash("Wind's picking up", ''), 1350);
    hud();
  }

  // ---------- input ----------
  canvas.addEventListener('pointerdown', e => {
    if (!S.team || S.busy) return;
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
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', () => { S.aim = null; draw(); });

  root.addEventListener('click', e => {
    const t = e.target.closest('[data-team]');
    if (t) { S.team = t.dataset.team; S.goals = S.behinds = S.shots = 0; $('.kk-pick').hidden = true; setup(); flash(`Kicking for the ${TEAMS[S.team].name}`, ''); return; }
    if (e.target.closest('.kk-reset')) { cancelAnimationFrame(raf); S.team = null; $('.kk-pick').hidden = false; $('.kk-hud').hidden = $('.kk-hint').hidden = $('.kk-meta').hidden = true; draw(); }
  });
  new ResizeObserver(resize).observe(root); resize();
  setup();
}

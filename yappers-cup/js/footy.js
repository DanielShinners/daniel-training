/* Yappers Cup — a 3D footy that bounces and rolls along the bottom of the screen as you scroll.
   Small hand-rolled WebGL: a pointed spheroid with a painted leather texture (Yappers Cup branding),
   moved by a little physics sim that scroll speed kicks along. Decorative only: no pointer events. */

export function startFooty() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const S = innerWidth < 600 ? 120 : 160;                 // canvas size (CSS px)
  const R = S * 0.36;                                     // rough radius for floor / wall contact
  const wrap = document.createElement('div');
  wrap.className = 'footy';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `<div class="footy-shadow"></div><canvas class="footy-ball"></canvas>`;
  document.body.appendChild(wrap);
  const style = document.createElement('style');
  style.textContent = `.footy{position:fixed;inset:0;pointer-events:none;z-index:25;overflow:hidden}
    .footy-ball{position:absolute;left:0;top:0;width:${S}px;height:${S}px;will-change:transform;pointer-events:auto;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .footy-shadow{position:absolute;left:0;top:0;width:${S * 0.7}px;height:${S * 0.12}px;border-radius:50%;
      background:radial-gradient(closest-side,rgba(0,0,0,.55),rgba(0,0,0,0));will-change:transform,opacity}
    html.yg-open .footy{display:none}`;
  document.head.appendChild(style);

  const canvas = wrap.querySelector('canvas'), shadow = wrap.querySelector('.footy-shadow');
  const DPR = Math.min(devicePixelRatio || 1, 2);
  canvas.width = canvas.height = Math.round(S * DPR);
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) { wrap.remove(); return; }

  // ---------- texture: u runs around the ball (4 panels), v runs tip to tip ----------
  const TW = 1024, TH = 512, tex = document.createElement('canvas'); tex.width = TW; tex.height = TH;
  const MO = new Image(); MO.crossOrigin = 'anonymous'; MO.src = ((window.YC_CONFIG && window.YC_CONFIG.assetBase) || '') + 'assets/movember-white.png';
  function paint() {
    const c = tex.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, TH); g.addColorStop(0, '#c92a1c'); g.addColorStop(0.5, '#e23a24'); g.addColorStop(1, '#c92a1c');
    c.fillStyle = g; c.fillRect(0, 0, TW, TH);
    // leather grain
    let s = 11; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 9000; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.05)'; c.fillRect(rnd() * TW, rnd() * TH, 1.5, 1.5); }
    // seams + stitching
    for (let k = 0; k < 4; k++) {
      const x = k * TW / 4;
      c.fillStyle = 'rgba(60,0,0,.55)'; c.fillRect(x - 2, 0, 4, TH); if (k === 0) c.fillRect(TW - 2, 0, 2, TH);
      c.fillStyle = '#1a0a08';
      for (let y = 6; y < TH; y += 11) { c.fillRect(x - 7, y, 3, 5); c.fillRect(x + 4, y + 5, 3, 5); if (k === 0) { c.fillRect(TW - 7, y, 3, 5); c.fillRect(4, y + 5, 3, 5); } }
    }
    // lace patch over the seam at u = 0.25
    const lx = TW / 4, ly0 = TH * 0.34, ly1 = TH * 0.66;
    c.setLineDash([5, 5]); c.strokeStyle = 'rgba(20,0,0,.6)'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(lx, TH / 2, 46, (ly1 - ly0) / 2 + 14, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    for (let i = 0; i < 7; i++) {
      const y = ly0 + i * (ly1 - ly0) / 6;
      c.fillStyle = '#f6f1e6'; c.beginPath(); c.roundRect(lx - 30, y - 5, 60, 10, 5); c.fill();
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(lx - 28, y + 3, 56, 2);
    }
    const along = (cx, cy, draw) => { c.save(); c.translate(cx, cy); c.rotate(-Math.PI / 2); draw(); c.restore(); };
    c.fillStyle = '#140808'; c.textAlign = 'center'; c.textBaseline = 'middle';
    // big wordmark on the two panels either side of the laces
    for (const cx of [TW * 0.125, TW * 0.375]) along(cx, TH / 2, () => {
      c.font = '52px Anton, Impact, sans-serif'; c.fillText('YAPPERS CUP', 0, -14);
      c.font = '13px Archivo, Arial, sans-serif'; c.fillText('KICKING GOALS FOR MEN\'S HEALTH', 0, 32);
    });
    // match-ball oval on the far panels
    for (const cx of [TW * 0.625, TW * 0.875]) {
      c.strokeStyle = '#140808'; c.lineWidth = 4; c.beginPath(); c.ellipse(cx, TH / 2, 90, 165, 0, 0, Math.PI * 2); c.stroke();
      along(cx, TH / 2, () => {
        c.font = '12px Archivo, Arial, sans-serif';
        c.fillText('OFFICIAL MATCH BALL', 0, -52); c.fillText('SUNDAY 29 NOVEMBER 2026', 0, -34);
        c.font = '28px Anton, Impact, sans-serif'; c.fillText('MUDGUTS v PISSANTS', 0, 4);
        c.font = '12px Archivo, Arial, sans-serif'; c.fillText('PROUDLY SUPPORTING', 0, 34);
        if (MO.complete && MO.naturalWidth) { const h = 26, w = h * MO.naturalWidth / MO.naturalHeight; c.globalCompositeOperation = 'source-over'; c.filter = 'brightness(0) opacity(.92)'; c.drawImage(MO, -w / 2, 44, w, h); c.filter = 'none'; }
      });
    }
  }

  // ---------- mesh: pointed spheroid, long axis = y ----------
  const LAT = 48, LON = 64, pos = [], nrm = [], uv = [], idx = [];
  const A = 0.6, B = 1.0;
  const P = (th, ph) => { const r = A * Math.pow(Math.sin(th), 0.82); return [r * Math.cos(ph), B * Math.cos(th), r * Math.sin(ph)]; };
  for (let i = 0; i <= LAT; i++) for (let j = 0; j <= LON; j++) {
    const th = Math.max(1e-3, Math.min(Math.PI - 1e-3, i / LAT * Math.PI)), ph = j / LON * Math.PI * 2;
    const p = P(th, ph), e = 1e-3, a = P(th + e, ph), b = P(th, ph + e);
    const t1 = [a[0] - p[0], a[1] - p[1], a[2] - p[2]], t2 = [b[0] - p[0], b[1] - p[1], b[2] - p[2]];
    let n = [t1[1] * t2[2] - t1[2] * t2[1], t1[2] * t2[0] - t1[0] * t2[2], t1[0] * t2[1] - t1[1] * t2[0]];
    const l = Math.hypot(...n) || 1; n = n.map(v => -v / l);
    if (n[0] * p[0] + n[1] * p[1] + n[2] * p[2] < 0) n = n.map(v => -v);
    pos.push(...p); nrm.push(...n); uv.push(j / LON, 1 - i / LAT);
  }
  for (let i = 0; i < LAT; i++) for (let j = 0; j < LON; j++) {
    const a = i * (LON + 1) + j, b = a + LON + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }

  const vs = `attribute vec3 p; attribute vec3 n; attribute vec2 t; uniform mat4 M; uniform mat4 PV;
    varying vec3 vN; varying vec2 vT; varying vec3 vP;
    void main(){ vec4 w = M * vec4(p,1.0); vP = w.xyz; vN = mat3(M) * n; vT = t; gl_Position = PV * w; }`;
  const fs = `precision mediump float; varying vec3 vN; varying vec2 vT; varying vec3 vP; uniform sampler2D tex;
    void main(){
      vec3 n = normalize(vN); vec3 l = normalize(vec3(-0.5, 0.8, 0.9)); vec3 v = normalize(vec3(0.0,0.0,4.0) - vP);
      vec3 h = normalize(l + v);
      vec3 base = texture2D(tex, vT).rgb;
      float diff = max(dot(n,l), 0.0);
      float spec = pow(max(dot(n,h), 0.0), 36.0) * 0.35;
      float rim = pow(1.0 - max(dot(n,v), 0.0), 2.5);
      vec3 col = base * (0.28 + 0.85 * diff) + vec3(1.0,0.95,0.9) * spec - rim * 0.18;
      gl_FragColor = vec4(col, 1.0);
    }`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { wrap.remove(); return; }
  gl.useProgram(prog);
  const buf = (data, loc, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); const a = gl.getAttribLocation(prog, loc); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, size, gl.FLOAT, false, 0, 0); };
  buf(pos, 'p', 3); buf(nrm, 'n', 3); buf(uv, 't', 2);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  const T = gl.createTexture();
  const upload = () => { paint(); gl.bindTexture(gl.TEXTURE_2D, T); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); };
  upload();
  Promise.all([document.fonts.load('80px Anton'), document.fonts.load('20px Archivo')]).then(upload, () => {});
  MO.onload = () => { upload(); if (!running) draw(); };
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.frontFace(gl.CW);
  gl.viewport(0, 0, canvas.width, canvas.height);

  // ---------- matrices ----------
  const mul = (a, b) => { const o = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; };
  const rx = a => [1, 0, 0, 0, 0, Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1];
  const ry = a => [Math.cos(a), 0, -Math.sin(a), 0, 0, 1, 0, 0, Math.sin(a), 0, Math.cos(a), 0, 0, 0, 0, 1];
  const rz = a => [Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const f = 1 / Math.tan(15 * Math.PI / 180), near = 1, far = 10;
  const proj = [f, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0];
  const view = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -4.2, 1];
  const PV = mul(proj, view);
  const uM = gl.getUniformLocation(prog, 'M'), uPV = gl.getUniformLocation(prog, 'PV');
  gl.uniformMatrix4fv(uPV, false, PV);

  // ---------- physics ----------
  let W = innerWidth, H = innerHeight;
  const floor = () => H - R - 14;
  const st = { x: Math.min(90, W * 0.2), y: floor(), vx: 0, vy: 0, tumble: Math.PI / 2, wT: 0, spin: 0, wS: 0, tilt: 0.55 };
  let lastY = scrollY, last = performance.now(), running = false, gone = null, back = null;
  // tap the ball and it's punted away into the distance
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault(); if (gone || back) return;
    gone = { t0: performance.now(), x0: st.x, y0: st.y, x1: W * (0.35 + Math.random() * 0.3), y1: H * 0.22 };
    st.wT = (Math.random() < 0.5 ? -1 : 1) * 22; st.wS = 14; kick();
  });
  addEventListener('resize', () => { W = innerWidth; H = innerHeight; st.y = Math.min(st.y, floor()); kick(); });
  addEventListener('scroll', () => {
    const dy = scrollY - lastY; lastY = scrollY; if (gone || back) return;
    st.vx = Math.max(-1300, Math.min(1300, st.vx + dy * 7));
    if (st.y >= floor() - 3 && Math.abs(dy) > 3) { st.vy = -Math.min(1050, 320 + Math.abs(dy) * 16); st.wT += (Math.random() - 0.5) * 14; }
    st.wS += dy * 0.06;
    kick();
  }, { passive: true });
  function kick() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(step); } }

  function step(now) {
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    if (gone) return flyAway(now, dt);
    if (back) return flyBack(now, dt);
    const fl = floor(), onFloor = st.y >= fl - 0.5;
    st.vy += 2600 * dt; st.x += st.vx * dt; st.y += st.vy * dt;
    if (st.y > fl) {
      st.y = fl;
      if (st.vy > 160) { st.vy = -st.vy * 0.52; st.vx += (Math.random() - 0.5) * st.vy * 0.5; st.wT += (Math.random() - 0.5) * 12; }   // odd footy bounce
      else st.vy = 0;
    }
    if (st.x < R) { st.x = R; st.vx = Math.abs(st.vx) * 0.6; }
    if (st.x > W - R) { st.x = W - R; st.vx = -Math.abs(st.vx) * 0.6; }
    st.vx *= Math.pow(onFloor ? 0.12 : 0.7, dt);                   // ground friction / air drag
    // rotation: tumble end over end in the air, settle on its side on the ground, roll about the long axis
    st.tumble += st.wT * dt; st.wT *= Math.pow(onFloor ? 0.02 : 0.5, dt);
    if (onFloor && st.vy === 0) { const target = Math.round((st.tumble - Math.PI / 2) / (Math.PI * 2)) * Math.PI * 2 + Math.PI / 2; st.tumble += (target - st.tumble) * Math.min(1, dt * 6); }
    st.spin += (st.vx / (R * 0.9)) * dt + st.wS * dt; st.wS *= Math.pow(0.15, dt);
    st.tilt = 0.55 + Math.sin(now / 900) * 0.08;
    draw();
    const settled = onFloor && st.vy === 0 && Math.abs(st.vx) < 3 && Math.abs(st.wT) < 0.05 && Math.abs(st.wS) < 0.05;
    if (settled) { running = false; return; }
    requestAnimationFrame(step);
  }
  function flyAway(now, dt) {
    const t = Math.min(1, (now - gone.t0) / 1100), e = 1 - Math.pow(1 - t, 3);
    st.x = gone.x0 + (gone.x1 - gone.x0) * e;
    st.y = gone.y0 + (gone.y1 - gone.y0) * e - Math.sin(t * Math.PI) * H * 0.18;   // a little arc as it sails off
    st.tumble += st.wT * dt; st.spin += st.wS * dt;
    const k = Math.max(0.02, 1 - e * 0.98);
    draw(k);
    canvas.style.opacity = String(t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25);
    shadow.style.opacity = String(Math.max(0, 0.8 - t * 2));
    if (t < 1) return requestAnimationFrame(step);
    canvas.style.visibility = 'hidden';
    setTimeout(comeBack, 3000);                                    // 3 seconds later it's punted back in
  }
  function comeBack() {
    const fromLeft = Math.random() < 0.5;
    gone = null;
    back = { t0: performance.now(), x0: W * (0.35 + Math.random() * 0.3), y0: H * 0.22, x1: fromLeft ? W * 0.25 : W * 0.75, y1: floor() - H * 0.15 };
    canvas.style.visibility = ''; canvas.style.opacity = '1';
    st.wT = (fromLeft ? 1 : -1) * 18; st.wS = -12;
    running = true; last = performance.now(); requestAnimationFrame(step);
  }
  function flyBack(now, dt) {
    const t = Math.min(1, (now - back.t0) / 1000), e = t * t;       // accelerate towards the viewer
    st.x = back.x0 + (back.x1 - back.x0) * e;
    st.y = back.y0 + (back.y1 - back.y0) * e - Math.sin(t * Math.PI) * H * 0.12;
    st.tumble += st.wT * dt; st.spin += st.wS * dt;
    draw(Math.max(0.02, 0.02 + 0.98 * e));
    shadow.style.opacity = String(Math.min(0.8, t));
    if (t < 1) return requestAnimationFrame(step);
    st.vx = (back.x1 - back.x0) * 0.9; st.vy = 700; back = null;   // land and let physics take over
    requestAnimationFrame(step);
  }
  function draw(scale = 1) {
    canvas.style.transform = `translate3d(${st.x - S / 2}px,${st.y - S / 2}px,0) scale(${scale})`;
    const h = Math.max(0, floor() - st.y), k = Math.max(0.35, 1 - h / 500);
    shadow.style.transform = `translate3d(${st.x - S * 0.35}px,${floor() + R * 0.8}px,0) scale(${k * scale})`;
    if (!gone) shadow.style.opacity = String(0.25 + 0.6 * k);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(uM, false, mul(mul(rz(st.tumble), rx(st.tilt)), ry(st.spin)));
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
  }
  draw();
}

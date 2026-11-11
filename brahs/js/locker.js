import * as THREE from "https://unpkg.com/three@0.170.0/build/three.module.js";

const PURPLE = "#442C75";
const INK = "#2A1848";
const CREAM = "#F7F4EF";
const app = document.getElementById("app");
const params = new URLSearchParams(location.search);
const shot = params.get("shot") || "wide";
const players = (window.BRAHS_SEASON.players || []).slice().sort((a, b) => num(a) - num(b));
let index = Math.max(0, players.findIndex((p) => p.name === (params.get("player") || "Daniel Shinners")));
if (index < 0) index = 0;

function num(p) {
  const n = p.number || p.placeholderNumber || "0";
  return parseInt(n, 10) || 0;
}
function labelNo(p) {
  return p.number || p.placeholderNumber || "";
}
function surname(p) {
  return p.surname || p.name.split(" ").slice(-1)[0].toUpperCase();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
function digit(ctx, d, x, y, w, h) {
  const t = h * 0.2;
  const r = t * 0.25;
  const mid = y + h * 0.4;
  const right = x + w - t;
  const left = x;
  const top = y;
  const bot = y + h - t;
  const horiz = (yy) => roundRect(ctx, x, yy, w, t, r);
  const vert = (xx, yy, hh) => roundRect(ctx, xx, yy, t, hh, r);
  ctx.fillStyle = "#fff";
  if (d === "0" || d === "O") { horiz(top); horiz(bot); vert(left, top, h); vert(right, top, h); }
  else if (d === "1") { vert(x + w * 0.38, top, h); }
  else if (d === "2") { horiz(top); horiz(mid); horiz(bot); vert(right, top, h * 0.42); vert(left, mid, h * 0.42); }
  else if (d === "3") { horiz(top); horiz(mid); horiz(bot); vert(right, top, h); }
  else if (d === "4") { vert(left, top, h * 0.48); horiz(mid); vert(right, top, h); }
  else if (d === "5") { horiz(top); horiz(mid); horiz(bot); vert(left, top, h * 0.42); vert(right, mid, h * 0.42); }
  else if (d === "6") { horiz(top); horiz(mid); horiz(bot); vert(left, top, h); vert(right, mid, h * 0.42); }
  else if (d === "7") { horiz(top); vert(right, top, h); }
  else if (d === "8") { horiz(top); horiz(mid); horiz(bot); vert(left, top, h); vert(right, top, h); }
  else if (d === "9") { horiz(top); horiz(mid); horiz(bot); vert(left, top, h * 0.48); vert(right, top, h); }
}
function drawNumber(ctx, text, x, y, w, h) {
  const chars = String(text).split("");
  const gap = w * 0.06;
  const cw = (w - gap * (chars.length - 1)) / chars.length;
  chars.forEach((ch, i) => digit(ctx, ch, x + i * (cw + gap), y, cw * 0.92, h));
}
function meshDots(ctx, w, h) {
  ctx.fillStyle = "rgba(18, 8, 36, 0.55)";
  for (let y = 8; y < h; y += 10) {
    for (let x = 8; x < w; x += 10) {
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
function crest(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 64, s / 64);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(6, 34); ctx.lineTo(14, 12); ctx.lineTo(16, 20); ctx.lineTo(24, 14); ctx.lineTo(32, 6);
  ctx.lineTo(40, 14); ctx.lineTo(48, 20); ctx.lineTo(50, 12); ctx.lineTo(58, 34); ctx.closePath();
  ctx.fill();
  ctx.fillRect(8, 36, 48, 6);
  ctx.beginPath();
  ctx.arc(32, 60, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(20, 60); ctx.lineTo(44, 60);
  ctx.moveTo(32, 48); ctx.lineTo(32, 72);
  ctx.stroke();
  ctx.restore();
}
function backTexture(player) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 768;
  const g = c.getContext("2d");
  g.fillStyle = PURPLE;
  g.fillRect(0, 0, 512, 768);
  meshDots(g, 512, 768);
  crest(g, 256 - 28, 70, 56);
  g.fillStyle = "#fff";
  g.font = "700 34px 'DejaVu Sans', sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  const name = surname(player);
  const radius = 210;
  const letters = name.split("");
  const widths = letters.map((ch) => g.measureText(ch).width + 2);
  const total = widths.reduce((a, b) => a + b, 0);
  let theta = -total / 2 / radius;
  letters.forEach((ch, i) => {
    theta += widths[i] / 2 / radius;
    g.save();
    g.translate(256, 250);
    g.rotate(theta);
    g.fillText(ch, 0, -radius);
    g.restore();
    theta += widths[i] / 2 / radius;
  });
  drawNumber(g, labelNo(player), 70, 300, 372, 340);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.x = -1;
  tex.offset.x = 1;
  return tex;
}
function frontTexture(player, art) {
  const c = document.createElement("canvas");
  c.width = art.width; c.height = art.height;
  const g = c.getContext("2d");
  g.drawImage(art, 0, 0);
  const x = 299, y = 858, w = 417, h = 390;
  g.fillStyle = PURPLE;
  g.fillRect(x - 8, y - 8, w + 16, h + 16);
  drawNumber(g, labelNo(player), x + 20, y + 10, w - 40, h - 20);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(-1, -1);
  tex.offset.set(1, 1);
  return tex;
}

function panelGeo(neck) {
  const sx = 22, sy = 30;
  const pos = [], uv = [], idx = [];
  for (let y = 0; y <= sy; y++) {
    const v = y / sy;
    for (let x = 0; x <= sx; x++) {
      const u = x / sx;
      const nx = u * 2 - 1;
      let half = 0.26;
      if (v > 0.58) {
        const t = (v - 0.58) / 0.42;
        half = Math.max(0.1, 0.26 - Math.sin(Math.min(t, 1) * Math.PI) * 0.12);
      }
      let py = v * 0.78;
      if (v > 0.7) {
        const nt = (v - 0.7) / 0.3;
        const neckAmt = Math.max(0, 1 - Math.abs(nx) / 0.46);
        py -= neckAmt * nt * neck;
      }
      const fold = Math.sin(nx * 8) * 0.008 * v * (Math.abs(nx) > 0.2 ? 1 : 0.3);
      pos.push(nx * half, py, Math.sin(v * Math.PI) * 0.03 + fold);
      uv.push(u, v);
    }
  }
  for (let y = 0; y < sy; y++) {
    for (let x = 0; x < sx; x++) {
      const a = y * (sx + 1) + x;
      idx.push(a, a + sx + 1, a + 1, a + 1, a + sx + 1, a + sx + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function woodMap() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#8d5a32";
  g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 3) {
    g.fillStyle = `rgba(30,14,6,${0.05 + (x % 17) / 80})`;
    g.fillRect(x, 0, 2, 256);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeJersey(player, art) {
  const group = new THREE.Group();
  const cloth = (map) => new THREE.MeshPhysicalMaterial({
    map, color: "#ffffff", roughness: 0.82, metalness: 0, sheen: 0.45, sheenColor: new THREE.Color("#c8b8e0"), sheenRoughness: 0.6
  });
  const back = new THREE.Mesh(panelGeo(0.06), cloth(backTexture(player)));
  back.position.z = 0.05;
  back.rotation.y = Math.PI;
  const front = new THREE.Mesh(panelGeo(0.14), cloth(frontTexture(player, art)));
  front.position.z = -0.05;
  group.add(back, front);
  const pipe = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.45 });
  const neck = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 6, 24), pipe);
  neck.position.set(0, 0.66, 0.05);
  neck.rotation.x = Math.PI / 2;
  group.add(neck);
  [-1, 1].forEach((s) => {
    const arm = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 8, 20, Math.PI), pipe);
    arm.position.set(s * 0.2, 0.58, 0);
    arm.rotation.y = s * 0.6;
    arm.rotation.z = s * -0.8;
    group.add(arm);
  });
  group.userData.mats = [back.material, front.material];
  return group;
}

function makeBay(wood) {
  const g = new THREE.Group();
  const timber = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.78, metalness: 0.02 });
  const dark = new THREE.MeshStandardMaterial({ color: "#14110e", roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: "#c5c8ce", metalness: 0.85, roughness: 0.28 });
  const leather = new THREE.MeshStandardMaterial({ color: "#161616", roughness: 0.62 });
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.42, 0.38), timber);
  cab.position.set(0, 2.28, -0.08);
  const cavity = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.25, 0.08), dark);
  cavity.position.set(0, 1.4, -0.22);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.1, 0.36), leather);
  bench.position.set(0, 0.62, 0.08);
  const kick = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 0.12), timber);
  kick.position.set(0, 0.28, 0.16);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.08), metal);
  hook.position.set(0, 1.92, -0.02);
  [-0.46, 0.46].forEach((x) => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.06), metal);
    h.position.set(x, 1.55, 0.02);
    g.add(h);
  });
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.02), metal);
  handle.position.set(0, 2.28, 0.12);
  g.add(cab, cavity, bench, kick, hook, handle);
  const crestC = document.createElement("canvas");
  crestC.width = 128; crestC.height = 128;
  const cg = crestC.getContext("2d");
  cg.clearRect(0, 0, 128, 128);
  crest(cg, 32, 16, 64);
  const crestM = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(crestC), transparent: true }));
  crestM.position.set(0, 0.28, 0.23);
  g.add(crestM);
  return g;
}

function fallback() {
  app.innerHTML = '<div class="room"><div class="fallback" id="fb"></div></div>';
  const row = document.getElementById("fb");
  players.forEach((p) => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 768;
    const tex = backTexture(p);
    const fig = document.createElement("figure");
    const img = document.createElement("img");
    img.alt = surname(p) + " " + labelNo(p);
    img.src = tex.image.toDataURL();
    fig.appendChild(img);
    row.appendChild(fig);
  });
  window.__brahsReady = true;
}

async function main() {
  if (!window.WebGLRenderingContext) { fallback(); return; }
  let art;
  try {
    art = new Image();
    art.src = "assets/front-artwork.png";
    await art.decode();
  } catch (e) {
    art = document.createElement("canvas");
    art.width = 1050; art.height = 1502;
    art.getContext("2d").fillStyle = PURPLE;
    art.getContext("2d").fillRect(0, 0, 1050, 1502);
  }
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
  const gl = renderer.getContext();
  if (!gl) { fallback(); return; }
  const mobile = Math.min(window.innerWidth, window.innerHeight) < 800;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const room = document.createElement("div");
  room.className = "room";
  room.appendChild(renderer.domElement);
  app.appendChild(room);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#100e0c");
  scene.fog = new THREE.Fog("#100e0c", 6, 14);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  const wood = woodMap();
  const bays = [];
  const n = players.length;
  const radius = 5.2;
  const sweep = Math.min(1.15, 0.18 * (n - 1));
  players.forEach((p, i) => {
    const a = n === 1 ? 0 : -sweep / 2 + sweep * (i / (n - 1));
    const bay = makeBay(wood);
    bay.position.set(Math.sin(a) * radius, 0, -Math.cos(a) * radius);
    bay.rotation.y = Math.PI - a;
    const jersey = makeJersey(p, art);
    jersey.position.set(0, 0.95, 0.02);
    jersey.scale.setScalar(0.92);
    bay.add(jersey);
    const hanger = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.04, 0.06),
      new THREE.MeshStandardMaterial({ color: "#b08960", roughness: 0.55 })
    );
    hanger.position.set(0, 1.78, 0.02);
    bay.add(hanger);
    const spot = new THREE.SpotLight("#ffd2a8", 0, 6, 0.45, 0.6, 1);
    spot.position.set(0, 2.15, 0.3);
    spot.target.position.set(0, 1.3, 0.1);
    bay.add(spot, spot.target);
    bay.userData = { jersey, spot, player: p };
    scene.add(bay);
    bays.push(bay);
  });

  const floorC = document.createElement("canvas");
  floorC.width = 1024; floorC.height = 512;
  const fg = floorC.getContext("2d");
  fg.fillStyle = "#161310";
  fg.fillRect(0, 0, 1024, 512);
  try {
    const mark = new Image();
    mark.src = "assets/wordmark.svg";
    await mark.decode();
    fg.drawImage(mark, 180, 40, 660, 400);
  } catch (e) {
    fg.fillStyle = "#F4EFE6";
    fg.font = "700 80px sans-serif";
    fg.textAlign = "center";
    fg.fillText("SUPPORT BRAHS", 512, 280);
  }
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(7, 48),
    new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(floorC), roughness: 0.92 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  scene.add(new THREE.HemisphereLight("#ffd8b0", "#1a120c", 0.35));
  scene.add(new THREE.AmbientLight("#ffb27a", 0.08));

  const ui = document.createElement("div");
  ui.className = "room-ui";
  ui.innerHTML = '<div class="room-name"><b id="rn"></b><span id="rs"></span></div><div class="arrows"><button type="button" id="prev" aria-label="Previous jersey">←</button><button type="button" id="next" aria-label="Next jersey">→</button></div>';
  room.appendChild(ui);
  const card = document.createElement("aside");
  card.className = "card-pop";
  card.hidden = true;
  room.appendChild(card);

  let showingFront = false;
  let mode = shot === "jersey" || shot === "card" ? "close" : "wide";
  const target = new THREE.Vector3();
  const look = new THREE.Vector3();
  function frame() {
    const bay = bays[index];
    const wp = new THREE.Vector3();
    bay.getWorldPosition(wp);
    const outward = wp.clone().setY(0);
    if (outward.lengthSq() < 0.001) outward.set(0, 0, 1);
    outward.normalize();
    const dist = mode === "wide" ? 5.1 : 2.15;
    target.copy(wp).add(new THREE.Vector3(0, mode === "wide" ? 1.35 : 1.4, 0)).addScaledVector(outward, dist);
    look.copy(wp).add(new THREE.Vector3(0, 1.28, 0));
  }
  function applyName() {
    const p = players[index];
    document.getElementById("rn").textContent = surname(p) + "  " + labelNo(p);
    document.getElementById("rs").textContent = p.placeholder ? "Placeholder number" : p.name;
    bays.forEach((b, i) => {
      const on = i === index;
      const near = Math.abs(i - index) === 1;
      b.userData.spot.intensity = on ? 18 : near ? 4 : 0.4;
      b.userData.jersey.userData.mats.forEach((m) => m.color.set(on ? "#ffffff" : "#6e6a66"));
    });
  }
  function openCard(open) {
    showingFront = open;
    const p = players[index];
    if (!open) { card.hidden = true; return; }
    const ppg = p.gp && p.pts != null ? (p.pts / p.gp).toFixed(1) : "–";
    card.hidden = false;
    card.innerHTML = '<div class="row" style="justify-content:space-between"><div><p class="kicker">' + (p.placeholder ? "Placeholder number" : "Roster") + '</p><h2>' + p.name + '</h2></div><button class="iconbtn" type="button" id="close-card" aria-label="Close">×</button></div>' +
      '<p class="stat"><b>' + labelNo(p) + '</b><span>' + (p.placeholder ? "Assigned from the print list until Daniel maps it." : "PlayHQ number. Still worth a check against the print list.") + '</span></p>' +
      (p.kind === "private" ? '<p class="note">PlayHQ withheld this name, so season points are not mixed in.</p>' :
        '<div class="table-wrap"><table><tr><th>GP</th><th>PTS</th><th>PPG</th><th>1s</th><th>2s</th><th>3s</th></tr><tr><td>' + (p.gp || 0) + '</td><td>' + (p.pts ?? "–") + '</td><td>' + ppg + '</td><td>' + (p.p1 ?? "–") + '</td><td>' + (p.p2 ?? "–") + '</td><td>' + (p.p3 ?? "–") + '</td></tr></table></div>');
    card.querySelector("#close-card").onclick = () => openCard(false);
  }
  function step(dir) {
    index = (index + dir + players.length) % players.length;
    showingFront = false;
    card.hidden = true;
    mode = "close";
    frame();
    applyName();
  }
  document.getElementById("prev").onclick = () => step(-1);
  document.getElementById("next").onclick = () => step(1);
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
  let dragX = 0, dragging = false, moved = 0;
  renderer.domElement.addEventListener("pointerdown", (e) => { dragging = true; dragX = e.clientX; moved = 0; });
  renderer.domElement.addEventListener("pointermove", (e) => { if (dragging) moved = Math.max(moved, Math.abs(e.clientX - dragX)); });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;
    const dx = e.clientX - dragX;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
    else if (moved < 8) {
      mode = "close";
      openCard(!showingFront);
      frame();
    }
  });

  function resize() {
    const w = room.clientWidth, h = room.clientHeight;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();
  window.addEventListener("resize", resize);
  frame();
  applyName();
  if (shot === "card") {
    openCard(true);
    bays[index].userData.jersey.rotation.y = Math.PI;
  }
  camera.position.copy(target);
  camera.lookAt(look);

  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    camera.position.lerp(target, 0.08);
    const lookNow = new THREE.Vector3();
    camera.getWorldDirection(lookNow);
    camera.lookAt(look);
    bays.forEach((b, i) => {
      const j = b.userData.jersey;
      const focus = i === index;
      const face = focus && showingFront ? Math.PI : 0;
      j.rotation.y += (face - j.rotation.y) * 0.08;
      j.position.z = focus ? 0.16 : 0.02;
      j.rotation.z = focus ? Math.sin(t * 1.3) * 0.03 : 0;
      j.rotation.x = focus ? Math.sin(t * 0.9) * 0.015 : 0;
    });
    renderer.render(scene, camera);
    if (!window.__brahsReady) window.__brahsReady = true;
    requestAnimationFrame(tick);
  }
  tick();
}

main().catch(() => fallback());

(function () {
  const COPY = window.BRAHS_COPY || {};
  const season = (window.BRAHS_SEASON && window.BRAHS_SEASON.players) || [];
  const roster = COPY.roster || [];
  const app = document.getElementById("app");
  const params = new URLSearchParams(location.search);

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function statsFor(row) {
    if (!row.match) return null;
    return season.find((p) => String(p.name || "").split(" ")[0].toLowerCase() === row.match.toLowerCase()) || null;
  }
  const players = roster.map((row) => {
    const s = statsFor(row);
    return {
      nick: row.nick,
      number: row.number || "",
      provisional: !!row.provisional,
      gp: s ? s.gp : 0,
      pts: s ? s.pts : null,
      p1: s ? s.p1 : null,
      p2: s ? s.p2 : null,
      p3: s ? s.p3 : null
    };
  });
  const lead = ["Jerome", "Dan", "Dusty"];
  players.sort((a, b) => {
    const ia = lead.indexOf(a.nick), ib = lead.indexOf(b.nick);
    if (ia < 0 && ib < 0) return 0;
    if (ia < 0) return 1;
    if (ib < 0) return -1;
    return ia - ib;
  });
  let current = Math.max(0, players.findIndex((p) => p.nick === "Dan"));

  function face(p, back) {
    const num = p.number ? '<span class="j-num">' + esc(p.number) + "</span>" : "";
    if (back) {
      return '<div class="face back"><span class="j-first">' + esc(p.nick.toUpperCase()) + "</span>" + num + "</div>";
    }
    return '<div class="face front">' +
      '<span class="j-mark" aria-hidden="true"></span>' +
      '<svg class="j-crown" viewBox="0 0 24 14" width="22" height="12" aria-hidden="true"><path fill="#fff" d="M1 13 4.2 5.2 8 8.4 12 1.2 16 8.4 19.8 5.2 23 13Z"/></svg>' +
      '<span class="j-support">SUPPORT</span><span class="j-brahs">BRAHS</span>' + num + "</div>";
  }
  function bay(p, i) {
    return '<article class="bay" data-i="' + i + '">' +
      '<div class="bay-light"></div>' +
      '<div class="bay-cavity">' +
      '<div class="hooks" aria-hidden="true"><i></i><i></i></div>' +
      '<button type="button" class="jersey-btn" data-i="' + i + '" aria-pressed="false" aria-label="' + esc(p.nick) + (p.number ? " " + esc(p.number) : "") + '">' +
      '<span class="hanger" aria-hidden="true"></span>' +
      '<span class="flip">' + face(p, false) + face(p, true) + "</span></button>" +
      '<div class="cushion" aria-hidden="true"></div></div>' +
      '<div class="ledge" aria-hidden="true"></div>' +
      '<div class="drawer" aria-hidden="true"><span class="knob"></span><b><small>SUPPORT</small>BRAHS</b><span class="knob"></span></div>' +
      "</article>";
  }
  function card(p) {
    const ppg = p.gp && p.pts != null ? (p.pts / p.gp).toFixed(1) : "–";
    const stats = p.pts == null
      ? '<p class="note">No PlayHQ scoring linked to this nickname yet.</p>'
      : '<div class="table-wrap"><table><thead><tr><th>GP</th><th>PTS</th><th>PPG</th><th>1s</th><th>2s</th><th>3s</th></tr></thead><tbody><tr><td>' +
        p.gp + "</td><td>" + p.pts + "</td><td>" + ppg + "</td><td>" + (p.p1 || 0) + "</td><td>" + (p.p2 || 0) + "</td><td>" + (p.p3 || 0) + "</td></tr></tbody></table></div>";
    return '<article class="card player-card" id="player-card" tabindex="-1"><p class="kicker">Player' +
      (p.provisional ? ' <span class="ph">provisional</span>' : "") + "</p><h2>" + esc(p.nick) + "</h2>" +
      '<p class="sheet-no">' + (p.number ? esc(p.number) : "—") + "</p><p>Games played <b>" + p.gp + "</b></p>" + stats + "</article>";
  }

  app.innerHTML =
    '<p class="locker-intro">' + esc(COPY.locker || "") + '</p><div class="locker-wrap">' +
    '<div class="bay-arrows"><button type="button" id="bay-prev" aria-label="Previous bay">←</button><button type="button" id="bay-next" aria-label="Next bay">→</button></div>' +
    '<div class="bay-scroll" id="bays" tabindex="0">' + players.map(bay).join("") + "</div></div>" +
    '<div class="rack-page"><div id="card-slot"></div>' +
    '<h2 class="list-title" style="color:#F2EFE8">All players</h2><ul class="roster-list">' +
    players.map((p, i) => '<li><button type="button" data-i="' + i + '">' + esc(p.nick) + (p.number ? " · " + esc(p.number) : "") + (p.provisional ? " (provisional)" : "") + "</button></li>").join("") +
    "</ul></div>" +
    '<nav class="pill" aria-label="Team sections"><a href="locker.html" aria-current="page">Locker Room</a><a href="vote.html">Vote</a><a href="games.html">Games</a><a href="games.html#scoring">Stats</a><a href="board.html">MVB</a></nav>';

  const scroller = document.getElementById("bays");
  const bays = Array.from(document.querySelectorAll(".bay"));
  const slot = document.getElementById("card-slot");
  let open = params.get("card") === "1";

  function show(i) {
    current = (i + players.length) % players.length;
    bays.forEach((el, n) => {
      const on = n === current && open;
      el.classList.toggle("is-on", on);
      el.querySelector(".jersey-btn").setAttribute("aria-pressed", on ? "true" : "false");
    });
    bays[current].scrollIntoView({ inline: "center", block: "nearest", behavior: "auto" });
    slot.innerHTML = open ? card(players[current]) : "";
  }
  scroller.addEventListener("click", (e) => {
    const b = e.target.closest(".jersey-btn");
    if (!b) return;
    const i = Number(b.dataset.i);
    if (i === current && open) open = false;
    else { current = i; open = true; }
    show(current);
  });
  document.querySelector(".roster-list").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    open = true;
    show(Number(b.dataset.i));
  });
  document.getElementById("bay-prev").onclick = () => { open = false; show(current - 1); };
  document.getElementById("bay-next").onclick = () => { open = false; show(current + 1); };
  scroller.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); open = false; show(current + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); open = false; show(current - 1); }
    if (e.key === "Enter") { open = true; show(current); }
  });
  let dragX = null;
  scroller.addEventListener("pointerdown", (e) => { dragX = e.clientX; });
  scroller.addEventListener("pointerup", (e) => {
    if (dragX == null) return;
    const dx = e.clientX - dragX;
    dragX = null;
    if (Math.abs(dx) > 40) { open = false; show(current + (dx < 0 ? 1 : -1)); }
  });
  show(current);
  window.__brahsReady = true;
})();

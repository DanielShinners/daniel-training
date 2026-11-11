(function () {
  const players = (window.BRAHS_SEASON.players || []).slice();
  const app = document.getElementById("app");
  let current = players.findIndex((p) => p.name === "Daniel Shinners");
  if (current < 0) current = 0;
  const openOnLoad = new URLSearchParams(location.search).get("card") === "1";

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function shirtNo(p) {
    return p.number == null || p.number === "" ? "" : String(p.number);
  }
  function surname(p) {
    return p.surname || String(p.name || "").split(" ").slice(-1)[0].toUpperCase();
  }
  function jersey(p) {
    const no = shirtNo(p);
    const name = no ? surname(p) : "";
    const nameSize = name.length > 10 ? 11 : name.length > 8 ? 13 : 16;
    return (
      '<svg class="singlet" viewBox="0 0 140 188" role="img" aria-hidden="true">' +
      '<path fill="#111" d="M46 34c6-14 14-20 24-20s18 6 24 20l12 16c4 8 2 16-4 20l-4 92c-1 12-14 18-28 18s-27-6-28-18l-4-92c-6-4-8-12-4-20z"/>' +
      '<path fill="none" stroke="#F2EFE8" stroke-width="2.2" d="M52 36c6 8 30 8 36 0M40 52c8 8 10 16 8 24M100 52c-8 8-10 16-8 24"/>' +
      '<path fill="#F2EFE8" d="M62 46h16l-2 5 6-1-8 8-8-8 6 1z"/>' +
      '<text x="70" y="66" text-anchor="middle" fill="#F2EFE8" font-family="Bebas Neue, Impact, sans-serif" font-size="13" letter-spacing="1">BRAHS</text>' +
      (name ? '<text x="70" y="92" text-anchor="middle" fill="#F2EFE8" font-family="Bebas Neue, Impact, sans-serif" font-size="' + nameSize + '" letter-spacing="0.5">' + esc(name) + "</text>" : "") +
      (no ? '<text x="70" y="142" text-anchor="middle" fill="#F2EFE8" font-family="Bebas Neue, Impact, sans-serif" font-size="54">' + esc(no) + "</text>" : "") +
      "</svg>"
    );
  }
  function card(p) {
    const no = shirtNo(p);
    const ppg = p.gp && p.pts != null ? (p.pts / p.gp).toFixed(1) : "–";
    const stats = p.kind === "private" || p.pts == null
      ? '<p class="note">PlayHQ did not publish a full name for this spot, so season points stay off this card.</p>'
      : '<div class="table-wrap"><table><thead><tr><th>GP</th><th>PTS</th><th>PPG</th><th>1s</th><th>2s</th><th>3s</th></tr></thead><tbody><tr><td>' +
        p.gp + "</td><td>" + p.pts + "</td><td>" + ppg + "</td><td>" + (p.p1 ?? 0) + "</td><td>" + (p.p2 ?? 0) + "</td><td>" + (p.p3 ?? 0) + "</td></tr></tbody></table></div>";
    return (
      '<article class="card player-card" id="player-card" tabindex="-1">' +
      '<p class="kicker">Player</p><h2>' + esc(p.name) + "</h2>" +
      '<p class="sheet-no">' + (no ? esc(no) : "Number to come") + "</p>" +
      "<p>Games played <b>" + (p.gp || 0) + "</b></p>" + stats +
      "</article>"
    );
  }

  app.innerHTML =
    '<div class="rack-page">' +
    '<div class="rack-scene">' +
    '<div class="rack-scroll" id="rack" tabindex="0" role="listbox" aria-label="Jerseys on the rack">' +
    '<div class="rack-track">' +
    '<div class="rail" aria-hidden="true"></div>' +
    players.map((p, i) =>
      '<button type="button" class="hang" role="option" data-i="' + i + '" aria-selected="false" style="--d:' + (i % 5) + '">' +
      '<span class="hook" aria-hidden="true"></span>' + jersey(p) +
      '<span class="hang-name">' + esc(surname(p)) + "</span></button>"
    ).join("") +
    "</div></div></div>" +
    '<div id="card-slot"></div>' +
    '<h2 class="list-title">All players</h2>' +
    '<ul class="roster-list">' +
    players.map((p, i) => '<li><button type="button" data-i="' + i + '">' + esc(p.name) + (shirtNo(p) ? " · " + esc(shirtNo(p)) : "") + "</button></li>").join("") +
    "</ul></div>" +
    '<nav class="pill" aria-label="Team sections">' +
    '<a href="locker.html" aria-current="page">Locker Room</a>' +
    '<a href="vote.html">Vote</a>' +
    '<a href="games.html">Games</a>' +
    '<a href="games.html#scoring">Stats</a>' +
    '<a href="board.html">MVB</a>' +
    "</nav>";

  const rack = document.getElementById("rack");
  const slot = document.getElementById("card-slot");
  const hangs = Array.from(document.querySelectorAll(".hang"));

  function select(i, showCard) {
    current = i;
    hangs.forEach((el, n) => {
      const on = n === i;
      el.classList.toggle("is-on", on);
      el.setAttribute("aria-selected", on ? "true" : "false");
    });
    hangs[i].scrollIntoView({ inline: "center", block: "nearest", behavior: "auto" });
    slot.innerHTML = showCard ? card(players[i]) : "";
    if (showCard) document.getElementById("player-card").focus();
  }

  hangs.forEach((el) => {
    el.addEventListener("click", () => {
      const i = Number(el.dataset.i);
      select(i, true);
    });
  });
  document.querySelector(".roster-list").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    select(Number(b.dataset.i), true);
  });
  rack.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); select(Math.min(players.length - 1, current + 1), false); }
    if (e.key === "ArrowLeft") { e.preventDefault(); select(Math.max(0, current - 1), false); }
    if (e.key === "Enter") select(current, true);
  });

  select(current, openOnLoad);
  requestAnimationFrame(() => {
    hangs[current].scrollIntoView({ inline: "center", block: "nearest" });
    window.__brahsReady = true;
  });
})();

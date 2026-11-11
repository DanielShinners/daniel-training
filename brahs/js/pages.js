(function () {
  const C = window.BRAHS_CONFIG;
  const S = window.BRAHS_SEASON;
  const app = document.getElementById("app");
  const page = document.body.dataset.page;

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function money(cents) {
    return "$" + Math.round((cents || 0) / 100).toLocaleString("en-AU");
  }
  function niceDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return new Intl.DateTimeFormat("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
  }
  function niceTime(hm) {
    if (!hm) return "";
    const [h, min] = hm.split(":").map(Number);
    const hr = h % 12 || 12;
    return hr + ":" + String(min).padStart(2, "0") + (h >= 12 ? "pm" : "am");
  }
  function finals() { return S.games.filter((g) => g.status === "FINAL").slice().sort((a, b) => b.date.localeCompare(a.date)); }
  function upcoming() { return S.games.filter((g) => g.status !== "FINAL").slice().sort((a, b) => a.date.localeCompare(b.date)); }
  function ptsOf(p) {
    if (p.pts != null) return p.pts;
    return (p.p1 || 0) + (p.p2 || 0) * 2 + (p.p3 || 0) * 3;
  }
  function displayNo(p) { return p.number || p.placeholderNumber || ""; }
  function wrap(html) { app.innerHTML = '<div class="wrap">' + html + "</div>"; }

  function moBlock(id) {
    return '<div class="stat" id="' + id + '"><b>' + money(C.movemberAllTimeCents) + '</b><span>raised all-time, ' + esc(C.movemberAllTimeLabel) + '</span></div>';
  }
  async function refreshMo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    let all = C.movemberAllTimeCents;
    let label = C.movemberAllTimeLabel;
    let campaign = C.movemberCampaignCents;
    let campaignLabel = C.movemberCampaignLabel;
    try {
      const r = await fetch(C.supabaseUrl + "/rest/v1/brahs_meta?id=eq.movember&select=data", {
        headers: { apikey: C.supabaseKey, Authorization: "Bearer " + C.supabaseKey }
      });
      if (r.ok) {
        const rows = await r.json();
        const d = rows[0] && rows[0].data;
        if (d && d.allTimeCents) { all = d.allTimeCents; label = d.allTimeLabel || label; }
        if (d && d.campaignCents) { campaign = d.campaignCents; campaignLabel = d.campaignLabel || campaignLabel; }
      }
    } catch (e) {}
    try {
      const r = await fetch(C.movemberApi, { headers: { Accept: "application/json" } });
      if (r.ok) {
        const j = await r.json();
        const amt = j.AmountRaised && parseFloat(j.AmountRaised.convertedAmount);
        if (isFinite(amt)) { campaign = Math.round(amt * 100); campaignLabel = "this Movember, live from Movember"; }
      }
    } catch (e) {}
    el.innerHTML = "<b>" + money(all) + "</b><span>raised all-time, " + esc(label) + ". " + money(campaign) + " " + esc(campaignLabel) + ".</span>";
  }

  const pages = {
    home() {
      const last = finals()[0];
      const next = upcoming()[0];
      wrap(
        '<img class="shot" src="assets/hero-court.jpg" width="640" height="640" alt="Overhead of the black Support Brahs 3x3 court">' +
        '<p class="kicker">The real brahs of lululemon</p>' +
        "<h1>Show up. Have a crack.</h1>" +
        '<p class="lede">A community basketball team for men to move, grow and connect. Corporate games in 2017. Tuesday nights at MSAC now.</p>' +
        '<div class="motifs"><div><b>3x3</b><span>Streetball</span></div><div><b>Mo</b><span>Movember</span></div><div><b>Brah-B-Q</b><span>The cook-up</span></div></div>' +
        '<section class="card stack">' + moBlock("mo-home") +
        '<a class="btn" href="' + esc(C.movemberTeamUrl) + '">Donate to the team</a></section>' +
        (next ? '<section class="card"><p class="kicker">Next game</p><h2>' + esc(next.round) + " vs " + esc(next.opponent) + "</h2><p class=\"note\">" + esc([niceDate(next.date), niceTime(next.time), next.court, next.venue].filter(Boolean).join(" · ")) + "</p></section>" : "") +
        (last ? '<section class="card"><p class="kicker">Latest result</p><div class="scoreline"><h2>' + esc(last.round) + " vs " + esc(last.opponent) + '</h2><span class="wl">' + esc(last.outcome || "") + " " + esc(last.scoreFor) + "–" + esc(last.scoreAgainst) + "</span></div><p class=\"note\">" + esc(niceDate(last.date)) + (last.periods.length ? " · " + last.periods.map((p) => p.label + " " + p.for + "–" + p.against).join(", ") : "") + "</p></section>" : "") +
        '<div class="pair"><img src="assets/run-flannel.jpg" width="640" height="640" alt="Teammates running in flannel, one in a Support Brahs tee"><img src="assets/street-dunk.jpg" width="513" height="640" alt="A layup at an outdoor street game"></div>' +
        '<section class="card stack"><p class="kicker">Locker room</p><h2>Every jersey, on its own hook.</h2><p class="note">Purple mesh, white print, surname on the back. A simple 3D stand-in for now.</p><a class="btn" href="locker.html">Open the locker room</a></section>' +
        '<section class="card stack"><p class="kicker">Most Valuable Brah</p><h2>Winner revealed at the Christmas party.</h2><p class="note">Votes stay sealed. One ballot each, after the game.</p><div class="row"><a class="btn" href="vote.html">Vote</a><a class="btn ghost" href="board.html">The teaser</a></div></section>'
      );
      refreshMo("mo-home");
    },
    about() {
      wrap(
        '<img class="shot" src="assets/run-flannel.jpg" width="640" height="640" alt="Teammates out for a run, moustaches and a Support Brahs tee">' +
        '<p class="kicker">About</p><h1>A safe place to have a crack.</h1>' +
        '<p class="lede">The Support Brahs are a community basketball team. The mission is simple: make room for men to move, grow and connect.</p>' +
        '<section class="card stack"><p>It started with lululemon SSC staff in Melbourne, joking their way into a corporate basketball team. Not everyone could play. Enough of them were willing to show up.</p><p>The Tuesday game became the point of connection. Banter first, then the harder conversations. The team later moved into a weekly domestic comp: MCBA Tuesday Men B at MSAC.</p><p>Age, size and ability are not the test. Show up and have a crack.</p><p>There is a sister team, the Brah-lettes.</p></section>' +
        '<section class="card stack"><h2>More than a team</h2><p>Merchandise, Brah-B-Qs and 3x3 tournaments turned the same group toward Movember. lululemon has written about more than $70,000 raised for men\'s health. The Movember team page puts the running total at $89,559.</p><a class="btn ghost" href="movember.html">Movember</a></section>'
      );
    },
    history() {
      const item = (year, title, body, ph) =>
        "<article><p class=\"kicker\">" + esc(year) + (ph ? ' <span class="ph">placeholder</span>' : "") + "</p><h2>" + esc(title) + "</h2><p class=\"note\">" + body + "</p></article>";
      wrap(
        '<img class="shot" src="assets/court-overhead.jpg" width="360" height="640" alt="The 3x3 court from above, Support Brahs at centre court">' +
        '<p class="kicker">History</p><h1>From the loft to Tuesday night.</h1>' +
        '<p class="lede">A first pass. Dates we are not sure of are marked placeholder. Daniel can correct the line.</p>' +
        '<div class="tl">' +
        item("2017", "The team starts", "Co-founder Daniel Shinners and lululemon SSC colleagues turn office banter into a corporate basketball side in Melbourne.", false) +
        item("Soon after", "The Brah-lettes", "A sister team forms on the heels of the Brahs. The office starts treating Tuesday as part of the culture, not a one-off.", true) +
        item("Dates TBC", "Brah-B-Q 1.0, 2.0 and 3.0", "Three editions of the cook-up fundraiser. Years still to be filled in from the archive.", true) +
        item("2023", "3x3 Streetball Tournament", "Support Brahs host a 3x3 streetball event. A second annual edition followed. The year of that second one is still to confirm.", false) +
        item("Year TBC", "3x3 Fire Relief", "A 3x3 event tied to fire relief. Detail and date to come from Daniel.", true) +
        item("Year TBC", "Movember × Spalding × Support Brahs", "A partnership across the campaign, the ball brand and the team. Date to confirm.", true) +
        item("By 2025", "More than $70,000", "The lululemon story records $70,000+ for men's health. The Movember team page later shows $89,559 all-time.", false) +
        item("Summer 2026/27", "Tuesday Men B at MSAC", "Support Brahs are in the MCBA domestic grade at Melbourne Sports and Aquatic Centre. Most Valuable Brah runs alongside the season.", false) +
        "</div>"
      );
    },
    movember() {
      wrap(
        '<div class="pair"><img src="assets/mo-thumbs.jpg" width="640" height="640" alt="A teammate with a moustache giving a thumbs up"><img src="assets/mo-portrait.jpg" width="512" height="640" alt="A smiling teammate in a Movember hoodie"></div>' +
        '<p class="kicker">Movember</p><h1>Men\'s health, centre court.</h1>' +
        '<p class="lede">This is the team page, not a personal Mo page. Donate to The Support Brahs. Bio line: the real brahs. $89,559 raised.</p>' +
        '<section class="card stack">' + moBlock("mo-page") +
        '<a class="btn" href="' + esc(C.movemberTeamUrl) + '">Donate on the team page</a>' +
        '<p class="note"><a href="' + esc(C.movemberShortUrl) + '">movember.com/t/supportbrahs</a> · <a href="' + esc(C.movemberTeamUrl) + '">au.movember.com/team/2241550</a></p>' +
        "<p>The public Movember API exposes this campaign's total, not the all-time figure. If the browser can read it, the campaign line updates. The all-time number stays on the cached figure until someone updates it in Supabase.</p></section>"
      );
      refreshMo("mo-page");
    },
    gallery() {
      const items = (window.BRAHS_GALLERY || []).slice().sort((a, b) => (a.sort || 0) - (b.sort || 0));
      const camps = ["All"].concat(window.BRAHS_CAMPAIGNS || []);
      wrap(
        '<p class="kicker">Gallery</p><h1>Pictures, when we have them.</h1>' +
        '<p class="lede">A first handful from @supportbrahs, plus this season\'s jersey. Brah-B-Q and the Spalding shots are still to come from the Drive archive.</p>' +
        '<div class="filters" id="g-filters">' + camps.map((c, i) => '<button class="chip" type="button" data-camp="' + esc(c) + '" aria-pressed="' + (i === 0 ? "true" : "false") + '">' + esc(c) + "</button>").join("") + "</div>" +
        '<div class="masonry" id="g-grid"></div>' +
        '<dialog id="g-light"><img alt=""><div class="cap"><p></p><button class="btn ghost" type="button" id="g-close">Close</button></div></dialog>'
      );
      const grid = document.getElementById("g-grid");
      const dlg = document.getElementById("g-light");
      function draw(camp) {
        const list = items.filter((it) => camp === "All" || it.campaign === camp);
        if (!list.length) {
          grid.innerHTML = '<section class="card"><p>No photos for ' + esc(camp) + ' yet. Drop them in the gallery list or the brahs_gallery table when the Drive archive is chosen.</p></section>';
          return;
        }
        grid.innerHTML = list.map((it) =>
          "<figure><button type=\"button\" data-url=\"" + esc(it.url) + "\" data-cap=\"" + esc(it.caption) + "\"><img src=\"" + esc(it.url) + "\" alt=\"" + esc(it.caption) + "\"></button><figcaption>" + esc(it.campaign) + " · " + esc(it.year) + "<br>" + esc(it.caption) + "</figcaption></figure>"
        ).join("");
      }
      draw("All");
      document.getElementById("g-filters").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        document.querySelectorAll("#g-filters button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
        draw(b.dataset.camp);
      });
      grid.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        dlg.querySelector("img").src = b.dataset.url;
        dlg.querySelector("img").alt = b.dataset.cap;
        dlg.querySelector(".cap p").textContent = b.dataset.cap;
        dlg.showModal();
      });
      document.getElementById("g-close").addEventListener("click", () => dlg.close());
    },
    games() {
      const leaders = S.players.filter((p) => p.kind !== "private" && p.pts != null).slice().sort((a, b) => b.pts - a.pts || b.p3 - a.p3);
      const games = S.games.slice().sort((a, b) => a.date.localeCompare(b.date));
      wrap(
        '<img class="shot" src="assets/street-dunk.jpg" width="513" height="640" alt="Street basketball under the trees">' +
        '<p class="kicker">Games & Stats</p><h1>Summer 2026/27</h1>' +
        '<p class="lede">Tuesday Men B. Scoring only. No minutes, no foul ladder, no bottom of the list.</p>' +
        '<section class="card"><h2>Ladder</h2><div class="table-wrap"><table><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>For</th><th>Ag</th><th>%</th><th>Pts</th></tr></thead><tbody>' +
        S.ladder.map((t) => "<tr" + (t.teamId === S.meta.teamId ? ' class="us"' : "") + "><td>" + t.position + "</td><td>" + esc(t.team) + "</td><td>" + t.played + "</td><td>" + t.won + "</td><td>" + t.lost + "</td><td>" + t.pointsFor + "</td><td>" + t.pointsAgainst + "</td><td>" + t.percentage + "</td><td>" + t.points + "</td></tr>").join("") +
        "</tbody></table></div></section>" +
        '<section class="card"><h2>Scoring</h2><div class="table-wrap"><table><thead><tr><th>Player</th><th>GP</th><th>PTS</th><th>PPG</th><th>1s</th><th>2s</th><th>3s</th></tr></thead><tbody>' +
        leaders.map((p) => "<tr><td>" + esc(p.name) + "</td><td>" + p.gp + "</td><td>" + p.pts + "</td><td>" + (p.gp ? (p.pts / p.gp).toFixed(1) : "–") + "</td><td>" + p.p1 + "</td><td>" + p.p2 + "</td><td>" + p.p3 + "</td></tr>").join("") +
        "</tbody></table></div><p class=\"note\">PlayHQ did not publish a season aggregate. These totals are added up from game sheet points. Anonymous fill-ins stay on the game, not on this list.</p></section>" +
        '<section class="card stack"><h2>Fixture</h2>' + games.map((g) => {
          const score = g.status === "FINAL" && g.scoreFor != null ? esc(g.outcome) + " " + g.scoreFor + "–" + g.scoreAgainst : esc(g.status === "FINAL" ? "Final" : "Upcoming");
          return '<a class="scoreline" href="games.html#g-' + esc(g.id) + '" id="g-' + esc(g.id) + '"><span><b>' + esc(g.round) + "</b> " + esc(niceDate(g.date)) + " · " + esc(g.opponent) + "</span><span>" + score + "</span></a>";
        }).join("") + "</section>"
      );
      const hash = location.hash.slice(1);
      if (hash) {
        const row = document.getElementById(hash);
        if (row) {
          const g = games.find((x) => "g-" + x.id === hash);
          if (g) {
            const box = document.createElement("section");
            box.className = "card stack";
            const line = (g.lineup || []).map((p) => "<tr><td>" + esc(p.name) + "</td><td>" + esc(p.number || "") + "</td><td>" + ptsOf(p) + "</td><td>" + (p.p1 || 0) + "</td><td>" + (p.p2 || 0) + "</td><td>" + (p.p3 || 0) + "</td></tr>").join("");
            box.innerHTML = "<h2>" + esc(g.round) + " vs " + esc(g.opponent) + "</h2><p class=\"note\">" + esc([niceDate(g.date), niceTime(g.time), g.court, g.venue].filter(Boolean).join(" · ")) + "</p>" +
              (g.periods.length ? "<p>" + g.periods.map((p) => esc(p.label) + " " + p.for + "–" + p.against).join(" · ") + "</p>" : "") +
              (line ? '<div class="table-wrap"><table><thead><tr><th>Player</th><th>#</th><th>PTS</th><th>1</th><th>2</th><th>3</th></tr></thead><tbody>' + line + "</tbody></table></div>" : "<p>Lineup not published for this game.</p>") +
              (g.status === "FINAL" ? '<a class="btn" href="vote.html?game=' + esc(g.id) + '">Vote this game</a>' : "");
            row.insertAdjacentElement("afterend", box);
          }
        }
      }
    },
    vote() { renderVote(); },
    board() {
      wrap(
        '<p class="kicker">Most Valuable Brah</p><h1>Sealed until the Christmas party.</h1>' +
        '<section class="card stack"><h2>Winner revealed at the Christmas party.</h2><p>Ballots are write-only. The public site cannot read who voted, or who they picked. A count of ballots can show once that function is live. The tally stays shut until the reveal switch is turned on.</p><a class="btn" href="vote.html">Cast a vote</a><p class="note" id="ballot-note"></p></section>'
      );
      fetch(C.supabaseUrl + "/rest/v1/rpc/brahs_ballot_counts", {
        method: "POST",
        headers: { apikey: C.supabaseKey, Authorization: "Bearer " + C.supabaseKey, "Content-Type": "application/json" },
        body: "{}"
      }).then((r) => r.ok ? r.json() : null).then((rows) => {
        const n = document.getElementById("ballot-note");
        if (!n || !Array.isArray(rows) || !rows.length) return;
        const total = rows.reduce((a, r) => a + Number(r.ballots || 0), 0);
        n.textContent = total + (total === 1 ? " ballot is in across the season." : " ballots are in across the season.");
      }).catch(() => {});
    },
    partners() {
      const mail = (C.partnershipsEmail || "").trim();
      wrap(
        '<p class="kicker">Partnerships</p><h1>Back the Brahs.</h1>' +
        '<p class="lede">First-pass pitch. Daniel will rewrite this.</p>' +
        '<section class="card stack"><h2>Why partner</h2><p>Support Brahs is a community basketball side with a men\'s health purpose, not a closed social team. The room is the court, the Brah-B-Q and Movember. People come to move, then they stay to talk.</p><p>Past partners include lululemon and Spalding. The audience is the Instagram following, Tuesday night at MSAC, and the events: streetball, fundraisers, and the campaign month.</p><p class="note">[placeholder] Audience numbers, reach and the exact partnership history still need Daniel\'s figures.</p></section>' +
        '<section class="card stack"><h2>Ways to partner</h2><ul class="stack"><li>Event sponsor. Put your name on a Brah-B-Q or a game night.</li><li>Jersey or merch. A mark on the singlet, or a run of gear.</li><li>3x3 tournament. Court sponsor, balls, or the whole day.</li><li>Fundraising. Match a Movember push or back a campaign week.</li></ul><p class="note">[placeholder] Packages, costs and what a partner actually receives.</p></section>' +
        '<section class="card stack"><h2>Talk to us</h2><p>The form is the way in.' + (mail ? ' Or email <a href="mailto:' + esc(mail) + '">' + esc(mail) + "</a>." : "") + "</p>" +
        '<form id="enq" class="stack" novalidate>' +
        field("Name", "name", "text") + field("Email", "email", "email") + field("Organisation", "organisation", "text") +
        '<label class="field"><span>Enquiry</span><select name="enquiry_type" required><option value="">Choose one</option><option>Event sponsor</option><option>Jersey or merch</option><option>3x3 tournament</option><option>Fundraising</option><option>Something else</option></select></label>' +
        '<label class="field"><span>Message</span><textarea name="message" required maxlength="2000"></textarea></label>' +
        '<div class="hp"><label>Company URL<input name="company_url" tabindex="-1" autocomplete="off"></label></div>' +
        '<p class="err" id="enq-err" hidden></p><button class="btn" type="submit">Send</button></form>' +
        '<p id="enq-ok" hidden>Thanks. We have it, and we will reply.</p></section>'
      );
      const form = document.getElementById("enq");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const err = document.getElementById("enq-err");
        err.hidden = true;
        const data = Object.fromEntries(new FormData(form).entries());
        if ((data.company_url || "").trim()) {
          form.hidden = true;
          document.getElementById("enq-ok").hidden = false;
          return;
        }
        const last = Number(localStorage.getItem("brahs-enquiry-at") || 0);
        if (Date.now() - last < 60000) {
          err.textContent = "Give it a minute, then send again.";
          err.hidden = false;
          return;
        }
        if (!data.name || !data.email || !data.enquiry_type || !data.message) {
          err.textContent = "Name, email, enquiry and a message are required.";
          err.hidden = false;
          return;
        }
        const res = await fetch(C.supabaseUrl + "/rest/v1/brahs_enquiries", {
          method: "POST",
          headers: {
            apikey: C.supabaseKey,
            Authorization: "Bearer " + C.supabaseKey,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
          },
          body: JSON.stringify({
            name: data.name.trim(),
            email: data.email.trim(),
            organisation: (data.organisation || "").trim() || null,
            enquiry_type: data.enquiry_type,
            message: data.message.trim(),
            honey: null
          })
        });
        if (!res.ok) {
          err.textContent = "That didn't send. Try again in a minute.";
          err.hidden = false;
          return;
        }
        localStorage.setItem("brahs-enquiry-at", String(Date.now()));
        form.hidden = true;
        document.getElementById("enq-ok").hidden = false;
      });
    }
  };

  function field(label, name, type) {
    const req = name !== "organisation" ? " required" : "";
    return '<label class="field"><span>' + label + '</span><input name="' + name + '" type="' + type + '"' + req + "></label>";
  }

  function renderVote() {
    const played = finals();
    const params = new URLSearchParams(location.search);
    let gameId = params.get("game") || (played[0] && played[0].id);
    let voter = "";
    const picks = { three: "", two: "", one: "" };
    const extra = [];

    function game() { return S.games.find((g) => g.id === gameId) || played[0]; }
    function pool() {
      const g = game();
      const lineup = (g && g.lineup || []).filter((p) => p.kind !== "opponent");
      const base = lineup.length ? lineup.map((p) => p.name) : S.players.map((p) => p.name);
      return Array.from(new Set(base.concat(extra)));
    }
    function votedKey() { return "brahs-vote:" + (game() && game().id) + ":" + voter.trim().toLowerCase(); }

    function draw() {
      const g = game();
      const names = pool();
      const order = ["three", "two", "one"];
      const nextSlot = order.find((k) => !picks[k]);
      const taken = new Set(order.map((k) => picks[k]).filter(Boolean));
      wrap(
        '<p class="kicker">Vote</p><h1>Most Valuable Brah</h1>' +
        '<p class="lede">Three taps. You can\'t vote for yourself, or the same brah twice.</p>' +
        '<section class="card stack"><h2>The game</h2><div class="chips" id="games">' +
        played.map((gm) => '<button type="button" class="chip" data-game="' + esc(gm.id) + '" aria-pressed="' + (gm.id === g.id ? "true" : "false") + '">' + esc(gm.round) + " · " + esc(niceDate(gm.date)) + "<small>vs " + esc(gm.opponent) + "</small></button>").join("") +
        "</div></section>" +
        '<section class="card stack"><h2>Who are you?</h2><div class="chips" id="voters">' +
        names.map((n) => '<button type="button" class="chip" data-voter="' + esc(n) + '" aria-pressed="' + (n === voter ? "true" : "false") + '">' + esc(n) + "</button>").join("") +
        '</div><button class="btn ghost" type="button" id="add-open">Add a player</button><form id="add-form" class="row" hidden><input name="pname" maxlength="48" placeholder="Name" aria-label="Player name" style="flex:1;min-height:48px;border-radius:16px;border:1px solid var(--line);padding:8px 12px"><button class="btn" type="submit">Add</button></form></section>' +
        '<section class="card stack"><h2>Your 3-2-1</h2><div class="slots">' +
        order.map((k) => '<div class="slot"><b>' + ({ three: "3", two: "2", one: "1" }[k]) + "</b><span>" + esc(picks[k] || "Tap a name") + "</span></div>").join("") +
        '</div><div class="chips" id="picks">' +
        names.filter((n) => n !== voter).map((n) => '<button type="button" class="chip" data-pick="' + esc(n) + '" aria-pressed="' + (taken.has(n) ? "true" : "false") + '"' + (!voter || taken.has(n) ? " disabled" : "") + ">" + esc(n) + "</button>").join("") +
        '</div><p class="err" id="vote-err" hidden></p><p class="note" id="vote-hint"></p><button class="btn block" id="send" type="button"' + (!voter || order.some((k) => !picks[k]) ? " disabled" : "") + ">Submit</button></section>"
      );
      if (voter && localStorage.getItem(votedKey())) {
        document.getElementById("vote-hint").textContent = "This phone already sent a ballot for you in this game. Another one will be refused.";
      }
      document.getElementById("games").onclick = (e) => {
        const b = e.target.closest("[data-game]");
        if (!b) return;
        gameId = b.dataset.game;
        voter = "";
        picks.three = picks.two = picks.one = "";
        draw();
      };
      document.getElementById("voters").onclick = (e) => {
        const b = e.target.closest("[data-voter]");
        if (!b) return;
        voter = b.dataset.voter;
        if (picks.three === voter) picks.three = "";
        if (picks.two === voter) picks.two = "";
        if (picks.one === voter) picks.one = "";
        draw();
      };
      document.getElementById("add-open").onclick = () => { document.getElementById("add-form").hidden = false; };
      document.getElementById("add-form").onsubmit = async (e) => {
        e.preventDefault();
        const name = new FormData(e.target).get("pname").trim().replace(/\s+/g, " ");
        if (name.length < 2) return;
        extra.push(name);
        fetch(C.supabaseUrl + "/rest/v1/brahs_players", {
          method: "POST",
          headers: { apikey: C.supabaseKey, Authorization: "Bearer " + C.supabaseKey, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ name, source: "manual" })
        }).catch(() => {});
        draw();
      };
      document.getElementById("picks").onclick = (e) => {
        const b = e.target.closest("[data-pick]");
        if (!b || b.disabled) return;
        const name = b.dataset.pick;
        const slot = order.find((k) => !picks[k]);
        if (!slot) return;
        picks[slot] = name;
        draw();
      };
      document.getElementById("send").onclick = send;
    }

    async function send() {
      const err = document.getElementById("vote-err");
      const g = game();
      err.hidden = true;
      if (!voter || !picks.three || !picks.two || !picks.one) return;
      const low = [voter, picks.three, picks.two, picks.one].map((s) => s.toLowerCase());
      if (new Set(low).size < 4 || low.slice(1).includes(low[0])) {
        err.textContent = "Pick three different teammates, not yourself.";
        err.hidden = false;
        return;
      }
      const res = await fetch(C.supabaseUrl + "/rest/v1/brahs_votes", {
        method: "POST",
        headers: { apikey: C.supabaseKey, Authorization: "Bearer " + C.supabaseKey, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          game_id: g.id, game_date: g.date, round: g.round, opponent: g.opponent,
          voter, three: picks.three, two: picks.two, one: picks.one
        })
      });
      if (!res.ok) {
        err.textContent = res.status === 409 ? "You've already voted in this game." : "That didn't save. Try again.";
        err.hidden = false;
        return;
      }
      localStorage.setItem(votedKey(), "1");
      wrap(
        '<p class="kicker">Most Valuable Brah</p><h1>Votes are in.</h1>' +
        '<section class="card stack"><p>Thanks. Your ballot is sealed with the others.</p><a class="btn" href="board.html">Christmas party teaser</a></section>'
      );
    }
    draw();
  }

  if (pages[page]) pages[page]();
})();

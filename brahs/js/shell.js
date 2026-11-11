(function () {
  const NAV = [
    ["index.html", "Home", "home"],
    ["about.html", "About", "about"],
    ["history.html", "History", "history"],
    ["movember.html", "Movember", "movember"],
    ["gallery.html", "Gallery", "gallery"],
    ["locker.html", "Locker Room", "locker"],
    ["games.html", "Games & Stats", "games"],
    ["vote.html", "Vote / MVB", "vote"],
    ["partnerships.html", "Partnerships", "partners"]
  ];
  const here = document.body.dataset.nav || document.body.dataset.page || "home";
  const header = document.createElement("header");
  header.className = "top";
  header.innerHTML =
    '<a class="brand" href="index.html"><img class="badge" src="assets/mark-ball.jpg" width="36" height="36" alt="">' +
    '<span class="word"><svg class="crown" viewBox="0 0 24 14" width="22" height="12" aria-hidden="true"><path fill="currentColor" d="M1 13 4.2 5.2 8 8.4 12 1.2 16 8.4 19.8 5.2 23 13Z"/></svg>' +
    '<span class="support">Support</span><span class="brahs">BRAHS</span></span></a>' +
    '<button class="hamb" type="button" aria-expanded="false" aria-controls="site-nav"><span></span><span></span><span></span><span class="skip" style="position:static;left:auto;top:auto;width:1px;height:1px;overflow:hidden;padding:0">Menu</span></button>';
  const nav = document.createElement("nav");
  nav.id = "site-nav";
  nav.className = "navlinks";
  nav.innerHTML = NAV.map(([href, label, id]) =>
    '<a href="' + href + '"' + (id === here ? ' aria-current="page"' : "") + ">" + label + "</a>"
  ).join("");
  header.appendChild(nav);
  document.body.prepend(header);
  const btn = header.querySelector(".hamb");
  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  const C = window.BRAHS_CONFIG || {};
  const foot = document.createElement("footer");
  foot.className = "site-footer";
  foot.innerHTML =
    '<div class="wrap">' +
    '<div><a href="' + (C.instagram || "#") + '">Instagram @supportbrahs</a></div>' +
    '<div><a href="' + (C.movemberTeamUrl || "#") + '">Movember team</a> · <a href="' + (C.movemberShortUrl || "#") + '">movember.com/t/supportbrahs</a></div>' +
    "<div>Proud partners: lululemon, Movember, Spalding</div>" +
    "</div>";
  document.body.appendChild(foot);
})();

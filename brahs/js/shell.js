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
    '<a class="brand" href="index.html"><img src="assets/wordmark.svg" alt="Support Brahs"></a>' +
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

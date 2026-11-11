// Public wireframe copy. Edit this file. Pages read window.BRAHS_COPY.
// The research draft file was not on disk, so this is the current wireframe
// in one place, with the hero Daniel picked. Paste any other lines from that
// draft into the comments below.
//
// No surnames in this file. Nicknames only until Daniel confirms consent.
window.BRAHS_COPY = {
  // Hero. Chosen line:
  hero: "Connect, sweat, have a laugh.",
  // Alternatives:
  // "Show up. Have a crack."
  // "Move, grow and connect."

  home: {
    kicker: "The real brahs",
    lede: "A community basketball team for men to move, grow and connect. Corporate games in 2017. Tuesday nights at MSAC now.",
    motifs: [
      ["3x3", "Streetball"],
      ["Mo", "Movember"],
      ["Brah-B-Q", "The cook-up"]
    ],
    donate: "Donate to the team",
    next: "Next game",
    latest: "Latest result",
    lockerKicker: "Locker room",
    lockerTitle: "Every jersey, on its own hook.",
    lockerNote: "Black singlets on a rack. Nickname and number on the back.",
    lockerCta: "Open the locker room",
    mvbKicker: "Most Valuable Brah",
    mvbTitle: "Winner revealed at the Christmas party.",
    mvbNote: "3-2-1 only. One ballot each, after the game. Votes stay sealed.",
    vote: "Vote",
    teaser: "The teaser"
  },

  about: {
    kicker: "About",
    title: "A safe place to have a crack.",
    lede: "The Support Brahs are a community basketball team. The mission is simple: make room for men to move, grow and connect.",
    paragraphs: [
      "It started with lululemon SSC staff in Melbourne, joking their way into a corporate basketball team. Not everyone could play. Enough of them were willing to show up.",
      "The Tuesday game became the point of connection. Banter first, then the harder conversations. The team later moved into a weekly domestic comp: MCBA Tuesday Men B at MSAC.",
      "Age, size and ability are not the test. Show up and have a crack.",
      "There is a sister team, the Brah-lettes."
    ],
    moreTitle: "More than a team",
    more: "Merchandise, Brah-B-Qs and 3x3 tournaments turned the same group toward Movember. A lululemon story records more than $70,000 raised for men's health. The running total lives on the Movember page."
  },

  history: {
    kicker: "History",
    title: "From the loft to Tuesday night.",
    lede: "A first pass. Dates we are not sure of are marked placeholder.",
    items: [
      ["2017", "The team starts", "Co-founder Dan and lululemon SSC colleagues turn office banter into a corporate basketball side in Melbourne.", false],
      ["Soon after", "The Brah-lettes", "A sister team forms on the heels of the Brahs. The office starts treating Tuesday as part of the culture, not a one-off.", true],
      ["Dates TBC", "Brah-B-Q 1.0, 2.0 and 3.0", "Three editions of the cook-up fundraiser. Years still to be filled in from the archive.", true],
      ["2023", "3x3 Streetball Tournament", "Support Brahs host a 3x3 streetball event. A second annual edition followed. The year of that second one is still to confirm.", false],
      ["Year TBC", "3x3 Fire Relief", "A 3x3 event tied to fire relief. Detail and date still to confirm.", true],
      ["Year TBC", "Movember, Spalding and Support Brahs", "A partnership across the campaign, the ball brand and the team. Date to confirm.", true],
      ["By 2025", "More than $70,000", "The lululemon story records more than $70,000 for men's health. The live total is the Movember cache, taken from the team page.", false],
      ["Summer 2026/27", "Tuesday Men B at MSAC", "Support Brahs are in the MCBA domestic grade at Melbourne Sports and Aquatic Centre. Most Valuable Brah runs alongside the season.", false]
    ]
  },

  movember: {
    kicker: "Movember",
    title: "Men's health, centre court.",
    lede: "This is the team page, not a personal Mo page. Donate to The Support Brahs.",
    donate: "Donate on the team page",
    note: "The raised figure is the cache in brahs_settings. The Movember team page is the source. Update the cache when that page moves."
  },

  gallery: {
    kicker: "Gallery",
    title: "Pictures, when we have them.",
    intro: "A first handful from the team, plus this season's jersey.",
    sections: {
      All: "Court, campaign and jersey shots we can show now.",
      Movember: "Mo season. Runs, portraits and the mic.",
      "3x3 Streetball": "The black court and the outdoor game.",
      "Brah-B-Q": "Cook-up photos are still to come from the archive.",
      "Season jerseys": "This season's purple mesh singlet.",
      "Spalding partnership": "Spalding shots are still to come from the archive."
    }
  },

  locker: {
    kicker: "Locker room",
    title: "Nicknames on the back.",
    note: "Numbers are PlayHQ's where a first name matches. Max and Dave are marked provisional. A blank back means the number is not filled in yet."
  },

  mvb: {
    kicker: "Most Valuable Brah",
    title: "Sealed until the Christmas party.",
    cardTitle: "Winner revealed at the Christmas party.",
    body: "3-2-1 only. There is no Effort and Energy pick. Ballots are write-only. The public site cannot read who voted, or who they picked.",
    voteLede: "3-2-1 only. Three taps. Not yourself, and not the same brah twice.",
    thanks: "Thanks. Your ballot is sealed with the others.",
    cta: "Cast a vote"
  },

  footer: {
    instagram: "Instagram @supportbrahs",
    movember: "Movember team",
    partners: "Proud partners: lululemon, Movember, Spalding"
  },

  // Jersey backs use nick only. match is the PlayHQ first name, when we have one.
  // provisional: Daniel still needs to confirm the person.
  roster: [
    { nick: "Dan", number: "45", match: "Daniel" },
    { nick: "Dusty", number: "34", match: "Dusty" },
    { nick: "Jamo", number: "40" },
    { nick: "Max", number: "17", provisional: true },
    { nick: "Keith", number: "8", match: "Keith" },
    { nick: "Bill", number: "55", match: "William" },
    { nick: "Dave", number: "00", match: "David", provisional: true },
    { nick: "Flashy", number: "13" },
    { nick: "Jerome", number: "7", match: "Jerome" },
    { nick: "Boof", number: "15" },
    { nick: "Ilya", number: "21", match: "Ilya" },
    { nick: "Jacob", number: "23" },
    { nick: "Dilusha", number: "6" },
    { nick: "Bruno", number: "3" }
  ]
};

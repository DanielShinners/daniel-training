// Welcome / confirmation email sent once a player's payment goes through. Styled like yapperscup.com sections.
const NAMES: Record<string, string> = {
  FPL: 'Forward pocket', FF: 'Full forward', FPR: 'Forward pocket', HFFL: 'Half-forward flank', CHF: 'Centre half-forward', HFFR: 'Half-forward flank',
  WL: 'Wing', C: 'Centre', WR: 'Wing', RK: 'Ruck', RR: 'Ruck rover', R: 'Rover', HBFL: 'Half-back flank', CHB: 'Centre half-back', HBFR: 'Half-back flank',
  BPL: 'Back pocket', FB: 'Full back', BPR: 'Back pocket', I1: 'Interchange', I2: 'Interchange', I3: 'Interchange', I4: 'Interchange',
};
const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const SITE = 'https://yapperscup.com';
export const ASSETS = 'https://cdn.jsdelivr.net/gh/DanielShinners/daniel-training@af2cdb568a60d5697da9cc0f6297c3163a16434c/yappers-cup/assets/';
const MAP = 'https://www.google.com/maps/search/?api=1&query=Gosch%27s+Paddock+Olympic+Blvd+Melbourne';
const CAL = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('Yappers Cup 2026 · Mudguts v Pissants') +
  '&dates=20261129T013000Z/20261129T050000Z&location=' + encodeURIComponent("Gosch's Paddock, Olympic Blvd, Melbourne VIC") +
  '&details=' + encodeURIComponent('Arrive 12:30pm for a 1pm bounce. Bring boots or runners, a black top and a drink bottle. ' + SITE);
const DONATE = 'https://au.movember.com/events/view/id/kNxN', IG = 'https://www.instagram.com/yappers_cup';

// site tokens
const INK = '#101611', INK2 = '#181F19', CREAM = '#FFF0D7', RED = '#CD2A2D', MUTED = '#c9bfad', LINE = '#2f362f';
const DISPLAY = "Anton,Impact,'Arial Narrow Bold','Arial Narrow',Arial,sans-serif", BODY = "Archivo,Arial,Helvetica,sans-serif";

export function welcomeEmail(p: { first: string; team: string; pos: string; display: string; cents: number; photoLink?: string; hasPhoto?: boolean }, img = ASSETS) {
  const team = p.team === 'mudguts' ? 'Mudguts' : 'Pissants', posName = NAMES[p.pos] || p.pos, paid = '$' + (p.cents / 100).toFixed(2).replace(/\.00$/, '');
  const mine = p.team === 'mudguts' ? 'shield-mudguts.png' : 'shield-pissants.png';
  const subject = `You're in! ${team} · ${posName} · Yappers Cup 2026`;

  const eyebrow = (t: string) => `<p style="margin:0 0 6px;font:400 14px/1.2 ${DISPLAY};letter-spacing:.1em;text-transform:uppercase;color:${RED}">${t}</p>`;
  const h2 = (t: string) => `<h2 style="margin:0 0 14px;font:400 38px/1 ${DISPLAY};text-transform:uppercase;color:${CREAM}">${t}</h2>`;
  const section = (inner: string, bg = INK) => `<tr><td bgcolor="${bg}" style="background-color:${bg};padding:36px 30px;border-top:1px solid ${LINE}">${inner}</td></tr>`;
  const btn = (href: string, t: string, ghost = false) => `<a href="${href}" style="display:inline-block;margin:6px 8px 0 0;padding:13px 22px;border-radius:4px;font:400 17px/1 ${DISPLAY};letter-spacing:.05em;text-transform:uppercase;text-decoration:none;${ghost ? `border:2px solid ${CREAM};padding:11px 20px;color:${CREAM}` : `background-color:${RED};color:${CREAM}`}">${t}</a>`;
  // ruled rows like the site's numbered steps
  const rows = (items: [string, string][]) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items.map(([k, v]) =>
    `<tr><td valign="top" style="width:58px;padding:12px 0;border-top:1px solid ${LINE};font:400 20px/1.2 ${DISPLAY};color:${RED}">${k}</td><td style="padding:12px 0;border-top:1px solid ${LINE};font:15px/1.55 ${BODY};color:${MUTED}">${v}</td></tr>`).join('')}</table>`;
  const b = (t: string) => `<strong style="color:${CREAM}">${t}</strong>`;
  const n = (i: number) => String(i + 1).padStart(2, '0');

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="only dark"><meta name="supported-color-schemes" content="dark"><style>:root{color-scheme:only dark;supported-color-schemes:dark}</style>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;600;800&display=swap" rel="stylesheet"></head>
<body bgcolor="#0b0f0c" style="margin:0;padding:0;background-color:#0b0f0c">
<div style="display:none;max-height:0;overflow:hidden">Your spot is locked in: ${esc(team)}, ${esc(posName)}. Sunday 29 November, arrive 12:30pm.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0b0f0c" style="background-color:#0b0f0c"><tr><td align="center" bgcolor="#0b0f0c" style="padding:20px 10px;background-color:#0b0f0c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${INK}" style="max-width:620px;background-color:${INK}">

<tr><td bgcolor="${INK}" style="padding:16px 30px;border-bottom:1px solid ${LINE};background-color:${INK}">
  <a href="${SITE}" style="text-decoration:none;border:0"><img src="${img}lockup-small.png" height="30" alt="Yappers Cup" style="display:block;height:30px;width:auto"></a>
</td></tr>

<tr><td bgcolor="${INK2}" style="padding:44px 30px 40px;text-align:center;background-color:${INK2}">
  <a href="${SITE}" style="text-decoration:none;border:0"><img src="${img}wordmark-cream.png" width="420" alt="Yappers Cup" style="display:block;margin:0 auto;width:100%;max-width:420px;height:auto"></a>
  <p style="margin:14px 0 0;font:400 18px/1.2 ${DISPLAY};letter-spacing:.06em;text-transform:uppercase;color:${CREAM}">Kicking goals for men's health</p>
  <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:26px auto 0"><tr>
    <td><a href="${SITE}" style="text-decoration:none;border:0"><img src="${img}shield-mudguts.png" width="96" alt="Mudguts" style="display:block;height:auto;${p.team === 'mudguts' ? '' : 'opacity:.45'}"></a></td>
    <td style="padding:0 16px;font:400 26px/1 ${DISPLAY};text-transform:uppercase;color:${RED}">vs</td>
    <td><a href="${SITE}" style="text-decoration:none;border:0"><img src="${img}shield-pissants.png" width="96" alt="Pissants" style="display:block;height:auto;${p.team === 'pissants' ? '' : 'opacity:.45'}"></a></td>
  </tr></table>
  <p style="margin:18px 0 0;font:800 12px/1.4 ${BODY};letter-spacing:.24em;text-transform:uppercase;color:${MUTED}">Sunday 29 November 2026 · 1pm bounce</p>
</td></tr>

${section(`
  ${eyebrow('Payment received · You\'re on the team sheet')}
  <h1 style="margin:0 0 12px;font:400 52px/.95 ${DISPLAY};text-transform:uppercase;color:${CREAM}">You're in, ${esc(p.first)}!</h1>
  <p style="margin:0;font:16px/1.55 ${BODY};color:${MUTED}">Your spot is locked in and your name is up on the ground. Thanks for backing men's health.</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;border:1px solid #3a413a;border-radius:8px"><tr>
    <td width="86" style="padding:16px 0 16px 18px"><a href="${SITE}" style="text-decoration:none;border:0"><img src="${img}${mine}" width="68" alt="${team}" style="display:block;height:auto"></a></td>
    <td style="padding:16px 18px 16px 10px">
      <p style="margin:0;font:400 30px/1 ${DISPLAY};text-transform:uppercase;color:${CREAM}">${esc(posName)}</p>
      <p style="margin:6px 0 0;font:14px/1.5 ${BODY};color:${MUTED}">${team} · on the team sheet as ${b(esc(p.display))}</p>
    </td>
    <td align="right" style="padding:16px 18px;font:400 40px/1 ${DISPLAY};color:${RED}">${paid}</td>
  </tr></table>
  <p style="margin:10px 0 0;font:13px/1.5 ${BODY};color:${MUTED}">Your payment receipt from Stripe comes in a separate email.</p>
  ${p.photoLink ? `<p style="margin:18px 0 0;font:15px/1.55 ${BODY};color:${MUTED}">${p.hasPhoto ? 'Your photo is up on the team sheet. Want a different one?' : 'Put a face to the name. Add a headshot and it shows on the team sheet.'}</p>${btn(p.photoLink, p.hasPhoto ? 'Change your photo' : 'Add your photo', true)}` : ''}
`)}

${section(`
  ${eyebrow('Sunday 29 November 2026')}
  ${h2('Match day')}
  ${rows([['12:30', `${b('Arrive by 12:30pm.')} Grab your top and warm up.`], ['1PM', `${b('First bounce.')} Two 20-minute halves.`], ['MAP', `${b("Gosch's Paddock.")} Off Olympic Boulevard next to AAMI Park, on the Richmond side of the river.`]])}
  <p style="margin:12px 0 0">${btn(MAP, 'Open in Maps')}${btn(CAL, 'Add to calendar', true)}</p>
`, INK2)}

${section(`
  ${eyebrow('Before the bounce')}
  ${h2('Getting there')}
  ${rows([['01', `${b('Drive.')} Park around the Tan and walk across the river, or find a spot on the streets around Richmond.`], ['02', `${b('Tram 70')} from Flinders Street or Richmond stations stops at AAMI Park on Olympic Boulevard.`], ['03', `${b('Train')} to Richmond Station and walk.`]])}
`)}

${section(`
  ${eyebrow('Pack your bag')}
  ${h2('What to bring')}
  ${rows([['01', b('Footy boots or runners')], ['02', b('A black top')], ['03', `${b('A mouthguard')} (optional)`], ['04', b('A drink bottle')]])}
  <p style="margin:14px 0 0;font:15px/1.55 ${BODY};color:${MUTED}">We'll likely head to the pub for a beer after the game.</p>
`, INK2)}

${section(`
  ${eyebrow('Read before you play')}
  ${h2('The rules')}
  ${rows([
    'Mudguts v Pissants, 22 players per side with rolling interchange.',
    'Two 20-minute halves.',
    "Play it like a training practice match. It's not touch footy, but we're all mates and nobody wants an injury.",
    'No hard sling tackles.', 'No boundary umpires.', 'Lasso rule applies for the whole ground.', 'No arguing with the umpires.', 'No dickheads.',
  ].map((t, i) => [n(i), t] as [string, string]))}
`)}

${section(`
  ${eyebrow('Good to know')}
  ${h2('Rain, risk &amp; changes')}
  ${rows([['01', `${b('We play through the rain.')} Any changes go up on <a href="${IG}" style="color:${CREAM}">our Instagram</a>.`], ['02', `${b('Everyone plays at their own risk.')} See the <a href="${SITE}/terms.html" style="color:${CREAM}">terms &amp; conditions</a>.`], ['03', `${b("Can't make it any more?")} Reply to this email so someone else can take your spot.`]])}
`, INK2)}

${section(`
  ${eyebrow('Mini game · Warm up before the bounce')}
  ${h2('Goal-kicking practice')}
  <a href="${SITE}/#kick" style="display:block;text-decoration:none"><img src="${img}kick-preview.jpg" width="560" alt="Play the Yappers Cup goal-kicking game" style="display:block;width:100%;max-width:560px;height:auto;border-radius:8px;border:1px solid #3a413a"></a>
  <p style="margin:14px 0 0;font:16px/1.55 ${BODY};color:${MUTED}">Pick your team, drag back to aim and let go. 60 seconds to rack up goals and get your name on the leaderboard. Top the board and you'll see why it's worth it.</p>
  <p style="margin:14px 0 0">${btn(SITE + '/#kick', 'Play the game')}</p>
`)}

${section(`
  ${eyebrow('Footy worth talking about')}
  ${h2('Help us raise more')}
  <p style="margin:0;font:16px/1.55 ${BODY};color:${MUTED}">All profits raised go to Movember, funding men's mental health, suicide prevention and men's cancer programs. Know someone who wants to play, or mates and family who'd like to chip in?</p>
  <p style="margin:14px 0 0">${btn(SITE, 'Share the sign-up')}${btn(DONATE, 'Donate to Movember', true)}</p>
`, INK2)}

<tr><td bgcolor="${INK}" style="padding:40px 30px 36px;text-align:center;border-top:1px solid ${LINE};background-color:${INK}">
  <a href="${SITE}" style="text-decoration:none;border:0"><img src="${img}wordmark-red.png" width="260" alt="Yappers Cup" style="display:block;margin:0 auto;width:60%;max-width:260px;height:auto"></a>
  <p style="margin:18px 0 0;font:800 12px/1.6 ${BODY};letter-spacing:.24em;text-transform:uppercase;color:${MUTED}">Kicking goals for men's health</p>
  <p style="margin:10px 0 0;font:800 11px/1.6 ${BODY};letter-spacing:.24em;text-transform:uppercase;color:${MUTED}">Proudly supporting</p>
  <a href="${DONATE}" style="text-decoration:none;border:0"><img src="${img}movember-white.png" width="120" alt="Movember" style="display:block;margin:8px auto 0;height:auto"></a>
  <p style="margin:22px 0 0;font:13px/1.7 ${BODY};color:${MUTED}">Questions? Just reply, or email <a href="mailto:hello@yapperscup.com" style="color:${CREAM}">hello@yapperscup.com</a><br>
  <a href="${IG}" style="color:${CREAM}">@yappers_cup</a> · <a href="${SITE}" style="color:${CREAM}">yapperscup.com</a></p>
</td></tr>

</table></td></tr></table></body></html>`;

  const text = `YOU'RE IN, ${p.first.toUpperCase()}!

Your spot is locked in.
${posName} · ${team} · on the team sheet as ${p.display} · paid ${paid}
(Stripe receipt sent separately)
${p.photoLink ? `\n${p.hasPhoto ? 'Change your photo' : 'Add your photo to the team sheet'}: ${p.photoLink}\n` : ''}
MATCH DAY · Sunday 29 November 2026
- Arrive by 12:30pm. First bounce 1pm. Two 20-minute halves.
- Gosch's Paddock, off Olympic Boulevard next to AAMI Park.
Map: ${MAP}
Add to calendar: ${CAL}

GETTING THERE
- Park around the Tan and walk across the river, or find a spot on the streets around Richmond.
- Tram 70 from Flinders Street or Richmond stations to AAMI Park on Olympic Boulevard.
- Train to Richmond Station and walk.

WHAT TO BRING
- Footy boots or runners
- A black top
- A mouthguard (optional)
- A drink bottle
We'll likely head to the pub for a beer after.

THE RULES
- 22 players per side, rolling interchange. Two 20-minute halves.
- Play it like a training practice match. Not touch footy, but nobody wants an injury.
- No hard sling tackles. No boundary umpires. Lasso rule applies for the whole ground.
- No arguing with the umpires. No dickheads.

GOOD TO KNOW
- We play through the rain. Changes go up on Instagram: ${IG}
- Everyone plays at their own risk: ${SITE}/terms.html
- Can't make it? Reply and let us know.

GOAL-KICKING PRACTICE\nWarm up with the mini game: 60 seconds to top the leaderboard. ${SITE}/#kick\n\nAll profits raised go to Movember. Share the sign-up: ${SITE}  Donate: ${DONATE}

Questions? Reply or email hello@yapperscup.com`;
  return { subject, html, text };
}

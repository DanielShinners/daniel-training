# Support Brahs

Public site for [supportbrahs.com](https://supportbrahs.com). This folder is the whole site. When it moves to its own repo, the files at this level are the site root. Asset paths are relative, so they work at the domain root.

Canonical URLs, Open Graph tags and `sitemap.xml` point at `https://supportbrahs.com`.

## Preview

The pages render from `js/season.js`, a snapshot of the public PlayHQ fixture pulled on 11 Nov 2026. The browser does not call PlayHQ. A refresh script that writes `brahs_games` and `brahs_player_stats` is still to come.

## Votes

`brahs_votes` allows anonymous insert only. There is no select policy, so the public key cannot read ballots or tallies. `brahs_ballot_counts()` returns a count per game. `brahs_public_board()` returns tallies only when `brahs_settings.results_revealed` is true. That row has no anonymous policy. Flip it from the SQL editor, with the service role:

```sql
update public.brahs_settings
set results_revealed = true, updated_at = now()
where id = 'reveal';
```

To read ballots before the party, use the service role (not the public site):

```sql
select game_id, round, opponent, voter, three, two, one, created_at
from public.brahs_votes
order by game_date, voter;
```

## Movember

The confirmed all-time figure is **$89,559**, stored on `brahs_settings` and labelled **all-time raised**. The page reads it through `brahs_movember()`. Update it there when the Movember team page changes:

```sql
update public.brahs_settings
set movember_raised_cents = 8955900,
    movember_as_of = 'all-time raised',
    updated_at = now()
where id = 'reveal';
```

Donate links go to the team page, not a personal profile.

## Partnerships

The page shows `partnerships@supportbrahs.com` from `partnershipsEmail` in `js/config.js`. The form is the main path. Submissions insert into `brahs_enquiries` (anonymous insert only, no select). A honeypot column and a trigger allow one enquiry per email per minute, and three per hour.

Email is a Supabase Edge Function at `supabase/functions/brahs-enquiry-email`. It is **not deployed**. Deploy it only after these secrets are set:

| Secret | Purpose |
| --- | --- |
| `ENQUIRY_TO` | Inbox that receives the enquiry. Not stored in the site. |
| `ENQUIRY_FROM` | From address on a domain Resend has verified. |
| `RESEND_API_KEY` | Resend API key. |
| `WEBHOOK_SECRET` | Shared secret. The database webhook must send it as `x-brahs-webhook`. |

Then add a Database Webhook on `public.brahs_enquiries` INSERT to the function URL. If any secret is missing the function returns 503 and sends nothing.

## Roster numbers

PlayHQ numbers are stored when the sheet had one. They are not confirmed against the printer's list (45, 34, 40, 17, 8, 00, 13, 21, 23, 6, 3, 55, 7, 15). Daniel still needs to map them. Anyone without a PlayHQ number gets the next free number from that list, flagged as a placeholder. No number outside that list is invented.

## Credits

The header wordmark is set in type: a crown, italic Support, condensed BRAHS. It is not a trace of the lululemon or Movember marks. The small ball photo is the Instagram profile image, used only at badge size. Event photos are from @supportbrahs and stay at or below their original 640px. The jersey crest is redrawn. The locker is a simple three.js stand-in (three.js is MIT).

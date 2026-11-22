# Yappers Cup

Site for the Yappers Cup — Mudguts vs Pissants, Sunday 29 November 2026, raising funds for Movember.
Lives in this repo as a static folder; it shares the daniel-training Supabase project.

- `index.html` — the page (hero, about, teams, "Take the field", supporters & partners form, donate)
- `js/ground.js` — **The Ground**: an MCG-style stadium drawn on a canvas (no libraries). Players pick a team, then a position, and claim it with a Movember donation.
- `css/ground.css` — styles for The Ground
- `assets/` — artwork from the brand treatment and partnership deck

## Config
`window.YC_CONFIG` near the bottom of `index.html`: Supabase URL + publishable key, and `donateUrl` (swap in the Yappers Cup Movember team page).

## Positions
22 per team (18 on the ground + 4 interchange). Minimum donations: $100 key positions (FF, CHF, Ruck, Centre, CHB, FB), $50 other on-field, $25 interchange.
Change prices in two places: `PRICE` in `js/ground.js` and `yc_claim()` in Supabase.

## Confirming a player
A claim is `pending` and held for 7 days. When their donation shows up on Movember, open Supabase → Table Editor → `yc_positions` and set `status` to `confirmed`. Their name then shows on the ground and the scoreboard.
Supporter and partner sign-ups land in `yappers_cup_signups`.

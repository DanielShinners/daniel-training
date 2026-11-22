# Yappers Cup

Site for the Yappers Cup — Mudguts vs Pissants, Sunday 29 November 2026, raising funds for Movember.
Lives in this repo as a static folder; it shares the daniel-training Supabase project.

- `index.html` — the page (hero, about, teams, "Take the field", supporters & partners form, donate)
- `js/ground.js` — **The Ground**: an MCG-style stadium drawn on a canvas (no libraries). Players pick a team, then a position, and claim it with a Movember donation.
- `css/ground.css` — styles for The Ground
- `assets/` — artwork from the brand treatment and partnership deck

## Live site
https://yappers-cup.vercel.app (Vercel project `yappers-cup`). The Vercel copy holds `index.html` and `terms.html`; artwork, `js/` and `css/` load from jsDelivr pinned to a commit of this folder. After changing those files, push, then redeploy with the new commit hash in the URLs.

## Config
`window.YC_CONFIG` near the bottom of `index.html`: Supabase URL + publishable key, and `donateUrl` (swap in the Yappers Cup Movember team page).

## Positions
22 per team (18 on the ground + 4 interchange). Every position is a $25 minimum donation.
To change the price, update `PRICE` in `js/ground.js` and `mn` in `yc_claim()` in Supabase.

## Terms
`terms.html` holds the terms & conditions (own risk, release, first aid, donations, media, privacy). Both the position claim and the supporter/partner form require ticking the box; the time and terms version are saved with each sign-up (`terms_accepted_at`, `terms_version`). If you change the terms, bump `TERMS_VERSION` in `js/ground.js` and the version in `index.html`.

## Confirming a player
A claim is `pending` and held for 7 days. When their donation shows up on Movember, open Supabase → Table Editor → `yc_positions` and set `status` to `confirmed`. Their name then shows on the ground and the scoreboard.
Supporter and partner sign-ups land in `yappers_cup_signups`.

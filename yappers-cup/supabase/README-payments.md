# Card payments (Stripe)

- Edge function `yc-pay` (deployed to Supabase project dsbfhvmcxafqeawwgcrf, verify_jwt off).
  - `checkout`: reserves the position via `yc_claim`, opens a Stripe Checkout session (AUD, 31-minute expiry), returns its URL.
  - `confirm`: after the redirect back (`?paid=cs_...`), checks the session with Stripe and marks the position `confirmed`.
  - `reconcile`: runs whenever the ground opens; confirms any paid sessions whose tab was closed before the redirect.
- Needs the Supabase Edge Function secret `STRIPE_SECRET_KEY`. Until it's set, the site falls back to reserve-and-donate on Movember.
- Unpaid card checkouts release the spot after 45 minutes; old-style donation holds keep 1 day.
- DB: `yc_positions.stripe_session`, `paid_at`, `paid_cents`; functions `yc_expire`, `yc_set_session`, `yc_mark_paid`, `yc_open_sessions` (service role only).

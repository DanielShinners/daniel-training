// Yappers Cup: pay for a position with Stripe Checkout, then send the welcome email.
// actions: checkout (reserve + open Stripe), confirm (after redirect back), reconcile (catch payments where the tab was closed),
// photo (add, change or remove a player's headshot with their private photo token).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { welcomeEmail } from './email.ts';

const ORIGINS = ['https://yapperscup.com', 'https://www.yapperscup.com', 'https://yappers-cup.vercel.app'];
const SITE = 'https://yapperscup.com';
const POS_RE = /^(mudguts|pissants)-(FB|BPL|BPR|CHB|HBFL|HBFR|C|WL|WR|CHF|HFFL|HFFR|FF|FPL|FPR|RK|RR|R|I1|I2|I3|I4)$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = 'yc-photos';
const okOrigin = (o: string | null) => !!o && (ORIGINS.includes(o) || /^http:\/\/localhost(:\d+)?$/.test(o));
const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': okOrigin(origin) ? origin! : ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});
const NAMES: Record<string, string> = {
  FPL: 'Forward pocket', FF: 'Full forward', FPR: 'Forward pocket', HFFL: 'Half-forward flank', CHF: 'Centre half-forward', HFFR: 'Half-forward flank',
  WL: 'Wing', C: 'Centre', WR: 'Wing', RK: 'Ruck', RR: 'Ruck rover', R: 'Rover', HBFL: 'Half-back flank', CHB: 'Centre half-back', HBFR: 'Half-back flank',
  BPL: 'Back pocket', FB: 'Full back', BPR: 'Back pocket', I1: 'Interchange', I2: 'Interchange', I3: 'Interchange', I4: 'Interchange',
};

async function stripe(path: string, method = 'GET', form?: Record<string, string>) {
  const key = (Deno.env.get('STRIPE_SECRET_KEY') || '').trim();
  if (!key) throw new Error('not_configured');
  const res = await fetch('https://api.stripe.com/v1/' + path, {
    method, headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const j = await res.json();
  if (!res.ok) { console.error('stripe error', res.status, j?.error?.type, j?.error?.code, j?.error?.message); throw new Error(j?.error?.message || 'stripe_error'); }
  return j;
}

// send the welcome email once per paid position (claimed atomically so it never goes twice)
async function sendWelcome(sb: any, session: string) {
  const key = (Deno.env.get('RESEND_API_KEY') || '').trim();
  if (!key) return;
  const { data: rows } = await sb.from('yc_positions').update({ welcome_sent_at: new Date().toISOString() })
    .eq('stripe_session', session).eq('status', 'confirmed').is('welcome_sent_at', null)
    .select('position_id,full_name,email,team,pos,display_name,paid_cents,amount,photo_url,photo_token');
  const r = rows && rows[0]; if (!r) return;
  const first = String(r.full_name || '').trim().split(/\s+/)[0] || 'legend';
  const m = welcomeEmail({ first, team: r.team, pos: r.pos, display: r.display_name, cents: r.paid_cents ?? r.amount * 100, hasPhoto: !!r.photo_url, photoLink: `${SITE}/?photo=${r.position_id}.${r.photo_token}#ground` });
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Yappers Cup <hello@yapperscup.com>', to: [r.email], reply_to: 'hello@yapperscup.com', subject: m.subject, html: m.html, text: m.text }),
  });
  if (!res.ok) {
    console.error('welcome email failed', res.status, await res.text());
    await sb.from('yc_positions').update({ welcome_sent_at: null }).eq('stripe_session', session);   // try again next time
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const h = { ...cors(origin), 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  const out = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: h });
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  const confirm = async (id: string) => {
    const s = await stripe('checkout/sessions/' + encodeURIComponent(id));
    if (s.payment_status !== 'paid') return { ok: false, status: s.status };
    const { data } = await sb.rpc('yc_mark_paid', { p_session: id, p_cents: s.amount_total });
    if (data && data.ok) { try { await sendWelcome(sb, id); } catch (e) { console.error('welcome error', (e as Error).message); } }
    return data && data.ok ? { ...data, paid: true } : { ok: false };
  };

  try {
    if (body.action === 'checkout') {
      if (!Deno.env.get('STRIPE_SECRET_KEY')) return out({ ok: false, error: 'not_configured' });
      const c = body.claim || {};
      const { data: r, error } = await sb.rpc('yc_claim', c);
      if (error) { console.error('claim error', error.message); return out({ ok: false, error: 'That didn\'t go through. Try again.' }); }
      if (!r.ok) return out(r);
      const base = okOrigin(origin) ? origin! : ORIGINS[0];
      const [team, code] = String(c.p_position).split('-');
      const label = `Yappers Cup 2026 · ${team === 'mudguts' ? 'Mudguts' : 'Pissants'} · ${NAMES[code] || code}`;
      try {
        const s = await stripe('checkout/sessions', 'POST', {
          mode: 'payment',
          'line_items[0][quantity]': '1',
          'line_items[0][price_data][currency]': 'aud',
          'line_items[0][price_data][unit_amount]': String(Math.round(r.amount) * 100),
          'line_items[0][price_data][product_data][name]': label,
          'line_items[0][price_data][product_data][description]': 'Player entry. All proceeds go to Movember.',
          customer_email: String(c.p_email).trim(),
          'metadata[position]': c.p_position,
          'metadata[name]': r.name,
          'payment_intent_data[description]': label,
          expires_at: String(Math.floor(Date.now() / 1000) + 31 * 60),
          success_url: `${base}/?paid={CHECKOUT_SESSION_ID}#ground`,
          cancel_url: `${base}/?cancelled=1#ground`,
        });
        await sb.rpc('yc_set_session', { p_position: c.p_position, p_email: c.p_email, p_session: s.id });
        const { data: t } = await sb.from('yc_positions').select('photo_token').eq('position_id', c.p_position).eq('email', String(c.p_email).trim().toLowerCase()).maybeSingle();
        return out({ ok: true, url: s.url, name: r.name, token: t?.photo_token });
      } catch (e) {
        await sb.from('yc_positions').delete().eq('position_id', c.p_position).eq('status', 'pending').is('stripe_session', null);
        throw e;
      }
    }
    if (body.action === 'photo') {
      const pos = String(body.position || ''), token = String(body.token || '');
      if (!POS_RE.test(pos) || !UUID_RE.test(token)) return out({ ok: false, error: 'That photo link isn\'t right.' });
      const { data: row } = await sb.from('yc_positions').select('position_id,team,pos,display_name,full_name,status,photo_url').eq('position_id', pos).eq('photo_token', token).maybeSingle();
      if (!row) return out({ ok: false, error: 'That photo link has expired or isn\'t right.' });
      const info = { ok: true, position: row.position_id, team: row.team, pos: row.pos, name: row.display_name, first: String(row.full_name || '').trim().split(/\s+/)[0], photo: row.photo_url };
      const oldPath = row.photo_url && row.photo_url.includes(`/${BUCKET}/`) ? row.photo_url.split(`/${BUCKET}/`)[1] : null;
      if (body.remove === true) {
        await sb.from('yc_positions').update({ photo_url: null }).eq('position_id', pos).eq('photo_token', token);
        if (oldPath) await sb.storage.from(BUCKET).remove([oldPath]);
        return out({ ...info, photo: null });
      }
      if (typeof body.image !== 'string') return out(info);
      const b64 = body.image.replace(/^data:image\/jpeg;base64,/, '');
      let bytes: Uint8Array;
      try { bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0)); } catch { return out({ ok: false, error: 'That photo didn\'t come through. Try another.' }); }
      if (bytes.length < 1000 || bytes.length > 500000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return out({ ok: false, error: 'That photo didn\'t come through. Try another.' });
      const path = `${pos}/${crypto.randomUUID()}.jpg`;
      const up = await sb.storage.from(BUCKET).upload(path, bytes, { contentType: 'image/jpeg', cacheControl: '31536000' });
      if (up.error) { console.error('photo upload', up.error.message); return out({ ok: false, error: 'Couldn\'t save that photo. Try again.' }); }
      const url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      await sb.from('yc_positions').update({ photo_url: url }).eq('position_id', pos).eq('photo_token', token);
      if (oldPath) await sb.storage.from(BUCKET).remove([oldPath]);
      return out({ ...info, photo: url });
    }
    if (body.action === 'confirm' && typeof body.session === 'string' && body.session.startsWith('cs_')) return out(await confirm(body.session));
    if (body.action === 'reconcile') {
      if (!Deno.env.get('STRIPE_SECRET_KEY')) return out({ ok: true, done: 0 });
      const { data } = await sb.rpc('yc_open_sessions');
      let done = 0;
      for (const id of (data || []) as string[]) { try { const r = await confirm(id); if (r.ok) done++; } catch { /* keep going */ } }
      return out({ ok: true, done });
    }
    return out({ ok: false, error: 'bad_request' }, 400);
  } catch (e) {
    const m = (e as Error).message;
    console.error('yc-pay failed:', m);
    return out({ ok: false, error: m === 'not_configured' ? 'not_configured' : 'Payment couldn\'t start. Try again in a sec.' });
  }
});

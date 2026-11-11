// Emails a new brahs_enquiries row. Do not deploy until the secrets exist.
// Secrets: ENQUIRY_TO, ENQUIRY_FROM, RESEND_API_KEY, WEBHOOK_SECRET.
// ENQUIRY_TO is the inbox the partnerships@ address forwards to. It is not in the site.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  const to = Deno.env.get("ENQUIRY_TO");
  const from = Deno.env.get("ENQUIRY_FROM");
  const key = Deno.env.get("RESEND_API_KEY");
  const hook = Deno.env.get("WEBHOOK_SECRET");
  if (!to || !from || !key || !hook) {
    return new Response("Enquiry email secrets are not set", { status: 503 });
  }
  if (req.headers.get("x-brahs-webhook") !== hook) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const row = body && (body.record || body);
  if (!row || !row.email || !row.message) {
    return new Response("No enquiry", { status: 400 });
  }
  const text = [
    "New Support Brahs partnership enquiry",
    "",
    "Name: " + (row.name || ""),
    "Email: " + row.email,
    "Organisation: " + (row.organisation || ""),
    "Type: " + (row.enquiry_type || ""),
    "",
    row.message
  ].join("\n");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: row.email,
      subject: "Partnership enquiry: " + (row.enquiry_type || "general"),
      text
    })
  });
  if (!res.ok) {
    return new Response("Email provider rejected the send", { status: 502 });
  }
  return new Response("ok", { status: 200 });
});

import Stripe from 'stripe';

// Stripe webhook — listens for completed checkouts (Payment Link or Checkout
// Session) and marks the matching wedding account as "purchased" in Supabase.
//
// Note: this talks to Supabase via a plain REST (PostgREST) call instead of
// the @supabase/supabase-js client. The JS client always tries to spin up a
// Realtime (WebSocket) client on construction, which crashes in Netlify's
// Node 20 function runtime ("Node.js 20 detected without native WebSocket
// support"). We don't need Realtime here, so a direct fetch avoids the bug
// entirely and needs no extra dependency.
//
// Required Netlify environment variables (Site settings → Environment variables):
//   STRIPE_SECRET_KEY         — from Stripe Dashboard → Developers → API keys
//   STRIPE_WEBHOOK_SECRET     — from Stripe Dashboard → Developers → Webhooks
//                                (the "Signing secret" of the endpoint you create)
//   SUPABASE_URL              — same value as VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY — from Supabase → Project Settings → API
//                                (service_role / secret key — never expose this to the frontend)
//
// Webhook endpoint URL to configure in Stripe: https://<your-site>/api/stripe-webhook
// Event to subscribe to: checkout.session.completed
//
// Optionale Monitoring/Alerting-Umgebungsvariable:
//   ALERT_WEBHOOK_URL — Slack- oder Discord-"Incoming Webhook"-URL. Wenn
//                        gesetzt, schickt diese Funktion bei einem echten
//                        Fehler (z.B. Zahlung eingegangen, aber Account
//                        konnte nicht freigeschaltet werden) sofort eine
//                        Nachricht dorthin. Ohne diese Variable läuft alles
//                        wie bisher, nur ohne Benachrichtigung — nichts
//                        bricht, wenn sie fehlt.

async function notifyAlert(message) {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    const isDiscord = url.includes('discord.com');
    const payload = isDiscord ? { content: `🚨 ${message}` } : { text: `🚨 ${message}` };
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Die Benachrichtigung selbst darf den eigentlichen Webhook nicht
    // zusätzlich zum Absturz bringen — nur loggen.
    console.error('[stripe-webhook] alert notification failed:', err.message);
  }
}

export default async (req) => {
  try {
    const sig = req.headers.get('stripe-signature');
    const body = await req.text();

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('[stripe-webhook] signature verification failed:', err.message);
      await notifyAlert(`Stripe-Webhook: Signaturprüfung fehlgeschlagen — ${err.message}. Falls das öfter passiert, STRIPE_WEBHOOK_SECRET in Netlify prüfen.`);
      return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id;

      if (!userId) {
        console.warn('[stripe-webhook] checkout.session.completed without client_reference_id — cannot unlock account');
        await notifyAlert(`Stripe-Webhook: Zahlung eingegangen (session ${session.id}), aber OHNE client_reference_id — Account konnte NICHT automatisch freigeschaltet werden. Bitte manuell prüfen!`);
      } else {
        const supabaseUrl  = process.env.SUPABASE_URL;
        const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const res = await fetch(`${supabaseUrl}/rest/v1/weddings?user_id=eq.${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          headers: {
            'apikey':        serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type':  'application/json',
            'Prefer':        'return=minimal',
          },
          body: JSON.stringify({
            purchased:         true,
            purchased_at:      new Date().toISOString(),
            stripe_session_id: session.id,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error('[stripe-webhook] failed to unlock account:', res.status, text);
          await notifyAlert(`Stripe-Webhook: Zahlung eingegangen (user_id ${userId}, session ${session.id}), aber Datenbank-Update fehlgeschlagen (Status ${res.status}). Account wurde NICHT freigeschaltet — bitte manuell in Supabase nachtragen!`);
          return new Response('Database update failed', { status: 500 });
        }
        console.log(`[stripe-webhook] unlocked account for user_id=${userId}`);
      }
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('[stripe-webhook] unerwarteter Fehler:', err);
    await notifyAlert(`Stripe-Webhook: unerwarteter Absturz — ${err.message}`);
    return new Response('Internal error', { status: 500 });
  }
};

export const config = { path: '/api/stripe-webhook' };

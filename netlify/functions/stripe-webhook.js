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

export default async (req) => {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err.message);
    return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;

    if (!userId) {
      console.warn('[stripe-webhook] checkout.session.completed without client_reference_id — cannot unlock account');
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
        return new Response('Database update failed', { status: 500 });
      }
      console.log(`[stripe-webhook] unlocked account for user_id=${userId}`);
    }
  }

  return new Response('ok', { status: 200 });
};

export const config = { path: '/api/stripe-webhook' };

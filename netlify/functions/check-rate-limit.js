import { createHash } from 'node:crypto';

// Einfacher, serverseitiger Rate-Limiter für die öffentlichen
// Gästeseiten-Formulare (RSVP, Foto-Upload, Musik-/Programmwünsche).
// Wird vom Browser VOR dem eigentlichen Supabase-Schreibzugriff aufgerufen
// (siehe src/lib/rateLimit.js) und blockiert offensichtliches Fluten durch
// Skripte, ohne echte Gäste zu stören — die Limits unten sind großzügig
// gewählt (siehe LIMITS).
//
// Erkennt die echte Besucher-IP über den von Netlify automatisch gesetzten
// Header "x-nf-client-connection-ip". Die IP wird NIE gespeichert — nur ein
// SHA-256-Hash aus IP+Aktion als Schlüssel (keine personenbezogenen Daten
// in der DB, kein zusätzlicher DSGVO-Aufwand).
//
// Fail-open: Kann die Prüfung selbst nicht durchgeführt werden (z.B.
// Datenbank-Fehler), wird NICHT blockiert — ein kaputter Rate-Limiter soll
// niemals echte Gäste (z.B. am Hochzeitstag selbst) aussperren.
//
// Benötigte Netlify-Umgebungsvariablen (dieselben wie beim stripe-webhook):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Voraussetzung: SQL-Setup aus sql-rate-limiting-2026-08-10.sql einmalig im
// Supabase SQL Editor ausführen (legt Tabelle + Funktion an).

const LIMITS = {
  rsvp:     { max: 5,  windowSeconds: 600 }, // 5 RSVPs / 10 Min pro IP
  photo:    { max: 20, windowSeconds: 600 }, // 20 Foto-Uploads / 10 Min
  music:    { max: 10, windowSeconds: 600 }, // 10 Musikwünsche / 10 Min
  schedule: { max: 10, windowSeconds: 600 }, // 10 Programmwünsche / 10 Min
};

export default async (req) => {
  try {
    const { action } = await req.json();
    const limit = LIMITS[action];
    if (!limit) return new Response(JSON.stringify({ allowed: true }), { status: 200 });

    const ip  = req.headers.get('x-nf-client-connection-ip') || 'unknown';
    const key = createHash('sha256').update(`${ip}:${action}`).digest('hex');

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/rpc_check_rate_limit`, {
      method: 'POST',
      headers: {
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ p_key: key, p_max: limit.max, p_window_seconds: limit.windowSeconds }),
    });

    if (!res.ok) {
      console.error('[check-rate-limit] RPC failed:', res.status, await res.text());
      return new Response(JSON.stringify({ allowed: true }), { status: 200 }); // fail-open
    }

    const allowed = await res.json();
    return new Response(JSON.stringify({ allowed }), { status: 200 });
  } catch (err) {
    console.error('[check-rate-limit] unerwarteter Fehler:', err.message);
    return new Response(JSON.stringify({ allowed: true }), { status: 200 }); // fail-open
  }
};

export const config = { path: '/api/check-rate-limit' };

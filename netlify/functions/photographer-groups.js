// Server-seitige Schreibzugriffe auf photo_groups für die Token-basierte
// Fotografen-Seite (/photographer/:token), die ohne echten Supabase-Login
// läuft.
//
// Warum das nötig ist: Row-Level-Security kann den photographer_token nicht
// prüfen, weil anonyme Anfragen für Postgres alle identisch aussehen — es
// gibt keine "Identität", nur die anon-Rolle. Die bisherige offene Policy
// (jeder darf photo_groups schreiben/löschen) war deshalb nicht nur für
// Fotografen mit gültigem Link nutzbar, sondern für jeden im Internet, der
// die Supabase-URL kennt (Fund aus dem Supabase Security Advisor,
// 2026-08-10). Jetzt läuft jeder Schreibzugriff über diese Function:
//   1. Token wird HIER serverseitig gegen die weddings-Tabelle geprüft
//      (mit dem service_role Key, der RLS umgeht und deshalb sicher lesen
//      darf, ohne dass der Client selbst Zugriff bekommt).
//   2. Nur wenn der Token zu einer echten Hochzeit gehört, wird geschrieben
//      — und zwar mit der user_id, die WIR anhand des Tokens ermittelt
//      haben, nicht mit einer user_id, die der Client mitschickt (sonst
//      könnte man einfach eine fremde user_id einsetzen).
//
// Anders als bei check-rate-limit.js ist das Verhalten hier bewusst NICHT
// fail-open: Schlägt die Token-Prüfung fehl oder gibt es einen Fehler, wird
// NICHTS geschrieben oder gelöscht. Bei einem Schreibzugriff wäre
// "fail-open" hier ein Sicherheitsloch, kein Komfort-Feature.
//
// Voraussetzung: SQL-Setup aus sql-security-fixes-2026-08-10-round2.sql
// einmalig im Supabase SQL Editor ausführen (entzieht anon/authenticated
// die direkten Schreibrechte auf photo_groups).
//
// Benötigte Netlify-Umgebungsvariablen (dieselben wie bei den anderen
// Functions): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

export default async (req) => {
  try {
    const { token, action, group, groupId } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Kein Zugriffslink.' }), { status: 400 });
    }
    if (action !== 'save' && action !== 'delete') {
      return new Response(JSON.stringify({ error: 'Unbekannte Aktion.' }), { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 1. Token gegen weddings-Tabelle prüfen, user_id serverseitig ermitteln
    const weddingRes = await fetch(
      `${supabaseUrl}/rest/v1/weddings?photographer_token=eq.${encodeURIComponent(token)}&select=user_id`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    if (!weddingRes.ok) {
      console.error('[photographer-groups] Wedding-Lookup fehlgeschlagen:', weddingRes.status);
      return new Response(JSON.stringify({ error: 'Serverfehler.' }), { status: 500 });
    }
    const weddings = await weddingRes.json();
    const userId = weddings?.[0]?.user_id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Ungültiger oder abgelaufener Link.' }), { status: 403 });
    }

    // 2a. Löschen — nur innerhalb der eigenen (per Token ermittelten) Hochzeit
    if (action === 'delete') {
      if (!groupId) return new Response(JSON.stringify({ error: 'Keine Gruppen-ID.' }), { status: 400 });
      const delRes = await fetch(
        `${supabaseUrl}/rest/v1/photo_groups?id=eq.${encodeURIComponent(groupId)}&user_id=eq.${encodeURIComponent(userId)}`,
        { method: 'DELETE', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      );
      if (!delRes.ok) {
        console.error('[photographer-groups] Delete fehlgeschlagen:', delRes.status, await delRes.text());
        return new Response(JSON.stringify({ error: 'Löschen fehlgeschlagen.' }), { status: 500 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // 2b. Speichern (Insert oder Update) — user_id wird server-seitig erzwungen,
    // nicht vom Client übernommen, damit niemand eine fremde user_id unterschieben kann.
    if (!group || typeof group !== 'object') {
      return new Response(JSON.stringify({ error: 'Keine Daten.' }), { status: 400 });
    }
    const saveRes = await fetch(`${supabaseUrl}/rest/v1/photo_groups`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ ...group, user_id: userId }),
    });
    if (!saveRes.ok) {
      console.error('[photographer-groups] Save fehlgeschlagen:', saveRes.status, await saveRes.text());
      return new Response(JSON.stringify({ error: 'Speichern fehlgeschlagen.' }), { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('[photographer-groups] unerwarteter Fehler:', err.message);
    return new Response(JSON.stringify({ error: 'Serverfehler.' }), { status: 500 });
  }
};

export const config = { path: '/api/photographer-groups' };

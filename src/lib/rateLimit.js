/**
 * rateLimit.js — Client-Helfer für die serverseitige Rate-Limit-Prüfung
 * (Netlify Function `check-rate-limit`, siehe netlify/functions/check-rate-limit.js).
 *
 * Wird vor RSVP/Foto-Upload/Musikwunsch/Programmwunsch aufgerufen, um
 * offensichtliches Fluten der öffentlichen Gästeseiten-Formulare zu
 * verhindern. Fail-open: schlägt die Prüfung selbst fehl (Netzwerkfehler,
 * Function nicht erreichbar), wird NICHT blockiert — ein kaputter
 * Rate-Limiter soll niemals echte Gäste aussperren.
 */
export async function checkRateLimit(action) {
  try {
    const res = await fetch('/api/check-rate-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) return true;
    const { allowed } = await res.json();
    return allowed !== false;
  } catch {
    return true;
  }
}

import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkRateLimit } from './rateLimit';

// Kern-Smoke-Test für "RSVP absenden" bzw. den Rate-Limit-Schutz davor
// (Checkliste Punkt 12). Das Wichtigste hier ist NICHT die Limit-Logik
// selbst (die läuft serverseitig, siehe netlify/functions/check-rate-limit.js),
// sondern das Fail-open-Verhalten: Ein kaputter Rate-Limiter darf echte
// Gäste niemals aussperren.
describe('checkRateLimit', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lässt durch, wenn der Server allowed:true meldet', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ allowed: true }),
    }));
    await expect(checkRateLimit('rsvp')).resolves.toBe(true);
  });

  it('blockiert, wenn der Server allowed:false meldet', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ allowed: false }),
    }));
    await expect(checkRateLimit('rsvp')).resolves.toBe(false);
  });

  it('fail-open: lässt durch, wenn die Function einen Fehlerstatus liefert', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(checkRateLimit('photo')).resolves.toBe(true);
  });

  it('fail-open: lässt durch, wenn fetch komplett fehlschlägt (Netzwerkfehler)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Netzwerkfehler')));
    await expect(checkRateLimit('music')).resolves.toBe(true);
  });
});

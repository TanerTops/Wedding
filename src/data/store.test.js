import { describe, it, expect } from 'vitest';
import { hasFullAccess } from './store';

// Kern-Smoke-Test für "Freischaltung nach Kauf" (Checkliste Punkt 12).
// hasFullAccess() entscheidet in der ganzen App (App.jsx, Sidebar.jsx,
// UpgradeGate.jsx u.a.), ob Premium-Routen gesperrt sind — ein Bug hier
// würde entweder zahlende Kundinnen aussperren oder Nicht-Zahlende
// durchlassen. Beides real genug, um mit einem Test abgesichert zu sein.
describe('hasFullAccess', () => {
  it('gibt false zurück, wenn keine Hochzeit übergeben wird', () => {
    expect(hasFullAccess(null)).toBe(false);
    expect(hasFullAccess(undefined)).toBe(false);
  });

  it('gibt false zurück, wenn purchased fehlt oder falsy ist', () => {
    expect(hasFullAccess({})).toBe(false);
    expect(hasFullAccess({ purchased: false })).toBe(false);
    expect(hasFullAccess({ purchased: null })).toBe(false);
  });

  it('gibt true zurück, wenn purchased true ist', () => {
    expect(hasFullAccess({ purchased: true })).toBe(true);
  });

  it('ignoriert andere Felder auf der Hochzeit', () => {
    expect(hasFullAccess({ bride: 'Sarah', groom: 'Tom', purchased: true })).toBe(true);
    expect(hasFullAccess({ bride: 'Sarah', groom: 'Tom', purchased: false })).toBe(false);
  });
});

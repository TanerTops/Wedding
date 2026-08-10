import { describe, it, expect } from 'vitest';
import { validateImageFile } from './imageUtils';

// Kern-Smoke-Test für "Foto-Upload" (Checkliste Punkt 12). Diese Prüfung
// läuft vor jedem Upload auf der öffentlichen Gästeseite — verhindert
// falsche Dateitypen und zu große Dateien, bevor überhaupt zu Supabase
// hochgeladen wird.
function makeFakeFile({ type = 'image/jpeg', sizeBytes = 1024 } = {}) {
  // jsdom/node haben kein echtes File mit variabler .size — ein einfaches
  // Objekt mit denselben Feldern reicht für validateImageFile() aus, die
  // nur .type und .size liest.
  return { type, size: sizeBytes };
}

describe('validateImageFile', () => {
  it('lehnt fehlende Datei ab', () => {
    expect(validateImageFile(null)).toBe('Keine Datei ausgewählt.');
    expect(validateImageFile(undefined)).toBe('Keine Datei ausgewählt.');
  });

  it('lehnt Nicht-Bild-Dateien ab', () => {
    const file = makeFakeFile({ type: 'application/pdf' });
    expect(validateImageFile(file)).toBe('Bitte nur Bilddateien hochladen.');
  });

  it('lehnt Dateien ohne erkennbaren Typ ab', () => {
    const file = makeFakeFile({ type: '' });
    expect(validateImageFile(file)).toBe('Bitte nur Bilddateien hochladen.');
  });

  it('lehnt zu große Dateien ab (Standard-Limit 20 MB)', () => {
    const tooBig = makeFakeFile({ sizeBytes: 21 * 1024 * 1024 });
    expect(validateImageFile(tooBig)).toMatch(/zu groß/);
  });

  it('akzeptiert ein normales Foto innerhalb des Limits', () => {
    const normal = makeFakeFile({ sizeBytes: 4 * 1024 * 1024 });
    expect(validateImageFile(normal)).toBeNull();
  });

  it('respektiert ein individuelles Größenlimit', () => {
    const file = makeFakeFile({ sizeBytes: 6 * 1024 * 1024 });
    expect(validateImageFile(file, 5)).toMatch(/zu groß/);
    expect(validateImageFile(file, 10)).toBeNull();
  });
});

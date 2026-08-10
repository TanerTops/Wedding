/**
 * imageUtils.js — Client-seitige Bildkomprimierung + Validierung vor dem
 * Upload. Verhindert, dass unkomprimierte Handyfotos (oft 3–8 MB) das
 * Supabase-Storage-Kontingent unnötig belasten. Nutzt nur die Browser-
 * eigene Canvas-API, keine zusätzliche Abhängigkeit nötig.
 */

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.8;
const SKIP_BELOW_BYTES = 400 * 1024; // Kleine Dateien nicht anfassen

/**
 * Prüft Dateityp und Maximalgröße vor dem Upload. Gibt eine Fehlermeldung
 * (string) zurück, oder null wenn alles ok ist.
 */
export function validateImageFile(file, maxSizeMB = 20) {
  if (!file) return 'Keine Datei ausgewählt.';
  if (!file.type || !file.type.startsWith('image/')) return 'Bitte nur Bilddateien hochladen.';
  if (file.size > maxSizeMB * 1024 * 1024) return `Datei ist zu groß (max. ${maxSizeMB} MB).`;
  return null;
}

/**
 * Skaliert ein Bild auf max. `maxDimension` px (längste Kante) herunter und
 * komprimiert es als JPEG. Fällt bei jedem Fehler (z.B. Format ohne
 * Browser-Unterstützung) auf die Originaldatei zurück, statt den Upload
 * komplett scheitern zu lassen — das ist wichtiger als die Komprimierung
 * selbst, gerade bei Gästen auf einer Hochzeit.
 */
export async function compressImage(file, { maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY } = {}) {
  if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;
  if (file.size < SKIP_BELOW_BYTES) return file;
  if (typeof createImageBitmap === 'undefined' || typeof document === 'undefined') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file; // Komprimierung hat nichts gebracht

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

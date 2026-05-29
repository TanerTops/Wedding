import { useState } from 'react';
import { loadState, saveState, defaultWedding } from '../data/store';

export default function Settings() {
  const [wedding, setWedding] = useState(() => loadState('wedding', defaultWedding));
  const [saved, setSaved] = useState(false);
  function save() { saveState('wedding', wedding); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  function resetAll() {
    if (!confirm('Alle Daten zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden!')) return;
    ['wedding','guests','budgetItems','budgetCategories','tasks','timeline','seating','music','venue','registry','notes'].forEach(k => localStorage.removeItem(`vince_${k}`));
    window.location.reload();
  }
  return (
    <>
      <div className="topbar"><h1>Einstellungen</h1></div>
      <div className="page-body">
        <div className="card" style={{ maxWidth: 520, marginBottom: 20 }}>
          <div className="section-title">Eure Hochzeit</div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Braut</label><input className="input" value={wedding.bride} onChange={e => setWedding(w => ({ ...w, bride: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Bräutigam</label><input className="input" value={wedding.groom} onChange={e => setWedding(w => ({ ...w, groom: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="form-label">Hochzeitsdatum</label><input className="input" type="date" value={wedding.date} onChange={e => setWedding(w => ({ ...w, date: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Location</label><input className="input" value={wedding.venue} onChange={e => setWedding(w => ({ ...w, venue: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Gesamtbudget (€)</label><input className="input" type="number" value={wedding.budget} onChange={e => setWedding(w => ({ ...w, budget: parseFloat(e.target.value) || 0 }))} /></div>
          <button className="btn btn-primary" onClick={save}>{saved ? '✓ Gespeichert! 🌿' : 'Speichern'}</button>
        </div>
        <div className="card" style={{ maxWidth: 520, borderTop: '3px solid var(--blush)' }}>
          <div className="section-title" style={{ color: '#E57373' }}>Gefahrenzone</div>
          <p style={{ fontSize: 13, color: 'var(--mocha)', marginBottom: 14 }}>Setzt alle Daten auf den Demo-Stand zurück. Alle eigenen Eingaben gehen verloren.</p>
          <button className="btn btn-danger" onClick={resetAll}>Alle Daten zurücksetzen</button>
        </div>
      </div>
    </>
  );
}

import { useState } from 'react';
import { loadState, saveState, defaultWedding } from '../data/store';
import { saveWedding, deleteAccount } from '../lib/db';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const [wedding, setWedding] = useState(() => loadState('wedding', defaultWedding));
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [coAdminEmail, setCoAdminEmail] = useState('');
  const [coAdminSending, setCoAdminSending] = useState(false);
  const [coAdminMsg, setCoAdminMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');

  async function handleSave() {
    saveState('wedding', wedding);
    await saveWedding(wedding);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function inviteCoAdmin() {
    if (!coAdminEmail.trim()) return;
    setCoAdminSending(true);
    // Use Supabase magic link / invite
    const { error } = await supabase.auth.signInWithOtp({ 
      email: coAdminEmail,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) {
      setCoAdminMsg('Fehler: ' + error.message);
    } else {
      setCoAdminMsg(`✓ Einladungs-Link wurde an ${coAdminEmail} gesendet`);
      setCoAdminEmail('');
    }
    setCoAdminSending(false);
    setTimeout(() => setCoAdminMsg(''), 4000);
  }

  async function handleDeleteAccount() {
    if (confirmDelete !== 'LÖSCHEN') return;
    if (!confirm('Wirklich alles löschen? Das kann nicht rückgängig gemacht werden.')) return;
    setDeleting(true);
    const { error } = await deleteAccount();
    if (error) { alert('Fehler: ' + error.message); setDeleting(false); }
    else window.location.reload();
  }

  return (
    <>
      <div className="topbar">
        <div><h1>Einstellungen</h1><div className="topbar-sub">Hochzeitsdaten & Account</div></div>
        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? '✓ Gespeichert' : 'Speichern'}
        </button>
      </div>

      <div className="page-body">
        {/* Wedding data */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 16 }}>Hochzeitsdaten</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Braut</label>
              <input className="input" value={wedding.bride || ''} onChange={e => setWedding(w => ({ ...w, bride: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Bräutigam</label>
              <input className="input" value={wedding.groom || ''} onChange={e => setWedding(w => ({ ...w, groom: e.target.value }))} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Datum</label>
              <input className="input" type="date" value={wedding.date || ''} onChange={e => setWedding(w => ({ ...w, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="input" placeholder="z.B. Schloss Waldenburg" value={wedding.venue || ''} onChange={e => setWedding(w => ({ ...w, venue: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Budget (€)</label>
            <input className="input" type="number" value={wedding.budget || ''} onChange={e => setWedding(w => ({ ...w, budget: parseInt(e.target.value) || 0 }))} />
          </div>
        </div>

        {/* Co-Admin */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 4 }}>Mitplaner einladen</div>
          <p style={{ fontSize: 13, color: 'var(--mocha)', marginBottom: 16, lineHeight: 1.6 }}>
            Lade eine zweite Person ein (z.B. Trauzeugin) — sie bekommt einen Login-Link per Email und kann dann gemeinsam mit euch planen.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" style={{ flex: 1 }} type="email" placeholder="email@beispiel.de" value={coAdminEmail} onChange={e => setCoAdminEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && inviteCoAdmin()} />
            <button className="btn btn-primary" onClick={inviteCoAdmin} disabled={coAdminSending}>
              {coAdminSending ? '...' : 'Einladen'}
            </button>
          </div>
          {coAdminMsg && <div style={{ fontSize: 13, color: coAdminMsg.startsWith('✓') ? 'var(--sage)' : '#E57373', marginTop: 8 }}>{coAdminMsg}</div>}
          <div style={{ fontSize: 11, color: 'var(--mocha)', marginTop: 8 }}>
            ℹ️ Die eingeladene Person muss sich mit der gleichen Email registrieren um Zugang zu erhalten.
          </div>
        </div>

        {/* Danger zone */}
        <div className="card" style={{ border: '1px solid #FECACA' }}>
          <div className="section-title" style={{ marginBottom: 4, color: '#991B1B' }}>⚠️ Gefahrenzone</div>
          <p style={{ fontSize: 13, color: 'var(--mocha)', marginBottom: 16, lineHeight: 1.6 }}>
            Account und alle Daten unwiderruflich löschen — Gäste, Budget, Zeitplan, Fotos, alles.
          </p>
          <div className="form-group">
            <label className="form-label">Tippe <strong>LÖSCHEN</strong> zur Bestätigung</label>
            <input className="input" placeholder="LÖSCHEN" value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)} style={{ borderColor: confirmDelete === 'LÖSCHEN' ? '#EF4444' : undefined }} />
          </div>
          <button
            className="btn"
            style={{ background: confirmDelete === 'LÖSCHEN' ? '#EF4444' : '#FEE2E2', color: confirmDelete === 'LÖSCHEN' ? '#fff' : '#991B1B', border: 'none', padding: '10px 20px', borderRadius: 10, cursor: confirmDelete === 'LÖSCHEN' ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: 13 }}
            onClick={handleDeleteAccount}
            disabled={confirmDelete !== 'LÖSCHEN' || deleting}
          >
            {deleting ? 'Wird gelöscht...' : 'Account endgültig löschen'}
          </button>
        </div>
      </div>
    </>
  );
}

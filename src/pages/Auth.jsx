import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'wedding'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [weddingData, setWeddingData] = useState({ bride: '', groom: '', date: '', venue: '' });
  const [pendingSession, setPendingSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Bitte Email und Passwort eingeben.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onAuth(data.session);
    } catch (err) {
      setError(err.message.includes('Invalid login') ? 'Email oder Passwort falsch.' : err.message);
    } finally { setLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Bitte Email und Passwort eingeben.'); return; }
    if (password.length < 6) { setError('Passwort muss mindestens 6 Zeichen haben.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // Move to wedding details step
      setPendingSession(data.session);
      setMode('wedding');
    } catch (err) {
      if (err.message.includes('already registered')) {
        setError('Diese Email ist bereits registriert.'); setMode('login');
      } else { setError(err.message); }
    } finally { setLoading(false); }
  }

  async function handleWeddingSetup(e) {
    e.preventDefault();
    if (!weddingData.bride || !weddingData.groom || !weddingData.date) {
      setError('Bitte Braut, Bräutigam und Datum eingeben.'); return;
    }
    setLoading(true);
    try {
      // Import initializeUser and call with custom wedding data
      const { initializeUser } = await import('../lib/db');
      await initializeUser(weddingData);
      onAuth(pendingSession);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #FDF8F0 0%, #F0E8D8 50%, #EAE0D0 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif", padding: 24,
    }}>
      <div style={{ position: 'fixed', width: 500, height: 500, top: -120, right: -100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,149,106,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', width: 400, height: 400, bottom: -80, left: -80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,181,160,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 44, fontStyle: 'italic', color: 'var(--espresso)', lineHeight: 1 }}>Vince</div>
          <div style={{ fontSize: 13, color: 'var(--mocha)', marginTop: 6, letterSpacing: 1 }}>Hochzeitsplaner</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 8px 48px rgba(91,61,30,0.1)', border: '1px solid var(--sand)' }}>

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: 'var(--espresso)', marginBottom: 4, fontWeight: 400 }}>Willkommen zurück</h2>
              <p style={{ fontSize: 13, color: 'var(--mocha)', marginBottom: 24 }}>Melde dich an um weiterzuplanen.</p>
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="input" type="email" placeholder="deine@email.de" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" disabled={loading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Passwort</label>
                  <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" disabled={loading} />
                </div>
                {error && <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991B1B', marginBottom: 16 }}>{error}</div>}
                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 4 }} disabled={loading}>
                  {loading ? 'Bitte warten...' : 'Einloggen'}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--mocha)' }}>
                Noch kein Account?{' '}
                <button onClick={() => { setMode('register'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--terra)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, textDecoration: 'underline' }}>
                  Jetzt registrieren
                </button>
              </div>
            </>
          )}

          {/* ── REGISTER ── */}
          {mode === 'register' && (
            <>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: 'var(--espresso)', marginBottom: 4, fontWeight: 400 }}>Account erstellen</h2>
              <p style={{ fontSize: 13, color: 'var(--mocha)', marginBottom: 24 }}>Erstelle deinen kostenlosen Account.</p>
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="input" type="email" placeholder="deine@email.de" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" disabled={loading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Passwort</label>
                  <input className="input" type="password" placeholder="Mindestens 6 Zeichen" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" disabled={loading} />
                </div>
                {error && <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991B1B', marginBottom: 16 }}>{error}</div>}
                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 4 }} disabled={loading}>
                  {loading ? 'Bitte warten...' : 'Weiter →'}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--mocha)' }}>
                Bereits registriert?{' '}
                <button onClick={() => { setMode('login'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--terra)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, textDecoration: 'underline' }}>
                  Einloggen
                </button>
              </div>
            </>
          )}

          {/* ── WEDDING DETAILS ── */}
          {mode === 'wedding' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💍</div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: 'var(--espresso)', fontWeight: 400, marginBottom: 4 }}>Eure Hochzeit</h2>
                <p style={{ fontSize: 13, color: 'var(--mocha)' }}>Diese Daten könnt ihr später jederzeit ändern.</p>
              </div>
              <form onSubmit={handleWeddingSetup}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Name Braut *</label>
                    <input className="input" placeholder="z.B. Sarah" value={weddingData.bride} onChange={e => setWeddingData(d => ({ ...d, bride: e.target.value }))} autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Name Bräutigam *</label>
                    <input className="input" placeholder="z.B. Tobias" value={weddingData.groom} onChange={e => setWeddingData(d => ({ ...d, groom: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Hochzeitsdatum *</label>
                  <input className="input" type="date" value={weddingData.date} onChange={e => setWeddingData(d => ({ ...d, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Location / Venue</label>
                  <input className="input" placeholder="z.B. Schloss Waldenburg" value={weddingData.venue} onChange={e => setWeddingData(d => ({ ...d, venue: e.target.value }))} />
                </div>
                {error && <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991B1B', marginBottom: 16 }}>{error}</div>}
                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 4 }} disabled={loading}>
                  {loading ? 'Wird eingerichtet...' : 'Loslegen 🌸'}
                </button>
              </form>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--taupe)' }}>mit Liebe gebaut ♡</div>
      </div>
    </div>
  );
}

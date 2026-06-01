import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email || !password) { setError('Bitte Email und Passwort eingeben.'); return; }
    if (password.length < 6) { setError('Passwort muss mindestens 6 Zeichen haben.'); return; }

    setLoading(true);
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('Registrierung erfolgreich! Bitte bestätige deine Email, dann kannst du dich einloggen.');
        setMode('login');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuth(data.session);
      }
    } catch (err) {
      if (err.message.includes('Email not confirmed')) {
        setError('Bitte zuerst die Bestätigungs-Email klicken.');
      } else if (err.message.includes('Invalid login credentials')) {
        setError('Email oder Passwort falsch.');
      } else if (err.message.includes('User already registered')) {
        setError('Diese Email ist bereits registriert. Bitte einloggen.');
        setMode('login');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #FDF8F0 0%, #F0E8D8 50%, #EAE0D0 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      padding: 24,
    }}>
      {/* Decorative orbs */}
      <div style={{ position: 'fixed', width: 500, height: 500, top: -120, right: -100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,149,106,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', width: 400, height: 400, bottom: -80, left: -80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,181,160,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontStyle: 'italic', color: 'var(--espresso)', lineHeight: 1 }}>
            Vince
          </div>
          <div style={{ fontSize: 13, color: 'var(--mocha)', marginTop: 6, letterSpacing: 1 }}>
            Hochzeitsplaner
          </div>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 8px 48px rgba(91,61,30,0.1)', border: '1px solid var(--sand)' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: 'var(--espresso)', marginBottom: 4, fontWeight: 400 }}>
            {mode === 'login' ? 'Willkommen zurück' : 'Account erstellen'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--mocha)', marginBottom: 24 }}>
            {mode === 'login' ? 'Melde dich an um weiterzuplanen.' : 'Erstelle deinen kostenlosen Account.'}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="deine@email.de"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Passwort</label>
              <input
                className="input"
                type="password"
                placeholder={mode === 'register' ? 'Mindestens 6 Zeichen' : '••••••••'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                disabled={loading}
              />
            </div>

            {error && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991B1B', marginBottom: 16 }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ background: '#E8F5E9', border: '1px solid #C8E6C9', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#2E7D32', marginBottom: 16 }}>
                {success}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 4 }}
              disabled={loading}
            >
              {loading ? 'Bitte warten...' : mode === 'login' ? 'Einloggen' : 'Account erstellen'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--mocha)' }}>
            {mode === 'login' ? (
              <>Noch kein Account?{' '}
                <button onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--terra)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, textDecoration: 'underline' }}>
                  Jetzt registrieren
                </button>
              </>
            ) : (
              <>Bereits registriert?{' '}
                <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--terra)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, textDecoration: 'underline' }}>
                  Einloggen
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--taupe)' }}>
          mit Liebe gebaut ♡
        </div>
      </div>
    </div>
  );
}

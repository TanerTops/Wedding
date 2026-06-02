import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconCheck, IconArrowRight, IconX } from '@tabler/icons-react';
import { loadState, saveState } from '../data/store';

const STEPS = [
  { id: 'wedding',   emoji: '💍', title: 'Hochzeitsdaten prüfen',     desc: 'Namen, Datum und Location in Einstellungen anpassen',     to: '/settings' },
  { id: 'guests',    emoji: '👥', title: 'Erste Gäste eintragen',      desc: 'Gästeliste aufbauen und Einladungscodes generieren',      to: '/guests' },
  { id: 'guestpage', emoji: '🌐', title: 'Gästeseite einrichten',      desc: 'Dresscode, Hero-Bild und Sektionen konfigurieren',        to: '/guest-page' },
  { id: 'budget',    emoji: '💰', title: 'Budget planen',              desc: 'Gesamtbudget setzen und erste Ausgaben eintragen',        to: '/budget' },
  { id: 'timeline',  emoji: '📋', title: 'Zeitplan erstellen',         desc: 'Tagesablauf für die Hochzeit planen',                    to: '/timeline' },
  { id: 'tasks',     emoji: '✅', title: 'Aufgaben anlegen',           desc: 'Was muss bis wann erledigt werden?',                     to: '/tasks' },
  { id: 'venue',     emoji: '🏰', title: 'Location eintragen',        desc: 'Adresse und Kontakt der Venue speichern',                 to: '/venue' },
  { id: 'invite',    emoji: '📨', title: 'Gästelink verschicken',      desc: 'QR-Code drucken oder Link per Email teilen',             to: '/guest-page' },
];

export default function Onboarding({ onDismiss }) {
  const [done, setDone] = useState(() => loadState('onboardingDone', []));

  function toggle(id) {
    const updated = done.includes(id) ? done.filter(d => d !== id) : [...done, id];
    setDone(updated);
    saveState('onboardingDone', updated);
  }

  function dismiss() {
    saveState('onboardingDismissed', true);
    onDismiss();
  }

  const pct = Math.round((done.length / STEPS.length) * 100);

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid var(--sand)', marginBottom: 20, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #FDF8F0 0%, #F5EDE0 100%)', padding: '20px 20px 16px', borderBottom: '1px solid var(--sand)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: 'var(--espresso)', marginBottom: 4 }}>
              🌸 Willkommen bei Vince!
            </div>
            <div style={{ fontSize: 13, color: 'var(--mocha)' }}>
              {done.length === STEPS.length ? 'Alles erledigt — ihr seid startklar! 🎉' : `${done.length} von ${STEPS.length} Schritten erledigt`}
            </div>
          </div>
          <button onClick={dismiss} className="btn-icon" style={{ flexShrink: 0 }}>
            <IconX size={15} stroke={2} />
          </button>
        </div>
        <div style={{ height: 6, background: 'var(--sand)', borderRadius: 10, marginTop: 12, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--sage)', borderRadius: 10, transition: 'width .3s' }} />
        </div>
      </div>

      {/* Steps */}
      <div style={{ padding: '8px 0' }}>
        {STEPS.map((step, i) => {
          const isDone = done.includes(step.id);
          return (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < STEPS.length - 1 ? '1px solid #FAF6F0' : 'none', opacity: isDone ? 0.6 : 1 }}>
              <button onClick={() => toggle(step.id)} style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${isDone ? 'var(--sage)' : 'var(--sand)'}`, background: isDone ? 'var(--sage)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                {isDone && <IconCheck size={12} stroke={3} color="#fff" />}
              </button>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{step.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--espresso)', textDecoration: isDone ? 'line-through' : 'none' }}>{step.title}</div>
                <div style={{ fontSize: 12, color: 'var(--mocha)' }}>{step.desc}</div>
              </div>
              <Link to={step.to} style={{ color: 'var(--terra)', flexShrink: 0 }}>
                <IconArrowRight size={16} stroke={2} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

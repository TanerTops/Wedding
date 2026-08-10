import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconCheck, IconArrowRight, IconX } from '@tabler/icons-react';
import { loadState, saveState } from '../data/store';

// ── Custom SVG icons — thin stroke, warm/boho style ──────────────
const Icons = {
  rings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="12" r="5"/>
      <circle cx="15" cy="12" r="5"/>
    </svg>
  ),
  guests: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="7" r="3"/>
      <path d="M4 20v-1a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v1"/>
      <circle cx="17" cy="9" r="2.5"/>
      <path d="M14 20v-1a3 3 0 0 1 3-3h0a3 3 0 0 1 3 3v1"/>
    </svg>
  ),
  globe: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9"/>
      <path d="M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
    </svg>
  ),
  budget: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/>
      <circle cx="12" cy="13" r="2.5"/>
      <path d="M2 10h20"/>
    </svg>
  ),
  timeline: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="7" y1="12" x2="17" y2="12"/>
      <line x1="7" y1="16" x2="13" y2="16"/>
    </svg>
  ),
  tasks: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  venue: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21c-4-4-7-7.5-7-11a7 7 0 0 1 14 0c0 3.5-3 7-7 11Z"/>
      <circle cx="12" cy="10" r="2.5"/>
    </svg>
  ),
  invite: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
};

const STEPS = [
  { id: 'wedding',   Icon: Icons.rings,    title: 'Hochzeitsdaten prüfen',   desc: 'Namen, Datum und Location in Einstellungen anpassen',   to: '/settings'   },
  { id: 'guests',    Icon: Icons.guests,   title: 'Erste Gäste eintragen',   desc: 'Gästeliste aufbauen und Einladungscodes generieren',    to: '/guests'     },
  { id: 'guestpage', Icon: Icons.globe,    title: 'Gästeseite einrichten',   desc: 'Dresscode, Hero-Bild und Sektionen konfigurieren',      to: '/guest-page' },
  { id: 'budget',    Icon: Icons.budget,   title: 'Budget planen',           desc: 'Gesamtbudget setzen und erste Ausgaben eintragen',      to: '/budget'     },
  { id: 'timeline',  Icon: Icons.timeline, title: 'Zeitplan erstellen',      desc: 'Tagesablauf für die Hochzeit planen',                   to: '/timeline'   },
  { id: 'tasks',     Icon: Icons.tasks,    title: 'Aufgaben anlegen',        desc: 'Was muss bis wann erledigt werden?',                   to: '/tasks'      },
  { id: 'venue',     Icon: Icons.venue,    title: 'Location eintragen',      desc: 'Adresse und Kontakt der Venue speichern',               to: '/venue'      },
  { id: 'invite',    Icon: Icons.invite,   title: 'Gästelink verschicken',   desc: 'QR-Code drucken oder Link per Email teilen',            to: '/guest-page' },
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
              Willkommen bei Wedding Buddy!
            </div>
            <div style={{ fontSize: 13, color: 'var(--mocha)' }}>
              {done.length === STEPS.length
                ? 'Alles erledigt — ihr seid startklar! 🎉'
                : `${done.length} von ${STEPS.length} Schritten erledigt`}
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
            <div key={step.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 20px',
              borderBottom: i < STEPS.length - 1 ? '1px solid #FAF6F0' : 'none',
              opacity: isDone ? 0.55 : 1,
              transition: 'opacity .2s',
            }}>
              {/* Checkbox */}
              <button
                onClick={() => toggle(step.id)}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  border: `2px solid ${isDone ? 'var(--sage)' : 'var(--sand)'}`,
                  background: isDone ? 'var(--sage)' : '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0, transition: 'all .15s',
                }}>
                {isDone && <IconCheck size={12} stroke={3} color="#fff" />}
              </button>

              {/* Custom icon */}
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: isDone ? 'var(--sand)' : 'var(--warm)',
                border: `1px solid ${isDone ? 'var(--sand)' : '#EAD9C4'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isDone ? 'var(--mocha)' : 'var(--terra)',
                transition: 'all .2s',
              }}>
                <step.Icon />
              </div>

              {/* Text */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13.5, fontWeight: 500, color: 'var(--espresso)',
                  textDecoration: isDone ? 'line-through' : 'none',
                }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--mocha)' }}>{step.desc}</div>
              </div>

              {/* Arrow */}
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

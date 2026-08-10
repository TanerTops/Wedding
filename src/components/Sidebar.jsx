import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  IconLayoutDashboard, IconUsers, IconWallet, IconCheckbox,
  IconClock, IconLayoutColumns, IconMapPin, IconMusic,
  IconGift, IconNotes, IconSettings, IconExternalLink, IconWorldWww,
  IconPhoto, IconCamera, IconLogout, IconBuildingStore, IconLock
} from '@tabler/icons-react';
import { loadState, defaultWedding, makeSlug, hasFullAccess } from '../data/store';
import { getWedding, getTasks } from '../lib/db';

const NAV = [
  { to: '/', icon: IconLayoutDashboard, label: 'Übersicht' },
  { to: '/guests', icon: IconUsers, label: 'Gäste' },
  { to: '/budget', icon: IconWallet, label: 'Budget' },
  { to: '/vendors', icon: IconBuildingStore, label: 'Dienstleister', premium: true },
  { to: '/tasks', icon: IconCheckbox, label: 'Aufgaben', premium: true },
  { to: '/timeline', icon: IconClock, label: 'Zeitplan', premium: true },
  { to: '/seating', icon: IconLayoutColumns, label: 'Sitzordnung', premium: true },
  { to: '/venue', icon: IconMapPin, label: 'Location', premium: true },
  { to: '/music', icon: IconMusic, label: 'Musik', premium: true },
  { to: '/registry', icon: IconGift, label: 'Geschenke', premium: true },
  { to: '/notes', icon: IconNotes, label: 'Notizen', premium: true },
  { to: '/guest-page', icon: IconWorldWww, label: 'Gästeseite', premium: true },
  { to: '/memories', icon: IconPhoto, label: 'Erinnerungen', premium: true },
  { to: '/photos', icon: IconCamera, label: 'Fotoplanung' },
  { to: '/settings', icon: IconSettings, label: 'Einstellungen' },
];

export default function Sidebar({ onLogout }) {
  const [wedding, setWedding] = useState(() => loadState('wedding', defaultWedding));
  const [tasks, setTasks] = useState(() => loadState('tasks', []));

  useEffect(() => {
    getWedding().then(({ data }) => { if (data) { setWedding(data); } });
    getTasks().then(({ data }) => { if (data) setTasks(data); });
    // Listen for wedding updates from Settings
    const handler = () => getWedding().then(({ data }) => { if (data) setWedding(data); });
    window.addEventListener('weddingUpdated', handler);
    return () => window.removeEventListener('weddingUpdated', handler);
  }, []);

  const days = Math.ceil((new Date(wedding?.date || Date.now()) - new Date()) / 86400000);
  const purchased = hasFullAccess(wedding);
  const done = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const guestUrl = `/guest/${makeSlug(wedding)}`;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>Wedding Buddy</h2>
        <p>Hochzeitsplaner</p>
        <div className="divider" />
      </div>

      <div className="wedding-card">
        <img src="/logo-mark.png" alt="Wedding Buddy" style={{ width: 28, height: 28, display: 'block', margin: '0 auto 6px' }} />
        <div className="couple">{wedding.bride} & {wedding.groom}</div>
        <div className="wdate">{new Date(wedding.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div className="countdown">{days > 0 ? `${days} Tage noch 🌸` : '🎉 Heute!'}</div>
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--mocha)', marginBottom: 4 }}>
            <span>Planung</span><span>{pct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: pct + '%', background: 'var(--terra)' }} />
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ to, icon: Icon, label, premium }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Icon size={15} stroke={1.5} />
            {label}
            {premium && !purchased && <IconLock size={11} stroke={2} style={{ marginLeft: 'auto', color: 'var(--taupe)' }} />}
          </NavLink>
        ))}
        <a href={guestUrl} target="_blank" rel="noopener noreferrer" className="nav-item"
          style={{ marginTop: 8, borderTop: '1px solid var(--sand)', paddingTop: 12, color: 'var(--terra)' }}>
          <IconExternalLink size={15} stroke={1.5} />
          Gästeseite öffnen
        </a>
      </nav>

      {onLogout && (
        <button onClick={onLogout} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', margin:'0 8px 8px', borderRadius:10, border:'none', background:'none', cursor:'pointer', color:'var(--mocha)', fontSize:12.5, fontFamily:"'DM Sans',sans-serif", width:'calc(100% - 16px)' }}
          onMouseEnter={e=>e.currentTarget.style.background='var(--warm)'}
          onMouseLeave={e=>e.currentTarget.style.background='none'}>
          <IconLogout size={14} stroke={1.5}/> Ausloggen
        </button>
      )}

      <div className="sidebar-footer" style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 6 }}>mit Liebe gebaut ♡</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', fontSize: 11 }}>
          <a href="/impressum" style={{ color: 'var(--mocha)', textDecoration: 'none' }}>Impressum</a>
          <a href="/datenschutz" style={{ color: 'var(--mocha)', textDecoration: 'none' }}>Datenschutz</a>
        </div>
      </div>
    </aside>
  );
}

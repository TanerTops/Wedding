import { NavLink } from 'react-router-dom';
import {
  IconLayoutDashboard, IconUsers, IconWallet, IconCheckbox,
  IconClock, IconLayoutColumns, IconMapPin, IconMusic,
  IconGift, IconNotes, IconSettings, IconExternalLink, IconWorldWww,
  IconPhoto, IconCamera
} from '@tabler/icons-react';
import { loadState, defaultWedding, makeSlug } from '../data/store';

const NAV = [
  { to: '/', icon: IconLayoutDashboard, label: 'Übersicht' },
  { to: '/guests', icon: IconUsers, label: 'Gäste' },
  { to: '/budget', icon: IconWallet, label: 'Budget' },
  { to: '/tasks', icon: IconCheckbox, label: 'Aufgaben' },
  { to: '/timeline', icon: IconClock, label: 'Zeitplan' },
  { to: '/seating', icon: IconLayoutColumns, label: 'Sitzordnung' },
  { to: '/venue', icon: IconMapPin, label: 'Location' },
  { to: '/music', icon: IconMusic, label: 'Musik' },
  { to: '/registry', icon: IconGift, label: 'Geschenke' },
  { to: '/notes', icon: IconNotes, label: 'Notizen' },
  { to: '/guest-page', icon: IconWorldWww, label: 'Gästeseite' },
  { to: '/memories', icon: IconPhoto, label: 'Erinnerungen' },
  { to: '/photos', icon: IconCamera, label: 'Fotoplanung' },
  { to: '/settings', icon: IconSettings, label: 'Einstellungen' },
];

export default function Sidebar() {
  const wedding = loadState('wedding', defaultWedding);
  const tasks = loadState('tasks', []);
  const days = Math.ceil((new Date(wedding.date) - new Date()) / 86400000);
  const done = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const guestUrl = `/guest/${makeSlug(wedding)}`;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>Vince</h2>
        <p>Hochzeitsplaner</p>
        <div className="divider" />
      </div>

      <div className="wedding-card">
        <div className="emoji">🌿</div>
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
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Icon size={15} stroke={1.5} />
            {label}
          </NavLink>
        ))}
        <a href={guestUrl} target="_blank" rel="noopener noreferrer" className="nav-item"
          style={{ marginTop: 8, borderTop: '1px solid var(--sand)', paddingTop: 12, color: 'var(--terra)' }}>
          <IconExternalLink size={15} stroke={1.5} />
          Gästeseite öffnen
        </a>
      </nav>

      <div className="sidebar-footer">with love ♡</div>
    </aside>
  );
}

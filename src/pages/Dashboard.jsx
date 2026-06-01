import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IconUsers, IconWallet, IconCheckbox, IconLayoutColumns,
  IconArrowRight, IconExternalLink, IconPlus
} from '@tabler/icons-react';
import { loadState, defaultWedding, makeSlug, defaultGuests, defaultBudgetItems, defaultTasks } from '../data/store';

export default function Dashboard() {
  const wedding = loadState('wedding', defaultWedding);
  const guests = loadState('guests', defaultGuests);
  const budgetItems = loadState('budgetItems', defaultBudgetItems);
  const tasks = loadState('tasks', defaultTasks);
  const memories = loadState('memories', []);
  const pendingUploads = memories.filter(m => !m.approved && m.uploadedBy === 'guest').length;

  const days = Math.ceil((new Date(wedding.date) - new Date()) / 86400000);
  const confirmed = guests.filter(g => g.status === 'confirmed').length;
  const rsvpPct = guests.length ? Math.round(confirmed / guests.length * 100) : 0;
  const totalSpent = budgetItems.filter(i => i.paid).reduce((s, i) => s + i.amount, 0);
  const totalCom = budgetItems.reduce((s, i) => s + i.amount, 0);
  const budgPct = Math.min(100, Math.round(totalCom / wedding.budget * 100));
  const done = tasks.filter(t => t.done).length;
  const taskPct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const upcoming = tasks.filter(t => !t.done).sort((a, b) => new Date(a.due) - new Date(b.due)).slice(0, 4);
  const guestUrl = `/guest/${makeSlug(wedding)}`;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>{wedding.bride} & {wedding.groom}</h1>
          <div className="topbar-sub">{days > 0 ? `Noch ${days} Tage bis zu eurem großen Tag 🌸` : '🎉 Heute!'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={guestUrl} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">
            <IconExternalLink size={14} stroke={1.5} /> Gästeseite
          </a>
          <Link to="/tasks" className="btn btn-primary btn-sm">
            <IconPlus size={14} stroke={2} /> Aufgabe
          </Link>
        </div>
      </div>
      <div className="page-body">
        <div className="stats-grid">
          <StatCard label="Tage noch" value={days} sub={new Date(wedding.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })} accent="var(--gold)" />
          <StatCard label="Gäste" value={guests.length} sub={`${confirmed} zugesagt`} accent="var(--sage)" />
          <StatCard label="RSVP" value={rsvpPct + '%'} sub={guests.filter(g => g.status === 'pending').length + ' ausstehend'} accent="var(--terra)" />
          <StatCard label="Budget" value={budgPct + '%'} sub={totalSpent.toLocaleString('de-DE') + ' € bezahlt'} accent="var(--blush)" />
        </div>

        <div className="grid-2" style={{ marginBottom: 16 }}>
          <div className="card">
            <div className="section-title">Planungsfortschritt</div>
            {[['Aufgaben', taskPct, `${done}/${tasks.length}`, 'var(--sage)'], ['RSVP-Rücklauf', rsvpPct, `${confirmed}/${guests.length}`, 'var(--terra)'], ['Budget', budgPct, `${totalCom.toLocaleString('de-DE')} €`, 'var(--gold)']].map(([l, v, s, c]) => (
              <div key={l} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: 'var(--brown)', fontWeight: 500 }}>{l}</span>
                  <span style={{ color: 'var(--mocha)' }}>{s}</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: v + '%', background: c }} /></div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <div className="section-title" style={{ margin: 0 }}>Nächste Aufgaben</div>
              <Link to="/tasks" style={{ fontSize: 11, color: 'var(--terra)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                Alle <IconArrowRight size={12} stroke={2} />
              </Link>
            </div>
            {upcoming.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #F5EFE4' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.priority === 'high' ? '#E57373' : t.priority === 'medium' ? '#F9A825' : 'var(--sage)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--espresso)' }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--mocha)' }}>{t.due ? new Date(t.due).toLocaleDateString('de-DE') : ''} · {t.cat}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid-2">
          <div className="card-warm">
            <div className="section-title">Schnellaktionen</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { to: '/guests', Icon: IconUsers, l: 'Gäste' },
                { to: '/budget', Icon: IconWallet, l: 'Budget' },
                { to: '/tasks', Icon: IconCheckbox, l: 'Aufgaben' },
                { to: '/seating', Icon: IconLayoutColumns, l: 'Sitzordnung' }
              ].map(({ to, Icon, l }) => (
                <Link key={to} to={to} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: 12, background: 'var(--cream)', border: '1px solid var(--sand)', borderRadius: 12, cursor: 'pointer', transition: 'all .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--sand)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--cream)'}>
                    <Icon size={20} stroke={1.5} style={{ color: 'var(--terra)', marginBottom: 4 }} />
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--brown)' }}>{l}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="card-warm">
            <div className="section-title">Letzte Aktivitäten</div>
            {[
              { t: 'Fotografin gebucht', time: 'gestern', icon: '📸' },
              { t: 'Budget aktualisiert', time: 'vor 2 Tagen', icon: '🌿' },
              { t: '3 neue RSVP', time: 'vor 3 Tagen', icon: '✉️' },
              { t: 'Sitzplan begonnen', time: 'vor 5 Tagen', icon: '🌸' }
            ].map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 3 ? '1px solid #F5EFE4' : 'none' }}>
                <span style={{ fontSize: 16 }}>{a.icon}</span>
                <div><div style={{ fontSize: 13 }}>{a.t}</div><div style={{ fontSize: 11, color: 'var(--mocha)' }}>{a.time}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card" style={{ borderTopColor: accent }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

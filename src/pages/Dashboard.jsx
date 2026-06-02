import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  IconUsers, IconWallet, IconCheckbox, IconLayoutColumns,
  IconArrowRight, IconExternalLink, IconPlus, IconBell
} from '@tabler/icons-react';
import { loadState, defaultWedding, makeSlug } from '../data/store';
import { getWedding, getGuests, getBudgetItems, getTasks, getRSVPs, getPhotos } from '../lib/db';

export default function Dashboard() {
  const [data, setData] = useState({
    wedding:     loadState('wedding', defaultWedding),
    guests:      loadState('guests', []),
    budgetItems: loadState('budgetItems', []),
    tasks:       loadState('tasks', []),
    rsvps:       [],
    pendingPhotos: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getWedding(),
      getGuests(),
      getBudgetItems(),
      getTasks(),
      getRSVPs(),
      getPhotos(),
    ]).then(([w, g, b, t, r, p]) => {
      setData({
        wedding:      w.data || loadState('wedding', defaultWedding),
        guests:       g.data || [],
        budgetItems:  b.data || [],
        tasks:        t.data || [],
        rsvps:        r.data || [],
        pendingPhotos: (p.data || []).filter(ph => !ph.approved && ph.uploaded_by === 'guest').length,
      });
      setLoading(false);
    });
  }, []);

  const { wedding, guests, budgetItems, tasks, rsvps, pendingPhotos } = data;

  const days         = Math.ceil((new Date(wedding.date) - new Date()) / 86400000);
  const confirmed    = guests.filter(g => g.status === 'confirmed').length;
  const pending      = guests.filter(g => g.status === 'pending').length;
  const rsvpPct      = guests.length ? Math.round(confirmed / guests.length * 100) : 0;
  const totalSpent   = budgetItems.filter(i => i.paid).reduce((s, i) => s + (i.amount || 0), 0);
  const totalCom     = budgetItems.reduce((s, i) => s + (i.amount || 0), 0);
  const budgPct      = wedding.budget ? Math.min(100, Math.round(totalCom / wedding.budget * 100)) : 0;
  const doneTasks    = tasks.filter(t => t.done).length;
  const taskPct      = tasks.length ? Math.round(doneTasks / tasks.length * 100) : 0;
  const upcoming     = [...tasks].filter(t => !t.done).sort((a, b) => new Date(a.due||a.dueDate||0) - new Date(b.due||b.dueDate||0)).slice(0, 4);
  const newRsvps     = rsvps.filter(r => !guests.some(g => g.name?.toLowerCase() === r.name?.toLowerCase())).length;
  const guestUrl     = `/guest/${makeSlug(wedding)}`;

  const notifications = [
    newRsvps > 0 && { icon: '✉️', text: `${newRsvps} neue RSVP-Eingänge`, to: '/guests', color: 'var(--terra)' },
    pendingPhotos > 0 && { icon: '📸', text: `${pendingPhotos} Fotos warten auf Freigabe`, to: '/memories', color: 'var(--gold)' },
    pending > 0 && { icon: '⏳', text: `${pending} Gäste noch ausstehend`, to: '/guests', color: 'var(--mocha)' },
  ].filter(Boolean);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>{wedding.bride} & {wedding.groom}</h1>
          <div className="topbar-sub">
            {loading ? 'Wird geladen...' : days > 0 ? `Noch ${days} Tage bis zu eurem großen Tag 🌸` : '🎉 Heute!'}
          </div>
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
        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <StatCard label="Tage noch"  value={days}          sub={new Date(wedding.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })} accent="var(--gold)" />
          <StatCard label="Gäste"      value={guests.length} sub={`${confirmed} zugesagt`} accent="var(--sage)" />
          <StatCard label="RSVP"       value={rsvpPct + '%'} sub={`${pending} ausstehend`} accent="var(--terra)" />
          <StatCard label="Budget"     value={budgPct + '%'} sub={totalSpent.toLocaleString('de-DE') + ' € bezahlt'} accent="var(--blush)" />
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'var(--mocha)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <IconBell size={13} stroke={1.5} /> Hinweise
            </div>
            {notifications.map((n, i) => (
              <Link key={i} to={n.to} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < notifications.length - 1 ? '1px solid var(--sand)' : 'none', textDecoration: 'none' }}>
                <span style={{ fontSize: 16 }}>{n.icon}</span>
                <span style={{ fontSize: 13, color: n.color, fontWeight: 500 }}>{n.text}</span>
                <IconArrowRight size={12} stroke={2} style={{ marginLeft: 'auto', color: 'var(--mocha)' }} />
              </Link>
            ))}
          </div>
        )}

        <div className="grid-2" style={{ marginBottom: 16 }}>
          {/* Progress */}
          <div className="card">
            <div className="section-title">Planungsfortschritt</div>
            {[
              ['Aufgaben',    taskPct, `${doneTasks}/${tasks.length}`,           'var(--sage)'],
              ['RSVP-Rücklauf', rsvpPct, `${confirmed}/${guests.length}`,        'var(--terra)'],
              ['Budget',      budgPct, `${totalCom.toLocaleString('de-DE')} €`,  'var(--gold)'],
            ].map(([l, v, s, c]) => (
              <div key={l} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: 'var(--brown)', fontWeight: 500 }}>{l}</span>
                  <span style={{ color: 'var(--mocha)' }}>{s}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: v + '%', background: c }} />
                </div>
              </div>
            ))}
          </div>

          {/* Next tasks */}
          <div className="card">
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <div className="section-title" style={{ margin: 0 }}>Nächste Aufgaben</div>
              <Link to="/tasks" style={{ fontSize: 11, color: 'var(--terra)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                Alle <IconArrowRight size={12} stroke={2} />
              </Link>
            </div>
            {upcoming.length === 0 && <div style={{ fontSize: 13, color: 'var(--mocha)', textAlign: 'center', padding: '16px 0' }}>🎉 Alle erledigt!</div>}
            {upcoming.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < upcoming.length - 1 ? '1px solid #F5EFE4' : 'none' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.priority === 'high' ? '#E57373' : t.priority === 'medium' ? '#F9A825' : 'var(--sage)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--espresso)' }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--mocha)' }}>
                    {(t.due||t.dueDate) ? new Date(t.due||t.dueDate).toLocaleDateString('de-DE') : ''} · {t.category||t.cat||''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card-warm">
          <div className="section-title">Schnellaktionen</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { to: '/guests',  Icon: IconUsers,         l: 'Gäste' },
              { to: '/budget',  Icon: IconWallet,         l: 'Budget' },
              { to: '/tasks',   Icon: IconCheckbox,       l: 'Aufgaben' },
              { to: '/seating', Icon: IconLayoutColumns,  l: 'Sitzordnung' },
            ].map(({ to, Icon, l }) => (
              <Link key={to} to={to} style={{ textDecoration: 'none' }}>
                <div style={{ padding: 12, background: 'var(--cream)', border: '1px solid var(--sand)', borderRadius: 12, cursor: 'pointer', transition: 'all .15s', textAlign: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--sand)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--cream)'}>
                  <Icon size={20} stroke={1.5} style={{ color: 'var(--terra)', marginBottom: 4 }} />
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--brown)' }}>{l}</div>
                </div>
              </Link>
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

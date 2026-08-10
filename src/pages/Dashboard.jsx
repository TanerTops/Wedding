import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  IconUsers, IconWallet, IconCheckbox, IconLayoutColumns,
  IconArrowRight, IconExternalLink, IconPlus, IconBell, IconX,
  IconBuildingStore, IconClock, IconMapPin, IconMusic, IconGift,
  IconNotes, IconWorldWww, IconPhoto, IconCamera, IconSettings,
} from '@tabler/icons-react';
import { loadState, defaultWedding, makeSlug, QUICK_ACTION_CATALOG, DEFAULT_QUICK_ACTIONS, hasFullAccess, FULL_ACCESS_PRICE, STRIPE_PAYMENT_LINK } from '../data/store';
import { getWedding, getGuests, getBudgetItems, getTasks, getRSVPs, getPhotos, getMusicWishes, uploadCouplePhoto, removeCouplePhoto } from '../lib/db';
import Onboarding from './Onboarding';

const QA_ICON_MAP = {
  IconUsers, IconWallet, IconBuildingStore, IconCheckbox, IconClock,
  IconLayoutColumns, IconMapPin, IconMusic, IconGift, IconNotes,
  IconWorldWww, IconPhoto, IconCamera, IconSettings,
};

export default function Dashboard() {
  const [data, setData] = useState({
    wedding:     loadState('wedding', defaultWedding),
    guests:      loadState('guests', []),
    budgetItems: loadState('budgetItems', []),
    tasks:       loadState('tasks', []),
    rsvps:       [],
    pendingPhotos: 0,
    recentRsvps:  [],
    recentPhotos: [],
    recentWishes: [],
  });
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(() => !loadState('onboardingDismissed', false));
  const [quickActions] = useState(() => loadState('quickActions', DEFAULT_QUICK_ACTIONS));
  const [coupleUploading, setCoupleUploading] = useState(false);
  const coupleFileRef = useRef(null);

  async function handleCouplePhotoUpload(file) {
    if (!file) return;
    setCoupleUploading(true);
    const { data: result, error } = await uploadCouplePhoto(file);
    if (!error && result) {
      setData(d => ({ ...d, wedding: { ...d.wedding, couple_photo_url: result.url, couple_photo_path: result.path } }));
      window.dispatchEvent(new Event('weddingUpdated'));
    } else if (error) {
      alert(error.message || 'Fehler beim Hochladen.');
    }
    setCoupleUploading(false);
    if (coupleFileRef.current) coupleFileRef.current.value = '';
  }

  async function handleCouplePhotoRemove(e) {
    e.stopPropagation();
    if (!confirm('Foto entfernen?')) return;
    await removeCouplePhoto(data.wedding.couple_photo_path);
    setData(d => ({ ...d, wedding: { ...d.wedding, couple_photo_url: '', couple_photo_path: '' } }));
    window.dispatchEvent(new Event('weddingUpdated'));
  }

  useEffect(() => {
    Promise.all([
      getWedding(),
      getGuests(),
      getBudgetItems(),
      getTasks(),
      getRSVPs(),
      getPhotos(),
      getMusicWishes(),
    ]).then(([w, g, b, t, r, p, m]) => {
      setData({
        wedding:      w.data || loadState('wedding', defaultWedding),
        guests:       g.data || [],
        budgetItems:  b.data || [],
        tasks:        t.data || [],
        rsvps:        r.data || [],
        pendingPhotos: (p.data || []).filter(ph => !ph.approved && ph.uploaded_by === 'guest').length,
        // Bugfix: these were fetched but never stored, so "Letzte Aktivitäten" always showed empty
        recentRsvps:  r.data || [],
        recentPhotos: (p.data || []).filter(ph => ph.uploaded_by === 'guest'),
        recentWishes: m.data || [],
      });
      setLoading(false);
    });
  }, []);

  const { wedding, guests, budgetItems, tasks, rsvps, pendingPhotos } = data;
  const purchased = hasFullAccess(wedding);
  const [showUpsell, setShowUpsell] = useState(true);

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

  // Payment reminders: items due within 14 days
  const dueItems = budgetItems.filter(i => {
    if (i.paid) return false;
    if (!i.due) return false;
    const d = Math.ceil((new Date(i.due) - new Date()) / 86400000);
    return d >= 0 && d <= 14;
  }).sort((a, b) => new Date(a.due) - new Date(b.due));

  const notifications = [
    newRsvps > 0 && { icon: '✉️', text: `${newRsvps} neue RSVP-Eingänge`, to: '/guests', color: 'var(--terra)' },
    pendingPhotos > 0 && { icon: '📸', text: `${pendingPhotos} Fotos warten auf Freigabe`, to: '/memories', color: 'var(--gold)' },
    pending > 0 && { icon: '⏳', text: `${pending} Gäste noch ausstehend`, to: '/guests', color: 'var(--mocha)' },
    ...dueItems.map(i => {
      const d = Math.ceil((new Date(i.due) - new Date()) / 86400000);
      return { icon: '💳', text: `${i.desc || i.description}: ${i.amount?.toLocaleString('de-DE')} € fällig in ${d} Tag${d !== 1 ? 'en' : ''}`, to: '/budget', color: '#E57373' };
    }),
  ].filter(Boolean);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Übersicht</h1>
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
        {/* Onboarding */}
        {showOnboarding && <Onboarding onDismiss={() => setShowOnboarding(false)} />}

        {/* Upsell banner — freemium accounts only, dismissible */}
        {!purchased && showUpsell && (
          <div className="card-warm" style={{ marginBottom: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 20 }}>🔓</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--espresso)' }}>Ihr nutzt gerade die kostenlose Version</div>
              <div style={{ fontSize: 12, color: 'var(--mocha)', marginTop: 2 }}>
                Schaltet Zeitplan, Sitzordnung, Location, Musik, Gästeseite & mehr frei — einmalig {FULL_ACCESS_PRICE} €.
              </div>
            </div>
            <a
              href={wedding?.user_id ? `${STRIPE_PAYMENT_LINK}?client_reference_id=${encodeURIComponent(wedding.user_id)}` : STRIPE_PAYMENT_LINK}
              target="_blank" rel="noopener" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}
            >
              Jetzt freischalten
            </a>
            <button onClick={() => setShowUpsell(false)} className="btn-icon" style={{ flexShrink: 0 }} title="Ausblenden">
              <IconX size={14} stroke={1.5} />
            </button>
          </div>
        )}

        {/* Beautiful countdown hero */}
        <div className="card" style={{ marginBottom: 16, padding: '28px 24px', background: 'linear-gradient(135deg, #FDF8F0 0%, #F5EDE0 100%)', border: '1px solid var(--sand)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', right: -20, top: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(196,149,106,0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 40, bottom: -40, width: 100, height: 100, borderRadius: '50%', background: 'rgba(168,181,160,0.1)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Couple photo upload zone */}
              <div
                onClick={() => !coupleUploading && coupleFileRef.current?.click()}
                title={wedding.couple_photo_url ? 'Foto ändern' : 'Foto hochladen'}
                style={{ position: 'relative', width: 84, height: 84, flexShrink: 0, cursor: coupleUploading ? 'default' : 'pointer' }}
              >
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '3px solid #fff', boxShadow: '0 2px 10px rgba(91,61,30,0.15)', background: wedding.couple_photo_url ? 'transparent' : 'var(--warm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {wedding.couple_photo_url ? (
                    <img src={wedding.couple_photo_url} alt="Brautpaar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : coupleUploading ? (
                    <div style={{ fontSize: 9, color: 'var(--mocha)' }}>Lädt…</div>
                  ) : (
                    <IconCamera size={22} stroke={1.5} style={{ color: 'var(--taupe)' }} />
                  )}
                </div>
                <div style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: '50%', background: 'var(--brown)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <IconCamera size={11} stroke={2} style={{ color: '#fff' }} />
                </div>
                {wedding.couple_photo_url && (
                  <button onClick={handleCouplePhotoRemove} title="Foto entfernen"
                    style={{ position: 'absolute', top: -4, left: -4, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <IconX size={10} stroke={2} />
                  </button>
                )}
                <input ref={coupleFileRef} type="file" accept="image/*" hidden onChange={e => handleCouplePhotoUpload(e.target.files?.[0])} />
              </div>
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 38, fontStyle: 'italic', color: 'var(--espresso)', lineHeight: 1.1 }}>
                  {days > 0 ? `Noch ${days} Tage` : days === 0 ? '🎉 Heute!' : `Vor ${Math.abs(days)} Tagen`}
                </div>
                <div style={{ fontSize: 13, color: 'var(--mocha)', marginTop: 6 }}>
                  {new Date(wedding.date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  {wedding.venue && ` · ${wedding.venue}`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { v: Math.floor(days / 7), l: 'Wochen' },
                { v: days, l: 'Tage' },
                { v: days * 24, l: 'Stunden' },
              ].map(({ v, l }) => (
                <div key={l} style={{ textAlign: 'center', background: '#fff', borderRadius: 14, padding: '12px 16px', border: '1px solid var(--sand)', minWidth: 64 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--espresso)', fontFamily: "'Cormorant Garamond',serif" }}>{Math.max(0, v)}</div>
                  <div style={{ fontSize: 10, color: 'var(--mocha)', textTransform: 'uppercase', letterSpacing: 1 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <StatCard label="Gäste"      value={guests.length} sub={`${confirmed} zugesagt`} accent="var(--sage)" />
          <StatCard label="RSVP"       value={rsvpPct + '%'} sub={`${pending} ausstehend`} accent="var(--terra)" />
          <StatCard label="Budget"     value={budgPct + '%'} sub={totalSpent.toLocaleString('de-DE') + ' € bezahlt'} accent="var(--blush)" />
          <StatCard label="Aufgaben"   value={taskPct + '%'} sub={`${doneTasks}/${tasks.length} erledigt`} accent="var(--gold)" />
        </div>

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

        <div className="grid-2">
          {/* Quick actions */}
          <div className="card-warm">
            <div className="section-title">Schnellaktionen</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {quickActions
                .map(id => QUICK_ACTION_CATALOG.find(a => a.id === id))
                .filter(Boolean)
                .map(({ to, iconName, label }) => {
                  const Icon = QA_ICON_MAP[iconName] || IconUsers;
                  return (
                    <Link key={to} to={to} style={{ textDecoration: 'none' }}>
                      <div style={{ padding: 12, background: 'var(--cream)', border: '1px solid var(--sand)', borderRadius: 12, cursor: 'pointer', transition: 'all .15s', textAlign: 'center' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--sand)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--cream)'}>
                        <Icon size={20} stroke={1.5} style={{ color: 'var(--terra)', marginBottom: 4 }} />
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--brown)' }}>{label}</div>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>

          {/* Recent activity */}
          <div className="card-warm">
            <div className="section-title">Letzte Aktivitäten von Gästen</div>
            {[
              ...(data.recentRsvps || []).map(r => ({
                icon: r.attending === 'yes' ? '✅' : '❌',
                text: `${r.name} hat ${r.attending === 'yes' ? 'zugesagt' : 'abgesagt'}`,
                time: r.submitted_at,
                to: '/guests',
              })),
              ...(data.recentPhotos || []).map(p => ({
                icon: '📸',
                text: `Foto von ${p.uploader || 'Gast'} hochgeladen`,
                time: p.created_at,
                to: '/memories',
              })),
              ...(data.recentWishes || []).map(w => ({
                icon: '🎵',
                text: `Musikwunsch von ${w.sender_name || 'Gast'}`,
                time: w.submitted_at,
                to: '/music',
              })),
            ]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 5)
            .map((a, i, arr) => (
              <Link key={i} to={a.to} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid #F5EFE4' : 'none', textDecoration: 'none' }}>
                <span style={{ fontSize: 16 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--espresso)' }}>{a.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--mocha)' }}>
                    {a.time ? new Date(a.time).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              </Link>
            ))}
            {(data.recentRsvps || []).length === 0 && (data.recentPhotos || []).length === 0 && (data.recentWishes || []).length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--mocha)', textAlign: 'center', padding: '16px 0' }}>
                Noch keine Aktivitäten
              </div>
            )}
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

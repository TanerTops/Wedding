import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { IconBell, IconX, IconArrowRight } from '@tabler/icons-react';
import { getBudgetItems, getTasks, getRSVPs, getPhotos } from '../lib/db';

const daysUntil = d => Math.ceil((new Date(d) - new Date()) / 86400000);

function deriveNotifications(budget, tasks, rsvps, photos) {
  const notes = [];

  // ── Überfällige Aufgaben ──
  const overdue = (tasks || []).filter(t => !t.done && t.due && daysUntil(t.due) < 0);
  if (overdue.length > 0) {
    notes.push({
      id:    'overdue-tasks',
      icon:  '⚠️',
      title: `${overdue.length} überfällige Aufgabe${overdue.length !== 1 ? 'n' : ''}`,
      desc:  overdue.slice(0, 2).map(t => t.title).join(', ') + (overdue.length > 2 ? ` +${overdue.length - 2}` : ''),
      to:    '/tasks',
      color: '#E57373',
    });
  }

  // ── Aufgaben fällig in 7 Tagen ──
  const soonTasks = (tasks || []).filter(t => !t.done && t.due && daysUntil(t.due) >= 0 && daysUntil(t.due) <= 7);
  if (soonTasks.length > 0) {
    notes.push({
      id:    'soon-tasks',
      icon:  '📋',
      title: `${soonTasks.length} Aufgabe${soonTasks.length !== 1 ? 'n' : ''} diese Woche fällig`,
      desc:  soonTasks.slice(0, 2).map(t => t.title).join(', ') + (soonTasks.length > 2 ? ` +${soonTasks.length - 2}` : ''),
      to:    '/tasks',
      color: 'var(--gold)',
    });
  }

  // ── Anstehende Zahlungen ≤ 14 Tage ──
  const duePayments = (budget || [])
    .filter(i => !i.paid && i.due && daysUntil(i.due) >= 0 && daysUntil(i.due) <= 14)
    .sort((a, b) => new Date(a.due) - new Date(b.due));
  duePayments.forEach(item => {
    const d = daysUntil(item.due);
    notes.push({
      id:    `payment-${item.id}`,
      icon:  '💳',
      title: `${item.desc || item.description}: ${Number(item.amount).toLocaleString('de-DE')} €`,
      desc:  d === 0 ? 'Heute fällig' : d === 1 ? 'Morgen fällig' : `Fällig in ${d} Tagen`,
      to:    '/budget',
      color: d <= 3 ? '#E57373' : 'var(--terra)',
    });
  });

  // ── RSVP-Eingänge ──
  const rsvpList = (rsvps || []).slice(0, 5);
  if (rsvpList.length > 0) {
    const attending = rsvpList.filter(r => r.attending === 'yes').length;
    const declined  = rsvpList.filter(r => r.attending !== 'yes').length;
    notes.push({
      id:    'rsvps',
      icon:  '✉️',
      title: `${rsvpList.length} RSVP-Eingänge`,
      desc:  `${attending} zugesagt · ${declined} abgesagt`,
      to:    '/guests',
      color: 'var(--sage)',
    });
  }

  // ── Fotos zur Freigabe ──
  const pendingPhotos = (photos || []).filter(p => !p.approved && p.uploaded_by === 'guest');
  if (pendingPhotos.length > 0) {
    notes.push({
      id:    'photos',
      icon:  '📸',
      title: `${pendingPhotos.length} Foto${pendingPhotos.length !== 1 ? 's' : ''} zur Freigabe`,
      desc:  'Von Gästen hochgeladen — noch nicht freigegeben',
      to:    '/memories',
      color: 'var(--mocha)',
    });
  }

  return notes;
}

function deriveCount(budget, tasks, rsvps, photos) {
  let n = 0;
  n += (tasks  || []).filter(t => !t.done && t.due && daysUntil(t.due) <= 7).length;
  n += (budget || []).filter(i => !i.paid && i.due && daysUntil(i.due) >= 0 && daysUntil(i.due) <= 14).length;
  if ((rsvps  || []).length > 0) n += 1;
  if ((photos || []).filter(p => !p.approved && p.uploaded_by === 'guest').length > 0) n += 1;
  return n;
}

export default function NotificationCenter() {
  const [open,    setOpen]    = useState(false);
  const [items,   setItems]   = useState([]);
  const [count,   setCount]   = useState(0);
  const [loading, setLoading] = useState(true);
  const panelRef              = useRef();

  // Load once — shared between badge count and panel content
  useEffect(() => {
    Promise.all([getBudgetItems(), getTasks(), getRSVPs(), getPhotos()])
      .then(([budget, tasks, rsvps, photos]) => {
        const b = budget.data || [];
        const t = tasks.data  || [];
        const r = rsvps.data  || [];
        const p = photos.data || [];
        setItems(deriveNotifications(b, t, r, p));
        setCount(deriveCount(b, t, r, p));
        setLoading(false);
      });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Detect mobile (< 769px) to adjust panel bottom
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 769;

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position:     'relative',
          background:   open ? 'var(--sand)' : '#fff',
          border:       '1px solid var(--sand)',
          borderRadius: 10,
          cursor:       'pointer',
          padding:      '6px 8px',
          display:      'flex',
          alignItems:   'center',
          color:        open ? 'var(--terra)' : 'var(--mocha)',
          transition:   'all .15s',
          boxShadow:    '0 1px 4px rgba(91,61,30,0.08)',
        }}
        title="Benachrichtigungen"
      >
        <IconBell size={18} stroke={1.5}/>
        {count > 0 && (
          <span style={{
            position:       'absolute',
            top:            -5,
            right:          -5,
            background:     'var(--terra)',
            color:          '#fff',
            borderRadius:   '50%',
            width:          17,
            height:         17,
            fontSize:       9,
            fontWeight:     700,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontFamily:     "'DM Sans', sans-serif",
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div
          style={{ position:'fixed', inset:0, zIndex:498, background:'rgba(91,61,30,0.08)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in panel — avoids MobileNav at bottom on mobile */}
      <div
        ref={panelRef}
        style={{
          position:      'fixed',
          top:           0,
          right:         0,
          // On mobile: stop above the MobileNav (57px + safe area)
          bottom:        isMobile ? 'calc(57px + env(safe-area-inset-bottom, 4px))' : 0,
          width:         340,
          maxWidth:      '92vw',
          background:    '#fff',
          borderLeft:    '1px solid var(--sand)',
          zIndex:        499,
          display:       'flex',
          flexDirection: 'column',
          boxShadow:     '-4px 0 32px rgba(91,61,30,0.12)',
          transform:     open ? 'translateX(0)' : 'translateX(110%)',
          transition:    'transform 0.28s cubic-bezier(.32,.72,0,1)',
        }}
      >
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 20px 14px', borderBottom:'1px solid var(--sand)', background:'linear-gradient(135deg,#FDF8F0,#F5EDE0)', flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:'var(--espresso)' }}>Benachrichtigungen</div>
            {!loading && (
              <div style={{ fontSize:12, color:'var(--mocha)', marginTop:2 }}>
                {items.length > 0 ? `${items.length} Hinweis${items.length !== 1 ? 'e' : ''}` : 'Alles im grünen Bereich'}
              </div>
            )}
          </div>
          <button className="btn-icon" onClick={() => setOpen(false)}><IconX size={15} stroke={2}/></button>
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 0' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--mocha)', fontSize:13 }}>Lädt...</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 24px' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🌸</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:'var(--espresso)', marginBottom:6 }}>Alles erledigt!</div>
              <div style={{ fontSize:13, color:'var(--mocha)', lineHeight:1.6 }}>Keine offenen Hinweise — ihr seid gut vorbereitet.</div>
            </div>
          ) : (
            items.map((item, i) => (
              <Link
                key={item.id}
                to={item.to}
                onClick={() => setOpen(false)}
                style={{
                  display:        'flex',
                  alignItems:     'flex-start',
                  gap:            12,
                  padding:        '14px 20px',
                  borderBottom:   i < items.length - 1 ? '1px solid #FAF6F0' : 'none',
                  textDecoration: 'none',
                  background:     '#fff',
                  transition:     'background .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#FDF8F2'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <div style={{ width:3, alignSelf:'stretch', background:item.color, borderRadius:4, flexShrink:0, marginTop:2 }}/>
                <span style={{ fontSize:20, flexShrink:0, marginTop:1 }}>{item.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13.5, fontWeight:600, color:'var(--espresso)', marginBottom:2 }}>{item.title}</div>
                  <div style={{ fontSize:12, color:'var(--mocha)', lineHeight:1.4 }}>{item.desc}</div>
                </div>
                <IconArrowRight size={14} stroke={2} style={{ color:'var(--mocha)', flexShrink:0, marginTop:4 }}/>
              </Link>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'10px 20px', borderTop:'1px solid var(--sand)', background:'var(--warm)', fontSize:11, color:'var(--mocha)', textAlign:'center', flexShrink:0 }}>
          Aktualisiert beim App-Start
        </div>
      </div>
    </>
  );
}

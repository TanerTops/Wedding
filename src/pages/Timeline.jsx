import { useState, useEffect } from 'react';
import {
  IconPlus, IconTrash, IconEdit, IconX, IconDownload,
  IconUsers, IconTool, IconClock, IconMapPin, IconFilter
} from '@tabler/icons-react';
import { loadState, saveState, defaultTimeline } from '../data/store';
import { getTimeline, upsertTimelineEvent, deleteTimelineEvent } from '../lib/db';

const TYPES = [
  { id: 'ceremony',     label: 'Trauung',         color: '#C4956A', bg: '#FDF5E8', emoji: '💒' },
  { id: 'getting-ready',label: 'Getting Ready',   color: '#B8A9C9', bg: '#F5F0FB', emoji: '💄' },
  { id: 'photo',        label: 'Fotos',           color: '#A8B5A0', bg: '#F0F5EE', emoji: '📸' },
  { id: 'reception',    label: 'Empfang',         color: '#C9A884', bg: '#FDF8F0', emoji: '🥂' },
  { id: 'dinner',       label: 'Dinner',          color: '#8B9E7A', bg: '#EEF2EC', emoji: '🍽️' },
  { id: 'party',        label: 'Feier',           color: '#C4B5A5', bg: '#FAF6F2', emoji: '🎉' },
  { id: 'speech',       label: 'Reden',           color: '#9B8EA0', bg: '#F3F0F5', emoji: '🎤' },
  { id: 'logistics',    label: 'Organisation',    color: '#B5A88A', bg: '#F5F2EA', emoji: '📋' },
  { id: 'other',        label: 'Sonstiges',       color: '#A89880', bg: '#F5F2ED', emoji: '✨' },
];
const getType = id => TYPES.find(t => t.id === id) || TYPES[TYPES.length - 1];

// Parse "HH:MM" → minutes
const toMin = t => { try { const [h,m]=t.split(':').map(Number); return h*60+m; } catch { return 0; } };
// Minutes → "HH:MM"
const toTime = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
// Format "HH:MM" nicely
const fmt = t => { try { const [h,m]=t.split(':'); const d=new Date(2000,0,1,+h,+m); return d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}); } catch { return t; } };


export default function Timeline() {
  const [events, setEvents] = useState(() => loadState('timeline', defaultTimeline));

  useEffect(() => {
    getTimeline().then(({ data }) => {
      if (data && data.length > 0) {
        const mapped = data.map(e => ({ ...e, endTime: e.end_time || e.endTime, desc: e.description || e.desc }));
        setEvents(mapped);
        saveState('timeline', mapped);
      }
    });
  }, []);
  const [tab, setTab] = useState('editor');
  const [activeFilter, setActiveFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  function save(e) { setEvents(e); saveState('timeline', e); }
  async function saveEvent(event) {
    const updated = events.find(e => e.id === event.id)
      ? events.map(e => e.id === event.id ? event : e)
      : [...events, event];
    save(updated);
    await upsertTimelineEvent(event);
  }
  async function removeEvent(id) {
    save(events.filter(e => e.id !== id));
    await deleteTimelineEvent(id);
  }

  const sorted = [...events].sort((a,b) => toMin(a.time) - toMin(b.time));

  // Filter
  const filtered = activeFilter === 'all' ? sorted
    : sorted.filter(e => e.type === activeFilter);

  // Category counts
  const catCounts = TYPES.map(t => ({ ...t, count: events.filter(e => e.type === t.id).length })).filter(c => c.count > 0);

  function openAdd() {
    setForm({ time: '12:00', endTime: '13:00', title: '', type: 'reception', loc: '', desc: '', guests: true, vendor: false });
    setModal('add');
  }
  function openEdit(ev) { setForm({ ...ev }); setModal(ev.id); }
  function handleSave() {
    if (!form.title?.trim()) return;
    const event = modal === 'add'
      ? { ...form, id: Math.max(0, ...events.map(e => e.id)) + 1 }
      : { ...form, id: modal };
    saveEvent(event);
    setModal(null);
  }
  function del(id) { if (confirm('Termin löschen?')) removeEvent(id); }

  function exportText() {
    const lines = sorted.map(e => `${fmt(e.time)} – ${e.endTime ? fmt(e.endTime) : ''} | ${e.title}${e.loc ? ` @ ${e.loc}` : ''}${e.desc ? `\n  ${e.desc}` : ''}`);
    const blob = new Blob([lines.join('\n\n')], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'zeitplan.txt'; a.click();
  }

  // Build visual timeline rows
  // Detect parallels: events that overlap in time
  function buildRows(evs) {
    const rows = [];
    for (const ev of evs) {
      const start = toMin(ev.time);
      const end   = ev.endTime ? toMin(ev.endTime) : start + 60;
      let placed = false;
      for (const row of rows) {
        const last = row[row.length - 1];
        const lastEnd = last.endTime ? toMin(last.endTime) : toMin(last.time) + 60;
        if (start >= lastEnd) { row.push(ev); placed = true; break; }
      }
      if (!placed) rows.push([ev]);
    }
    return rows;
  }

  // Guest requests (demo)
  const guestRequests = [
    { id:1, name:'Max Müller', type:'Rede', desc:'Möchte eine kurze Rede halten (~5 Min)', time:'Nach dem Dinner', status:'pending' },
    { id:2, name:'Familie Schneider', type:'Spiel', desc:'Haben ein lustiges Kennenlernspiel vorbereitet', time:'Abends', status:'pending' },
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Zeitplan</h1>
          <div className="topbar-sub">Plant jeden Moment eures besonderen Tages</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={exportText}>
            <IconDownload size={14} stroke={1.5} /> Export
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <IconPlus size={15} stroke={2} /> Termin
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button className={`tab${tab==='editor'?' active':''}`} onClick={() => setTab('editor')}>
            Zeitplan Editor
          </button>
          <button className={`tab${tab==='requests'?' active':''}`} onClick={() => setTab('requests')}>
            Gästeanfragen
            {guestRequests.filter(r=>r.status==='pending').length > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--terra)', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
                {guestRequests.filter(r=>r.status==='pending').length}
              </span>
            )}
          </button>
        </div>

        {/* ── EDITOR TAB ── */}
        {tab === 'editor' && (
          <>
            {/* Day overview card */}
            <div className="card" style={{ marginBottom: 20, padding: '14px 18px' }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: 'var(--espresso)', marginBottom: 12 }}>Übersicht Hochzeitstag</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <div style={{ background: 'var(--warm)', borderRadius: 10, padding: '8px 14px', textAlign: 'center', border: '1px solid var(--sand)' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--espresso)' }}>{events.length}</div>
                  <div style={{ fontSize: 11, color: 'var(--mocha)' }}>Termine</div>
                </div>
                {(() => {
                  const s = sorted;
                  const first = s[0], last = s[s.length-1];
                  const totalH = last && first ? ((parseInt((last.endTime||last.time).split(':')[0])*60+parseInt((last.endTime||last.time).split(':')[1]||0)) - (parseInt(first.time.split(':')[0])*60+parseInt(first.time.split(':')[1]||0))) : 0;
                  return <>
                    <div style={{ background: 'var(--warm)', borderRadius: 10, padding: '8px 14px', textAlign: 'center', border: '1px solid var(--sand)' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--espresso)' }}>{first ? first.time : '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--mocha)' }}>Beginn</div>
                    </div>
                    <div style={{ background: 'var(--warm)', borderRadius: 10, padding: '8px 14px', textAlign: 'center', border: '1px solid var(--sand)' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--espresso)' }}>{last?.endTime || last?.time || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--mocha)' }}>Ende</div>
                    </div>
                    <div style={{ background: 'var(--warm)', borderRadius: 10, padding: '8px 14px', textAlign: 'center', border: '1px solid var(--sand)' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--espresso)' }}>{events.filter(e=>e.guests).length}</div>
                      <div style={{ fontSize: 11, color: 'var(--mocha)' }}>mit Gästen</div>
                    </div>
                  </>;
                })()}
              </div>
              {/* Mini timeline bar */}
              <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 6, overflow: 'hidden' }}>
                {sorted.map(ev => {
                  const type = getType(ev.type);
                  const dur = ev.endTime
                    ? (parseInt(ev.endTime.split(':')[0])*60+parseInt(ev.endTime.split(':')[1]||0)) - (parseInt(ev.time.split(':')[0])*60+parseInt(ev.time.split(':')[1]||0))
                    : 60;
                  return <div key={ev.id} title={ev.title} style={{ flex: Math.max(1, dur), background: type.color, borderRadius: 2 }} />;
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--taupe)', marginTop: 3 }}>
                <span>{sorted[0]?.time}</span><span>{sorted[sorted.length-1]?.endTime || sorted[sorted.length-1]?.time}</span>
              </div>
            </div>

            {/* Category filter pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 20, alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--mocha)', marginRight: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconFilter size={13} stroke={1.5} /> Filter:
              </div>
              <button onClick={() => setActiveFilter('all')}
                style={{ padding: '4px 14px', borderRadius: 30, border: '1px solid var(--sand)', background: activeFilter==='all'?'var(--brown)':'#fff', color: activeFilter==='all'?'#fff':'var(--mocha)', fontSize: 12.5, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .15s' }}>
                Alle ({events.length})
              </button>
              {catCounts.map(cat => (
                <button key={cat.id} onClick={() => setActiveFilter(cat.id)}
                  style={{ padding: '4px 14px', borderRadius: 30, border: `1px solid ${cat.color}44`, background: activeFilter===cat.id?cat.color:cat.bg, color: activeFilter===cat.id?'#fff':cat.color, fontSize: 12.5, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 500, transition: 'all .15s' }}>
                  {cat.emoji} {cat.label} ({cat.count})
                </button>
              ))}
            </div>

            {/* Visual timeline */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {filtered.map((ev, idx) => {
                const type = getType(ev.type);
                const duration = ev.endTime
                  ? (() => { const m = toMin(ev.endTime) - toMin(ev.time); if (m <= 0) return ''; const h = Math.floor(m/60); const min = m%60; return h > 0 ? `${h}h${min>0?` ${min}min`:''}` : `${min} min`; })()
                  : '';
                const isLast = idx === filtered.length - 1;

                return (
                  <div key={ev.id} style={{ display: 'flex', borderBottom: isLast?'none':'1px solid #F5EFE4' }}>
                    {/* Time column */}
                    <div style={{ width: 72, flexShrink: 0, padding: '18px 0 18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--espresso)', fontFamily: 'DM Sans, sans-serif' }}>{fmt(ev.time)}</span>
                      {ev.endTime && <span style={{ fontSize: 10.5, color: 'var(--mocha)' }}>{fmt(ev.endTime)}</span>}
                    </div>

                    {/* Color stripe */}
                    <div style={{ width: 4, flexShrink: 0, background: type.color, margin: '12px 0' }} />

                    {/* Content */}
                    <div style={{ flex: 1, padding: '16px 16px 16px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          {/* Type badge */}
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: type.bg, border: `1px solid ${type.color}44`, borderRadius: 20, padding: '2px 9px', fontSize: 11, color: type.color, fontWeight: 600, marginBottom: 6 }}>
                            <span style={{ fontSize: 12 }}>{type.emoji}</span> {type.label}
                          </div>

                          <h3 style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--espresso)', marginBottom: 3, lineHeight: 1.3 }}>{ev.title}</h3>

                          {ev.loc && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--mocha)', marginBottom: ev.desc?4:6 }}>
                              <IconMapPin size={12} stroke={1.5} /> {ev.loc}
                            </div>
                          )}

                          {ev.desc && (
                            <div style={{ fontSize: 12.5, color: 'var(--mocha)', marginBottom: 8, lineHeight: 1.5 }}>{ev.desc}</div>
                          )}

                          {/* Badges row */}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            {duration && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--mocha)', background: 'var(--warm)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--sand)' }}>
                                <IconClock size={11} stroke={1.5} /> {duration}
                              </span>
                            )}
                            {ev.guests && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--sage)', background: '#F0F5EE', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--sage)44', fontWeight: 500 }}>
                                <IconUsers size={11} stroke={1.5} /> Gäste
                              </span>
                            )}
                            {ev.vendor && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--terra)', background: '#FDF5E8', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--terra)44', fontWeight: 500 }}>
                                <IconTool size={11} stroke={1.5} /> Dienstleister
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button className="btn-icon" style={{ padding: '5px 7px' }} onClick={() => openEdit(ev)}>
                            <IconEdit size={13} stroke={1.5} />
                          </button>
                          <button className="btn-icon" style={{ padding: '5px 7px', background: '#FEE2E2', color: '#991B1B' }} onClick={() => del(ev.id)}>
                            <IconTrash size={13} stroke={1.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--mocha)' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🌿</div>
                  <p>Keine Termine in dieser Kategorie</p>
                </div>
              )}
            </div>

            {/* Add event button at bottom */}
            <button className="btn btn-secondary" style={{ marginTop: 14, width: '100%', justifyContent: 'center' }} onClick={openAdd}>
              <IconPlus size={15} stroke={2} /> Termin hinzufügen
            </button>
          </>
        )}

        {/* ── GUEST REQUESTS TAB ── */}
        {tab === 'requests' && (
          <div>
            <div className="card-warm" style={{ marginBottom: 16, borderLeft: '3px solid var(--gold)', padding: '12px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--espresso)' }}>
                Gäste können auf eurer Gästeseite Programmwünsche einreichen (Reden, Spiele, Auftritte). Die Anfragen erscheinen hier.
              </div>
            </div>

            {guestRequests.map(req => (
              <div key={req.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--warm)', border: '1px solid var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {req.type === 'Rede' ? '🎤' : req.type === 'Spiel' ? '🎲' : '✨'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--espresso)' }}>{req.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--mocha)', marginTop: 1 }}>
                          {req.type} · gewünschter Zeitpunkt: <strong>{req.time}</strong>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--terra)', background: '#FDF5E8', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--terra)44' }}>
                        Ausstehend
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--mocha)', margin: '8px 0 10px', lineHeight: 1.5 }}>{req.desc}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => {
                        setForm({ time: '19:30', endTime: '20:00', title: `${req.type}: ${req.name}`, type: 'speech', loc: 'Festsaal', desc: req.desc, guests: true, vendor: false });
                        setModal('add');
                        setTab('editor');
                      }}>
                        ✓ In Zeitplan übernehmen
                      </button>
                      <button className="btn btn-secondary btn-sm">Ablehnen</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {guestRequests.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--mocha)' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🌿</div>
                <p>Noch keine Anfragen von Gästen</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3>{modal === 'add' ? 'Termin hinzufügen' : 'Termin bearbeiten'}</h3>
              <button className="btn-icon" onClick={() => setModal(null)}><IconX size={15} stroke={2} /></button>
            </div>

            <div className="form-group">
              <label className="form-label">Titel *</label>
              <input className="input" placeholder="z.B. Freie Trauung" value={form.title||''} onChange={e => setForm(f=>({...f,title:e.target.value}))} />
            </div>

            <div className="form-group">
              <label className="form-label">Kategorie</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                {TYPES.map(t => (
                  <div key={t.id} onClick={() => setForm(f=>({...f,type:t.id}))}
                    style={{ padding: '8px 6px', borderRadius: 10, border: `2px solid ${form.type===t.id?t.color:'var(--sand)'}`, background: form.type===t.id?t.bg:'#fff', cursor: 'pointer', textAlign: 'center', transition: 'all .15s' }}>
                    <div style={{ fontSize: 16, marginBottom: 2 }}>{t.emoji}</div>
                    <div style={{ fontSize: 10.5, color: form.type===t.id?t.color:'var(--mocha)', fontWeight: form.type===t.id?600:400 }}>{t.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Startzeit</label>
                <input className="input" type="time" value={form.time||''} onChange={e => setForm(f=>({...f,time:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Endzeit</label>
                <input className="input" type="time" value={form.endTime||''} onChange={e => setForm(f=>({...f,endTime:e.target.value}))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Location / Ort</label>
              <input className="input" placeholder="z.B. Festsaal" value={form.loc||''} onChange={e => setForm(f=>({...f,loc:e.target.value}))} />
            </div>

            <div className="form-group">
              <label className="form-label">Beschreibung</label>
              <textarea className="input" rows={2} value={form.desc||''} onChange={e => setForm(f=>({...f,desc:e.target.value}))} style={{ resize:'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13.5, color: 'var(--brown)' }}>
                <input type="checkbox" checked={!!form.guests} onChange={e=>setForm(f=>({...f,guests:e.target.checked}))} />
                <IconUsers size={14} stroke={1.5} /> Gäste beteiligt
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13.5, color: 'var(--brown)' }}>
                <input type="checkbox" checked={!!form.vendor} onChange={e=>setForm(f=>({...f,vendor:e.target.checked}))} />
                <IconTool size={14} stroke={1.5} /> Dienstleister
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {modal === 'add' ? 'Hinzufügen' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

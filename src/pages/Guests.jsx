import { useState, useEffect } from 'react';
import { IconPlus, IconTrash, IconEdit, IconX, IconSearch, IconCheck, IconBell, IconKey, IconCopy } from '@tabler/icons-react';
import { loadState, saveState, defaultGuests, makeInviteCode } from '../data/store';
import { getRSVPs } from '../lib/db';

const GROUPS = ['Familie Braut', 'Familie Bräutigam', 'Freunde', 'Arbeit', 'Dienstleister', 'Sonstige'];
const MENUS = ['', 'Fleisch', 'Fisch', 'Vegetarisch', 'Vegan', 'Kinder'];
const AV = ['#C4956A','#A8B5A0','#C4B5A5','#8B9E7A','#B8A9C9','#C9A884','#9B8EA0','#B5A88A'];
const ini = n => n.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
const avc = id => AV[id % AV.length];

export default function Guests() {
  const [guests, setGuests] = useState(() => loadState('guests', defaultGuests));
  const [rsvps, setRsvps] = useState([]);
  const [rsvpsLoading, setRsvpsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fGroup, setFGroup] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [tab, setTab] = useState('guests'); // 'guests' | 'rsvp'

  // Load RSVPs from Supabase
  useEffect(() => {
    getRSVPs().then(({ data }) => {
      setRsvps(data || []);
      setRsvpsLoading(false);
    });
  }, []);

  const newRsvps = rsvps.filter(r => {
    // Check if RSVP name already exists in guests
    return !guests.some(g => g.name.toLowerCase() === r.name.toLowerCase());
  });

  function saveGuests(updated) { setGuests(updated); saveState('guests', updated); }

  function openAdd() { setForm({ name: '', email: '', group: 'Freunde', status: 'pending', menu: '', note: '' }); setModal('add'); }
  function openEdit(g) { setForm({ ...g }); setModal(g.id); }

  function handleSave() {
    if (!form.name?.trim()) return;
    if (modal === 'add') {
      saveGuests([...guests, { ...form, id: Math.max(0, ...guests.map(g => g.id)) + 1 }]);
    } else {
      saveGuests(guests.map(g => g.id === modal ? { ...form, id: g.id } : g));
    }
    setModal(null);
  }

  function del(id) { if (confirm('Gast löschen?')) saveGuests(guests.filter(g => g.id !== id)); }

  // Parse companions string → array of names
  function parseCompanions(str) {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(Boolean);
  }

  // Import RSVP as guest + companions as separate guests
  function importRSVP(rsvp) {
    let updated = [...guests];
    let nextId = Math.max(0, ...updated.map(g => g.id)) + 1;
    const status = rsvp.attending === 'yes' ? 'confirmed' : 'declined';

    // Main guest
    updated.push({
      id: nextId++,
      name: rsvp.name,
      email: rsvp.email || '',
      group: 'Freunde',
      status,
      menu: rsvp.menu || '',
      note: rsvp.message || '',
    });

    // Companions
    parseCompanions(rsvp.companions).forEach(name => {
      updated.push({
        id: nextId++,
        name,
        email: '',
        group: 'Freunde',
        status,
        menu: '',
        note: `Begleitperson von ${rsvp.name}`,
      });
    });

    saveGuests(updated);
  }

  function importAllRSVPs() {
    let updated = [...guests];
    let nextId = Math.max(0, ...updated.map(g => g.id)) + 1;
    newRsvps.forEach(rsvp => {
      const status = rsvp.attending === 'yes' ? 'confirmed' : 'declined';
      updated.push({
        id: nextId++,
        name: rsvp.name,
        email: rsvp.email || '',
        group: 'Freunde',
        status,
        menu: rsvp.menu || '',
        note: rsvp.message || '',
      });
      parseCompanions(rsvp.companions).forEach(name => {
        updated.push({
          id: nextId++,
          name,
          email: '',
          group: 'Freunde',
          status,
          menu: '',
          note: `Begleitperson von ${rsvp.name}`,
        });
      });
    });
    saveGuests(updated);
  }

  const filtered = guests.filter(g => {
    const ms = g.name.toLowerCase().includes(search.toLowerCase()) || (g.email || '').toLowerCase().includes(search.toLowerCase());
    return ms && (!fGroup || g.group === fGroup) && (!fStatus || g.status === fStatus);
  });

  const confirmed = guests.filter(g => g.status === 'confirmed').length;
  const SL = { confirmed: 'Zugesagt', pending: 'Ausstehend', declined: 'Abgesagt' };
  const fmtDate = d => { try { return new Date(d).toLocaleDateString('de-DE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }); } catch { return d; }};

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Gäste</h1>
          <div className="topbar-sub">RSVP, Menüwahl & Gruppen verwalten</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <IconPlus size={15} stroke={2} /> Gast hinzufügen
        </button>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
          {[
            ['Gesamt', guests.length, '', 'var(--mocha)'],
            ['Zugesagt', confirmed, guests.length ? Math.round(confirmed/guests.length*100)+'%' : '', 'var(--sage)'],
            ['Ausstehend', guests.filter(g=>g.status==='pending').length, '', 'var(--gold)'],
            ['Abgesagt', guests.filter(g=>g.status==='declined').length, '', 'var(--blush)'],
          ].map(([l,v,s,a]) => (
            <div key={l} className="stat-card" style={{ borderTopColor: a }}>
              <div className="stat-label">{l}</div>
              <div className="stat-value">{v}</div>
              {s && <div className="stat-sub">{s}</div>}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button className={`tab${tab==='guests'?' active':''}`} onClick={() => setTab('guests')}>
            Gästeliste
          </button>
          <button className={`tab${tab==='rsvp'?' active':''}`} onClick={() => setTab('rsvp')}>
            RSVP Eingänge
            {newRsvps.length > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--terra)', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
                {newRsvps.length} neu
              </span>
            )}
          </button>
          <button className={`tab${tab==='codes'?' active':''}`} onClick={() => setTab('codes')}>
            <IconKey size={13} stroke={1.5} /> Einladungscodes
          </button>
        </div>

        {/* ── GUESTS TAB ── */}
        {tab === 'guests' && (
          <>
            <div className="card" style={{ marginBottom: 16, padding: 12 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 180px' }}>
                  <IconSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--mocha)' }} />
                  <input className="input" style={{ paddingLeft: 32 }} placeholder="Gäste suchen…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input" style={{ flex: '0 1 170px' }} value={fGroup} onChange={e => setFGroup(e.target.value)}>
                  <option value="">Alle Gruppen</option>{GROUPS.map(g => <option key={g}>{g}</option>)}
                </select>
                <select className="input" style={{ flex: '0 1 150px' }} value={fStatus} onChange={e => setFStatus(e.target.value)}>
                  <option value="">Alle Status</option>
                  <option value="confirmed">Zugesagt</option>
                  <option value="pending">Ausstehend</option>
                  <option value="declined">Abgesagt</option>
                </select>
                {(search || fGroup || fStatus) && (
                  <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFGroup(''); setFStatus(''); }}>
                    <IconX size={13} stroke={2} /> Reset
                  </button>
                )}
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Gast</th><th>Gruppe</th><th>Status</th><th>Menü</th><th>Notiz</th>
                    <th style={{ width: 90 }}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(g => (
                    <tr key={g.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div className="avatar" style={{ width: 30, height: 30, background: avc(g.id), fontSize: 10 }}>{ini(g.name)}</div>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{g.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--mocha)' }}>{g.email || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--mocha)' }}>{g.group}</td>
                      <td><span className={`badge badge-${g.status}`}>{SL[g.status]}</span></td>
                      <td style={{ fontSize: 12.5 }}>{g.menu || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--mocha)' }}>{g.note || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" onClick={() => openEdit(g)}><IconEdit size={13} stroke={1.5} /></button>
                          <button className="btn-icon" style={{ background: '#FEE2E2', color: '#991B1B' }} onClick={() => del(g.id)}><IconTrash size={13} stroke={1.5} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '8px 14px', background: 'var(--warm)', fontSize: 11, color: 'var(--mocha)', borderTop: '1px solid var(--sand)' }}>
                {filtered.length} von {guests.length} Gästen
              </div>
            </div>
          </>
        )}

        {/* ── RSVP TAB ── */}
        {tab === 'rsvp' && (
          <div>
            {rsvpsLoading ? (
              <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--mocha)' }}>Lädt...</div>
            ) : rsvps.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
                <p style={{ color: 'var(--mocha)' }}>Noch keine RSVP-Eingänge</p>
              </div>
            ) : (
              <>
                {newRsvps.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ fontSize: 13, color: 'var(--mocha)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--espresso)' }}>{newRsvps.length}</span> neue Antworten noch nicht in Gästeliste
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={importAllRSVPs}>
                      <IconCheck size={13} stroke={2} /> Alle übernehmen
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {rsvps.map(rsvp => {
                    const alreadyImported = guests.some(g => g.name.toLowerCase() === rsvp.name.toLowerCase());
                    return (
                      <div key={rsvp.id} className="card" style={{ borderLeft: `4px solid ${rsvp.attending === 'yes' ? 'var(--sage)' : 'var(--blush)'}` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                              <div style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--espresso)' }}>{rsvp.name}</div>
                              <span style={{ fontSize: 11, fontWeight: 600, color: rsvp.attending === 'yes' ? 'var(--sage)' : '#E57373', background: rsvp.attending === 'yes' ? '#F0F5EE' : '#FEE2E2', padding: '2px 9px', borderRadius: 20 }}>
                                {rsvp.attending === 'yes' ? '✓ Zugesagt' : '✗ Abgesagt'}
                              </span>
                              {rsvp.plus_one && <span style={{ fontSize: 11, color: 'var(--mocha)', background: 'var(--warm)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--sand)' }}>+1</span>}
                              {alreadyImported && <span style={{ fontSize: 11, color: 'var(--sage)', background: '#F0F5EE', padding: '2px 8px', borderRadius: 20 }}>✓ Übernommen</span>}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--mocha)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                              {rsvp.email && <span>✉ {rsvp.email}</span>}
                              {rsvp.menu && <span>🍽 {rsvp.menu}</span>}
                              {rsvp.companions && <span>👥 +{rsvp.companions.split(',').filter(Boolean).length} Begleitperson{rsvp.companions.split(',').filter(Boolean).length !== 1 ? 'en' : ''}: {rsvp.companions}</span>}
                              {rsvp.submitted_at && <span>🕐 {fmtDate(rsvp.submitted_at)}</span>}
                            </div>
                            {rsvp.message && (
                              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--espresso)', background: 'var(--warm)', padding: '8px 12px', borderRadius: 8, fontStyle: 'italic' }}>
                                „{rsvp.message}"
                              </div>
                            )}
                          </div>
                          {!alreadyImported && (
                            <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => importRSVP(rsvp)}>
                              <IconCheck size={13} stroke={2} /> Übernehmen
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── CODES TAB ── */}
      {tab === 'codes' && (
        <div>
          <div className="card-warm" style={{ marginBottom: 16, borderLeft: '3px solid var(--gold)', padding: '12px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--espresso)', marginBottom: 4 }}>Einladungscodes</div>
            <div style={{ fontSize: 12, color: 'var(--mocha)', lineHeight: 1.6 }}>
              Jeder Gast hat einen persönlichen Code. Schreibt diesen auf die Einladungskarte — nur mit Code ist eine RSVP möglich.
            </div>
          </div>

          {/* Generate missing codes */}
          {guests.filter(g => !g.inviteCode).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <button className="btn btn-primary btn-sm" onClick={() => {
                const wedding = loadState('wedding', { date: '2026-10-15' });
                const year = new Date(wedding.date).getFullYear();
                const updated = guests.map(g => ({
                  ...g,
                  inviteCode: g.inviteCode || makeInviteCode(g.name, year)
                }));
                saveGuests(updated);
              }}>
                <IconKey size={13} stroke={2} /> Codes für alle Gäste generieren
              </button>
            </div>
          )}

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Gast</th>
                  <th>Code</th>
                  <th>Status</th>
                  <th style={{ width: 100 }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {guests.filter(g => g.status !== 'declined').map(g => {
                  const wedding = loadState('wedding', { date: '2026-10-15' });
                  const year = new Date(wedding.date).getFullYear();
                  const code = g.inviteCode || makeInviteCode(g.name, year);
                  return (
                    <tr key={g.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar" style={{ width: 26, height: 26, background: avc(g.id), fontSize: 9 }}>{ini(g.name)}</div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--espresso)' }}>{g.name}</div>
                        </div>
                      </td>
                      <td>
                        <code style={{ background: 'var(--warm)', padding: '3px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, color: 'var(--brown)', border: '1px solid var(--sand)', letterSpacing: 1 }}>
                          {code}
                        </code>
                      </td>
                      <td><span className={`badge badge-${g.status}`}>{g.status === 'confirmed' ? 'Zugesagt' : 'Ausstehend'}</span></td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => {
                          navigator.clipboard.writeText(code);
                        }}>
                          <IconCopy size={12} stroke={1.5} /> Kopieren
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3>{modal === 'add' ? 'Gast hinzufügen 🌿' : 'Gast bearbeiten'}</h3>
              <button className="btn-icon" onClick={() => setModal(null)}><IconX size={15} stroke={2} /></button>
            </div>
            <div className="form-group"><label className="form-label">Name *</label><input className="input" value={form.name||''} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">E-Mail</label><input className="input" type="email" value={form.email||''} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Gruppe</label><select className="input" value={form.group||'Freunde'} onChange={e => setForm(f=>({...f,group:e.target.value}))}>{GROUPS.map(g=><option key={g}>{g}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Status</label><select className="input" value={form.status||'pending'} onChange={e => setForm(f=>({...f,status:e.target.value}))}><option value="confirmed">Zugesagt</option><option value="pending">Ausstehend</option><option value="declined">Abgesagt</option></select></div>
            </div>
            <div className="form-group"><label className="form-label">Menü</label><select className="input" value={form.menu||''} onChange={e => setForm(f=>({...f,menu:e.target.value}))}>{MENUS.map(m=><option key={m} value={m}>{m||'– kein –'}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Notiz</label><input className="input" value={form.note||''} onChange={e => setForm(f=>({...f,note:e.target.value}))} /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={handleSave}>{modal==='add'?'Hinzufügen':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

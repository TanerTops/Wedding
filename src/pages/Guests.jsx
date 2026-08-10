import { useState, useEffect } from 'react';
import { IconPlus, IconTrash, IconEdit, IconX, IconSearch, IconCheck, IconKey, IconCopy, IconChevronDown, IconChevronRight, IconUserPlus } from '@tabler/icons-react';
import { loadState, saveState, makeInviteCode, makeSlug } from '../data/store';
import { getRSVPs, upsertGuest, deleteGuest as dbDeleteGuest, getGuests } from '../lib/db';

const GROUPS = ['Familie Braut', 'Familie Bräutigam', 'Freunde', 'Arbeit', 'Dienstleister', 'Sonstige'];
const MENUS  = ['', 'Fleisch', 'Fisch', 'Vegetarisch', 'Vegan', 'Kinder'];
const AV     = ['#C4956A','#A8B5A0','#C4B5A5','#8B9E7A','#B8A9C9','#C9A884','#9B8EA0','#B5A88A'];
const ini    = n => n.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
const avc    = id => AV[id % AV.length];
const SL     = { confirmed: 'Zugesagt', pending: 'Ausstehend', declined: 'Abgesagt' };
const fmtDate = d => { try { return new Date(d).toLocaleDateString('de-DE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }); } catch { return d; }};

export default function Guests() {
  const [guests, setGuests]           = useState([]);
  const [rsvps, setRsvps]             = useState([]);
  const [rsvpsLoading, setRsvpsLoading] = useState(true);
  const [search, setSearch]           = useState('');
  const [fGroup, setFGroup]           = useState('');
  const [fStatus, setFStatus]         = useState('');
  const [modal, setModal]             = useState(null); // null | 'add' | 'addCompanion' | 'delete' | uuid
  const [form, setForm]               = useState({});
  const [tab, setTab]                 = useState('guests');
  const [expanded, setExpanded]       = useState({}); // { [parentId]: bool }
  const [deleteTarget, setDeleteTarget] = useState(null); // { guest, companions }
  const [newPrimaryId, setNewPrimaryId] = useState(''); // chosen new primary in delete modal
  const [companionParentId, setCompanionParentId] = useState(null); // which primary we're adding to

  useEffect(() => {
    getRSVPs().then(({ data }) => { setRsvps(data || []); setRsvpsLoading(false); });
    getGuests().then(({ data }) => {
      if (data != null) { setGuests(data); saveState('guests', data); }
    });
  }, []);

  // ── Derived: primary guests and their companions ────────────────
  const primaryGuests    = guests.filter(g => !g.is_companion && !g.parent_id);
  const companions       = guests.filter(g => g.is_companion || g.parent_id);
  const companionsOf     = id => companions.filter(c => c.parent_id === id);
  const newRsvps         = rsvps.filter(r => !guests.some(g => g.name.toLowerCase() === r.name.toLowerCase()));

  // ── Persist helpers ─────────────────────────────────────────────
  function saveGuests(updated) { setGuests(updated); saveState('guests', updated); }

  // ── Modals ──────────────────────────────────────────────────────
  function openAdd() {
    setForm({ name:'', email:'', group:'Freunde', status:'pending', menu:'', note:'', is_companion: false });
    setModal('add');
  }

  function openAddCompanion(parentId) {
    setCompanionParentId(parentId);
    const parent = guests.find(g => g.id === parentId);
    setForm({ name:'', email:'', group: parent?.group || 'Freunde', status: parent?.status || 'pending', menu:'', note:'', is_companion: true, parent_id: parentId });
    setModal('addCompanion');
  }

  function openEdit(g) { setForm({ ...g }); setModal(g.id); }

  // ── Save guest ──────────────────────────────────────────────────
  async function handleSave() {
    if (!form.name?.trim()) return;
    const isNew = modal === 'add' || modal === 'addCompanion';
    if (isNew) {
      const newGuest = { ...form, id: crypto.randomUUID() };
      saveGuests([...guests, newGuest]);
      await upsertGuest({ ...newGuest, group_name: newGuest.group });
    } else {
      const updated = { ...form, id: modal };
      saveGuests(guests.map(g => g.id === modal ? updated : g));
      await upsertGuest({ ...updated, group_name: updated.group });
    }
    setModal(null);
    setCompanionParentId(null);
  }

  // ── Delete with companion promotion ────────────────────────────
  function openDelete(guest) {
    const comps = companionsOf(guest.id);
    if (comps.length === 0) {
      // No companions — just confirm simple delete
      setDeleteTarget({ guest, companions: [] });
      setNewPrimaryId('');
      setModal('delete');
    } else {
      setDeleteTarget({ guest, companions: comps });
      setNewPrimaryId('');
      setModal('delete');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const { guest, companions } = deleteTarget;

    if (companions.length === 0 || !newPrimaryId) {
      // Delete guest + all companions
      const idsToDelete = [guest.id, ...companions.map(c => c.id)];
      saveGuests(guests.filter(g => !idsToDelete.includes(g.id)));
      await Promise.all(idsToDelete.map(id => dbDeleteGuest(id)));
    } else {
      // Promote chosen companion to primary
      const newPrimary = companions.find(c => c.id === newPrimaryId);
      const remainingCompanions = companions.filter(c => c.id !== newPrimaryId);

      const updated = guests.map(g => {
        if (g.id === newPrimaryId) return { ...g, is_companion: false, parent_id: null };
        if (remainingCompanions.some(c => c.id === g.id)) return { ...g, parent_id: newPrimaryId };
        return g;
      }).filter(g => g.id !== guest.id);

      saveGuests(updated);
      await dbDeleteGuest(guest.id);
      await upsertGuest({ ...newPrimary, is_companion: false, parent_id: null, group_name: newPrimary.group });
      await Promise.all(remainingCompanions.map(c => upsertGuest({ ...c, parent_id: newPrimaryId, group_name: c.group })));
    }

    setModal(null);
    setDeleteTarget(null);
    setNewPrimaryId('');
  }

  // ── Toggle expanded ─────────────────────────────────────────────
  function toggleExpanded(id) {
    setExpanded(e => ({ ...e, [id]: !e[id] }));
  }

  // ── Filter ──────────────────────────────────────────────────────
  const filteredPrimary = primaryGuests.filter(g => {
    const ms = g.name.toLowerCase().includes(search.toLowerCase()) || (g.email||'').toLowerCase().includes(search.toLowerCase());
    return ms && (!fGroup || g.group === fGroup || g.group_name === fGroup) && (!fStatus || g.status === fStatus);
  });

  // Stats across all guests
  const confirmed = guests.filter(g => g.status === 'confirmed').length;

  // ── RSVP import ─────────────────────────────────────────────────
  function parseCompanions(str) {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(Boolean);
  }

  async function importRSVP(rsvp) {
    const status = rsvp.attending === 'yes' ? 'confirmed' : 'declined';
    const primaryId = crypto.randomUUID();
    const newGuests = [];
    newGuests.push({ id: primaryId, name: rsvp.name, email: rsvp.email||'', group:'Freunde', group_name:'Freunde', status, menu: rsvp.menu||'', note: rsvp.message||'', is_companion: false, parent_id: null });
    parseCompanions(rsvp.companions).forEach(name => {
      newGuests.push({ id: crypto.randomUUID(), name, email:'', group:'Freunde', group_name:'Freunde', status, menu:'', note:`Begleitperson von ${rsvp.name}`, is_companion: true, parent_id: primaryId });
    });
    saveGuests([...guests, ...newGuests]);
    await Promise.all(newGuests.map(g => upsertGuest(g)));
  }

  async function importAllRSVPs() {
    const newGuests = [];
    newRsvps.forEach(rsvp => {
      const status = rsvp.attending === 'yes' ? 'confirmed' : 'declined';
      const primaryId = crypto.randomUUID();
      newGuests.push({ id: primaryId, name: rsvp.name, email: rsvp.email||'', group:'Freunde', group_name:'Freunde', status, menu: rsvp.menu||'', note: rsvp.message||'', is_companion: false, parent_id: null });
      parseCompanions(rsvp.companions).forEach(name => {
        newGuests.push({ id: crypto.randomUUID(), name, email:'', group:'Freunde', group_name:'Freunde', status, menu:'', note:`Begleitperson von ${rsvp.name}`, is_companion: true, parent_id: primaryId });
      });
    });
    saveGuests([...guests, ...newGuests]);
    await Promise.all(newGuests.map(g => upsertGuest(g)));
  }

  // ── Status badge ────────────────────────────────────────────────
  function StatusBadge({ status }) {
    return <span className={`badge badge-${status}`}>{SL[status]}</span>;
  }

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
        <div className="stats-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:16 }}>
          {[
            ['Gesamt',     guests.length,                                                       '',                                                             'var(--mocha)'],
            ['Zugesagt',   confirmed,                                                           guests.length ? Math.round(confirmed/guests.length*100)+'%':'', 'var(--sage)' ],
            ['Ausstehend', guests.filter(g=>g.status==='pending').length,                       '',                                                             'var(--gold)'  ],
            ['Abgesagt',   guests.filter(g=>g.status==='declined').length,                      '',                                                             'var(--blush)' ],
          ].map(([l,v,s,a]) => (
            <div key={l} className="stat-card" style={{ borderTopColor: a }}>
              <div className="stat-label">{l}</div>
              <div className="stat-value">{v}</div>
              {s && <div className="stat-sub">{s}</div>}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom:16 }}>
          <button className={`tab${tab==='guests'?' active':''}`}  onClick={()=>setTab('guests')}>Gästeliste</button>
          <button className={`tab${tab==='rsvp'?' active':''}`}    onClick={()=>setTab('rsvp')}>
            RSVP Eingänge
            {newRsvps.length>0 && <span style={{ marginLeft:6, background:'var(--terra)', color:'#fff', borderRadius:20, padding:'1px 7px', fontSize:10, fontWeight:700 }}>{newRsvps.length} neu</span>}
          </button>
          <button className={`tab${tab==='codes'?' active':''}`}   onClick={()=>setTab('codes')}>
            <IconKey size={13} stroke={1.5}/> Einladungscodes
          </button>
        </div>

        {/* ── GUESTS TAB ── */}
        {tab === 'guests' && (
          <>
            {/* Filters */}
            <div className="card" style={{ marginBottom:16, padding:12 }}>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                <div style={{ position:'relative', flex:'1 1 180px' }}>
                  <IconSearch size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--mocha)' }}/>
                  <input className="input" style={{ paddingLeft:32 }} placeholder="Gäste suchen…" value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                <select className="input" style={{ flex:'0 1 170px' }} value={fGroup} onChange={e=>setFGroup(e.target.value)}>
                  <option value="">Alle Gruppen</option>{GROUPS.map(g=><option key={g}>{g}</option>)}
                </select>
                <select className="input" style={{ flex:'0 1 150px' }} value={fStatus} onChange={e=>setFStatus(e.target.value)}>
                  <option value="">Alle Status</option>
                  <option value="confirmed">Zugesagt</option>
                  <option value="pending">Ausstehend</option>
                  <option value="declined">Abgesagt</option>
                </select>
                {(search||fGroup||fStatus) && (
                  <button className="btn btn-secondary btn-sm" onClick={()=>{setSearch('');setFGroup('');setFStatus('');}}>
                    <IconX size={13} stroke={2}/> Reset
                  </button>
                )}
              </div>
            </div>

            {/* Guest list */}
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width:28 }}></th>
                    <th>Gast</th>
                    <th>Gruppe</th>
                    <th>Status</th>
                    <th>Menü</th>
                    <th>Notiz</th>
                    <th style={{ width:110 }}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrimary.map(g => {
                    const comps   = companionsOf(g.id);
                    const hasComps = comps.length > 0;
                    const isOpen  = expanded[g.id];

                    return (
                      <>
                        {/* Primary guest row */}
                        <tr key={g.id} style={{ background: hasComps && isOpen ? '#FDFAF5' : 'transparent' }}>
                          <td style={{ padding:'0 0 0 10px' }}>
                            {hasComps ? (
                              <button onClick={()=>toggleExpanded(g.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--mocha)', padding:4, borderRadius:6, display:'flex', alignItems:'center' }}>
                                {isOpen ? <IconChevronDown size={14} stroke={2}/> : <IconChevronRight size={14} stroke={2}/>}
                              </button>
                            ) : null}
                          </td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                              <div className="avatar" style={{ width:30, height:30, background:avc(g.id), fontSize:10 }}>{ini(g.name)}</div>
                              <div>
                                <div style={{ fontWeight:500, fontSize:13 }}>{g.name}</div>
                                <div style={{ fontSize:11, color:'var(--mocha)' }}>{g.email||'—'}</div>
                                {hasComps && (
                                  <div style={{ fontSize:10, color:'var(--terra)', marginTop:1 }}>
                                    {comps.length} Begleitperson{comps.length!==1?'en':''}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize:12, color:'var(--mocha)' }}>{g.group||g.group_name}</td>
                          <td><StatusBadge status={g.status}/></td>
                          <td style={{ fontSize:12.5 }}>{g.menu||'—'}</td>
                          <td style={{ fontSize:12, color:'var(--mocha)' }}>{g.note||'—'}</td>
                          <td>
                            <div style={{ display:'flex', gap:4 }}>
                              <button className="btn-icon" title="Begleitperson hinzufügen" onClick={()=>openAddCompanion(g.id)}>
                                <IconUserPlus size={13} stroke={1.5}/>
                              </button>
                              <button className="btn-icon" onClick={()=>openEdit(g)}><IconEdit size={13} stroke={1.5}/></button>
                              <button className="btn-icon" style={{ background:'#FEE2E2', color:'#991B1B' }} onClick={()=>openDelete(g)}>
                                <IconTrash size={13} stroke={1.5}/>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Companion rows — shown when expanded */}
                        {isOpen && comps.map((c) => (
                          <tr key={c.id} style={{ background:'#FAF7F2' }}>
                            <td></td>
                            <td>
                              <div style={{ display:'flex', alignItems:'center', gap:9, paddingLeft:18 }}>
                                <div style={{ width:2, height:28, background:'var(--sand)', borderRadius:2, flexShrink:0 }}/>
                                <div className="avatar" style={{ width:24, height:24, background:avc(c.id), fontSize:9, opacity:0.85 }}>{ini(c.name)}</div>
                                <div>
                                  <div style={{ fontWeight:400, fontSize:12.5, color:'var(--espresso)' }}>{c.name}</div>
                                  <div style={{ fontSize:10, color:'var(--mocha)' }}>{c.email||'—'}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ fontSize:11, color:'var(--mocha)' }}>{c.group||c.group_name}</td>
                            <td><StatusBadge status={c.status}/></td>
                            <td style={{ fontSize:12 }}>{c.menu||'—'}</td>
                            <td style={{ fontSize:11, color:'var(--mocha)' }}>{c.note||'—'}</td>
                            <td>
                              <div style={{ display:'flex', gap:4 }}>
                                <button className="btn-icon" onClick={()=>openEdit(c)}><IconEdit size={13} stroke={1.5}/></button>
                                <button className="btn-icon" style={{ background:'#FEE2E2', color:'#991B1B' }} onClick={async()=>{
                                  if (!confirm(`${c.name} entfernen?`)) return;
                                  saveGuests(guests.filter(g=>g.id!==c.id));
                                  await dbDeleteGuest(c.id);
                                }}>
                                  <IconTrash size={13} stroke={1.5}/>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding:'8px 14px', background:'var(--warm)', fontSize:11, color:'var(--mocha)', borderTop:'1px solid var(--sand)' }}>
                {filteredPrimary.length} Hauptgäste · {guests.length} Personen gesamt
              </div>
            </div>
          </>
        )}

        {/* ── RSVP TAB ── */}
        {tab === 'rsvp' && (
          <div>
            {rsvpsLoading ? (
              <div className="card" style={{ textAlign:'center', padding:40, color:'var(--mocha)' }}>Lädt...</div>
            ) : rsvps.length === 0 ? (
              <div className="card" style={{ textAlign:'center', padding:40 }}>
                <div style={{ fontSize:36, marginBottom:10 }}>📭</div>
                <p style={{ color:'var(--mocha)' }}>Noch keine RSVP-Eingänge</p>
              </div>
            ) : (
              <>
                {newRsvps.length > 0 && (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <div style={{ fontSize:13, color:'var(--mocha)' }}>
                      <span style={{ fontWeight:600, color:'var(--espresso)' }}>{newRsvps.length}</span> neue Antworten noch nicht in Gästeliste
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={importAllRSVPs}>
                      <IconCheck size={13} stroke={2}/> Alle übernehmen
                    </button>
                  </div>
                )}
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {rsvps.map(rsvp => {
                    const alreadyImported = guests.some(g=>g.name.toLowerCase()===rsvp.name.toLowerCase());
                    return (
                      <div key={rsvp.id} className="card" style={{ borderLeft:`4px solid ${rsvp.attending==='yes'?'var(--sage)':'var(--blush)'}` }}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                              <div style={{ fontWeight:600, fontSize:14.5, color:'var(--espresso)' }}>{rsvp.name}</div>
                              <span style={{ fontSize:11, fontWeight:600, color:rsvp.attending==='yes'?'var(--sage)':'#E57373', background:rsvp.attending==='yes'?'#F0F5EE':'#FEE2E2', padding:'2px 9px', borderRadius:20 }}>
                                {rsvp.attending==='yes'?'✓ Zugesagt':'✗ Abgesagt'}
                              </span>
                              {rsvp.plus_one && <span style={{ fontSize:11, color:'var(--mocha)', background:'var(--warm)', padding:'2px 8px', borderRadius:20, border:'1px solid var(--sand)' }}>+1</span>}
                              {alreadyImported && <span style={{ fontSize:11, color:'var(--sage)', background:'#F0F5EE', padding:'2px 8px', borderRadius:20 }}>✓ Übernommen</span>}
                            </div>
                            <div style={{ fontSize:12, color:'var(--mocha)', display:'flex', gap:12, flexWrap:'wrap' }}>
                              {rsvp.email && <span>✉ {rsvp.email}</span>}
                              {rsvp.menu && <span>🍽 {rsvp.menu}</span>}
                              {rsvp.companions && <span>👥 +{rsvp.companions.split(',').filter(Boolean).length} Begleitperson{rsvp.companions.split(',').filter(Boolean).length!==1?'en':''}: {rsvp.companions}</span>}
                              {rsvp.submitted_at && <span>🕐 {fmtDate(rsvp.submitted_at)}</span>}
                            </div>
                            {rsvp.message && (
                              <div style={{ marginTop:8, fontSize:13, color:'var(--espresso)', background:'var(--warm)', padding:'8px 12px', borderRadius:8, fontStyle:'italic' }}>
                                „{rsvp.message}"
                              </div>
                            )}
                          </div>
                          {!alreadyImported && (
                            <button className="btn btn-primary btn-sm" style={{ flexShrink:0 }} onClick={()=>importRSVP(rsvp)}>
                              <IconCheck size={13} stroke={2}/> Übernehmen
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

        {/* ── CODES TAB ── */}
        {tab === 'codes' && (
          <div>
            <div className="card-warm" style={{ marginBottom:16, borderLeft:'3px solid var(--gold)', padding:'12px 16px' }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--espresso)', marginBottom:4 }}>Einladungscodes</div>
              <div style={{ fontSize:12, color:'var(--mocha)', lineHeight:1.6 }}>
                Nur Hauptgäste erhalten einen Code — Begleitpersonen werden über die Hauptperson miterfasst.
              </div>
            </div>

            {primaryGuests.filter(g=>!g.inviteCode).length > 0 && (
              <div style={{ marginBottom:14 }}>
                <button className="btn btn-primary btn-sm" onClick={()=>{
                  const wedding = loadState('wedding', { date:'2026-10-15' });
                  const year = new Date(wedding.date).getFullYear();
                  const updated = guests.map(g=>({ ...g, inviteCode: g.inviteCode||makeInviteCode(g.name, year) }));
                  saveGuests(updated);
                }}>
                  <IconKey size={13} stroke={2}/> Codes für alle Hauptgäste generieren
                </button>
              </div>
            )}

            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Gast</th><th>Begleitpersonen</th><th>Code</th><th>Status</th><th style={{ width:100 }}>Aktionen</th></tr>
                </thead>
                <tbody>
                  {primaryGuests.filter(g=>g.status!=='declined').map(g => {
                    const wedding = loadState('wedding', { date:'2026-10-15' });
                    const year = new Date(wedding.date).getFullYear();
                    const code = g.inviteCode || makeInviteCode(g.name, year);
                    const comps = companionsOf(g.id);
                    return (
                      <tr key={g.id}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div className="avatar" style={{ width:26, height:26, background:avc(g.id), fontSize:9 }}>{ini(g.name)}</div>
                            <div style={{ fontSize:13, fontWeight:500, color:'var(--espresso)' }}>{g.name}</div>
                          </div>
                        </td>
                        <td style={{ fontSize:12, color:'var(--mocha)' }}>
                          {comps.length > 0 ? comps.map(c=>c.name).join(', ') : '—'}
                        </td>
                        <td>
                          <code style={{ background:'var(--warm)', padding:'3px 10px', borderRadius:8, fontSize:13, fontWeight:700, color:'var(--brown)', border:'1px solid var(--sand)', letterSpacing:1 }}>
                            {code}
                          </code>
                        </td>
                        <td><StatusBadge status={g.status}/></td>
                        <td>
                          <div style={{ display:'flex', gap:6 }}>
                            <button className="btn btn-secondary btn-sm" onClick={()=>navigator.clipboard.writeText(code)}>
                              <IconCopy size={12} stroke={1.5}/> Kopieren
                            </button>
                            {g.email && (
                              <a className="btn btn-secondary btn-sm"
                                href={`mailto:${g.email}?subject=Einladung zur Hochzeit&body=Liebe/r ${g.name},%0A%0AWir freuen uns, dich zu unserer Hochzeit einladen zu dürfen!%0A%0ABitte melde dich unter folgendem Link an: ${encodeURIComponent(window.location.origin+'/guest/'+makeSlug(loadState('wedding', {})))}%0A%0ADein persönlicher Einladungscode: ${code}%0A%0AHerzliche Grüße`}>
                                ✉️
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Add / Edit guest ── */}
      {modal && modal !== 'delete' && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h3>
                {modal==='add' ? 'Gast hinzufügen' :
                 modal==='addCompanion' ? `Begleitperson hinzufügen` :
                 'Gast bearbeiten'}
              </h3>
              <button className="btn-icon" onClick={()=>setModal(null)}><IconX size={15} stroke={2}/></button>
            </div>

            {modal === 'addCompanion' && (
              <div style={{ background:'var(--warm)', borderRadius:10, padding:'8px 12px', marginBottom:14, fontSize:12, color:'var(--mocha)' }}>
                Begleitperson von <strong style={{ color:'var(--espresso)' }}>{guests.find(g=>g.id===companionParentId)?.name}</strong> — bekommt keine separate Einladungsmail
              </div>
            )}

            <div className="form-group"><label className="form-label">Name *</label><input className="input" value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">E-Mail</label><input className="input" type="email" value={form.email||''} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Gruppe</label>
                <select className="input" value={form.group||'Freunde'} onChange={e=>setForm(f=>({...f,group:e.target.value}))}>
                  {GROUPS.map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Status</label>
                <select className="input" value={form.status||'pending'} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  <option value="confirmed">Zugesagt</option>
                  <option value="pending">Ausstehend</option>
                  <option value="declined">Abgesagt</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Menü</label>
              <select className="input" value={form.menu||''} onChange={e=>setForm(f=>({...f,menu:e.target.value}))}>
                {MENUS.map(m=><option key={m} value={m}>{m||'– kein –'}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Notiz</label><input className="input" placeholder="z.B. Beeinträchtigungen, Unverträglichkeiten, Allergien..." value={form.note||''} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/></div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-secondary" onClick={()=>setModal(null)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {modal==='add'||modal==='addCompanion' ? 'Hinzufügen' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Delete with companion promotion ── */}
      {modal === 'delete' && deleteTarget && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3>Gast löschen</h3>
              <button className="btn-icon" onClick={()=>setModal(null)}><IconX size={15} stroke={2}/></button>
            </div>

            <div style={{ background:'#FEE2E2', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#991B1B' }}>
              <strong>{deleteTarget.guest.name}</strong> wird aus der Gästeliste entfernt.
            </div>

            {deleteTarget.companions.length > 0 ? (
              <>
                <div style={{ fontSize:13, color:'var(--espresso)', marginBottom:12, lineHeight:1.6 }}>
                  Dieser Gast hat <strong>{deleteTarget.companions.length} Begleitperson{deleteTarget.companions.length!==1?'en':''}</strong>. Soll jemand die Hauptperson übernehmen?
                </div>

                <div className="form-group">
                  <label className="form-label">Neue Hauptperson (optional)</label>
                  <select className="input" value={newPrimaryId} onChange={e=>setNewPrimaryId(e.target.value)}>
                    <option value="">— Alle Begleitpersonen ebenfalls löschen —</option>
                    {deleteTarget.companions.map(c=>(
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {newPrimaryId && (
                  <div style={{ background:'var(--warm)', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:'var(--mocha)' }}>
                    <strong style={{ color:'var(--espresso)' }}>{deleteTarget.companions.find(c=>c.id===newPrimaryId)?.name}</strong> wird zur Hauptperson.
                    {deleteTarget.companions.filter(c=>c.id!==newPrimaryId).length > 0 && (
                      <> Die anderen {deleteTarget.companions.filter(c=>c.id!==newPrimaryId).length} Begleitperson{deleteTarget.companions.filter(c=>c.id!==newPrimaryId).length!==1?'en':''} bleiben ihr zugeordnet.</>
                    )}
                  </div>
                )}

                {!newPrimaryId && (
                  <div style={{ background:'#FEF3C7', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#92400E' }}>
                    ⚠️ Ohne Auswahl werden auch {deleteTarget.companions.map(c=>c.name).join(', ')} gelöscht.
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize:13, color:'var(--mocha)', marginBottom:16 }}>
                Dieser Gast hat keine Begleitpersonen. Löschen bestätigen?
              </div>
            )}

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-secondary" onClick={()=>setModal(null)}>Abbrechen</button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                <IconTrash size={13} stroke={1.5}/>
                {newPrimaryId ? 'Löschen & Befördern' : deleteTarget.companions.length > 0 ? 'Alle löschen' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

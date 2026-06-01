import { useState } from 'react';
import { loadState, saveState, defaultWedding, makeSlug } from '../data/store';
import {
  IconExternalLink, IconCopy, IconCheck, IconToggleRight, IconToggleLeft,
  IconPlus, IconTrash, IconClock, IconGripVertical
} from '@tabler/icons-react';

const defaultConfig = {
  heroTitle: '', heroSubtitle: 'Wir freuen uns, mit euch zu feiern.',
  heroImageUrl: '', heroImagePosition: 'center',
  sections: { rsvp: true, timeline: true, location: true, dresscode: true, music: true, registry: true, timeslots: true },
  dresscodeStyle: 'Elegant & Boho',
  dresscodeText: 'Wir wünschen uns elegante Kleidung in warmen Erdtönen. Da wir auch im Freien feiern, gerne mit bequemen Schuhen.',
  dresscodeColors: ['#C4956A', '#C4B5A5', '#A8B5A0', '#D4C4A8', '#B8A9C9'],
  rsvpDeadlineOffset: 30,
};

const SECTIONS_META = [
  { id: 'rsvp',      label: 'RSVP / Zu- & Absagen',    sub: 'Gäste können ihre Teilnahme bestätigen' },
  { id: 'timeline',  label: 'Tagesablauf',              sub: 'Zeigt den Ablauf eures Hochzeitstages' },
  { id: 'location',  label: 'Location & Anfahrt',       sub: 'Informationen zur Location' },
  { id: 'dresscode', label: 'Dresscode',                sub: 'Kleidungsempfehlungen für eure Gäste' },
  { id: 'music',     label: 'Musikwünsche',             sub: 'Gäste können Songs vorschlagen' },
  { id: 'registry',  label: 'Geschenkeliste',           sub: 'Eure Wunschliste für Gäste' },
  { id: 'timeslots', label: 'Zeitslots',                sub: 'Gäste können Slots für Aktionen anfragen' },
  { id: 'memories',  label: 'Erinnerungen & Fotos',     sub: 'Gäste können Fotos hochladen' },
];

function newSlot() {
  return { id: Date.now().toString(), label: '', time: '', duration: 15, maxGroups: 1, description: '', bookings: 0 };
}

export default function GuestPageSettings() {
  const wedding = loadState('wedding', defaultWedding);
  const [config, setConfig]   = useState(() => loadState('guestPageConfig', defaultConfig));
  const [timeslots, setTimeslots] = useState(() => loadState('timeslots', []));
  const [saved, setSaved]     = useState(false);
  const [copied, setCopied]   = useState(false);
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'timeslots'

  // ── Slot requests (read-only view for admin) ──
  const slotRequests = loadState('slotRequests', []);

  function buildShareUrl() {
    const tl  = loadState('timeline', []);
    const reg = loadState('registry', []);
    const memories = loadState('memories', []).filter(p => p.approved);
    const memCats  = loadState('memoryCategories', []);
    const payload  = { wedding, config, timeline: tl, registry: reg, memories, memoryCategories: memCats, timeslots };
    try {
      const b64 = btoa(encodeURIComponent(JSON.stringify(payload)));
      return `${window.location.origin}/guest/${makeSlug(wedding)}#data=${b64}`;
    } catch { return `${window.location.origin}/guest/${makeSlug(wedding)}`; }
  }
  const guestUrl = buildShareUrl();

  function update(key, val) { setConfig(c => ({ ...c, [key]: val })); }
  function toggleSection(id) { setConfig(c => ({ ...c, sections: { ...c.sections, [id]: !c.sections?.[id] } })); }

  function saveConfig() {
    saveState('guestPageConfig', config);
    saveState('timeslots', timeslots);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }
  function copyLink() {
    navigator.clipboard.writeText(guestUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  // Slot helpers
  function addSlot()             { setTimeslots(s => [...s, newSlot()]); }
  function removeSlot(id)        { setTimeslots(s => s.filter(x => x.id !== id)); }
  function updateSlot(id, key, val) { setTimeslots(s => s.map(x => x.id === id ? { ...x, [key]: val } : x)); }

  const activeCount = Object.values(config.sections || {}).filter(Boolean).length;

  const TAB = { fontFamily:"'DM Sans',sans-serif", fontSize:13, padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', transition:'all .15s' };

  return (
    <>
      {/* ── RESPONSIVE STYLES ── */}
      <style>{`
        .settings-cols { display:flex; gap:20px; align-items:flex-start; }
        .settings-left { flex:1; display:flex; flex-direction:column; gap:16px; }
        .settings-right { width:300px; flex-shrink:0; }
        @media (max-width:768px) {
          .settings-cols { flex-direction:column; }
          .settings-right { width:100%; }
        }
        .slot-row { display:grid; grid-template-columns:80px 1fr 80px 80px 1fr; gap:8px; align-items:start; }
        @media (max-width:640px) {
          .slot-row { grid-template-columns:1fr 1fr; }
        }
      `}</style>

      <div className="topbar">
        <div>
          <h1>Gästeseite</h1>
          <div className="topbar-sub">Konfiguriert eure öffentliche Hochzeitsseite · {activeCount} Bereiche aktiv</div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <a href={guestUrl} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">
            <IconExternalLink size={14} stroke={1.5} /> Vorschau
          </a>
          <button className="btn btn-primary" onClick={saveConfig}>
            {saved ? <><IconCheck size={14} stroke={2} /> Gespeichert!</> : 'Speichern'}
          </button>
        </div>
      </div>

      <div className="page-body">

        {/* Tab switcher */}
        <div style={{ display:'flex', gap:6, marginBottom:20, background:'var(--warm)', borderRadius:12, padding:6, border:'1px solid var(--sand)', width:'fit-content' }}>
          {[['general','Allgemein'],['timeslots','Zeitslots'],['requests','Anfragen']].map(([id,label]) => (
            <button key={id} style={{ ...TAB, background:activeTab===id?'#fff':'transparent', color:activeTab===id?'var(--espresso)':'var(--mocha)', boxShadow:activeTab===id?'0 1px 4px rgba(91,61,30,0.1)':'none', fontWeight:activeTab===id?500:400 }} onClick={()=>setActiveTab(id)}>
              {label}
              {id==='requests' && slotRequests.length>0 && (
                <span style={{ marginLeft:6, background:'var(--terra)', color:'#fff', borderRadius:20, fontSize:10, padding:'1px 6px', fontWeight:600 }}>{slotRequests.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: GENERAL ── */}
        {activeTab === 'general' && (
          <div className="settings-cols">
            <div className="settings-left">

              {/* Link */}
              <div className="card">
                <div className="section-title">Link zur Gästeseite</div>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:0, padding:'8px 13px', background:'var(--warm)', borderRadius:10, border:'1px solid var(--sand)', fontSize:13, color:'var(--mocha)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {guestUrl}
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={copyLink}>
                    {copied ? <IconCheck size={14} stroke={2} /> : <IconCopy size={14} stroke={1.5} />}
                    {copied ? 'Kopiert!' : 'Kopieren'}
                  </button>
                  <a href={guestUrl} target="_blank" rel="noopener" className="btn btn-primary btn-sm">
                    <IconExternalLink size={14} stroke={1.5} /> Öffnen
                  </a>
                </div>
              </div>

              {/* Hero */}
              <div className="card">
                <div className="section-title">Hero Bereich</div>
                <div className="form-group">
                  <label className="form-label">Überschrift (leer = Name aus Einstellungen)</label>
                  <input className="input" placeholder={`${wedding.bride} & ${wedding.groom}`} value={config.heroTitle} onChange={e=>update('heroTitle',e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Untertitel / Willkommenstext</label>
                  <textarea className="input" rows={2} value={config.heroSubtitle} onChange={e=>update('heroSubtitle',e.target.value)} style={{ resize:'vertical' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Hero-Bild URL</label>
                  <input className="input" placeholder="https://images.unsplash.com/..." value={config.heroImageUrl} onChange={e=>update('heroImageUrl',e.target.value)} />
                  <div style={{ fontSize:11, color:'var(--mocha)', marginTop:4 }}>
                    Tipp: <a href="https://unsplash.com" target="_blank" rel="noopener" style={{ color:'var(--terra)' }}>unsplash.com</a> für kostenlose Hochzeitsfotos
                  </div>
                </div>
                {config.heroImageUrl && (
                  <div>
                    <div style={{ height:130, borderRadius:10, overflow:'hidden', border:'1px solid var(--sand)', marginBottom:10 }}>
                      <div style={{ height:'100%', background:`linear-gradient(rgba(0,0,0,0.25),rgba(0,0,0,0.15)), url(${config.heroImageUrl}) ${config.heroImagePosition}/cover no-repeat`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontStyle:'italic', color:'#fff', textShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>
                          {config.heroTitle || `${wedding.bride} & ${wedding.groom}`}
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bildposition</label>
                      <select className="input" value={config.heroImagePosition} onChange={e=>update('heroImagePosition',e.target.value)}>
                        {['center','top','bottom','left','right'].map(p=><option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Dresscode */}
              <div className="card">
                <div className="section-title">Dresscode</div>
                <div className="form-group">
                  <label className="form-label">Stil-Bezeichnung</label>
                  <input className="input" value={config.dresscodeStyle} onChange={e=>update('dresscodeStyle',e.target.value)} placeholder="z.B. Elegant & Boho" />
                </div>
                <div className="form-group">
                  <label className="form-label">Beschreibung</label>
                  <textarea className="input" rows={3} value={config.dresscodeText} onChange={e=>update('dresscodeText',e.target.value)} style={{ resize:'vertical' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Farbpalette (Hex-Werte, kommagetrennt)</label>
                  <input className="input" value={(config.dresscodeColors||[]).join(', ')} onChange={e=>update('dresscodeColors',e.target.value.split(',').map(s=>s.trim()).filter(s=>s.startsWith('#')))} placeholder="#C4956A, #A8B5A0, #C4B5A5" />
                  <div style={{ display:'flex', gap:8, marginTop:8 }}>
                    {(config.dresscodeColors||[]).map((col,i) => (
                      <div key={i} style={{ width:32, height:32, borderRadius:'50%', background:col, border:'2px solid var(--sand)' }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* RSVP deadline */}
              <div className="card">
                <div className="section-title">RSVP Frist</div>
                <div className="form-group">
                  <label className="form-label">Tage vor der Hochzeit als Deadline</label>
                  <input className="input" type="number" min="7" max="90" value={config.rsvpDeadlineOffset} onChange={e=>update('rsvpDeadlineOffset',parseInt(e.target.value)||30)} />
                </div>
              </div>
            </div>

            {/* Right: section toggles */}
            <div className="settings-right">
              <div className="card">
                <div className="section-title">Sektionen ein-/ausblenden</div>
                <p style={{ fontSize:12, color:'var(--mocha)', marginBottom:14, lineHeight:1.5 }}>
                  Wählt, welche Bereiche auf eurer Gästeseite sichtbar sein sollen.
                </p>
                {SECTIONS_META.map(s => {
                  const on = config.sections?.[s.id] !== false;
                  return (
                    <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0', borderBottom:'1px solid var(--sand)', cursor:'pointer' }} onClick={()=>toggleSection(s.id)}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:on?'var(--espresso)':'var(--mocha)' }}>{s.label}</div>
                        <div style={{ fontSize:11, color:'var(--mocha)' }}>{s.sub}</div>
                      </div>
                      {on
                        ? <IconToggleRight size={26} stroke={1.5} style={{ color:'var(--terra)', flexShrink:0 }} />
                        : <IconToggleLeft  size={26} stroke={1.5} style={{ color:'var(--taupe)', flexShrink:0 }} />
                      }
                    </div>
                  );
                })}
              </div>

              <div className="card-warm" style={{ marginTop:14, textAlign:'center', padding:20 }}>
                <div style={{ fontSize:24, marginBottom:8 }}>🔗</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:'var(--espresso)', marginBottom:6 }}>Gästeseite teilen</div>
                <div style={{ fontSize:12, color:'var(--mocha)', marginBottom:14, lineHeight:1.5 }}>Schickt den Link direkt an eure Gäste per E-Mail oder WhatsApp.</div>
                <a href={guestUrl} target="_blank" rel="noopener" className="btn btn-primary btn-sm" style={{ width:'100%', justifyContent:'center', display:'flex' }}>
                  <IconExternalLink size={14} stroke={1.5} /> Gästeseite öffnen
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: TIMESLOTS ── */}
        {activeTab === 'timeslots' && (
          <div>
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom:16 }}>
                <div>
                  <div className="section-title">Zeitslots verwalten</div>
                  <p style={{ fontSize:13, color:'var(--mocha)', lineHeight:1.6, marginTop:4, maxWidth:520 }}>
                    Legt hier feste Zeitfenster an, aus denen Gäste einen Slot für ihre Aktion wählen können (z.B. Spiele, Überraschungen, Reden). Leer lassen = Gäste können frei eine Wunschzeit eingeben.
                  </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={addSlot} style={{ flexShrink:0 }}>
                  <IconPlus size={13} stroke={2} /> Slot hinzufügen
                </button>
              </div>

              {timeslots.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 16px', border:'2px dashed var(--sand)', borderRadius:12, color:'var(--mocha)' }}>
                  <IconClock size={32} stroke={1} style={{ opacity:0.4, marginBottom:8 }} />
                  <p style={{ fontSize:13, marginBottom:12 }}>Noch keine Zeitslots angelegt.<br />Ohne Slots können Gäste eine freie Wunschzeit eingeben.</p>
                  <button className="btn btn-secondary btn-sm" onClick={addSlot}><IconPlus size={13} stroke={2} /> Ersten Slot anlegen</button>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {timeslots.map((slot,i) => (
                    <div key={slot.id} style={{ background:'var(--warm)', borderRadius:12, padding:'14px 16px', border:'1px solid var(--sand)' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'var(--mocha)', textTransform:'uppercase', letterSpacing:0.4 }}>Slot {i+1}</div>
                        <button onClick={()=>removeSlot(slot.id)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--mocha)', opacity:0.6, display:'flex', alignItems:'center', padding:'2px 6px', borderRadius:6 }}>
                          <IconTrash size={14} stroke={1.5} />
                        </button>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8, marginBottom:8 }}>
                        <div className="form-group" style={{ margin:0 }}>
                          <label className="form-label">Uhrzeit *</label>
                          <input className="input" type="time" value={slot.time} onChange={e=>updateSlot(slot.id,'time',e.target.value)} />
                        </div>
                        <div className="form-group" style={{ margin:0 }}>
                          <label className="form-label">Dauer (Min.)</label>
                          <select className="input" value={slot.duration} onChange={e=>updateSlot(slot.id,'duration',parseInt(e.target.value))}>
                            {[5,10,15,20,30,45,60,90].map(d=><option key={d} value={d}>{d} Min.</option>)}
                          </select>
                        </div>
                        <div className="form-group" style={{ margin:0 }}>
                          <label className="form-label">Max. Gruppen</label>
                          <input className="input" type="number" min="1" max="10" value={slot.maxGroups} onChange={e=>updateSlot(slot.id,'maxGroups',parseInt(e.target.value)||1)} />
                        </div>
                        <div className="form-group" style={{ margin:0 }}>
                          <label className="form-label">Buchungen</label>
                          <input className="input" type="number" min="0" value={slot.bookings||0} onChange={e=>updateSlot(slot.id,'bookings',parseInt(e.target.value)||0)} />
                        </div>
                      </div>
                      <div className="form-group" style={{ margin:0 }}>
                        <label className="form-label">Bezeichnung *</label>
                        <input className="input" placeholder="z.B. Spielerunde, Überraschung, Freie Zeit…" value={slot.label} onChange={e=>updateSlot(slot.id,'label',e.target.value)} />
                      </div>
                      <div className="form-group" style={{ marginTop:8, marginBottom:0 }}>
                        <label className="form-label">Beschreibung (optional)</label>
                        <input className="input" placeholder="Kurze Info für die Gäste" value={slot.description} onChange={e=>updateSlot(slot.id,'description',e.target.value)} />
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={addSlot} style={{ alignSelf:'flex-start' }}>
                    <IconPlus size={13} stroke={2} /> Weiteren Slot hinzufügen
                  </button>
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-primary" onClick={saveConfig}>
                {saved ? <><IconCheck size={14} stroke={2} /> Gespeichert!</> : 'Speichern'}
              </button>
            </div>
          </div>
        )}

        {/* ── TAB: REQUESTS ── */}
        {activeTab === 'requests' && (
          <div>
            <div className="card">
              <div className="section-title">Eingegangene Zeitslot-Anfragen</div>
              {slotRequests.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 16px', color:'var(--mocha)' }}>
                  <IconClock size={36} stroke={1} style={{ opacity:0.35, marginBottom:12 }} />
                  <p style={{ fontSize:14 }}>Noch keine Anfragen eingegangen.</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:12 }}>
                  {slotRequests.map((req,i) => (
                    <div key={i} style={{ background:'var(--warm)', borderRadius:12, padding:'14px 16px', border:'1px solid var(--sand)' }}>
                      <div style={{ display:'flex', gap:12, justifyContent:'space-between', flexWrap:'wrap' }}>
                        <div>
                          <div style={{ fontWeight:600, fontSize:14, color:'var(--espresso)', marginBottom:2 }}>{req.name}</div>
                          <div style={{ fontSize:13, color:'var(--mocha)' }}>{req.activity}</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          {req.time && <div style={{ fontSize:12, fontWeight:500, color:'var(--terra)' }}><IconClock size={11} stroke={2} style={{ verticalAlign:'middle' }} /> {req.time}</div>}
                          {req.duration && <div style={{ fontSize:11, color:'var(--mocha)' }}>{req.duration} Min.</div>}
                        </div>
                      </div>
                      {req.note && <div style={{ fontSize:12, color:'var(--mocha)', marginTop:8, fontStyle:'italic' }}>"{req.note}"</div>}
                      <div style={{ display:'flex', gap:8, marginTop:10 }}>
                        <button className="btn btn-primary btn-sm">✓ Bestätigen</button>
                        <button className="btn btn-secondary btn-sm">✗ Ablehnen</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

import { useState, useEffect, useRef } from 'react';
import { loadState, saveState, defaultWedding, makeSlug } from '../data/store';
import { saveGuestPageConfig, syncLocalToSupabase } from '../lib/db';
import {
  IconExternalLink, IconCopy, IconCheck,
  IconToggleRight, IconToggleLeft, IconPlus, IconTrash, IconX
} from '@tabler/icons-react';
import QrCodeCard from '../components/QrCodeCard';


const defaultConfig = {
  heroTitle: '', heroSubtitle: 'Wir freuen uns, mit euch zu feiern.',
  heroImageUrl: '', heroImagePosition: 'center',
  sections: {
    rsvp: true, timeline: true, location: true, dresscode: true,
    music: true, registry: true, memories: true, schedule: true, info: true,
  },
  dresscodeStyle: 'Elegant & Boho',
  dresscodeText: 'Wir wünschen uns elegante Kleidung in warmen Erdtönen. Da wir auch im Freien feiern, gerne mit bequemen Schuhen.',
  dresscodeColors: ['#C4956A', '#C4B5A5', '#A8B5A0', '#D4C4A8', '#B8A9C9'],
  generalInfoTitle: 'Gut zu wissen',
  generalInfoText: '',
  rsvpDeadlineOffset: 30,
  scheduleTitle: 'Programmwünsche',
  scheduleSubtitle: 'Habt ihr eine Rede, einen Auftritt oder eine Überraschung geplant? Meldet euch hier!',
  scheduleSlots: [
    { id: 1, time: 'Sektempfang', label: 'Rede / Ansage', maxMin: 5 },
    { id: 2, time: 'Nach dem Dinner', label: 'Spiel / Aktion', maxMin: 10 },
    { id: 3, time: 'Abends', label: 'Auftritt / Performance', maxMin: 15 },
  ],
};

const SECTIONS_META = [
  { id: 'rsvp',      label: 'RSVP',                  sub: 'Zu- & Absagen' },
  { id: 'timeline',  label: 'Tagesablauf',            sub: 'Ablauf des Tages' },
  { id: 'location',  label: 'Location & Anfahrt',     sub: 'Adresse & Karte' },
  { id: 'dresscode', label: 'Dresscode',              sub: 'Kleidungsempfehlung' },
  { id: 'info',      label: 'Allgemeine Infos',       sub: 'Freitext für Gäste' },
  { id: 'schedule',  label: 'Programmwünsche',        sub: 'Zeitslots anfragen' },
  { id: 'music',     label: 'Musikwünsche',           sub: 'Songs vorschlagen' },
  { id: 'registry',  label: 'Geschenkeliste',         sub: 'Wunschliste' },
  { id: 'memories',  label: 'Erinnerungen & Fotos',   sub: 'Foto-Upload' },
];





export default function GuestPageSettings() {
  const wedding = loadState('wedding', defaultWedding);
  const [config, setConfig] = useState(() => loadState('guestPageConfig', defaultConfig));
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('sections');

  // Sicherheits-Fix: früher enthielt der geteilte Link die komplette
  // Gästeliste + RSVP-Stände Base64-kodiert direkt in der URL (#data=...).
  // Die Seite hat dieses Hash-Fragment nie ausgelesen (die Daten kamen immer
  // ohnehin server-seitig über den Slug) — der Link war also nur ein
  // unnötiges Datenleck ohne jeden Nutzen. Jetzt wird überall nur noch der
  // saubere Link ohne eingebettete Daten verwendet.
  const cleanGuestUrl = `${window.location.origin}/guest/${makeSlug(wedding)}`;
  const memoriesUrl = `${window.location.origin}/memories/${makeSlug(wedding)}`;

  function update(key, val) { setConfig(c => ({ ...c, [key]: val })); }
  function toggleSection(id) { setConfig(c => ({ ...c, sections: { ...c.sections, [id]: !c.sections[id] } })); }

  async function saveConfig() {
    saveState('guestPageConfig', config);
    await saveGuestPageConfig(config);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }
  function copyLink() {
    navigator.clipboard.writeText(cleanGuestUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  // Slot management
  function addSlot() {
    const slots = config.scheduleSlots || [];
    const id = Math.max(0, ...slots.map(s => s.id)) + 1;
    update('scheduleSlots', [...slots, { id, time: '', label: '', maxMin: 5 }]);
  }
  function updateSlot(id, field, val) {
    update('scheduleSlots', (config.scheduleSlots||[]).map(s => s.id === id ? { ...s, [field]: val } : s));
  }
  function removeSlot(id) {
    update('scheduleSlots', (config.scheduleSlots||[]).filter(s => s.id !== id));
  }

  const activeCount = Object.values(config.sections || {}).filter(Boolean).length;
  const TABS = [
    { id: 'sections', label: 'Sektionen' },
    { id: 'hero',     label: 'Hero' },
    { id: 'schedule', label: 'Programm' },
    { id: 'dresscode',label: 'Dresscode' },
    { id: 'info',     label: 'Infos' },
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Gästeseite</h1>
          <div className="topbar-sub">{activeCount} Bereiche aktiv</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={cleanGuestUrl} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">
            <IconExternalLink size={14} stroke={1.5} /> Vorschau
          </a>
          <button className="btn btn-secondary btn-sm" onClick={async () => {
            setSyncing(true);
            await syncLocalToSupabase();
            setSyncing(false);
            alert('Alle Daten wurden mit Supabase synchronisiert ✓');
          }} disabled={syncing}>
            {syncing ? '...' : '↑ Sync'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={saveConfig}>
            {saved ? <><IconCheck size={14} stroke={2} /> Gespeichert</> : 'Speichern'}
          </button>
        </div>
      </div>

      <div className="page-body">

        {/* Share link */}
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="section-title" style={{ marginBottom: 10 }}>Link zur Gästeseite</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', padding: '8px 12px', background: 'var(--warm)', borderRadius: 10, border: '1px solid var(--sand)', fontSize: 12, color: 'var(--mocha)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {window.location.origin}/guest/{makeSlug(wedding)}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={copyLink} style={{ flexShrink: 0 }}>
              {copied ? <><IconCheck size={13} stroke={2} /> Kopiert!</> : <><IconCopy size={13} stroke={1.5} /> Kopieren</>}
            </button>
            <a href={cleanGuestUrl} target="_blank" rel="noopener" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
              <IconExternalLink size={13} stroke={1.5} /> Öffnen
            </a>
          </div>
          <div style={{ fontSize: 11, color: 'var(--mocha)', marginTop: 8 }}>
            ℹ️ Der Link funktioniert auf jedem Gerät — Daten werden direkt beim Öffnen sicher geladen.
          </div>
        </div>

        {/* QR codes for printing on invitations */}
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="section-title" style={{ marginBottom: 4 }}>QR-Codes</div>
          <div style={{ fontSize: 12, color: 'var(--mocha)', marginBottom: 14 }}>
            Zum Ausdrucken auf euren Einladungen — als PNG herunterladen.
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <QrCodeCard label="Gästeseite" sub="RSVP, Ablauf, Geschenke & mehr" url={cleanGuestUrl} filename="gaesteseite-qr.png" />
            <QrCodeCard label="Foto-Galerie" sub="Freigegebene Fotos ansehen" url={memoriesUrl} filename="foto-galerie-qr.png" />
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 18 }}>
          {TABS.map(t => (
            <button key={t.id} className={`tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── SEKTIONEN TAB ── */}
        {activeTab === 'sections' && (
          <div className="card">
            <div className="section-title" style={{ marginBottom: 14 }}>Bereiche ein-/ausblenden</div>
            {/* Require invite code toggle */}
            <div onClick={() => setConfig(c => ({ ...c, requireCode: !c.requireCode }))}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, cursor: 'pointer', background: 'var(--warm)', border: '1px solid var(--sand)', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--espresso)' }}>Einladungscode erforderlich</div>
                <div style={{ fontSize: 12, color: 'var(--mocha)', marginTop: 2 }}>
                  {config.requireCode ? 'Gäste können nur mit Code zusagen' : 'Jeder kann ohne Code zusagen'}
                </div>
              </div>
              <div style={{ width: 44, height: 24, borderRadius: 12, background: config.requireCode ? 'var(--sage)' : 'var(--sand)', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: config.requireCode ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {SECTIONS_META.map(s => {
                const on = config.sections?.[s.id] !== false;
                return (
                  <div key={s.id}
                    onClick={() => toggleSection(s.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', background: on ? 'var(--warm)' : '#fff', border: '1px solid ' + (on ? 'var(--sand)' : 'transparent'), transition: 'all .15s', marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: on ? 'var(--espresso)' : 'var(--mocha)' }}>{s.label}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--mocha)', marginTop: 1 }}>{s.sub}</div>
                    </div>
                    {on
                      ? <IconToggleRight size={28} stroke={1.5} style={{ color: 'var(--terra)', flexShrink: 0 }} />
                      : <IconToggleLeft  size={28} stroke={1.5} style={{ color: 'var(--taupe)', flexShrink: 0 }} />
                    }
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── HERO TAB ── */}
        {activeTab === 'hero' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <div className="section-title" style={{ marginBottom: 14 }}>Hero-Bereich</div>
              <div className="form-group">
                <label className="form-label">Überschrift (leer = Brautpaar-Namen)</label>
                <input className="input" placeholder={`${wedding.bride} & ${wedding.groom}`} value={config.heroTitle} onChange={e => update('heroTitle', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Untertitel</label>
                <textarea className="input" rows={2} value={config.heroSubtitle} onChange={e => update('heroSubtitle', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label className="form-label">RSVP Frist (Tage vor Hochzeit)</label>
                <input className="input" type="number" min="7" max="90" value={config.rsvpDeadlineOffset} onChange={e => update('rsvpDeadlineOffset', parseInt(e.target.value) || 30)} />
              </div>
            </div>

            <div className="card">
              <div className="section-title" style={{ marginBottom: 14 }}>Hintergrundbild</div>
              <div className="form-group">
                <label className="form-label">Bild-URL (z.B. Unsplash)</label>
                <input className="input" placeholder="https://images.unsplash.com/..." value={config.heroImageUrl} onChange={e => update('heroImageUrl', e.target.value)} />
                <div style={{ fontSize: 11, color: 'var(--mocha)', marginTop: 4 }}>
                  Tipp: <a href="https://unsplash.com/s/photos/wedding" target="_blank" rel="noopener" style={{ color: 'var(--terra)' }}>unsplash.com</a> für kostenlose Hochzeitsfotos
                </div>
              </div>
              {config.heroImageUrl && (
                <>
                  <div style={{ height: 130, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--sand)', marginBottom: 10 }}>
                    <div style={{ height: '100%', background: `linear-gradient(rgba(0,0,0,0.25),rgba(0,0,0,0.15)), url(${config.heroImageUrl}) ${config.heroImagePosition}/cover no-repeat`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontStyle: 'italic', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                        {config.heroTitle || `${wedding.bride} & ${wedding.groom}`}
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bildposition</label>
                    <select className="input" value={config.heroImagePosition} onChange={e => update('heroImagePosition', e.target.value)}>
                      {['center','top','bottom','left','right'].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── PROGRAMM TAB ── */}
        {activeTab === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <div className="section-title" style={{ marginBottom: 14 }}>Programmwünsche — Sektion</div>
              <div className="form-group">
                <label className="form-label">Titel</label>
                <input className="input" value={config.scheduleTitle || ''} onChange={e => update('scheduleTitle', e.target.value)} placeholder="Programmwünsche" />
              </div>
              <div className="form-group">
                <label className="form-label">Beschreibungstext</label>
                <textarea className="input" rows={3} value={config.scheduleSubtitle || ''} onChange={e => update('scheduleSubtitle', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div className="section-title" style={{ margin: 0 }}>Zeitslots</div>
                <button className="btn btn-secondary btn-sm" onClick={addSlot}>
                  <IconPlus size={13} stroke={2} /> Slot
                </button>
              </div>

              {(config.scheduleSlots || []).map((slot, i) => (
                <div key={slot.id} style={{ background: 'var(--warm)', borderRadius: 10, padding: 12, marginBottom: 10, border: '1px solid var(--sand)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--mocha)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Slot {i + 1}</span>
                    <button className="btn-icon" style={{ padding: '3px 6px' }} onClick={() => removeSlot(slot.id)}>
                      <IconTrash size={13} stroke={1.5} />
                    </button>
                  </div>
                  <div className="grid-2">
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">Zeitpunkt</label>
                      <input className="input" placeholder="z.B. Nach dem Dinner" value={slot.time} onChange={e => updateSlot(slot.id, 'time', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 8 }}>
                      <label className="form-label">Art</label>
                      <input className="input" placeholder="z.B. Spiel / Rede / Auftritt" value={slot.label} onChange={e => updateSlot(slot.id, 'label', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Max. Dauer (Minuten)</label>
                    <input className="input" type="number" min="1" max="60" value={slot.maxMin} onChange={e => updateSlot(slot.id, 'maxMin', parseInt(e.target.value) || 5)} />
                  </div>
                </div>
              ))}

              {(!config.scheduleSlots || config.scheduleSlots.length === 0) && (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <p>Noch keine Slots — klicke auf "+ Slot"</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── DRESSCODE TAB ── */}
        {activeTab === 'dresscode' && (
          <div className="card">
            <div className="section-title" style={{ marginBottom: 14 }}>Dresscode</div>
            <div className="form-group">
              <label className="form-label">Stil-Bezeichnung</label>
              <input className="input" value={config.dresscodeStyle} onChange={e => update('dresscodeStyle', e.target.value)} placeholder="z.B. Elegant & Boho" />
            </div>
            <div className="form-group">
              <label className="form-label">Beschreibung</label>
              <textarea className="input" rows={4} value={config.dresscodeText} onChange={e => update('dresscodeText', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Farbpalette (Hex-Werte, kommagetrennt)</label>
              <input className="input" value={(config.dresscodeColors || []).join(', ')} onChange={e => update('dresscodeColors', e.target.value.split(',').map(s => s.trim()).filter(s => s.startsWith('#')))} placeholder="#C4956A, #A8B5A0, #C4B5A5" />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {(config.dresscodeColors || []).map((col, i) => (
                  <div key={i} title={col} style={{ width: 34, height: 34, borderRadius: '50%', background: col, border: '2px solid var(--sand)' }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ALLGEMEINE INFOS TAB ── */}
        {activeTab === 'info' && (
          <div className="card">
            <div className="section-title" style={{ marginBottom: 14 }}>Allgemeine Infos</div>
            <div style={{ fontSize: 12, color: 'var(--mocha)', marginBottom: 14 }}>
              Freitext für alles, was Gäste sonst noch wissen sollten — z.B. Parkmöglichkeiten, Übernachtung, Anreise, Kinderbetreuung, Wetter-Hinweise.
            </div>
            <div className="form-group">
              <label className="form-label">Überschrift</label>
              <input className="input" value={config.generalInfoTitle || ''} onChange={e => update('generalInfoTitle', e.target.value)} placeholder="z.B. Gut zu wissen" />
            </div>
            <div className="form-group">
              <label className="form-label">Text</label>
              <textarea className="input" rows={6} value={config.generalInfoText || ''} onChange={e => update('generalInfoText', e.target.value)} style={{ resize: 'vertical' }} placeholder="z.B. Parkplätze sind direkt vor der Location verfügbar. Die nächste Übernachtungsmöglichkeit ist das Hotel XY, 5 Gehminuten entfernt. Für Kinder gibt es eine Betreuung ab 15 Uhr..." />
            </div>
          </div>
        )}

        {/* Save button at bottom */}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <a href={cleanGuestUrl} target="_blank" rel="noopener" className="btn btn-secondary">
            <IconExternalLink size={14} stroke={1.5} /> Gästeseite öffnen
          </a>
          <button className="btn btn-primary" onClick={saveConfig}>
            {saved ? <><IconCheck size={14} stroke={2} /> Gespeichert!</> : 'Speichern'}
          </button>
        </div>
      </div>
    </>
  );
}

import { useState } from 'react';
import { loadState, saveState, defaultWedding, makeSlug } from '../data/store';
import { IconExternalLink, IconCopy, IconCheck, IconToggleRight, IconToggleLeft, IconPhoto } from '@tabler/icons-react';

const defaultConfig = {
  heroTitle: '', heroSubtitle: 'Wir freuen uns, mit euch zu feiern.',
  heroImageUrl: '', heroImagePosition: 'center',
  sections: { rsvp: true, timeline: true, location: true, dresscode: true, music: true, registry: true },
  dresscodeStyle: 'Elegant & Boho',
  dresscodeText: 'Wir wünschen uns elegante Kleidung in warmen Erdtönen. Da wir auch im Freien feiern, gerne mit bequemen Schuhen.',
  dresscodeColors: ['#C4956A', '#C4B5A5', '#A8B5A0', '#D4C4A8', '#B8A9C9'],
  rsvpDeadlineOffset: 30,
};

const SECTIONS_META = [
  { id: 'rsvp', label: 'RSVP / Zu- & Absagen', sub: 'Gäste können ihre Teilnahme bestätigen' },
  { id: 'timeline', label: 'Tagesablauf', sub: 'Zeigt den Ablauf eures Hochzeitstages' },
  { id: 'location', label: 'Location & Anfahrt', sub: 'Informationen zur Location' },
  { id: 'dresscode', label: 'Dresscode', sub: 'Kleidungsempfehlungen für eure Gäste' },
  { id: 'music', label: 'Musikwünsche', sub: 'Gäste können Songs vorschlagen' },
  { id: 'registry', label: 'Geschenkeliste', sub: 'Eure Wunschliste für Gäste' },
  { id: 'memories', label: 'Erinnerungen & Fotos', sub: 'Gäste können Fotos hochladen' },
];

export default function GuestPageSettings() {
  const wedding = loadState('wedding', defaultWedding);
  const [config, setConfig] = useState(() => loadState('guestPageConfig', defaultConfig));
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  function buildShareUrl() {
    const tl = loadState('timeline', []);
    const reg = loadState('registry', []);
    const payload = { wedding, config, timeline: tl, registry: reg };
    try { const b64 = btoa(encodeURIComponent(JSON.stringify(payload))); return `${window.location.origin}/guest/${makeSlug(wedding)}#data=${b64}`; } catch { return `${window.location.origin}/guest/${makeSlug(wedding)}`; }
  }
  const guestUrl = buildShareUrl();

  function update(key, val) { setConfig(c => ({ ...c, [key]: val })); }
  function toggleSection(id) { setConfig(c => ({ ...c, sections: { ...c.sections, [id]: !c.sections[id] } })); }

  function saveConfig() {
    saveState('guestPageConfig', config);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  function copyLink() {
    navigator.clipboard.writeText(guestUrl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const activeCount = Object.values(config.sections).filter(Boolean).length;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Gästeseite</h1>
          <div className="topbar-sub">Konfiguriert eure öffentliche Hochzeitsseite · {activeCount} Bereiche aktiv</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={guestUrl} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">
            <IconExternalLink size={14} stroke={1.5} /> Vorschau
          </a>
          <button className="btn btn-primary" onClick={saveConfig}>
            {saved ? <><IconCheck size={14} stroke={2} /> Gespeichert!</> : 'Speichern'}
          </button>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* Left column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Link */}
            <div className="card">
              <div className="section-title">Link zur Gästeseite</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, padding: '8px 13px', background: 'var(--warm)', borderRadius: 10, border: '1px solid var(--sand)', fontSize: 13, color: 'var(--mocha)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

            {/* Hero customization */}
            <div className="card">
              <div className="section-title">Hero Bereich</div>

              <div className="form-group">
                <label className="form-label">Überschrift (leer = Name aus Einstellungen)</label>
                <input className="input" placeholder={`${wedding.bride} & ${wedding.groom}`} value={config.heroTitle} onChange={e => update('heroTitle', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Untertitel / Willkommenstext</label>
                <textarea className="input" rows={2} value={config.heroSubtitle} onChange={e => update('heroSubtitle', e.target.value)} style={{ resize: 'vertical' }} />
              </div>

              <div className="form-group">
                <label className="form-label">Hero-Bild URL (z.B. Unsplash-Link)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" placeholder="https://images.unsplash.com/..." value={config.heroImageUrl} onChange={e => update('heroImageUrl', e.target.value)} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--mocha)', marginTop: 4 }}>
                  Tipp: Nutzt <a href="https://unsplash.com" target="_blank" rel="noopener" style={{ color: 'var(--terra)' }}>unsplash.com</a> für kostenlose Hochzeitsfotos
                </div>
              </div>

              {config.heroImageUrl && (
                <div>
                  <div style={{ height: 140, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--sand)', marginBottom: 10 }}>
                    <div style={{ height: '100%', background: `linear-gradient(rgba(0,0,0,0.25),rgba(0,0,0,0.15)), url(${config.heroImageUrl}) ${config.heroImagePosition}/cover no-repeat`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontStyle: 'italic', color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                        {config.heroTitle || `${wedding.bride} & ${wedding.groom}`}
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bildposition</label>
                    <select className="input" value={config.heroImagePosition} onChange={e => update('heroImagePosition', e.target.value)}>
                      {['center', 'top', 'bottom', 'left', 'right'].map(p => <option key={p} value={p}>{p}</option>)}
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
                <input className="input" value={config.dresscodeStyle} onChange={e => update('dresscodeStyle', e.target.value)} placeholder="z.B. Elegant & Boho" />
              </div>
              <div className="form-group">
                <label className="form-label">Beschreibung</label>
                <textarea className="input" rows={3} value={config.dresscodeText} onChange={e => update('dresscodeText', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Farbpalette (Hex-Werte, kommagetrennt)</label>
                <input className="input" value={(config.dresscodeColors || []).join(', ')} onChange={e => update('dresscodeColors', e.target.value.split(',').map(s => s.trim()).filter(s => s.startsWith('#')))} placeholder="#C4956A, #A8B5A0, #C4B5A5" />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {(config.dresscodeColors || []).map((col, i) => (
                    <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: col, border: '2px solid var(--sand)' }} />
                  ))}
                </div>
              </div>
            </div>

            {/* RSVP deadline */}
            <div className="card">
              <div className="section-title">RSVP Frist</div>
              <div className="form-group">
                <label className="form-label">Tage vor der Hochzeit als Deadline</label>
                <input className="input" type="number" min="7" max="90" value={config.rsvpDeadlineOffset} onChange={e => update('rsvpDeadlineOffset', parseInt(e.target.value) || 30)} />
              </div>
            </div>
          </div>

          {/* Right column: section toggles */}
          <div style={{ width: 300, flexShrink: 0 }}>
            <div className="card">
              <div className="section-title">Sektionen ein-/ausblenden</div>
              <p style={{ fontSize: 12, color: 'var(--mocha)', marginBottom: 14, lineHeight: 1.5 }}>
                Wählt aus, welche Bereiche auf eurer Gästeseite angezeigt werden sollen.
              </p>
              {SECTIONS_META.map(s => {
                const on = config.sections[s.id] !== false;
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--sand)' }}
                    onClick={() => toggleSection(s.id)} style_={{ cursor: 'pointer' }}>
                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => toggleSection(s.id)}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: on ? 'var(--espresso)' : 'var(--mocha)' }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--mocha)' }}>{s.sub}</div>
                    </div>
                    <div onClick={() => toggleSection(s.id)} style={{ cursor: 'pointer', color: on ? 'var(--sage)' : 'var(--taupe)' }}>
                      {on
                        ? <IconToggleRight size={26} stroke={1.5} style={{ color: 'var(--terra)' }} />
                        : <IconToggleLeft size={26} stroke={1.5} style={{ color: 'var(--taupe)' }} />
                      }
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card-warm" style={{ marginTop: 14, textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔗</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, color: 'var(--espresso)', marginBottom: 6 }}>Gästeseite teilen</div>
              <div style={{ fontSize: 12, color: 'var(--mocha)', marginBottom: 14, lineHeight: 1.5 }}>Schickt den Link direkt an eure Gäste per E-Mail oder WhatsApp.</div>
              <a href={guestUrl} target="_blank" rel="noopener" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
                <IconExternalLink size={14} stroke={1.5} /> Gästeseite öffnen
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

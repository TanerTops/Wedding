import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { loadState, defaultWedding, defaultTimeline } from '../data/store';
import {
  IconCalendar, IconMapPin, IconMusic, IconGift, IconShirt,
  IconChevronDown, IconCheck, IconArrowRight, IconHeart, IconPlus, IconUpload
} from '@tabler/icons-react';

// ─────────────────────────────────────────────────────────────────
// The guest page reads data from localStorage (same device/browser)
// OR from a base64-encoded payload in the URL hash: /guest/slug#data=...
// The admin "Gästeseite" settings page generates the full shareable link.
// ─────────────────────────────────────────────────────────────────

const defaultConfig = {
  heroTitle: '',
  heroSubtitle: 'Wir freuen uns, mit euch zu feiern.',
  heroImageUrl: '',
  heroImagePosition: 'center',
  sections: { rsvp: true, timeline: true, location: true, dresscode: true, music: true, registry: true },
  dresscodeStyle: 'Elegant & Boho',
  dresscodeText: 'Wir wünschen uns elegante Kleidung in warmen Erdtönen. Da wir auch im Freien feiern, gerne mit bequemen Schuhen.',
  dresscodeColors: ['#C4956A','#C4B5A5','#A8B5A0','#D4C4A8','#B8A9C9'],
  rsvpDeadlineOffset: 30,
};

const TYPE_COLORS = {
  ceremony: '#C4956A', photo: '#A8B5A0', reception: '#C9A884',
  dinner: '#B5A88A', speech: '#B8A9C9', dance: '#C4B5A5', party: '#9B8EA0',
};
const TYPE_LABELS = {
  ceremony: 'Zeremonie', photo: 'Fotos', reception: 'Empfang',
  dinner: 'Dinner', speech: 'Reden', dance: 'Tanz', party: 'Party',
};

const SECTION_NAV = [
  { id: 'rsvp', label: 'RSVP' },
  { id: 'timeline', label: 'Ablauf' },
  { id: 'location', label: 'Location' },
  { id: 'dresscode', label: 'Dresscode' },
  { id: 'music', label: 'Musik' },
  { id: 'registry', label: 'Geschenke' },
  { id: 'memories', label: 'Erinnerungen' },
];

// Try to load embedded data from URL hash (for sharing across devices)
function loadFromHash() {
  try {
    const hash = window.location.hash;
    if (!hash.includes('data=')) return null;
    const b64 = hash.split('data=')[1];
    const json = atob(decodeURIComponent(b64));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function GuestPage() {
  const { slug } = useParams();
  const [active, setActive] = useState('');
  const [rsvpStep, setRsvpStep] = useState(1);
  const [rsvpData, setRsvpData] = useState({ name: '', email: '', attending: '', menu: '', plusOne: false, message: '' });
  const [rsvpDone, setRsvpDone] = useState(false);
  const [songs, setSongs] = useState([{ title: '', artist: '' }]);
  const [songSent, setSongSent] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploads, setUploads] = useState([]);
  const [uploadDone, setUploadDone] = useState(false);

  // Load data: URL hash takes priority (shared link), fallback to localStorage, fallback to defaults
  const hashData = loadFromHash();
  const wedding  = hashData?.wedding  || loadState('wedding',          defaultWedding);
  const timeline = hashData?.timeline || loadState('timeline',         defaultTimeline);
  const config   = hashData?.config   || loadState('guestPageConfig',  defaultConfig);
  const registry = hashData?.registry || loadState('registry', [
    { id: 1, title: 'Honeymoon-Kasse',      desc: 'Beitrag zu unserer Hochzeitsreise', amount: 0,   type: 'fund' },
    { id: 2, title: 'Küchenmaschine',       desc: 'KitchenAid, Farbe: Creme',          amount: 399, type: 'item' },
    { id: 3, title: 'Abendessen zu zweit',  desc: 'Ein schöner Restaurant-Abend',      amount: 120, type: 'item' },
  ]);

  const heroTitle = config.heroTitle || `${wedding.bride} & ${wedding.groom}`;
  const days = Math.ceil((new Date(wedding.date) - new Date()) / 86400000);
  const deadline = new Date(new Date(wedding.date).getTime() - (config.rsvpDeadlineOffset || 30) * 86400000);
  const activeSections = SECTION_NAV.filter(s => config.sections[s.id] !== false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
      { threshold: 0.3, rootMargin: '-60px 0px 0px 0px' }
    );
    activeSections.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  function scrollTo(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', fontFamily: "'DM Sans', sans-serif" }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(251,247,240,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--sand)', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontStyle: 'italic', color: 'var(--brown)' }}>
          {wedding.bride} & {wedding.groom}
        </div>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }} className="guest-nav-links">
          {activeSections.map(s => (
            <button key={s.id} onClick={() => scrollTo(s.id)} style={{ padding: '5px 12px', borderRadius: 30, fontSize: 12, border: 'none', cursor: 'pointer', background: active === s.id ? 'var(--sand)' : 'transparent', color: active === s.id ? 'var(--espresso)' : 'var(--mocha)', fontWeight: active === s.id ? 500 : 400, transition: 'all .15s', fontFamily: "'DM Sans',sans-serif" }}>
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" style={{ minHeight: '100vh', paddingTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', background: config.heroImageUrl ? `linear-gradient(rgba(0,0,0,0.28),rgba(0,0,0,0.18)), url(${config.heroImageUrl}) ${config.heroImagePosition}/cover no-repeat` : 'linear-gradient(160deg,#FDF8F0 0%,#F0E8D8 50%,#EAE0D0 100%)' }}>
        {!config.heroImageUrl && <>
          <div style={{ position: 'absolute', width: 500, height: 500, top: -120, right: -100, borderRadius: '50%', background: 'radial-gradient(circle,rgba(196,149,106,0.18) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 380, height: 380, bottom: -80, left: -80, borderRadius: '50%', background: 'radial-gradient(circle,rgba(168,181,160,0.18) 0%,transparent 70%)', pointerEvents: 'none' }} />
        </>}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 620, padding: '0 24px' }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20, color: config.heroImageUrl ? 'rgba(255,255,255,0.8)' : 'var(--mocha)' }}>
            Ihr seid herzlich eingeladen
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontStyle: 'italic', lineHeight: 1.05, marginBottom: 20, letterSpacing: 1, color: config.heroImageUrl ? '#fff' : 'var(--espresso)', fontSize: 'clamp(48px,8vw,80px)' }}>
            {heroTitle}
          </h1>
          <div style={{ width: 60, height: 1, background: config.heroImageUrl ? 'rgba(255,255,255,0.5)' : 'linear-gradient(90deg,transparent,var(--mocha),transparent)', margin: '0 auto 20px' }} />
          {config.heroSubtitle && (
            <p style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 24, color: config.heroImageUrl ? 'rgba(255,255,255,0.88)' : 'var(--mocha)' }}>
              {config.heroSubtitle}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 30, fontSize: 14, fontWeight: 500, background: config.heroImageUrl ? 'rgba(255,255,255,0.15)' : 'rgba(196,149,106,0.12)', border: '1px solid ' + (config.heroImageUrl ? 'rgba(255,255,255,0.3)' : 'rgba(196,149,106,0.4)'), color: config.heroImageUrl ? '#fff' : 'var(--terra)' }}>
              <IconCalendar size={15} stroke={1.5} />
              {new Date(wedding.date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 30, fontSize: 14, background: config.heroImageUrl ? 'rgba(255,255,255,0.12)' : 'var(--warm)', border: '1px solid ' + (config.heroImageUrl ? 'rgba(255,255,255,0.2)' : 'var(--sand)'), color: config.heroImageUrl ? 'rgba(255,255,255,0.85)' : 'var(--brown)' }}>
              <IconMapPin size={15} stroke={1.5} />
              {wedding.venue}
            </div>
          </div>
          {days > 0 && config.sections.rsvp !== false && (
            <button className="btn btn-primary" style={{ fontSize: 15, padding: '11px 28px', background: config.heroImageUrl ? 'rgba(255,255,255,0.2)' : 'var(--brown)', backdropFilter: config.heroImageUrl ? 'blur(8px)' : 'none', border: config.heroImageUrl ? '1px solid rgba(255,255,255,0.4)' : 'none' }} onClick={() => scrollTo('rsvp')}>
              Jetzt zusagen <IconHeart size={15} stroke={1.5} />
            </button>
          )}
          {days > 0 && (
            <div style={{ marginTop: 14, fontSize: 12, color: config.heroImageUrl ? 'rgba(255,255,255,0.6)' : 'var(--mocha)' }}>
              Bitte antworte bis {deadline.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', animation: 'vbounce 2s infinite', opacity: 0.5 }}>
          <IconChevronDown size={24} stroke={1.5} style={{ color: config.heroImageUrl ? '#fff' : 'var(--mocha)' }} />
        </div>
        <style>{`@keyframes vbounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(7px)}}`}</style>
      </section>

      {/* RSVP */}
      {config.sections.rsvp !== false && (
        <section id="rsvp" style={{ background: '#fff' }}>
          <div className="guest-section">
            <SectionHeader title="Werdet ihr dabei sein?" sub="Wir würden uns riesig freuen!" />
            {rsvpDone ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#E8F5E9', border: '2px solid #C8E6C9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <IconCheck size={28} stroke={2} style={{ color: '#388E3C' }} />
                </div>
                <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, color: 'var(--espresso)', marginBottom: 8 }}>
                  {rsvpData.attending === 'yes' ? 'Wir freuen uns auf euch! 🌸' : 'Schade, dass ihr nicht dabei sein könnt.'}
                </h3>
                <p style={{ color: 'var(--mocha)', fontSize: 14 }}>
                  {rsvpData.attending === 'yes' ? 'Eure Zusage ist eingegangen.' : 'Danke für eure Rückmeldung.'}
                </p>
              </div>
            ) : (
              <div className="rsvp-form" style={{ maxWidth: 520, margin: '0 auto' }}>
                {/* Steps */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                  {[1,2,3].map((s, i) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: i < 2 ? 1 : 'none' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, background: rsvpStep > s ? 'var(--sage)' : rsvpStep === s ? 'var(--brown)' : 'var(--sand)', color: rsvpStep >= s ? '#fff' : 'var(--mocha)' }}>
                        {rsvpStep > s ? <IconCheck size={14} stroke={2.5} /> : s}
                      </div>
                      <span style={{ fontSize: 12, color: rsvpStep === s ? 'var(--brown)' : 'var(--mocha)', fontWeight: rsvpStep === s ? 500 : 400 }}>
                        {s === 1 ? 'Teilnahme' : s === 2 ? 'Details' : 'Bestätigung'}
                      </span>
                      {i < 2 && <div style={{ flex: 1, height: 1, background: rsvpStep > s ? 'var(--sage)' : 'var(--sand)' }} />}
                    </div>
                  ))}
                </div>

                {rsvpStep === 1 && (
                  <div>
                    <div className="form-group"><label className="form-label">Euer Name *</label><input className="input" placeholder="Vollständiger Name" value={rsvpData.name} onChange={e => setRsvpData(d => ({ ...d, name: e.target.value }))} /></div>
                    <div className="form-group"><label className="form-label">E-Mail</label><input className="input" type="email" placeholder="email@beispiel.de" value={rsvpData.email} onChange={e => setRsvpData(d => ({ ...d, email: e.target.value }))} /></div>
                    <div className="form-group">
                      <label className="form-label">Werdet ihr dabei sein? *</label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {[{ v: 'yes', l: 'Ja, wir kommen! 🌿' }, { v: 'no', l: 'Leider nicht 😢' }].map(opt => (
                          <button key={opt.v} onClick={() => setRsvpData(d => ({ ...d, attending: opt.v }))} style={{ flex: 1, padding: '10px 16px', borderRadius: 30, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500, transition: 'all .15s', background: rsvpData.attending === opt.v ? 'var(--brown)' : 'var(--warm)', color: rsvpData.attending === opt.v ? '#fff' : 'var(--brown)', border: `1px solid ${rsvpData.attending === opt.v ? 'var(--brown)' : 'var(--sand)'}` }}>
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} onClick={() => rsvpData.name && rsvpData.attending && setRsvpStep(2)}>
                      Weiter <IconArrowRight size={15} stroke={2} />
                    </button>
                  </div>
                )}

                {rsvpStep === 2 && (
                  <div>
                    {rsvpData.attending === 'yes' && <>
                      <div className="form-group">
                        <label className="form-label">Menüwahl</label>
                        <select className="input" value={rsvpData.menu} onChange={e => setRsvpData(d => ({ ...d, menu: e.target.value }))}>
                          <option value="">– bitte wählen –</option>
                          {['Fleisch','Fisch','Vegetarisch','Vegan'].map(m => <option key={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13.5, color: 'var(--brown)' }}>
                          <input type="checkbox" checked={rsvpData.plusOne} onChange={e => setRsvpData(d => ({ ...d, plusOne: e.target.checked }))} />
                          Ich bringe eine Begleitperson mit (+1)
                        </label>
                      </div>
                    </>}
                    <div className="form-group">
                      <label className="form-label">Nachricht ans Brautpaar</label>
                      <textarea className="input" rows={3} placeholder="Wir freuen uns so sehr! ..." value={rsvpData.message} onChange={e => setRsvpData(d => ({ ...d, message: e.target.value }))} style={{ resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary" onClick={() => setRsvpStep(1)}>← Zurück</button>
                      <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setRsvpStep(3)}>Weiter <IconArrowRight size={15} stroke={2} /></button>
                    </div>
                  </div>
                )}

                {rsvpStep === 3 && (
                  <div>
                    <h4 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: 'var(--espresso)', marginBottom: 14 }}>Eure Angaben</h4>
                    {[['Name', rsvpData.name], ['Teilnahme', rsvpData.attending === 'yes' ? '✅ Zugesagt' : '❌ Abgesagt'], rsvpData.menu && ['Menü', rsvpData.menu], rsvpData.plusOne && ['Begleitperson', '+1'], rsvpData.message && ['Nachricht', rsvpData.message]].filter(Boolean).map(([l,v]) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--sand)', fontSize: 13 }}>
                        <span style={{ color: 'var(--mocha)' }}>{l}</span>
                        <span style={{ color: 'var(--espresso)', fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button className="btn btn-secondary" onClick={() => setRsvpStep(2)}>← Zurück</button>
                      <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setRsvpDone(true)}>Absenden 🌸</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* TIMELINE */}
      {config.sections.timeline !== false && (
        <section id="timeline" style={{ background: 'var(--cream)' }}>
          <div className="guest-section">
            <SectionHeader title="Tagesablauf" sub="Ein Tag voller schöner Momente" />
            <div style={{ maxWidth: 580, margin: '0 auto' }}>
              {timeline.map((ev, i) => (
                <div key={ev.id} style={{ display: 'flex', gap: 18 }}>
                  <div style={{ width: 54, textAlign: 'right', paddingTop: 4, flexShrink: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--mocha)' }}>{ev.time}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: TYPE_COLORS[ev.type] || 'var(--terra)', boxShadow: `0 0 0 4px ${(TYPE_COLORS[ev.type]||'var(--terra)')}22`, marginTop: 5, flexShrink: 0 }} />
                    {i < timeline.length - 1 && <div style={{ width: 1.5, flex: 1, background: 'var(--sand)', minHeight: 26 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 18 }}>
                    <div className="card" style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 10, color: TYPE_COLORS[ev.type], fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{TYPE_LABELS[ev.type] || ev.type}</div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--espresso)' }}>{ev.title}</div>
                      {ev.loc && <div style={{ fontSize: 12, color: 'var(--mocha)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}><IconMapPin size={12} stroke={1.5} />{ev.loc}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LOCATION */}
      {config.sections.location !== false && (
        <section id="location" style={{ background: '#fff' }}>
          <div className="guest-section">
            <SectionHeader title="Location & Anreise" sub="Wir freuen uns, euch hier willkommen zu heißen" />
            <div className="card" style={{ overflow: 'hidden', padding: 0, maxWidth: 720, margin: '0 auto' }}>
              <div style={{ height: 200, background: 'linear-gradient(135deg,#F2D9B8 0%,#E8D5C0 50%,#D4C4B0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 44, marginBottom: 8 }}>🏰</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: 'var(--espresso)' }}>{wedding.venue}</div>
                </div>
              </div>
              <div style={{ padding: 24 }}>
                <div className="grid-2" style={{ marginBottom: 20 }}>
                  <div>
                    <div className="section-title">Adresse</div>
                    <div style={{ fontSize: 14, color: 'var(--espresso)', lineHeight: 1.8 }}>{wedding.venue}</div>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(wedding.venue)}`} target="_blank" rel="noopener" className="btn btn-secondary btn-sm" style={{ marginTop: 10, display: 'inline-flex' }}>
                      <IconMapPin size={13} stroke={1.5} /> Google Maps
                    </a>
                  </div>
                  <div>
                    <div className="section-title">Parken</div>
                    <div style={{ fontSize: 13, color: 'var(--mocha)', lineHeight: 1.8 }}>Parkplätze sind direkt vor der Location verfügbar.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* DRESSCODE */}
      {config.sections.dresscode !== false && (
        <section id="dresscode" style={{ background: 'var(--warm)' }}>
          <div className="guest-section">
            <SectionHeader title="Dresscode" sub="Damit wir zusammen wunderschöne Erinnerungen schaffen" />
            <div className="card" style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: '36px 32px' }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: 'var(--espresso)', marginBottom: 10, fontStyle: 'italic' }}>{config.dresscodeStyle}</div>
              <p style={{ fontSize: 14, color: 'var(--mocha)', lineHeight: 1.8, maxWidth: 380, margin: '0 auto 28px' }}>{config.dresscodeText}</p>
              <div className="section-title" style={{ textAlign: 'center', marginBottom: 16 }}>Empfohlene Farben</div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['Terrakotta','Sand','Salbei','Beige','Lavendel'].map((name, i) => (
                  <div key={name} style={{ textAlign: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: (config.dresscodeColors||[])[i]||'#DDD3C0', border: '2px solid var(--sand)', margin: '0 auto 6px' }} />
                    <div style={{ fontSize: 11, color: 'var(--mocha)' }}>{name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* MUSIC */}
      {config.sections.music !== false && (
        <section id="music" style={{ background: '#fff' }}>
          <div className="guest-section">
            <SectionHeader title="Musikwünsche" sub="Welche Songs bringen euch auf die Tanzfläche?" />
            {songSent ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div>
                <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: 'var(--espresso)' }}>Vielen Dank!</h3>
                <p style={{ color: 'var(--mocha)', marginTop: 6 }}>Eure Musikwünsche sind eingegangen.</p>
              </div>
            ) : (
              <div style={{ maxWidth: 500, margin: '0 auto' }}>
                <div className="form-group"><label className="form-label">Euer Name</label><input className="input" placeholder="Damit der DJ weiß, von wem der Wunsch kommt" /></div>
                {songs.map((song, i) => (
                  <div key={i} style={{ background: 'var(--warm)', borderRadius: 12, padding: 14, marginBottom: 10, border: '1px solid var(--sand)' }}>
                    <div style={{ fontSize: 11, color: 'var(--mocha)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Song {i+1}</div>
                    <div className="form-group"><input className="input" placeholder="Songtitel" value={song.title} onChange={e => { const s=[...songs]; s[i].title=e.target.value; setSongs(s); }} /></div>
                    <input className="input" placeholder="Künstler" value={song.artist} onChange={e => { const s=[...songs]; s[i].artist=e.target.value; setSongs(s); }} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSongs([...songs, { title:'', artist:'' }])}>
                    <IconPlus size={13} stroke={2} /> Weiterer Song
                  </button>
                  <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSongSent(true)}>
                    Absenden <IconMusic size={14} stroke={1.5} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* REGISTRY */}
      {config.sections.registry !== false && (
        <section id="registry" style={{ background: 'var(--cream)' }}>
          <div className="guest-section">
            <SectionHeader title="Geschenkeliste" sub="Eure Anwesenheit ist das schönste Geschenk." />
            <div className="grid-3" style={{ maxWidth: 720, margin: '0 auto' }}>
              {registry.map(item => (
                <div key={item.id} className="card" style={{ overflow: 'hidden', padding: 0 }}>
                  <div style={{ height: 100, background: 'linear-gradient(135deg,var(--terra-light),var(--sage-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>
                    {item.type === 'fund' ? '✈️' : '🎁'}
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--espresso)', marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--mocha)', marginBottom: 8, lineHeight: 1.5 }}>{item.desc}</div>
                    {item.amount > 0 && <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--terra)', marginBottom: 8 }}>{item.amount.toLocaleString('de-DE')} €</div>}
                    <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                      {item.type === 'fund' ? 'Beitragen' : 'Reservieren'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* MEMORIES — guest photo upload */}
      {config.sections.memories !== false && (
        <section id="memories" style={{ background: 'var(--warm)' }}>
          <div className="guest-section">
            <SectionHeader title="Eure Erinnerungen" sub="Teilt eure schönsten Fotos vom großen Tag mit uns!" />

            {/* Approved public gallery */}
            <GuestMemoriesGallery />

            <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg,transparent,var(--mocha),transparent)', margin: '32px auto 0' }} />

            {/* Upload form */}
            <div className="card" style={{ maxWidth: 520, margin: '32px auto 0' }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: 'var(--espresso)', marginBottom: 4 }}>Foto hochladen</div>
              <p style={{ fontSize: 13, color: 'var(--mocha)', marginBottom: 16, lineHeight: 1.6 }}>
                Ladet eure Fotos hoch — wir prüfen sie und schalten die schönsten für alle sichtbar.
              </p>
              {uploadDone ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🌸</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: 'var(--espresso)' }}>Vielen Dank!</div>
                  <div style={{ fontSize: 13, color: 'var(--mocha)', marginTop: 6 }}>Eure Fotos wurden eingereicht und werden bald freigeschaltet.</div>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Euer Name</label>
                    <input className="input" placeholder="Damit wir wissen von wem die Fotos sind" value={uploadName} onChange={e => setUploadName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fotos auswählen</label>
                    <input type="file" accept="image/*" multiple
                      onChange={e => setUploads(Array.from(e.target.files))}
                      style={{ width: '100%', padding: '8px', border: '1px dashed var(--taupe)', borderRadius: 10, background: 'var(--warm)', fontSize: 13, cursor: 'pointer' }}
                    />
                    {uploads.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--mocha)', marginTop: 6 }}>
                        {uploads.length} {uploads.length === 1 ? 'Foto' : 'Fotos'} ausgewählt
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => { if (uploads.length > 0) setUploadDone(true); }}
                    disabled={uploads.length === 0}
                  >
                    <IconUpload size={15} stroke={2} /> Fotos einreichen
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer style={{ background: 'var(--warm)', borderTop: '1px solid var(--sand)', padding: '36px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontStyle: 'italic', color: 'var(--brown)', marginBottom: 6 }}>{wedding.bride} & {wedding.groom}</div>
        <div style={{ fontSize: 13, color: 'var(--mocha)' }}>{new Date(wedding.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div style={{ fontSize: 12, color: 'var(--taupe)', marginTop: 12, fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic' }}>mit Liebe geplant ♡</div>
      </footer>
    </div>
  );
}


function GuestMemoriesGallery() {
  const [lightbox, setLightbox] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  // Load from hash (shared link) or localStorage
  const hashData = loadFromHash();
  const allPhotos = hashData?.memories || loadState('memories', []);
  const categories = hashData?.memoryCategories || loadState('memoryCategories', []);
  const approvedPhotos = allPhotos.filter(p => p.approved);

  if (approvedPhotos.length === 0) return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--mocha)' }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
      <p style={{ fontSize: 14 }}>Noch keine Fotos freigegeben — schaut bald wieder vorbei!</p>
    </div>
  );

  // Build category list from photos actually present
  const catIds = [...new Set(approvedPhotos.map(p => p.category).filter(Boolean))];
  const getCat = id => categories.find(c => c.id === id) || { label: id || 'Sonstiges', emoji: '📷' };

  const filtered = activeCategory === 'all' ? approvedPhotos
    : approvedPhotos.filter(p => p.category === activeCategory);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Category filter pills */}
      {catIds.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginBottom: 20 }}>
          <button onClick={() => setActiveCategory('all')}
            style={{ padding: '5px 14px', borderRadius: 30, border: '1px solid var(--sand)', background: activeCategory === 'all' ? 'var(--brown)' : '#fff', color: activeCategory === 'all' ? '#fff' : 'var(--mocha)', fontSize: 12.5, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .15s' }}>
            Alle ({approvedPhotos.length})
          </button>
          {catIds.map(id => {
            const cat = getCat(id);
            const count = approvedPhotos.filter(p => p.category === id).length;
            return (
              <button key={id} onClick={() => setActiveCategory(id)}
                style={{ padding: '5px 14px', borderRadius: 30, border: '1px solid var(--sand)', background: activeCategory === id ? 'var(--brown)' : '#fff', color: activeCategory === id ? '#fff' : 'var(--mocha)', fontSize: 12.5, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .15s' }}>
                {cat.emoji} {cat.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Photo grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
        {filtered.map(photo => {
          const cat = getCat(photo.category);
          return (
            <div key={photo.id}
              onClick={() => setLightbox(photo)}
              style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3', background: 'var(--sand)', cursor: 'pointer', position: 'relative', transition: 'transform .2s', boxShadow: '0 2px 8px rgba(91,61,30,0.1)' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <img src={photo.thumb || photo.url} alt={photo.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.style.display='none'; }}
              />
              {/* Category chip */}
              <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(253,248,242,0.9)', backdropFilter: 'blur(4px)', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 500, color: 'var(--espresso)' }}>
                {cat.emoji} {cat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 18 }}>
            ✕
          </button>
          <img src={lightbox.url} alt={lightbox.name}
            style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }}
            onClick={e => e.stopPropagation()}
          />
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', color: '#fff', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{lightbox.name}</div>
            <div style={{ fontSize: 12, opacity: 0.55, marginTop: 2 }}>
              {getCat(lightbox.category).emoji} {getCat(lightbox.category).label} · von {lightbox.uploader}
            </div>
          </div>
          {/* Prev/Next */}
          {(() => {
            const idx = filtered.findIndex(p => p.id === lightbox.id);
            return <>
              {idx > 0 && <button onClick={e => { e.stopPropagation(); setLightbox(filtered[idx-1]); }}
                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, fontSize: 20, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>}
              {idx < filtered.length-1 && <button onClick={e => { e.stopPropagation(); setLightbox(filtered[idx+1]); }}
                style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, fontSize: 20, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>}
            </>;
          })()}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 40 }}>
      <h2 className="guest-section-title">{title}</h2>
      {sub && <p className="guest-section-sub">{sub}</p>}
      <div className="guest-divider" />
    </div>
  );
}

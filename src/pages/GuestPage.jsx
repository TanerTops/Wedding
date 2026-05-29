import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { loadState, saveState, defaultWedding, defaultTimeline } from '../data/store';
import {
  IconCalendar, IconMapPin, IconMusic, IconGift, IconShirt,
  IconChevronDown, IconCheck, IconArrowRight, IconHeart
} from '@tabler/icons-react';

// ── Guest Page Config stored in localStorage ──────────────────────
const defaultConfig = {
  heroTitle: '',
  heroSubtitle: 'Wir freuen uns, mit euch zu feiern.',
  heroImageUrl: '',
  heroImagePosition: 'center',
  sections: {
    rsvp: true, timeline: true, location: true,
    dresscode: true, music: true, registry: true,
  },
  dresscodeStyle: 'Elegant & Boho',
  dresscodeText: 'Wir wünschen uns elegante Kleidung in warmen Erdtönen. Da wir auch im Freien feiern, gerne mit bequemen Schuhen.',
  dresscodeColors: ['#C4956A','#C4B5A5','#A8B5A0','#D4C4A8','#B8A9C9'],
  rsvpDeadlineOffset: 30,
};

const SECTION_NAV = [
  { id: 'rsvp', label: 'RSVP', icon: IconCalendar },
  { id: 'timeline', label: 'Ablauf', icon: IconCalendar },
  { id: 'location', label: 'Location', icon: IconMapPin },
  { id: 'dresscode', label: 'Dresscode', icon: IconShirt },
  { id: 'music', label: 'Musik', icon: IconMusic },
  { id: 'registry', label: 'Geschenke', icon: IconGift },
];

const TYPE_COLORS = {
  ceremony: '#C4956A', photo: '#A8B5A0', reception: '#C9A884',
  dinner: '#B5A88A', speech: '#B8A9C9', dance: '#C4B5A5', party: '#9B8EA0',
};
const TYPE_LABELS = {
  ceremony: 'Zeremonie', photo: 'Fotos', reception: 'Empfang',
  dinner: 'Dinner', speech: 'Reden', dance: 'Tanz', party: 'Party',
};

export default function GuestPage() {
  const { slug } = useParams(); // used for future per-wedding data fetching
  const [active, setActive] = useState('');
  const [rsvpStep, setRsvpStep] = useState(1);
  const [rsvpData, setRsvpData] = useState({ name: '', email: '', attending: '', menu: '', plusOne: false, message: '' });
  const [rsvpDone, setRsvpDone] = useState(false);
  const [songs, setSongs] = useState([{ title: '', artist: '' }]);
  const [songSent, setSongSent] = useState(false);

  const wedding = loadState('wedding', defaultWedding);
  const timeline = loadState('timeline', defaultTimeline);
  const config = loadState('guestPageConfig', defaultConfig);
  const registry = loadState('registry', [
    { id: 1, title: 'Honeymoon-Kasse', desc: 'Beitrag zu unserer Hochzeitsreise', amount: 0, type: 'fund', reserved: false },
    { id: 2, title: 'Küchenmaschine', desc: 'KitchenAid, Farbe: Creme', amount: 399, type: 'item', reserved: false },
    { id: 3, title: 'Abendessen zu zweit', desc: 'Ein schöner Restaurant-Abend', amount: 120, type: 'item', reserved: false },
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

      {/* ── STICKY NAV ─────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(251,247,240,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--sand)', height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px'
      }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontStyle: 'italic', color: 'var(--brown)' }}>
          {wedding.bride} & {wedding.groom}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {activeSections.map(s => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              style={{
                padding: '5px 14px', borderRadius: 30, fontSize: 12.5, border: 'none', cursor: 'pointer',
                background: active === s.id ? 'var(--sand)' : 'transparent',
                color: active === s.id ? 'var(--espresso)' : 'var(--mocha)',
                fontWeight: active === s.id ? 500 : 400, transition: 'all .15s',
                fontFamily: "'DM Sans',sans-serif"
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section id="hero" style={{
        minHeight: '100vh', paddingTop: 58, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden',
        background: config.heroImageUrl
          ? `linear-gradient(rgba(0,0,0,0.28), rgba(0,0,0,0.18)), url(${config.heroImageUrl}) ${config.heroImagePosition}/cover no-repeat`
          : 'linear-gradient(160deg, #FDF8F0 0%, #F0E8D8 50%, #EAE0D0 100%)'
      }}>
        {/* Decorative orbs when no image */}
        {!config.heroImageUrl && <>
          <div style={{ position: 'absolute', width: 500, height: 500, top: -120, right: -100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,149,106,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 380, height: 380, bottom: -80, left: -80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,181,160,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        </>}

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 620, padding: '0 24px' }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20, color: config.heroImageUrl ? 'rgba(255,255,255,0.8)' : 'var(--mocha)' }}>
            Ihr seid herzlich eingeladen
          </div>

          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontStyle: 'italic',
            lineHeight: 1.05, marginBottom: 20, letterSpacing: 1,
            color: config.heroImageUrl ? '#fff' : 'var(--espresso)',
            fontSize: 'clamp(52px, 8vw, 80px)'
          }}>
            {heroTitle}
          </h1>

          <div style={{ width: 60, height: 1, background: config.heroImageUrl ? 'rgba(255,255,255,0.5)' : 'linear-gradient(90deg,transparent,var(--mocha),transparent)', margin: '0 auto 20px' }} />

          {config.heroSubtitle && (
            <p style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 24, color: config.heroImageUrl ? 'rgba(255,255,255,0.88)' : 'var(--mocha)' }}>
              {config.heroSubtitle}
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 30, fontSize: 14, fontWeight: 500, background: config.heroImageUrl ? 'rgba(255,255,255,0.15)' : 'rgba(196,149,106,0.12)', border: '1px solid ' + (config.heroImageUrl ? 'rgba(255,255,255,0.3)' : 'var(--terra)'), color: config.heroImageUrl ? '#fff' : 'var(--terra)' }}>
              <IconCalendar size={15} stroke={1.5} />
              {new Date(wedding.date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 30, fontSize: 14, background: config.heroImageUrl ? 'rgba(255,255,255,0.12)' : 'var(--warm)', border: '1px solid ' + (config.heroImageUrl ? 'rgba(255,255,255,0.2)' : 'var(--sand)'), color: config.heroImageUrl ? 'rgba(255,255,255,0.85)' : 'var(--brown)' }}>
              <IconMapPin size={15} stroke={1.5} />
              {wedding.venue}
            </div>
          </div>

          {days > 0 && config.sections.rsvp !== false && (
            <button
              className="btn btn-primary"
              style={{ fontSize: 15, padding: '11px 28px', background: config.heroImageUrl ? 'rgba(255,255,255,0.2)' : 'var(--brown)', backdropFilter: config.heroImageUrl ? 'blur(8px)' : 'none', border: config.heroImageUrl ? '1px solid rgba(255,255,255,0.4)' : 'none' }}
              onClick={() => scrollTo('rsvp')}
            >
              Jetzt zusagen <IconHeart size={15} stroke={1.5} />
            </button>
          )}

          {days > 0 && (
            <div style={{ marginTop: 14, fontSize: 12, color: config.heroImageUrl ? 'rgba(255,255,255,0.6)' : 'var(--mocha)' }}>
              Bitte antworte bis {deadline.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', animation: 'bounce 2s infinite', opacity: 0.5 }}>
          <IconChevronDown size={24} stroke={1.5} style={{ color: config.heroImageUrl ? '#fff' : 'var(--mocha)' }} />
        </div>
        <style>{`@keyframes bounce { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(6px)} }`}</style>
      </section>

      {/* ── RSVP ──────────────────────────────────────────────── */}
      {config.sections.rsvp !== false && (
        <section id="rsvp" style={{ background: '#fff', padding: '80px 24px' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
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
                  {rsvpData.attending === 'yes' ? 'Eure Zusage ist eingegangen. Wir melden uns bald!' : 'Danke für eure Rückmeldung.'}
                </p>
              </div>
            ) : (
              <div className="card">
                {/* Step indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                  {[1, 2, 3].map((s, i) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: i < 2 ? 1 : 'none' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, transition: 'all .2s', background: rsvpStep > s ? 'var(--sage)' : rsvpStep === s ? 'var(--brown)' : 'var(--sand)', color: rsvpStep >= s ? '#fff' : 'var(--mocha)' }}>
                        {rsvpStep > s ? <IconCheck size={14} stroke={2.5} /> : s}
                      </div>
                      <span style={{ fontSize: 12, color: rsvpStep === s ? 'var(--brown)' : 'var(--mocha)', fontWeight: rsvpStep === s ? 500 : 400 }}>
                        {s === 1 ? 'Teilnahme' : s === 2 ? 'Details' : 'Bestätigung'}
                      </span>
                      {i < 2 && <div style={{ flex: 1, height: 1, background: rsvpStep > s ? 'var(--sage)' : 'var(--sand)', transition: 'background .3s' }} />}
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
                          {['Fleisch', 'Fisch', 'Vegetarisch', 'Vegan'].map(m => <option key={m}>{m}</option>)}
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
                    {[['Name', rsvpData.name], ['Teilnahme', rsvpData.attending === 'yes' ? '✅ Zugesagt' : '❌ Abgesagt'], rsvpData.menu && ['Menü', rsvpData.menu], rsvpData.plusOne && ['Begleitperson', 'Ja +1'], rsvpData.message && ['Nachricht', rsvpData.message]].filter(Boolean).map(([l, v]) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--sand)', fontSize: 13 }}>
                        <span style={{ color: 'var(--mocha)' }}>{l}</span>
                        <span style={{ color: 'var(--espresso)', fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button className="btn btn-secondary" onClick={() => setRsvpStep(2)}>← Zurück</button>
                      <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setRsvpDone(true)}>
                        Absenden 🌸
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── TIMELINE ──────────────────────────────────────────── */}
      {config.sections.timeline !== false && (
        <section id="timeline" style={{ background: 'var(--cream)', padding: '80px 24px' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <SectionHeader title="Tagesablauf" sub="Ein Tag voller schöner Momente" />
            {timeline.map((ev, i) => (
              <div key={ev.id} style={{ display: 'flex', gap: 18 }}>
                <div style={{ width: 54, textAlign: 'right', paddingTop: 4, flexShrink: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--mocha)' }}>{ev.time}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: TYPE_COLORS[ev.type] || 'var(--terra)', boxShadow: `0 0 0 4px ${(TYPE_COLORS[ev.type] || 'var(--terra)')}22`, marginTop: 5, flexShrink: 0 }} />
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
        </section>
      )}

      {/* ── LOCATION ──────────────────────────────────────────── */}
      {config.sections.location !== false && (
        <section id="location" style={{ background: '#fff', padding: '80px 24px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <SectionHeader title="Location & Anreise" sub="Wir freuen uns, euch hier willkommen zu heißen" />
            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
              <div style={{ height: 220, background: 'linear-gradient(135deg, #F2D9B8 0%, #E8D5C0 50%, #D4C4B0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 10 }}>🏰</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: 'var(--espresso)' }}>{wedding.venue}</div>
                </div>
              </div>
              <div style={{ padding: 28 }}>
                <div className="grid-2" style={{ marginBottom: 24 }}>
                  <div>
                    <div className="section-title">Adresse</div>
                    <div style={{ fontSize: 14, color: 'var(--espresso)', lineHeight: 1.8 }}>{wedding.venue}</div>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(wedding.venue)}`} target="_blank" rel="noopener" className="btn btn-secondary btn-sm" style={{ marginTop: 10, display: 'inline-flex' }}>
                      <IconMapPin size={13} stroke={1.5} /> In Google Maps öffnen
                    </a>
                  </div>
                  <div>
                    <div className="section-title">Parken</div>
                    <div style={{ fontSize: 13.5, color: 'var(--mocha)', lineHeight: 1.8 }}>Parkplätze sind direkt vor der Location verfügbar. Bitte rechtzeitig anreisen.</div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--sand)', paddingTop: 20 }}>
                  <div className="section-title" style={{ marginBottom: 12 }}>Unterkunft in der Nähe</div>
                  <div className="grid-2">
                    {[{ name: 'Hotel Waldblick', dist: '2 km', price: 'ab 89 €/Nacht' }, { name: 'Gasthof Zur Eiche', dist: '3 km', price: 'ab 65 €/Nacht' }].map(h => (
                      <div key={h.name} style={{ background: 'var(--warm)', borderRadius: 12, padding: 14, border: '1px solid var(--sand)' }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--espresso)' }}>{h.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--mocha)', marginTop: 3 }}>{h.dist} · {h.price}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── DRESSCODE ─────────────────────────────────────────── */}
      {config.sections.dresscode !== false && (
        <section id="dresscode" style={{ background: 'var(--warm)', padding: '80px 24px' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <SectionHeader title="Dresscode" sub="Damit wir zusammen wunderschöne Erinnerungen schaffen" />
            <div className="card" style={{ textAlign: 'center', padding: '36px 32px' }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, color: 'var(--espresso)', marginBottom: 10, fontStyle: 'italic' }}>
                {config.dresscodeStyle}
              </div>
              <p style={{ fontSize: 14, color: 'var(--mocha)', lineHeight: 1.8, maxWidth: 380, margin: '0 auto 28px' }}>
                {config.dresscodeText}
              </p>
              <div className="section-title" style={{ textAlign: 'center', marginBottom: 16 }}>Empfohlene Farben</div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                {(config.dresscodeColors || defaultConfig.dresscodeColors).map((col, i) => {
                  const names = ['Terrakotta', 'Sand', 'Salbei', 'Beige', 'Lavendel'];
                  return (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: col, border: '2px solid var(--sand)', margin: '0 auto 6px' }} />
                      <div style={{ fontSize: 11, color: 'var(--mocha)' }}>{names[i] || ''}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── MUSIC ─────────────────────────────────────────────── */}
      {config.sections.music !== false && (
        <section id="music" style={{ background: '#fff', padding: '80px 24px' }}>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <SectionHeader title="Musikwünsche" sub="Welche Songs bringen euch auf die Tanzfläche?" />
            {songSent ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div>
                <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: 'var(--espresso)' }}>Vielen Dank!</h3>
                <p style={{ color: 'var(--mocha)', marginTop: 6 }}>Eure Musikwünsche sind eingegangen.</p>
              </div>
            ) : (
              <>
                <div className="form-group"><label className="form-label">Euer Name</label><input className="input" placeholder="Damit der DJ weiß, von wem der Wunsch kommt" /></div>
                {songs.map((song, i) => (
                  <div key={i} style={{ background: 'var(--warm)', borderRadius: 12, padding: 14, marginBottom: 10, border: '1px solid var(--sand)' }}>
                    <div style={{ fontSize: 11, color: 'var(--mocha)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Song {i + 1}</div>
                    <div className="form-group"><input className="input" placeholder="Songtitel" value={song.title} onChange={e => { const s = [...songs]; s[i].title = e.target.value; setSongs(s); }} /></div>
                    <input className="input" placeholder="Künstler" value={song.artist} onChange={e => { const s = [...songs]; s[i].artist = e.target.value; setSongs(s); }} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setSongs([...songs, { title: '', artist: '' }])}>
                    <IconPlus size={13} stroke={2} /> Weiterer Song
                  </button>
                  <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSongSent(true)}>
                    Absenden <IconMusic size={14} stroke={1.5} />
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ── REGISTRY ──────────────────────────────────────────── */}
      {config.sections.registry !== false && (
        <section id="registry" style={{ background: 'var(--cream)', padding: '80px 24px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <SectionHeader title="Geschenkeliste" sub="Eure Anwesenheit ist das schönste Geschenk. Wenn ihr uns eine Freude machen möchtet:" />
            <div className="grid-3">
              {registry.map(item => (
                <div key={item.id} className="card" style={{ overflow: 'hidden', padding: 0, transition: 'transform .2s, box-shadow .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(91,61,30,.14)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}>
                  <div style={{ height: 110, background: 'linear-gradient(135deg, var(--terra-light), var(--sage-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>
                    {item.type === 'fund' ? '✈️' : '🎁'}
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--espresso)', marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--mocha)', marginBottom: 10, lineHeight: 1.5 }}>{item.desc}</div>
                    {item.amount > 0 && <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--terra)', marginBottom: 10 }}>{item.amount.toLocaleString('de-DE')} €</div>}
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

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer style={{ background: 'var(--warm)', borderTop: '1px solid var(--sand)', padding: '36px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontStyle: 'italic', color: 'var(--brown)', marginBottom: 6 }}>
          {wedding.bride} & {wedding.groom}
        </div>
        <div style={{ fontSize: 13, color: 'var(--mocha)' }}>
          {new Date(wedding.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div style={{ fontSize: 12, color: 'var(--taupe)', marginTop: 12, fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic' }}>
          mit Liebe geplant ♡
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 40 }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 38, fontWeight: 300, color: 'var(--espresso)', marginBottom: 8 }}>{title}</h2>
      {sub && <p style={{ fontSize: 14, color: 'var(--mocha)', lineHeight: 1.6 }}>{sub}</p>}
      <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg,transparent,var(--mocha),transparent)', margin: '14px auto 0' }} />
    </div>
  );
}

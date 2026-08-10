import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { loadState, defaultWedding, defaultTimeline } from '../data/store';
import { submitRSVP, uploadPhoto, submitScheduleRequest, submitMusicWish, getGuestPageData, upsertRegistryItem, verifyGuestCode } from '../lib/db';
import {
  IconCalendar, IconMapPin, IconMusic, IconGift, IconShirt,
  IconChevronDown, IconCheck, IconArrowRight, IconHeart, IconPlus, IconUpload, IconLock
} from '@tabler/icons-react';

// Guest page loads data from Supabase (or localStorage fallback)

const defaultConfig = {
  heroTitle: '',
  heroSubtitle: 'Wir freuen uns, mit euch zu feiern.',
  heroImageUrl: '',
  heroImagePosition: 'center',
  sections: { rsvp: true, timeline: true, location: true, dresscode: true, music: true, registry: true, info: true },
  dresscodeStyle: 'Elegant & Boho',
  dresscodeText: 'Wir wünschen uns elegante Kleidung in warmen Erdtönen. Da wir auch im Freien feiern, gerne mit bequemen Schuhen.',
  dresscodeColors: ['#C4956A','#C4B5A5','#A8B5A0','#D4C4A8','#B8A9C9'],
  generalInfoTitle: 'Gut zu wissen',
  generalInfoText: '',
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
  { id: 'info', label: 'Infos' },
  { id: 'dresscode', label: 'Dresscode' },
  { id: 'music', label: 'Musik' },
  { id: 'registry', label: 'Geschenke' },
  { id: 'schedule', label: 'Programm' },
  { id: 'memories', label: 'Erinnerungen' },
];

export default function GuestPage() {
  const { slug } = useParams();

  // ── UI state ────────────────────────────────────────────────────
  const [active, setActive] = useState('');
  const [rsvpStep, setRsvpStep] = useState(1);
  const [rsvpData, setRsvpData] = useState({ name: '', email: '', attending: '', menu: '', plusOne: false, message: '', companions: '' });
  const [rsvpDone, setRsvpDone] = useState(false);
  const [songs, setSongs] = useState([{ title: '', artist: '' }]);
  const [senderName, setSenderName] = useState('');
  const [songSent, setSongSent] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploads, setUploads] = useState([]);
  const [uploadDone, setUploadDone] = useState(false);
  const [scheduleSubmitted, setScheduleSubmitted] = useState(false);
  const [reservedItems, setReservedItems] = useState([]);
  const [reservingId, setReservingId] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({ name: '', slotId: '', type: '', description: '', duration: '' });
  const [inviteCode, setInviteCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeChecking, setCodeChecking] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);

  // ── Data loading ─────────────────────────────────────────────────
  const [pageData, setPageData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    getGuestPageData(slug).then(({ data }) => {
      if (data) setPageData(data);
      setDataLoading(false);
    });
  }, []);

  // ── Derived data (safe with fallbacks) ───────────────────────────
  const wedding  = pageData?.wedding  || loadState('wedding', defaultWedding);
  const timeline = pageData?.timeline || loadState('timeline', defaultTimeline);
  const config   = pageData?.config   || loadState('guestPageConfig', defaultConfig);
  const registry = pageData?.registry || loadState('registry', [
    { id: 1, title: 'Honeymoon-Kasse',     desc: 'Beitrag zu unserer Hochzeitsreise', amount: 0,   type: 'fund' },
    { id: 2, title: 'Küchenmaschine',      desc: 'KitchenAid, Farbe: Creme',          amount: 399, type: 'item' },
    { id: 3, title: 'Abendessen zu zweit', desc: 'Ein schöner Restaurant-Abend',      amount: 120, type: 'item' },
  ]);
  const heroTitle    = config?.heroTitle || `${wedding?.bride || ''} & ${wedding?.groom || ''}`;
  const days         = Math.ceil((new Date(wedding?.date || Date.now()) - new Date()) / 86400000);
  const deadline     = new Date(new Date(wedding?.date || Date.now()).getTime() - ((config?.rsvpDeadlineOffset || 30) * 86400000));
  const activeSections = SECTION_NAV.filter(s => (config?.sections || {})[s.id] !== false);

  // ── Scroll observer ──────────────────────────────────────────────
  useEffect(() => {
    if (dataLoading) return;
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
      { threshold: 0.3, rootMargin: '-60px 0px 0px 0px' }
    );
    activeSections.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [dataLoading]);

  function scrollTo(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }

  async function verifyCode() {
    const code = inviteCode.trim();
    if (!code) { setCodeError('Bitte Code eingeben.'); return; }
    setCodeChecking(true);
    const { data: match } = await verifyGuestCode(wedding?.user_id, code);
    setCodeChecking(false);
    if (match) {
      setCodeError('');
      setCodeVerified(true);
      setRsvpData(d => ({ ...d, name: match.name, menu: match.menu || '' }));
    } else {
      setCodeVerified(false);
      setCodeError('Code nicht gefunden. Bitte prüfe deine Einladung.');
    }
  }

  async function reserveItem(item) {
    if (item.reserved || reservedItems.includes(item.id) || reservingId === item.id) return;
    setReservingId(item.id);
    await upsertRegistryItem({ ...item, reserved: true });
    setReservedItems(prev => [...prev, item.id]);
    setReservingId(null);
  }

  async function handleFinalSubmit() {
    // Code nur erzwingen, wenn das Paar "Einladungscode erforderlich" aktiviert hat.
    if (config?.requireCode && !codeVerified) {
      setCodeError('Bitte zuerst euren Einladungscode bestätigen.');
      return;
    }
    const { error } = await submitRSVP({
      ...rsvpData,
      plus_one: !!(rsvpData.companions?.trim()),
      companions: rsvpData.companions || '',
      inviteCode: inviteCode.trim() ? inviteCode.trim().toUpperCase() : '',
      userId: wedding?.user_id || '',
    });
    if (!error) setRsvpDone(true);
    else setCodeError('Fehler beim Absenden. Bitte nochmal versuchen.');
  }

  // ── Loading screen ───────────────────────────────────────────────
  if (dataLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #FDF8F0 0%, #F0E8D8 50%, #EAE0D0 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontStyle: 'italic', color: 'var(--espresso)', marginBottom: 8 }}>
            Vince
          </div>
          <div style={{ fontSize: 13, color: 'var(--mocha)' }}>Wird geladen...</div>
        </div>
      </div>
    );
  }


  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', fontFamily: "'DM Sans', sans-serif" }}>

      {/* NAV */}
      <GuestNav
        bride={wedding?.bride} groom={wedding?.groom}
        sections={activeSections} active={active} onNav={scrollTo}
      />

      {/* HERO */}
      <section id="hero" style={{ minHeight: '100vh', paddingTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', background: config?.heroImageUrl ? `linear-gradient(rgba(0,0,0,0.28),rgba(0,0,0,0.18)), url(${config?.heroImageUrl}) ${config?.heroImagePosition}/cover no-repeat` : 'linear-gradient(160deg,#FDF8F0 0%,#F0E8D8 50%,#EAE0D0 100%)' }}>
        {!config?.heroImageUrl && <>
          <div style={{ position: 'absolute', width: 500, height: 500, top: -120, right: -100, borderRadius: '50%', background: 'radial-gradient(circle,rgba(196,149,106,0.18) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 380, height: 380, bottom: -80, left: -80, borderRadius: '50%', background: 'radial-gradient(circle,rgba(168,181,160,0.18) 0%,transparent 70%)', pointerEvents: 'none' }} />
        </>}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 620, padding: '0 24px' }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20, color: config?.heroImageUrl ? 'rgba(255,255,255,0.8)' : 'var(--mocha)' }}>
            Ihr seid herzlich eingeladen
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontStyle: 'italic', lineHeight: 1.05, marginBottom: 20, letterSpacing: 1, color: config?.heroImageUrl ? '#fff' : 'var(--espresso)', fontSize: 'clamp(48px,8vw,80px)' }}>
            {heroTitle}
          </h1>
          <div style={{ width: 60, height: 1, background: config?.heroImageUrl ? 'rgba(255,255,255,0.5)' : 'linear-gradient(90deg,transparent,var(--mocha),transparent)', margin: '0 auto 20px' }} />
          {config?.heroSubtitle && (
            <p style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 24, color: config?.heroImageUrl ? 'rgba(255,255,255,0.88)' : 'var(--mocha)' }}>
              {config?.heroSubtitle}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 30, fontSize: 14, fontWeight: 500, background: config?.heroImageUrl ? 'rgba(255,255,255,0.15)' : 'rgba(196,149,106,0.12)', border: '1px solid ' + (config?.heroImageUrl ? 'rgba(255,255,255,0.3)' : 'rgba(196,149,106,0.4)'), color: config?.heroImageUrl ? '#fff' : 'var(--terra)' }}>
              <IconCalendar size={15} stroke={1.5} />
              {new Date(wedding?.date || Date.now()).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 30, fontSize: 14, background: config?.heroImageUrl ? 'rgba(255,255,255,0.12)' : 'var(--warm)', border: '1px solid ' + (config?.heroImageUrl ? 'rgba(255,255,255,0.2)' : 'var(--sand)'), color: config?.heroImageUrl ? 'rgba(255,255,255,0.85)' : 'var(--brown)' }}>
              <IconMapPin size={15} stroke={1.5} />
              {wedding?.venue}
            </div>
          </div>
          {days > 0 && config?.sections?.['rsvp'] !== false && (
            <button className="btn btn-primary" style={{ fontSize: 15, padding: '11px 28px', background: config?.heroImageUrl ? 'rgba(255,255,255,0.2)' : 'var(--brown)', backdropFilter: config?.heroImageUrl ? 'blur(8px)' : 'none', border: config?.heroImageUrl ? '1px solid rgba(255,255,255,0.4)' : 'none' }} onClick={() => scrollTo('rsvp')}>
              Jetzt zusagen <IconHeart size={15} stroke={1.5} />
            </button>
          )}
          {days > 0 && (
            <div style={{ marginTop: 14, fontSize: 12, color: config?.heroImageUrl ? 'rgba(255,255,255,0.6)' : 'var(--mocha)' }}>
              Bitte antworte bis {deadline.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', animation: 'vbounce 2s infinite', opacity: 0.5 }}>
          <IconChevronDown size={24} stroke={1.5} style={{ color: config?.heroImageUrl ? '#fff' : 'var(--mocha)' }} />
        </div>
        <style>{`@keyframes vbounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(7px)}}`}</style>
      </section>

      {/* RSVP */}
      {config?.sections?.['rsvp'] !== false && (
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
                {config?.requireCode && !codeVerified ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                      <IconLock size={20} stroke={1.5} style={{ color: 'var(--terra)' }} />
                    </div>
                    <h4 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: 'var(--espresso)', marginBottom: 6 }}>Euer Einladungscode</h4>
                    <p style={{ fontSize: 13, color: 'var(--mocha)', marginBottom: 18 }}>Den findet ihr auf eurer Einladung.</p>
                    <div style={{ display: 'flex', gap: 8, maxWidth: 320, margin: '0 auto' }}>
                      <input
                        className="input" placeholder="z.B. MUELLER2026" value={inviteCode}
                        onChange={e => { setInviteCode(e.target.value); setCodeError(''); }}
                        onKeyDown={e => e.key === 'Enter' && verifyCode()}
                        style={{ flex: 1, textAlign: 'center', textTransform: 'uppercase' }}
                      />
                      <button className="btn btn-primary" onClick={verifyCode} disabled={codeChecking}>
                        {codeChecking ? '…' : 'Bestätigen'}
                      </button>
                    </div>
                    {codeError && <div style={{ fontSize: 12, color: '#E57373', marginTop: 10 }}>{codeError}</div>}
                  </div>
                ) : (
                <>
                {/* Steps */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                  {[1,2,3,4].map((s, i) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: i < 3 ? 1 : 'none' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, background: rsvpStep > s ? 'var(--sage)' : rsvpStep === s ? 'var(--brown)' : 'var(--sand)', color: rsvpStep >= s ? '#fff' : 'var(--mocha)' }}>
                        {rsvpStep > s ? <IconCheck size={12} stroke={2.5} /> : s}
                      </div>
                      <span style={{ fontSize: 11, color: rsvpStep === s ? 'var(--brown)' : 'var(--mocha)', fontWeight: rsvpStep === s ? 500 : 400 }}>
                        {s === 1 ? 'Teilnahme' : s === 2 ? 'Details' : 'Bestätigung'}
                      </span>
                      {i < 3 && <div style={{ flex: 1, height: 1, background: rsvpStep > s ? 'var(--sage)' : 'var(--sand)' }} />}
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
                        <label className="form-label">Begleitpersonen (Namen, kommagetrennt)</label>
                        <input className="input" placeholder="z.B. Max Müller, Anna Schmidt" value={rsvpData.companions||''} onChange={e => setRsvpData(d => ({ ...d, companions: e.target.value }))} />
                        <div style={{ fontSize: 11, color: 'var(--mocha)', marginTop: 4 }}>Leer lassen wenn du alleine kommst</div>
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
                    {codeError && <div style={{ fontSize: 12, color: '#E57373', marginBottom: 10 }}>{codeError}</div>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button className="btn btn-secondary" onClick={() => setRsvpStep(2)}>← Zurück</button>
                      <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleFinalSubmit}>
                        Anmeldung absenden ✓
                      </button>
                    </div>
                  </div>
                )}
                </>
                )}

              </div>
            )}
          </div>
        </section>
      )}

      {/* TIMELINE */}
      {config?.sections?.['timeline'] !== false && (
        <section id="timeline" style={{ background: 'var(--cream)' }}>
          <div className="guest-section">
            <SectionHeader title="Tagesablauf" sub="Ein Tag voller schöner Momente" />
            <div style={{ maxWidth: 620, margin: '0 auto' }}>
              {timeline.map((ev, i) => {
                const TYPE_META = {
                  ceremony:      { color: '#C4956A', emoji: '💒', label: 'Trauung'       },
                  'getting-ready':{ color: '#B8A9C9', emoji: '💄', label: 'Getting Ready' },
                  photo:         { color: '#A8B5A0', emoji: '📸', label: 'Fotos'         },
                  reception:     { color: '#C9A884', emoji: '🥂', label: 'Empfang'       },
                  dinner:        { color: '#8B9E7A', emoji: '🍽️', label: 'Dinner'       },
                  party:         { color: '#C4B5A5', emoji: '🎉', label: 'Feier'         },
                  speech:        { color: '#9B8EA0', emoji: '🎤', label: 'Reden'         },
                  logistics:     { color: '#B5A88A', emoji: '📋', label: 'Organisation'  },
                };
                const meta = TYPE_META[ev.type] || { color: 'var(--terra)', emoji: '✨', label: ev.type };
                const fmt = t => { try { const [h,m]=t.split(':'); const d=new Date(2000,0,1,+h,+m); return d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}); } catch { return t||''; } };
                const dur = ev.endTime ? (() => { const m = (parseInt(ev.endTime.split(':')[0])*60+parseInt(ev.endTime.split(':')[1]||0)) - (parseInt(ev.time.split(':')[0])*60+parseInt(ev.time.split(':')[1]||0)); if (m<=0) return ''; const h=Math.floor(m/60); const min=m%60; return h>0?`${h}h${min>0?` ${min}min`:''}` : `${min} min`; })() : '';
                const isLast = i === timeline.length - 1;

                return (
                  <div key={ev.id || i} style={{ display: 'flex', gap: 0 }}>
                    {/* Time */}
                    <div style={{ width: 64, flexShrink: 0, paddingTop: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--mocha)' }}>{fmt(ev.time)}</span>
                      {ev.endTime && <div style={{ fontSize: 10, color: 'var(--taupe)', marginTop: 1 }}>{fmt(ev.endTime)}</div>}
                    </div>
                    {/* Dot + line */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                      <div style={{ width: 13, height: 13, borderRadius: '50%', background: meta.color, boxShadow: `0 0 0 4px ${meta.color}22`, marginTop: 5, flexShrink: 0 }} />
                      {!isLast && <div style={{ width: 1.5, flex: 1, background: 'var(--sand)', minHeight: 26 }} />}
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, paddingBottom: 22, paddingLeft: 10 }}>
                      <div className="card" style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: meta.color, fontWeight: 600, marginBottom: 5 }}>
                          <span>{meta.emoji}</span> {meta.label}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--espresso)', marginBottom: 3 }}>{ev.title}</div>
                        {ev.loc && (
                          <div style={{ fontSize: 12, color: 'var(--mocha)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <IconMapPin size={12} stroke={1.5} /> {ev.loc}
                          </div>
                        )}
                        {ev.desc && <div style={{ fontSize: 12.5, color: 'var(--mocha)', lineHeight: 1.5, marginBottom: 6 }}>{ev.desc}</div>}
                        {dur && (
                          <div style={{ fontSize: 11, color: 'var(--taupe)', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <IconCalendar size={11} stroke={1.5} /> {dur}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* SCHEDULE — programme slot requests */}
      {config.sections?.schedule !== false && (
        <section id="schedule" style={{ background: '#fff' }}>
          <div className="guest-section">
            <SectionHeader
              title={config?.scheduleTitle || 'Programmwünsche'}
              sub={config?.scheduleSubtitle || 'Habt ihr eine Rede, einen Auftritt oder eine Überraschung geplant? Meldet euch hier!'}
            />

            {scheduleSubmitted ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
                <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, color: 'var(--espresso)', marginBottom: 8 }}>Vielen Dank!</h3>
                <p style={{ color: 'var(--mocha)', fontSize: 14 }}>Euer Programmwunsch ist eingegangen. Wir melden uns!</p>
              </div>
            ) : (
              <div style={{ maxWidth: 520, margin: '0 auto' }}>
                {/* Slot cards */}
                {(config?.scheduleSlots || []).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                    {(config?.scheduleSlots || []).map(slot => (
                      <div key={slot.id}
                        onClick={() => setScheduleForm(f => ({ ...f, slotId: slot.id === f.slotId ? '' : slot.id }))}
                        style={{
                          padding: '14px 18px', borderRadius: 14, cursor: 'pointer', transition: 'all .15s',
                          border: `2px solid ${scheduleForm.slotId === slot.id ? 'var(--terra)' : 'var(--sand)'}`,
                          background: scheduleForm.slotId === slot.id ? '#FDF5E8' : '#fff',
                        }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--espresso)' }}>{slot.label}</div>
                            <div style={{ fontSize: 12, color: 'var(--mocha)', marginTop: 2 }}>
                              🕐 {slot.time} · max. {slot.maxMin} Minuten
                            </div>
                          </div>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${scheduleForm.slotId === slot.id ? 'var(--terra)' : 'var(--sand)'}`, background: scheduleForm.slotId === slot.id ? 'var(--terra)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {scheduleForm.slotId === slot.id && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Form */}
                <div className="card" style={{ padding: 22 }}>
                  <div className="form-group">
                    <label className="form-label">Euer Name *</label>
                    <input className="input" placeholder="Vollständiger Name" value={scheduleForm.name} onChange={e => setScheduleForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  {(!config?.scheduleSlots || config?.scheduleSlots.length === 0) && (
                    <div className="form-group">
                      <label className="form-label">Art des Programmpunkts</label>
                      <input className="input" placeholder="z.B. Rede, Spiel, Auftritt" value={scheduleForm.type} onChange={e => setScheduleForm(f => ({ ...f, type: e.target.value }))} />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Beschreibung</label>
                    <textarea className="input" rows={3} placeholder="Was habt ihr geplant? Wie können wir helfen?" value={scheduleForm.description} onChange={e => setScheduleForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Benötigte Zeit (Minuten)</label>
                    <input className="input" type="number" min="1" max="60" placeholder="5" value={scheduleForm.duration} onChange={e => setScheduleForm(f => ({ ...f, duration: e.target.value }))} />
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                    onClick={async () => {
                      if (!scheduleForm.name.trim()) return;
                      const slot = (config?.scheduleSlots||[]).find(s => s.id === scheduleForm.slotId);
                      await submitScheduleRequest({
                        name: scheduleForm.name,
                        slot_id: scheduleForm.slotId || '',
                        slot_label: slot?.label || scheduleForm.type || '',
                        description: scheduleForm.description,
                        duration: parseInt(scheduleForm.duration) || 5,
                      });
                      setScheduleSubmitted(true);
                    }}
                    disabled={!scheduleForm.name.trim()}
                  >
                    Anfrage senden 🎊
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}


      {/* LOCATION </section>
      )}

      {/* LOCATION */}
      {config?.sections?.['location'] !== false && (
        <section id="location" style={{ background: '#fff' }}>
          <div className="guest-section">
            <SectionHeader title="Location & Anreise" sub="Wir freuen uns, euch hier willkommen zu heißen" />
            <div className="card" style={{ overflow: 'hidden', padding: 0, maxWidth: 720, margin: '0 auto' }}>
              {/* Hero */}
              <div style={{ height: 180, background: 'linear-gradient(135deg,#F2D9B8 0%,#E8D5C0 50%,#D4C4B0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🏰</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: 'var(--espresso)' }}>
                    {wedding?.venue || 'Location'}
                  </div>
                </div>
              </div>
              <div style={{ padding: 24 }}>
                <div className="grid-2" style={{ marginBottom: 16 }}>
                  <div>
                    <div className="section-title" style={{ marginBottom: 8 }}>Adresse</div>
                    <div style={{ fontSize: 14, color: 'var(--espresso)', lineHeight: 1.8 }}>
                      <div>{wedding?.venue}</div>
                      {wedding?.venue_address && <div style={{ fontSize: 13, color: 'var(--mocha)' }}>{wedding.venue_address}</div>}
                    </div>
                    {(wedding?.venue || wedding?.venue_address) && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(wedding.venue_address || wedding.venue)}`}
                        target="_blank" rel="noopener" className="btn btn-secondary btn-sm" style={{ marginTop: 10, display: 'inline-flex' }}>
                        <IconMapPin size={13} stroke={1.5} /> Google Maps
                      </a>
                    )}
                  </div>
                  <div>
                    {(wedding?.venue_phone || wedding?.venue_contact) && (
                      <>
                        <div className="section-title" style={{ marginBottom: 8 }}>Kontakt</div>
                        {wedding.venue_phone && <div style={{ fontSize: 13, color: 'var(--mocha)' }}>📞 {wedding.venue_phone}</div>}
                        {wedding.venue_contact && <div style={{ fontSize: 13, color: 'var(--mocha)' }}>✉️ {wedding.venue_contact}</div>}
                      </>
                    )}
                  </div>
                </div>
                {wedding?.venue_notes && (
                  <div style={{ fontSize: 13, color: 'var(--mocha)', background: 'var(--warm)', padding: '12px 16px', borderRadius: 10, lineHeight: 1.7 }}>
                    {wedding.venue_notes}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* GENERAL INFO */}
      {config?.sections?.['info'] !== false && config?.generalInfoText && (
        <section id="info" style={{ background: '#fff' }}>
          <div className="guest-section">
            <SectionHeader title={config?.generalInfoTitle || 'Gut zu wissen'} sub="Alles Wichtige auf einen Blick" />
            <div className="card" style={{ maxWidth: 640, margin: '0 auto', padding: '32px 36px' }}>
              <p style={{ fontSize: 14.5, color: 'var(--espresso)', lineHeight: 1.9, whiteSpace: 'pre-wrap', margin: 0 }}>{config.generalInfoText}</p>
            </div>
          </div>
        </section>
      )}

      {/* DRESSCODE */}
      {config?.sections?.['dresscode'] !== false && (
        <section id="dresscode" style={{ background: 'var(--warm)' }}>
          <div className="guest-section">
            <SectionHeader title="Dresscode" sub="Damit wir zusammen wunderschöne Erinnerungen schaffen" />
            <div className="card" style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: '36px 32px' }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: 'var(--espresso)', marginBottom: 10, fontStyle: 'italic' }}>{config?.dresscodeStyle}</div>
              <p style={{ fontSize: 14, color: 'var(--mocha)', lineHeight: 1.8, maxWidth: 380, margin: '0 auto 28px' }}>{config?.dresscodeText}</p>
              <div className="section-title" style={{ textAlign: 'center', marginBottom: 16 }}>Empfohlene Farben</div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['Terrakotta','Sand','Salbei','Beige','Lavendel'].map((name, i) => (
                  <div key={name} style={{ textAlign: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: (config?.dresscodeColors||[])[i]||'#DDD3C0', border: '2px solid var(--sand)', margin: '0 auto 6px' }} />
                    <div style={{ fontSize: 11, color: 'var(--mocha)' }}>{name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* MUSIC */}
      {config?.sections?.['music'] !== false && (
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
                <div className="form-group"><label className="form-label">Euer Name</label><input className="input" placeholder="Damit der DJ weiß, von wem der Wunsch kommt" value={senderName} onChange={e => setSenderName(e.target.value)} /></div>
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
                  <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={async () => {
                    const validSongs = songs.filter(s => s.title.trim());
                    if (!validSongs.length) return;
                    const { error } = await submitMusicWish({ sender_name: senderName, songs: validSongs });
                    if (!error) setSongSent(true);
                  }}>
                    Absenden <IconMusic size={14} stroke={1.5} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* REGISTRY */}
      {config?.sections?.['registry'] !== false && (
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
                    <button 
                      className={`btn btn-sm ${(item.reserved || reservedItems.includes(item.id)) ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ width: '100%', justifyContent: 'center', opacity: (item.reserved || reservedItems.includes(item.id)) ? 0.7 : 1 }}
                      onClick={() => !item.reserved && !reservedItems.includes(item.id) && reserveItem(item)}
                      disabled={item.reserved || reservedItems.includes(item.id) || reservingId === item.id}
                    >
                      {reservingId === item.id ? '...' : (item.reserved || reservedItems.includes(item.id)) ? '✓ Reserviert' : (item.type === 'fund' ? 'Beitragen' : 'Reservieren')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}


      {/* MEMORIES — guest photo upload */}
      {config?.sections?.['memories'] !== false && (
        <section id="memories" style={{ background: 'var(--warm)' }}>
          <div className="guest-section">
            <SectionHeader title="Eure Erinnerungen" sub="Teilt eure schönsten Fotos vom großen Tag mit uns!" />

            {/* Upload form */}
            <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: 'var(--espresso)', marginBottom: 4 }}>Foto hochladen</div>
              <p style={{ fontSize: 13, color: 'var(--mocha)', marginBottom: 16, lineHeight: 1.6 }}>
                Ladet eure Fotos hoch — wir prüfen sie und schalten die schönsten für alle sichtbar.
              </p>
              {uploadDone === 'error' ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>😕</div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: 'var(--espresso)' }}>Leider hat das nicht geklappt</div>
                  <div style={{ fontSize: 13, color: 'var(--mocha)', marginTop: 6, marginBottom: 16 }}>Bitte prüft, ob es sich um Bilddateien handelt, und versucht es nochmal.</div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setUploadDone(false)}>Nochmal versuchen</button>
                </div>
              ) : uploadDone === true ? (
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
                    onClick={async () => {
                    if (!uploads.length) return;
                    setUploadDone('uploading');
                    let success = true;
                    for (const file of uploads) {
                      const { error } = await uploadPhoto(file, uploadName || 'Gast', 'guest');
                      if (error) { success = false; }
                    }
                    setUploadDone(success ? true : 'error');
                  }}
                    disabled={uploads.length === 0 || uploadDone === 'uploading'}
                  >
                    <IconUpload size={15} stroke={2} /> {uploadDone === 'uploading' ? 'Wird hochgeladen...' : 'Fotos einreichen'}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer style={{ background: 'var(--warm)', borderTop: '1px solid var(--sand)', padding: '36px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontStyle: 'italic', color: 'var(--brown)', marginBottom: 6 }}>{wedding?.bride} & {wedding?.groom}</div>
        <div style={{ fontSize: 13, color: 'var(--mocha)' }}>{new Date(wedding?.date || Date.now()).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div style={{ fontSize: 12, color: 'var(--taupe)', marginTop: 12, fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic' }}>mit Liebe geplant ♡</div>
      </footer>
    </div>
  );
}


// ── Guest page nav with mobile bottom sheet ──────────────────────
function GuestNav({ bride, groom, sections, active, onNav }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function handleNav(id) {
    onNav(id);
    setMenuOpen(false);
  }

  return (
    <>
      {/* Desktop & tablet sticky top nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(251,247,240,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--sand)', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontStyle: 'italic', color: 'var(--brown)', flexShrink: 0 }}>
          {bride} & {groom}
        </div>

        {/* Desktop links */}
        <div style={{ display: 'flex', gap: 2, flexWrap: 'nowrap', overflow: 'hidden' }} className="guest-nav-links">
          {sections.map(s => (
            <button key={s.id} onClick={() => handleNav(s.id)}
              style={{
                padding: '5px 11px', borderRadius: 30, fontSize: 12, border: 'none', cursor: 'pointer',
                background: active === s.id ? 'var(--sand)' : 'transparent',
                color: active === s.id ? 'var(--espresso)' : 'var(--mocha)',
                fontWeight: active === s.id ? 500 : 400,
                transition: 'all .15s', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap',
              }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            display: 'none', border: 'none', background: 'var(--warm)', borderRadius: 10,
            padding: '6px 10px', cursor: 'pointer', color: 'var(--brown)', fontSize: 18,
            flexShrink: 0,
          }}
          className="guest-nav-burger"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile menu sheet */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 198, background: 'rgba(91,61,30,0.15)' }} />
          <div style={{
            position: 'fixed', top: 56, left: 0, right: 0, zIndex: 199,
            background: 'rgba(251,247,240,0.98)', backdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--sand)',
            padding: '12px 16px 16px',
            boxShadow: '0 4px 24px rgba(91,61,30,0.12)',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {sections.map(s => (
                <button key={s.id} onClick={() => handleNav(s.id)}
                  style={{
                    padding: '11px 14px', borderRadius: 12, border: `1px solid ${active === s.id ? 'var(--terra)' : 'var(--sand)'}`,
                    background: active === s.id ? 'var(--sand)' : '#fff',
                    color: active === s.id ? 'var(--espresso)' : 'var(--mocha)',
                    fontWeight: active === s.id ? 600 : 400, fontSize: 13.5,
                    cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                    textAlign: 'left', transition: 'all .15s',
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 640px) {
          .guest-nav-links { display: none !important; }
          .guest-nav-burger { display: flex !important; }
        }
      `}</style>
    </>
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

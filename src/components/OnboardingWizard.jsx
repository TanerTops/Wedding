import { useState } from 'react';
import { IconArrowRight, IconArrowLeft, IconX, IconCheck } from '@tabler/icons-react';
import { saveWedding, getWedding } from '../lib/db';
import { saveState } from '../data/store';

const STEPS = [
  { id: 'date',      title: 'Wann ist euer großer Tag?',         subtitle: 'Das Datum könnt ihr jederzeit in den Einstellungen ändern.' },
  { id: 'partner',   title: 'Wie heißt euer Partner?',           subtitle: 'Die Namen werden für die Aufgaben-Zuweisung genutzt.' },
  { id: 'budget',    title: 'Was ist euer ungefähres Budget?',    subtitle: 'Nur eine grobe Schätzung — ihr könnt es später anpassen.' },
  { id: 'guests',    title: 'Wie viele Gäste plant ihr?',        subtitle: 'Hilft euch bei der Planung — kein fixer Wert.' },
  { id: 'witnesses', title: 'Habt ihr schon Trauzeugen?',        subtitle: 'Optional — könnt ihr auch später in den Einstellungen eintragen.' },
];

const BUDGET_OPTIONS = [
  { label: 'Unter 10.000 €',    value: 8000  },
  { label: '10.000 – 20.000 €', value: 15000 },
  { label: '20.000 – 35.000 €', value: 27000 },
  { label: '35.000 – 50.000 €', value: 42000 },
  { label: 'Über 50.000 €',     value: 60000 },
  { label: 'Noch nicht sicher', value: 18000 },
];

const GUEST_OPTIONS = [
  { label: 'Bis 30',     value: 25  },
  { label: '30 – 60',    value: 45  },
  { label: '60 – 100',   value: 80  },
  { label: '100 – 150',  value: 125 },
  { label: 'Über 150',   value: 175 },
  { label: 'Noch offen', value: 80  },
];

export default function OnboardingWizard({ onComplete, wedding }) {
  const [step, setStep]   = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm]   = useState({
    date:           wedding?.date || '',
    noDate:         false,
    bride:          wedding?.bride || '',
    groom:          wedding?.groom || '',
    budget:         wedding?.budget || null,
    guestCount:     null,
    witnessBride:   wedding?.witness_bride || '',
    witnessGroom:   wedding?.witness_groom || '',
  });

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const pct     = Math.round(((step) / STEPS.length) * 100);

  function canProceed() {
    if (current.id === 'date')      return form.noDate || !!form.date;
    if (current.id === 'partner')   return !!form.bride?.trim() && !!form.groom?.trim();
    if (current.id === 'budget')    return form.budget !== null;
    if (current.id === 'guests')    return form.guestCount !== null;
    if (current.id === 'witnesses') return true; // always optional
    return true;
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const { data: existing } = await getWedding();
      const updated = {
        ...(existing || {}),
        bride:          form.bride  || existing?.bride  || 'Braut',
        groom:          form.groom  || existing?.groom  || 'Bräutigam',
        date:           form.noDate ? (existing?.date || '2026-12-31') : (form.date || existing?.date || '2026-12-31'),
        budget:         form.budget  || existing?.budget || 18000,
        witness_bride:  form.witnessBride  || '',
        witness_groom:  form.witnessGroom  || '',
        notes:          existing?.notes || '',
        venue:          existing?.venue || '',
      };
      await saveWedding(updated);
      saveState('wedding', updated);
      // Mark wizard as done
      saveState('onboardingWizardDone', true);
      window.dispatchEvent(new Event('weddingUpdated'));
    } catch (e) {
      console.error('Wizard save error:', e);
    }
    setSaving(false);
    onComplete();
  }

  function next() {
    if (!canProceed()) return;
    if (isLast) { handleFinish(); return; }
    setStep(s => s + 1);
  }

  function back() { setStep(s => Math.max(0, s - 1)); }

  function skip() {
    if (isLast) { handleFinish(); return; }
    setStep(s => s + 1);
  }

  return (
    <div style={{
      position:       'fixed',
      inset:          0,
      zIndex:         600,
      background:     'rgba(91,61,30,0.25)',
      backdropFilter: 'blur(6px)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        16,
    }}>
      <div style={{
        background:    '#FDF8F2',
        borderRadius:  24,
        width:         '100%',
        maxWidth:      480,
        maxHeight:     '90vh',
        overflowY:     'auto',
        boxShadow:     '0 24px 80px rgba(91,61,30,0.2)',
        border:        '1px solid var(--sand)',
      }}>

        {/* Header */}
        <div style={{ padding:'24px 28px 0', borderBottom:'1px solid var(--sand)', paddingBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:13, color:'var(--mocha)', letterSpacing:2, textTransform:'uppercase', marginBottom:4 }}>
                Schritt {step + 1} von {STEPS.length}
              </div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, color:'var(--espresso)', fontStyle:'italic', lineHeight:1.2 }}>
                {current.title}
              </div>
              <div style={{ fontSize:12.5, color:'var(--mocha)', marginTop:6, lineHeight:1.5 }}>
                {current.subtitle}
              </div>
            </div>
            <button
              onClick={skip}
              className="btn-icon"
              style={{ flexShrink:0, marginLeft:12 }}
              title="Überspringen"
            >
              <IconX size={14} stroke={2}/>
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ height:4, background:'var(--sand)', borderRadius:4, overflow:'hidden' }}>
            <div style={{ width:`${pct}%`, height:'100%', background:'var(--terra)', borderRadius:4, transition:'width .3s' }}/>
          </div>
        </div>

        {/* Step content */}
        <div style={{ padding:'28px 28px 24px' }}>

          {/* ── Step: Date ── */}
          {current.id === 'date' && (
            <div>
              <div className="form-group">
                <label className="form-label">Hochzeitsdatum</label>
                <input
                  className="input"
                  type="date"
                  value={form.date}
                  disabled={form.noDate}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={{ opacity: form.noDate ? 0.5 : 1 }}
                />
              </div>
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13.5, color:'var(--brown)', marginTop:4 }}>
                <input
                  type="checkbox"
                  checked={form.noDate}
                  onChange={e => setForm(f => ({ ...f, noDate: e.target.checked, date: e.target.checked ? '' : f.date }))}
                />
                Datum noch nicht festgelegt — als Wunschdatum offen lassen
              </label>
            </div>
          )}

          {/* ── Step: Partner names ── */}
          {current.id === 'partner' && (
            <div>
              <div className="form-group">
                <label className="form-label">Name Braut / Person 1</label>
                <input
                  className="input"
                  placeholder="z.B. Sarah"
                  value={form.bride}
                  onChange={e => setForm(f => ({ ...f, bride: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Name Bräutigam / Person 2</label>
                <input
                  className="input"
                  placeholder="z.B. Tobias"
                  value={form.groom}
                  onChange={e => setForm(f => ({ ...f, groom: e.target.value }))}
                />
              </div>
              <div style={{ fontSize:12, color:'var(--mocha)', marginTop:4, lineHeight:1.5 }}>
                Diese Namen erscheinen in der App und auf der Gästeseite.
              </div>
            </div>
          )}

          {/* ── Step: Budget ── */}
          {current.id === 'budget' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {BUDGET_OPTIONS.map(opt => (
                <div
                  key={opt.label}
                  onClick={() => setForm(f => ({ ...f, budget: opt.value }))}
                  style={{
                    padding:      '14px 16px',
                    borderRadius: 12,
                    border:       `2px solid ${form.budget === opt.value ? 'var(--terra)' : 'var(--sand)'}`,
                    background:   form.budget === opt.value ? '#FDF5E8' : '#fff',
                    cursor:       'pointer',
                    fontSize:     13,
                    fontWeight:   form.budget === opt.value ? 600 : 400,
                    color:        form.budget === opt.value ? 'var(--espresso)' : 'var(--brown)',
                    transition:   'all .15s',
                    textAlign:    'center',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    gap:          8,
                  }}
                >
                  {form.budget === opt.value && <IconCheck size={13} stroke={2.5} style={{ color:'var(--terra)', flexShrink:0 }}/>}
                  {opt.label}
                </div>
              ))}
            </div>
          )}

          {/* ── Step: Guest count ── */}
          {current.id === 'guests' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {GUEST_OPTIONS.map(opt => (
                <div
                  key={opt.label}
                  onClick={() => setForm(f => ({ ...f, guestCount: opt.value }))}
                  style={{
                    padding:      '14px 16px',
                    borderRadius: 12,
                    border:       `2px solid ${form.guestCount === opt.value ? 'var(--terra)' : 'var(--sand)'}`,
                    background:   form.guestCount === opt.value ? '#FDF5E8' : '#fff',
                    cursor:       'pointer',
                    fontSize:     13,
                    fontWeight:   form.guestCount === opt.value ? 600 : 400,
                    color:        form.guestCount === opt.value ? 'var(--espresso)' : 'var(--brown)',
                    transition:   'all .15s',
                    textAlign:    'center',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    gap:          8,
                  }}
                >
                  {form.guestCount === opt.value && <IconCheck size={13} stroke={2.5} style={{ color:'var(--terra)', flexShrink:0 }}/>}
                  {opt.label}
                </div>
              ))}
            </div>
          )}

          {/* ── Step: Witnesses ── */}
          {current.id === 'witnesses' && (
            <div>
              <div className="form-group">
                <label className="form-label">Trauzeuge / Trauzeugin von {form.bride || 'Person 1'}</label>
                <input
                  className="input"
                  placeholder="Name (optional)"
                  value={form.witnessBride}
                  onChange={e => setForm(f => ({ ...f, witnessBride: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Trauzeuge / Trauzeugin von {form.groom || 'Person 2'}</label>
                <input
                  className="input"
                  placeholder="Name (optional)"
                  value={form.witnessGroom}
                  onChange={e => setForm(f => ({ ...f, witnessGroom: e.target.value }))}
                />
              </div>
              <div style={{ fontSize:12, color:'var(--mocha)', marginTop:4, lineHeight:1.5 }}>
                Trauzeugen können Aufgaben zugewiesen bekommen. Ihr könnt sie auch später in den Einstellungen eintragen.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'0 28px 28px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button
            className="btn btn-secondary"
            onClick={back}
            disabled={step === 0}
            style={{ opacity: step === 0 ? 0.4 : 1 }}
          >
            <IconArrowLeft size={14} stroke={2}/> Zurück
          </button>

          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {/* Skip link for optional steps */}
            {(current.id === 'witnesses') && (
              <button
                onClick={skip}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:12.5, color:'var(--mocha)', fontFamily:"'DM Sans',sans-serif", padding:'8px 4px' }}
              >
                Überspringen
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={next}
              disabled={!canProceed() || saving}
              style={{ opacity: !canProceed() ? 0.5 : 1 }}
            >
              {saving ? 'Speichert…' : isLast ? 'Fertigstellen' : 'Weiter'}
              {!saving && !isLast && <IconArrowRight size={14} stroke={2}/>}
              {!saving && isLast && <IconCheck size={14} stroke={2}/>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

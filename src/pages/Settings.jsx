import { useState, useEffect } from 'react';
import {
  IconCopy, IconCheck, IconCamera, IconGripVertical, IconX,
  IconUsers, IconWallet, IconBuildingStore, IconCheckbox, IconClock,
  IconLayoutColumns, IconMapPin, IconMusic, IconGift, IconNotes,
  IconWorldWww, IconPhoto, IconSettings, IconSparkles, IconExternalLink,
} from '@tabler/icons-react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { loadState, saveState, defaultWedding, QUICK_ACTION_CATALOG, DEFAULT_QUICK_ACTIONS, hasFullAccess, FULL_ACCESS_PRICE, STRIPE_PAYMENT_LINK } from '../data/store';
import { saveWedding, deleteAccount, syncLocalToSupabase, getWedding } from '../lib/db';
import { supabase } from '../lib/supabase';

const ICON_MAP = {
  IconUsers, IconWallet, IconBuildingStore, IconCheckbox, IconClock,
  IconLayoutColumns, IconMapPin, IconMusic, IconGift, IconNotes,
  IconWorldWww, IconPhoto, IconSettings,
};

// ── Sortable chip for a selected quick action ──────────────────────
function SortableQuickAction({ id, label, Icon, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={{ ...style, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'var(--warm)', border: '1px solid var(--sand)' }}>
      <span {...attributes} {...listeners} style={{ cursor: 'grab', touchAction: 'none', color: 'var(--taupe)', display: 'flex' }}>
        <IconGripVertical size={15} stroke={1.5} />
      </span>
      {Icon && <Icon size={15} stroke={1.5} style={{ color: 'var(--terra)', flexShrink: 0 }} />}
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--espresso)', flex: 1 }}>{label}</span>
      <button className="btn-icon" style={{ padding: 4 }} onClick={onRemove}><IconX size={13} stroke={1.5} /></button>
    </div>
  );
}

function generateToken() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}

export default function Settings() {
  const [wedding,       setWedding]       = useState(() => loadState('wedding', defaultWedding));
  const [saved,         setSaved]         = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [coAdminEmail,  setCoAdminEmail]  = useState('');
  const [coAdminSending,setCoAdminSending]= useState(false);
  const [coAdminMsg,    setCoAdminMsg]    = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');
  const [copied,        setCopied]        = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [quickActions, setQuickActions] = useState(() => loadState('quickActions', DEFAULT_QUICK_ACTIONS));
  const purchased = hasFullAccess(wedding);

  function toggleQuickAction(id) {
    const updated = quickActions.includes(id)
      ? quickActions.filter(q => q !== id)
      : [...quickActions, id];
    setQuickActions(updated);
    saveState('quickActions', updated);
  }
  function removeQuickAction(id) {
    const updated = quickActions.filter(q => q !== id);
    setQuickActions(updated);
    saveState('quickActions', updated);
  }
  const qaSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 6 } })
  );
  function handleQuickActionDragEnd(evt) {
    const { active, over } = evt;
    if (!over || active.id === over.id) return;
    const oldIndex = quickActions.indexOf(active.id);
    const newIndex = quickActions.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const updated = arrayMove(quickActions, oldIndex, newIndex);
    setQuickActions(updated);
    saveState('quickActions', updated);
  }

  useEffect(() => {
    getWedding().then(({ data }) => {
      if (data) { setWedding(data); saveState('wedding', data); }
    });
  }, []);

  const photographerUrl = wedding.photographer_token
    ? `${window.location.origin}/photographer/${wedding.photographer_token}`
    : null;

  async function handleSave() {
    saveState('wedding', wedding);
    await saveWedding(wedding);
    await syncLocalToSupabase();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    window.dispatchEvent(new Event('weddingUpdated'));
  }

  async function generatePhotographerLink() {
    setGeneratingToken(true);
    const token   = generateToken();
    const updated = { ...wedding, photographer_token: token };
    setWedding(updated);
    saveState('wedding', updated);
    await saveWedding(updated);
    setGeneratingToken(false);
  }

  async function revokePhotographerLink() {
    if (!confirm('Link wirklich widerrufen? Der Fotograf verliert sofort den Zugang.')) return;
    const updated = { ...wedding, photographer_token: null };
    setWedding(updated);
    saveState('wedding', updated);
    await saveWedding(updated);
  }

  function copyLink() {
    if (!photographerUrl) return;
    navigator.clipboard.writeText(photographerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function inviteCoAdmin() {
    if (!coAdminEmail.trim()) return;
    setCoAdminSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: coAdminEmail,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) {
      setCoAdminMsg('Fehler: ' + error.message);
    } else {
      setCoAdminMsg(`✓ Einladungs-Link wurde an ${coAdminEmail} gesendet`);
      setCoAdminEmail('');
    }
    setCoAdminSending(false);
    setTimeout(() => setCoAdminMsg(''), 4000);
  }

  async function handleDeleteAccount() {
    if (confirmDelete !== 'LÖSCHEN') return;
    if (!confirm('Wirklich alles löschen? Das kann nicht rückgängig gemacht werden.')) return;
    setDeleting(true);
    const { error } = await deleteAccount();
    if (error) { alert('Fehler: ' + error.message); setDeleting(false); }
    else window.location.reload();
  }

  return (
    <>
      <div className="topbar">
        <div><h1>Einstellungen</h1><div className="topbar-sub">Hochzeitsdaten & Account</div></div>
        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? '✓ Gespeichert' : 'Speichern'}
        </button>
      </div>

      <div className="page-body">

        {/* Vollversion / Freemium status */}
        <div className="card" style={{ marginBottom:20, ...(purchased ? {} : { background: 'linear-gradient(135deg, #FDF8F0 0%, #F5EDE0 100%)' }) }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:'50%', background: purchased ? 'var(--sage)' : 'var(--warm)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <IconSparkles size={18} stroke={1.5} style={{ color: purchased ? '#fff' : 'var(--terra)' }} />
              </div>
              <div>
                <div className="section-title" style={{ margin:0 }}>{purchased ? 'Vollversion aktiv' : 'Kostenlose Version'}</div>
                <div style={{ fontSize:12.5, color:'var(--mocha)', marginTop:2 }}>
                  {purchased
                    ? 'Ihr habt vollen Zugriff auf alle Planungs-Tools.'
                    : `Freemium: Übersicht, Gäste, Fotoplanung, Budgetrechner. Vollversion einmalig ${FULL_ACCESS_PRICE} €.`}
                </div>
              </div>
            </div>
            {!purchased && (
              <a
                href={wedding?.user_id ? `${STRIPE_PAYMENT_LINK}?client_reference_id=${encodeURIComponent(wedding.user_id)}` : STRIPE_PAYMENT_LINK}
                target="_blank" rel="noopener" className="btn btn-primary btn-sm" style={{ flexShrink:0 }}
              >
                <IconExternalLink size={13} stroke={1.5} /> Jetzt freischalten
              </a>
            )}
          </div>
        </div>

        {/* Wedding data */}
        <div className="card" style={{ marginBottom:20 }}>
          <div className="section-title" style={{ marginBottom:16 }}>Hochzeitsdaten</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Braut</label>
              <input className="input" value={wedding.bride||''} onChange={e => setWedding(w=>({...w,bride:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Bräutigam</label>
              <input className="input" value={wedding.groom||''} onChange={e => setWedding(w=>({...w,groom:e.target.value}))}/>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Datum</label>
              <input className="input" type="date" value={wedding.date||''} onChange={e => setWedding(w=>({...w,date:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="input" placeholder="z.B. Schloss Waldenburg" value={wedding.venue||''} onChange={e => setWedding(w=>({...w,venue:e.target.value}))}/>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Budget (€)</label>
              <input className="input" type="number" value={wedding.budget||''} onChange={e => setWedding(w=>({...w,budget:parseInt(e.target.value)||0}))}/>
            </div>
          </div>

          {/* Witnesses */}
          <div style={{ marginTop:8, paddingTop:16, borderTop:'1px solid var(--sand)' }}>
            <div className="section-title" style={{ marginBottom:12 }}>Trauzeugen</div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Trauzeugin / Trauzeuge von {wedding.bride||'Person 1'}</label>
                <input className="input" placeholder="Name (optional)" value={wedding.witness_bride||''} onChange={e => setWedding(w=>({...w,witness_bride:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Trauzeuge / Trauzeugin von {wedding.groom||'Person 2'}</label>
                <input className="input" placeholder="Name (optional)" value={wedding.witness_groom||''} onChange={e => setWedding(w=>({...w,witness_groom:e.target.value}))}/>
              </div>
            </div>
            <div style={{ fontSize:11, color:'var(--mocha)' }}>Trauzeugen können Aufgaben zugewiesen werden.</div>
          </div>
        </div>

        {/* Photographer link */}
        <div className="card" style={{ marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <IconCamera size={16} stroke={1.5} style={{ color:'var(--terra)' }}/>
            <div className="section-title" style={{ margin:0 }}>Fotografen-Zugang</div>
          </div>
          <p style={{ fontSize:13, color:'var(--mocha)', marginBottom:16, lineHeight:1.6 }}>
            Generiere einen dauerhaften Link für deinen Fotografen. Er kann damit die Fotoplanung einsehen und bearbeiten — ohne Zugang zu Budget, Gästedaten oder anderen Bereichen.
          </p>

          {photographerUrl ? (
            <>
              <div style={{ background:'var(--warm)', borderRadius:10, padding:'10px 14px', marginBottom:12, border:'1px solid var(--sand)', display:'flex', alignItems:'center', gap:10 }}>
                <code style={{ flex:1, fontSize:12, color:'var(--espresso)', wordBreak:'break-all', lineHeight:1.4 }}>
                  {photographerUrl}
                </code>
                <button className="btn btn-secondary btn-sm" style={{ flexShrink:0 }} onClick={copyLink}>
                  {copied ? <><IconCheck size={12} stroke={2}/> Kopiert</> : <><IconCopy size={12} stroke={1.5}/> Kopieren</>}
                </button>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <a
                  href={photographerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  Link öffnen →
                </a>
                <button
                  className="btn btn-sm"
                  style={{ background:'#FEE2E2', color:'#991B1B' }}
                  onClick={revokePhotographerLink}
                >
                  Link widerrufen
                </button>
              </div>
            </>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={generatePhotographerLink}
              disabled={generatingToken}
            >
              <IconCamera size={13} stroke={1.5}/>
              {generatingToken ? 'Wird generiert…' : 'Fotografen-Link generieren'}
            </button>
          )}
        </div>

        {/* Quick actions config */}
        <div className="card" style={{ marginBottom:20 }}>
          <div className="section-title" style={{ marginBottom:4 }}>Schnellaktionen</div>
          <p style={{ fontSize:13, color:'var(--mocha)', marginBottom:16, lineHeight:1.6 }}>
            Wähle, welche Bereiche als Schnellzugriff auf dem Dashboard erscheinen, und ordne sie per Drag &amp; Drop.
          </p>

          {quickActions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--mocha)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>
                Ausgewählt ({quickActions.length})
              </div>
              <DndContext sensors={qaSensors} collisionDetection={closestCenter} onDragEnd={handleQuickActionDragEnd}>
                <SortableContext items={quickActions} strategy={verticalListSortingStrategy}>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {quickActions.map(id => {
                      const item = QUICK_ACTION_CATALOG.find(c => c.id === id);
                      if (!item) return null;
                      return (
                        <SortableQuickAction
                          key={id}
                          id={id}
                          label={item.label}
                          Icon={ICON_MAP[item.iconName]}
                          onRemove={() => removeQuickAction(id)}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          <div style={{ fontSize:11, fontWeight:700, color:'var(--mocha)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>
            Verfügbar
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:8 }}>
            {QUICK_ACTION_CATALOG.filter(item => !quickActions.includes(item.id)).map(item => {
              const Icon = ICON_MAP[item.iconName];
              return (
                <button
                  key={item.id}
                  onClick={() => toggleQuickAction(item.id)}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 10px', borderRadius:10, border:'1px dashed var(--sand)', background:'#fff', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", textAlign:'left' }}
                >
                  {Icon && <Icon size={14} stroke={1.5} style={{ color:'var(--mocha)', flexShrink:0 }} />}
                  <span style={{ fontSize:12.5, color:'var(--brown)' }}>{item.label}</span>
                </button>
              );
            })}
            {QUICK_ACTION_CATALOG.every(item => quickActions.includes(item.id)) && (
              <div style={{ fontSize:12.5, color:'var(--mocha)', gridColumn:'1/-1' }}>Alle Bereiche sind schon ausgewählt.</div>
            )}
          </div>
        </div>

        {/* Co-Admin */}
        <div className="card" style={{ marginBottom:20 }}>
          <div className="section-title" style={{ marginBottom:4 }}>Mitplaner einladen</div>
          <p style={{ fontSize:13, color:'var(--mocha)', marginBottom:16, lineHeight:1.6 }}>
            Lade eine zweite Person ein (z.B. Trauzeugin) — sie bekommt einen Login-Link per Email und kann gemeinsam mit euch planen.
          </p>
          <div style={{ display:'flex', gap:8 }}>
            <input className="input" style={{ flex:1 }} type="email" placeholder="email@beispiel.de" value={coAdminEmail} onChange={e => setCoAdminEmail(e.target.value)} onKeyDown={e => e.key==='Enter'&&inviteCoAdmin()}/>
            <button className="btn btn-primary" onClick={inviteCoAdmin} disabled={coAdminSending}>
              {coAdminSending ? '…' : 'Einladen'}
            </button>
          </div>
          {coAdminMsg && <div style={{ fontSize:13, color:coAdminMsg.startsWith('✓')?'var(--sage)':'#E57373', marginTop:8 }}>{coAdminMsg}</div>}
          <div style={{ fontSize:11, color:'var(--mocha)', marginTop:8 }}>
            ℹ️ Die eingeladene Person muss sich mit der gleichen Email registrieren um Zugang zu erhalten.
          </div>
        </div>

        {/* Danger zone */}
        <div className="card" style={{ border:'1px solid #FECACA' }}>
          <div className="section-title" style={{ marginBottom:4, color:'#991B1B' }}>⚠️ Gefahrenzone</div>
          <p style={{ fontSize:13, color:'var(--mocha)', marginBottom:16, lineHeight:1.6 }}>
            Account und alle Daten unwiderruflich löschen — Gäste, Budget, Zeitplan, Fotos, alles.
          </p>
          <div className="form-group">
            <label className="form-label">Tippe <strong>LÖSCHEN</strong> zur Bestätigung</label>
            <input className="input" placeholder="LÖSCHEN" value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)} style={{ borderColor:confirmDelete==='LÖSCHEN'?'#EF4444':undefined }}/>
          </div>
          <button
            className="btn"
            style={{ background:confirmDelete==='LÖSCHEN'?'#EF4444':'#FEE2E2', color:confirmDelete==='LÖSCHEN'?'#fff':'#991B1B', border:'none', padding:'10px 20px', borderRadius:10, cursor:confirmDelete==='LÖSCHEN'?'pointer':'not-allowed', fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:13 }}
            onClick={handleDeleteAccount}
            disabled={confirmDelete!=='LÖSCHEN'||deleting}
          >
            {deleting ? 'Wird gelöscht...' : 'Account endgültig löschen'}
          </button>
        </div>
      </div>
    </>
  );
}

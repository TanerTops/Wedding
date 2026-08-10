import { useState, useEffect } from 'react';
import { IconCheck, IconClock, IconMapPin, IconUsers, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { supabase } from '../lib/supabase';

const PRIO_COLORS = { high: 'var(--terra)', medium: 'var(--gold)', low: 'var(--sage)' };
const PRIO_LABELS = { high: 'Wichtig', medium: 'Normal', low: 'Optional' };

export default function PhotographerPage() {
  const [wedding,   setWedding]   = useState(null);
  const [guests,    setGuests]    = useState([]);
  const [groups,    setGroups]    = useState([]);
  const [error,     setError]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [modal,     setModal]     = useState(false);
  const [form,      setForm]      = useState({});

  // Extract token from URL path
  const token = window.location.pathname.split('/photographer/')[1]?.split('/')[0];

  useEffect(() => {
    if (!token) { setError('Kein Zugriffslink gefunden.'); setLoading(false); return; }
    load();
  }, [token]);

  async function load() {
    setLoading(true);
    try {
      // Find wedding by token. Sicherheits-Fix: früher wurde die komplette
      // Zeile (inkl. Budget, Notizen, Kaufstatus, Stripe-Session-ID) geladen
      // — nur eine begrenzte, öffentlich unbedenkliche Spaltenauswahl nötig,
      // gleiches Prinzip wie bei getGuestPageData/getMemoriesPageData in db.js.
      const { data: weddingData, error: wErr } = await supabase
        .from('weddings')
        .select('id, user_id, bride, groom, date, venue, venue_address, venue_notes, photographer_token')
        .eq('photographer_token', token)
        .single();

      if (wErr || !weddingData) { setError('Ungültiger oder abgelaufener Link.'); setLoading(false); return; }
      setWedding(weddingData);

      // Load guests (name + group only)
      const { data: guestData } = await supabase
        .from('guests')
        .select('id, name, group_name, status')
        .eq('user_id', weddingData.user_id)
        .eq('is_companion', false)
        .order('name');
      setGuests(guestData || []);

      // Load photo groups
      const { data: groupData } = await supabase
        .from('photo_groups')
        .select('*')
        .eq('user_id', weddingData.user_id)
        .order('created_at');
      setGroups(groupData || []);
    } catch (e) {
      setError('Fehler beim Laden: ' + e.message);
    }
    setLoading(false);
  }

  async function saveGroup(group) {
    setSaving(true);
    const { error } = await supabase
      .from('photo_groups')
      .upsert({ ...group, user_id: wedding.user_id });
    if (error) console.error('Save error:', error);
    setSaving(false);
  }

  async function updateGroups(updated) {
    setGroups(updated);
  }

  async function toggleDone(id) {
    const group = groups.find(g => g.id === id);
    if (!group) return;
    const updated = { ...group, done: !group.done };
    setGroups(groups.map(g => g.id === id ? updated : g));
    await saveGroup(updated);
  }

  async function updateNote(id, note) {
    const group = groups.find(g => g.id === id);
    if (!group) return;
    const updated = { ...group, note };
    setGroups(groups.map(g => g.id === id ? updated : g));
    await saveGroup(updated);
  }

  async function addGuestToGroup(groupId, guestId) {
    const gid = parseInt(guestId) || guestId;
    if (!gid) return;
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const currentGuests = group.guests || [];
    if (currentGuests.includes(gid) || currentGuests.includes(String(gid))) return;
    const updated = { ...group, guests: [...currentGuests, gid] };
    setGroups(groups.map(g => g.id === groupId ? updated : g));
    await saveGroup(updated);
  }

  async function removeGuestFromGroup(groupId, guestId) {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const updated = {
      ...group,
      guests: (group.guests || []).filter(id => id !== guestId && id !== parseInt(guestId) && String(id) !== String(guestId))
    };
    setGroups(groups.map(g => g.id === groupId ? updated : g));
    await saveGroup(updated);
  }

  async function addGroup() {
    if (!form.name?.trim()) return;
    const newGroup = {
      id:          crypto.randomUUID(),
      name:        form.name,
      description: form.description || '',
      location:    form.location    || '',
      priority:    form.priority    || 'medium',
      duration:    parseInt(form.duration) || 1,
      note:        form.note        || '',
      done:        false,
      guests:      [],
      user_id:     wedding.user_id,
    };
    setGroups([...groups, newGroup]);
    await saveGroup(newGroup);
    setModal(false);
    setForm({});
  }

  async function deleteGroup(id) {
    if (!confirm('Gruppe löschen?')) return;
    setGroups(groups.filter(g => g.id !== id));
    await supabase.from('photo_groups').delete().eq('id', id);
  }

  // ── Render states ──
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--cream)' }}>
      <div style={{ textAlign:'center', color:'var(--mocha)', fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontStyle:'italic', marginBottom:8 }}>Wird geladen…</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--cream)', fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ textAlign:'center', maxWidth:400, padding:32 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>📷</div>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, color:'var(--espresso)', marginBottom:8 }}>Zugriff nicht möglich</h2>
        <p style={{ fontSize:14, color:'var(--mocha)', lineHeight:1.6 }}>{error}</p>
      </div>
    </div>
  );

  const done          = groups.filter(g => g.done).length;
  const totalDuration = groups.filter(g => !g.done).reduce((s, g) => s + (g.duration||0), 0);

  return (
    <div style={{ minHeight:'100vh', background:'var(--cream)', fontFamily:"'DM Sans',sans-serif" }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#FDF8F0,#F5EDE0)', borderBottom:'1px solid var(--sand)', padding:'20px 24px', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ maxWidth:720, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontStyle:'italic', color:'var(--espresso)' }}>
              {wedding.bride} & {wedding.groom}
            </div>
            <div style={{ fontSize:12, color:'var(--mocha)', marginTop:2 }}>
              📷 Fotografen-Ansicht · {new Date(wedding.date).toLocaleDateString('de-DE', { day:'numeric', month:'long', year:'numeric' })}
              {saving && <span style={{ marginLeft:8, color:'var(--terra)' }}>· Speichert…</span>}
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm({ priority:'medium', duration:1 }); setModal(true); }}>
            <IconPlus size={13} stroke={2}/> Gruppe
          </button>
        </div>
      </div>

      <div style={{ maxWidth:720, margin:'0 auto', padding:'24px 16px' }}>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Gruppen',  value: groups.length,       color:'var(--mocha)' },
            { label:'Erledigt', value: done,                color:'var(--sage)'  },
            { label:'Zeit ca.', value: `~${totalDuration}m`, color:'var(--terra)' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ borderTopColor:s.color }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Gästeliste readonly */}
        {guests.length > 0 && (
          <div className="card" style={{ marginBottom:20 }}>
            <div className="section-title" style={{ marginBottom:10 }}>Gästeliste</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {guests.map(g => (
                <div key={g.id} style={{ background:'var(--warm)', padding:'4px 12px', borderRadius:20, fontSize:12, border:'1px solid var(--sand)', color:'var(--espresso)' }}>
                  {g.name}
                  {g.group_name && <span style={{ color:'var(--mocha)', marginLeft:5 }}>· {g.group_name}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photo groups */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {groups.map(group => {
            const guestIds    = group.guests || [];
            const groupGuests = guestIds.map(id => guests.find(g => String(g.id) === String(id))).filter(Boolean);
            const availableToAdd = guests.filter(g => !guestIds.some(id => String(id) === String(g.id)));
            const isEditing   = editGroup === group.id;

            return (
              <div key={group.id} className="card" style={{ borderLeft:`4px solid ${PRIO_COLORS[group.priority||'medium']}`, opacity:group.done?0.65:1 }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  {/* Done toggle */}
                  <div onClick={() => toggleDone(group.id)} style={{ width:22, height:22, borderRadius:'50%', border:`2px solid ${group.done?'var(--sage)':'var(--sand)'}`, background:group.done?'var(--sage)':'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, marginTop:2 }}>
                    {group.done && <IconCheck size={12} stroke={3} style={{ color:'#fff' }}/>}
                  </div>

                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                      <div style={{ fontWeight:600, fontSize:15, color:'var(--espresso)', textDecoration:group.done?'line-through':'none' }}>{group.name}</div>
                      <span style={{ fontSize:10, fontWeight:600, color:PRIO_COLORS[group.priority||'medium'], background:PRIO_COLORS[group.priority||'medium']+'18', padding:'1px 7px', borderRadius:20 }}>
                        {PRIO_LABELS[group.priority||'medium']}
                      </span>
                      {group.duration > 0 && (
                        <span style={{ fontSize:11, color:'var(--mocha)', display:'flex', alignItems:'center', gap:3 }}>
                          <IconClock size={12} stroke={1.5}/> ~{group.duration}m
                        </span>
                      )}
                    </div>

                    {group.description && <div style={{ fontSize:12.5, color:'var(--mocha)', marginBottom:3 }}>{group.description}</div>}
                    {group.location && (
                      <div style={{ fontSize:12, color:'var(--mocha)', display:'flex', alignItems:'center', gap:4, marginBottom:6 }}>
                        <IconMapPin size={12} stroke={1.5}/> {group.location}
                      </div>
                    )}

                    {/* Note */}
                    {isEditing ? (
                      <input
                        className="input"
                        style={{ fontSize:12, marginBottom:8 }}
                        placeholder="Hinweis / Notiz für diese Gruppe"
                        defaultValue={group.note}
                        onBlur={e => updateNote(group.id, e.target.value)}
                      />
                    ) : group.note ? (
                      <div style={{ fontSize:11.5, color:'var(--terra)', background:'rgba(196,149,106,0.1)', padding:'4px 10px', borderRadius:8, marginBottom:8, fontStyle:'italic' }}>
                        📸 {group.note}
                      </div>
                    ) : null}

                    {/* Guests in group */}
                    {groupGuests.length > 0 && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:8 }}>
                        {groupGuests.map(g => (
                          <div key={g.id} style={{ display:'flex', alignItems:'center', gap:4, background:'var(--warm)', padding:'3px 8px', borderRadius:20, fontSize:12, border:'1px solid var(--sand)' }}>
                            <span style={{ color:'var(--espresso)' }}>{g.name}</span>
                            {isEditing && (
                              <button onClick={() => removeGuestFromGroup(group.id, g.id)} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--mocha)', fontSize:11, padding:0, lineHeight:1 }}>✕</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add guest when editing */}
                    {isEditing && (
                      <select
                        className="input"
                        style={{ fontSize:12, marginBottom:8 }}
                        value=""
                        onChange={e => { if (e.target.value) { addGuestToGroup(group.id, e.target.value); e.target.value=''; } }}
                      >
                        <option value="">+ Gast hinzufügen</option>
                        {availableToAdd.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    )}

                    <div style={{ fontSize:11, color:'var(--mocha)', display:'flex', alignItems:'center', gap:5, marginTop:4 }}>
                      <IconUsers size={12} stroke={1.5}/>
                      {groupGuests.length} {groupGuests.length===1?'Person':'Personen'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditGroup(isEditing ? null : group.id)}>
                      {isEditing ? 'Fertig' : '✏'}
                    </button>
                    <button className="btn-icon" style={{ background:'#FEE2E2', color:'#991B1B', padding:'5px 7px' }} onClick={() => deleteGroup(group.id)}>
                      <IconTrash size={13} stroke={1.5}/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {groups.length === 0 && (
            <div className="card" style={{ textAlign:'center', padding:40, color:'var(--mocha)' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>📷</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:'var(--espresso)', marginBottom:6 }}>Noch keine Fotogruppen</div>
              <button className="btn btn-primary btn-sm" onClick={() => { setForm({ priority:'medium', duration:1 }); setModal(true); }}>
                <IconPlus size={13} stroke={2}/> Erste Gruppe anlegen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add group modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h3>Fotogruppe hinzufügen</h3>
              <button className="btn-icon" onClick={() => setModal(false)}><IconX size={14} stroke={2}/></button>
            </div>
            <div className="form-group"><label className="form-label">Gruppenname *</label><input className="input" placeholder="z.B. Familie der Braut" value={form.name||''} onChange={e => setForm(f=>({...f,name:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Beschreibung</label><input className="input" placeholder="Kurze Beschreibung" value={form.description||''} onChange={e => setForm(f=>({...f,description:e.target.value}))}/></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Ort</label><input className="input" placeholder="z.B. Garten" value={form.location||''} onChange={e => setForm(f=>({...f,location:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Dauer (Min.)</label><input className="input" type="number" min="0" max="60" value={form.duration||1} onChange={e => setForm(f=>({...f,duration:e.target.value}))}/></div>
            </div>
            <div className="form-group"><label className="form-label">Priorität</label>
              <select className="input" value={form.priority||'medium'} onChange={e => setForm(f=>({...f,priority:e.target.value}))}>
                <option value="high">Wichtig</option>
                <option value="medium">Normal</option>
                <option value="low">Optional</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Hinweis</label><input className="input" placeholder="z.B. Goldene Stunde nutzen" value={form.note||''} onChange={e => setForm(f=>({...f,note:e.target.value}))}/></div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={addGroup}>Hinzufügen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

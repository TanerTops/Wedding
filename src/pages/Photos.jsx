import { useState, useEffect } from 'react';
import { IconPlus, IconTrash, IconX, IconUsers, IconCheck, IconClock, IconMapPin, IconCamera, IconGripVertical } from '@tabler/icons-react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { loadState, saveState, defaultGuests } from '../data/store';
import { getGuests } from '../lib/db';
import Moodboard from '../components/Moodboard';

const DEFAULT_GROUPS = [
  { id:1, name:'Brautpaar', desc:'Romantische Paarfotos', location:'Schlossgarten', priority:'high', duration:0, done:false, guests:[], note:'Goldene Stunde nutzen' },
  { id:2, name:'Familie der Braut', desc:'Eltern, Großeltern und Geschwister', location:'Garten', priority:'high', duration:1, done:false, guests:[], note:'' },
  { id:3, name:'Familie des Bräutigams', desc:'Eltern, Großeltern und Geschwister', location:'Garten', priority:'high', duration:1, done:false, guests:[], note:'' },
  { id:4, name:'Beide Familien', desc:'Großes Familienfoto', location:'Terrasse', priority:'high', duration:5, done:false, guests:[], note:'Stufenaufstellung empfohlen' },
  { id:5, name:'Trauzeugen', desc:'Trauzeugin und Trauzeuge', location:'Schlosseingang', priority:'high', duration:1, done:false, guests:[], note:'' },
  { id:6, name:'Freunde der Braut', desc:'Beste Freundinnen von Sarah', location:'Garten', priority:'medium', duration:1, done:false, guests:[], note:'' },
  { id:7, name:'Freunde des Bräutigams', desc:'Beste Freunde von Tobias', location:'Garten', priority:'medium', duration:1, done:false, guests:[], note:'' },
];

// ── Sortable card wrapper (drag & drop reorder, mouse + touch) ────
function SortablePhotoGroup({ id, priorityColor, done, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeft: `4px solid ${priorityColor}`,
    opacity: done ? 0.65 : (isDragging ? 0.85 : 1),
    boxShadow: isDragging ? '0 6px 18px rgba(91,61,30,0.18)' : undefined,
    position: 'relative',
    zIndex: isDragging ? 10 : 'auto',
  };
  const dragHandle = (
    <div
      {...attributes}
      {...listeners}
      title="Ziehen zum Umsortieren"
      style={{ cursor: 'grab', touchAction: 'none', color: 'var(--taupe)', flexShrink: 0, display: 'flex', alignItems: 'center', paddingTop: 2 }}
    >
      <IconGripVertical size={16} stroke={1.5} />
    </div>
  );
  return (
    <div ref={setNodeRef} className="card" style={style}>
      {children(dragHandle)}
    </div>
  );
}

export default function Photos() {
  const [groups, setGroups] = useState(() => loadState('photoGroups', DEFAULT_GROUPS));
  const [guests, setGuests] = useState(() => loadState('guests', defaultGuests));

  useEffect(() => {
    getGuests().then(({ data }) => {
      if (data && data.length > 0) setGuests(data);
    });
  }, []);
  const [modal, setModal] = useState(null); // null | 'addGroup' | groupId
  const [form, setForm] = useState({});
  const [editGroup, setEditGroup] = useState(null);

  function save(g) { setGroups(g); saveState('photoGroups', g); }

  function addGroup() {
    if (!form.name?.trim()) return;
    const id = Math.max(0, ...groups.map(g => g.id)) + 1;
    save([...groups, { id, name: form.name, desc: form.desc||'', location: form.location||'', priority: form.priority||'medium', duration: parseInt(form.duration)||1, done: false, guests: [], note: form.note||'' }]);
    setModal(null); setForm({});
  }

  function updateGroup(id, updates) {
    save(groups.map(g => g.id === id ? { ...g, ...updates } : g));
  }

  function deleteGroup(id) {
    if (!confirm('Gruppe löschen?')) return;
    save(groups.filter(g => g.id !== id));
  }

  function toggleDone(id) {
    save(groups.map(g => g.id === id ? { ...g, done: !g.done } : g));
  }

  function addGuestToGroup(groupId, guestId) {
    const gid = parseInt(guestId);
    if (!gid) return;
    save(groups.map(g => g.id === groupId ? { ...g, guests: g.guests.includes(gid) ? g.guests : [...g.guests, gid] } : g));
  }

  function removeGuestFromGroup(groupId, guestId) {
    save(groups.map(g => g.id === groupId ? { ...g, guests: g.guests.filter(id => id !== guestId) } : g));
  }

  // ── Drag & drop reordering (order = array index, mouse + touch) ──
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 6 } })
  );
  function handleDragEnd(evt) {
    const { active, over } = evt;
    if (!over || active.id === over.id) return;
    const oldIndex = groups.findIndex(g => g.id === active.id);
    const newIndex = groups.findIndex(g => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    save(arrayMove(groups, oldIndex, newIndex));
  }

  const done = groups.filter(g => g.done).length;
  const totalDuration = groups.filter(g => !g.done).reduce((s, g) => s + (g.duration||0), 0);
  const totalGuests = new Set(groups.flatMap(g => g.guests)).size;

  const PRIO_COLORS = { high: 'var(--terra)', medium: 'var(--gold)', low: 'var(--sage)' };
  const PRIO_LABELS = { high: 'Wichtig', medium: 'Normal', low: 'Optional' };

  // Guests not in any group
  const assignedGuestIds = new Set(groups.flatMap(g => g.guests));
  const unassignedGuests = guests.filter(g => g.status === 'confirmed' && !assignedGuestIds.has(g.id));

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Fotoplanung</h1>
          <div className="topbar-sub">{groups.length} Gruppen · {done} erledigt · ~{totalDuration} Min. verbleibend</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ priority: 'medium', duration: 1 }); setModal('addGroup'); }}>
          <IconPlus size={15} stroke={2} /> Gruppe
        </button>
      </div>

      <div className="page-body">
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 18 }}>
          {[
            { label: 'Gruppen', value: groups.length, color: 'var(--mocha)' },
            { label: 'Erledigt', value: done, color: 'var(--sage)' },
            { label: 'Gäste involviert', value: totalGuests, color: 'var(--gold)' },
            { label: 'Zeit ca.', value: `~${totalDuration}m`, color: 'var(--terra)' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ borderTopColor: s.color }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Unassigned guests warning */}
        {unassignedGuests.length > 0 && (
          <div className="card-warm" style={{ marginBottom: 16, borderLeft: '3px solid var(--gold)', padding: '12px 16px' }}>
            <div className="section-title" style={{ marginBottom: 8 }}>
              {unassignedGuests.length} Gäste keiner Gruppe zugeordnet
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {unassignedGuests.map(g => (
                <div key={g.id} style={{ background: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 12, border: '1px solid var(--sand)', color: 'var(--espresso)' }}>
                  {g.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photo groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={groups.map(g => g.id)} strategy={verticalListSortingStrategy}>
              {groups.map(group => {
                const groupGuests = group.guests.map(id => guests.find(g => g.id === id)).filter(Boolean);
                const availableToAdd = guests.filter(g => g.status === 'confirmed' && !group.guests.includes(g.id));
                const isEditing = editGroup === group.id;
                return (
                  <SortablePhotoGroup key={group.id} id={group.id} priorityColor={PRIO_COLORS[group.priority]} done={group.done}>
                    {(dragHandle) => (
                <>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {dragHandle}
                  {/* Done checkbox */}
                  <div onClick={() => toggleDone(group.id)} style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${group.done ? 'var(--sage)' : 'var(--sand)'}`, background: group.done ? 'var(--sage)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}>
                    {group.done && <IconCheck size={12} stroke={3} style={{ color: '#fff' }} />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--espresso)', textDecoration: group.done ? 'line-through' : 'none' }}>{group.name}</div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: PRIO_COLORS[group.priority], background: PRIO_COLORS[group.priority]+'18', padding: '1px 7px', borderRadius: 20 }}>
                        {PRIO_LABELS[group.priority]}
                      </span>
                      {group.duration > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--mocha)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <IconClock size={12} stroke={1.5} /> ~{group.duration}m
                        </span>
                      )}
                    </div>

                    {group.desc && <div style={{ fontSize: 12.5, color: 'var(--mocha)', marginBottom: 3 }}>{group.desc}</div>}

                    {group.location && (
                      <div style={{ fontSize: 12, color: 'var(--mocha)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                        <IconMapPin size={12} stroke={1.5} /> {group.location}
                      </div>
                    )}

                    {group.note && (
                      <div style={{ fontSize: 11.5, color: 'var(--terra)', background: 'rgba(196,149,106,0.1)', padding: '4px 10px', borderRadius: 8, marginBottom: 8, fontStyle: 'italic' }}>
                        📸 {group.note}
                      </div>
                    )}

                    {/* Guests in group */}
                    {groupGuests.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                        {groupGuests.map(g => (
                          <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--warm)', padding: '3px 8px', borderRadius: 20, fontSize: 12, border: '1px solid var(--sand)' }}>
                            <span style={{ color: 'var(--espresso)' }}>{g.name}</span>
                            <button onClick={() => removeGuestFromGroup(group.id, g.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--mocha)', fontSize: 11, padding: 0, lineHeight: 1 }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add guest dropdown */}
                    {isEditing && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <select className="input" style={{ fontSize: 12 }}
                          onChange={e => { if (e.target.value) addGuestToGroup(group.id, e.target.value); e.target.value = ''; }}>
                          <option value="">+ Gast hinzufügen</option>
                          {availableToAdd.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        <input className="input" style={{ fontSize: 12, flex: 1 }} placeholder="Hinweis für Fotografen"
                          defaultValue={group.note}
                          onBlur={e => updateGroup(group.id, { note: e.target.value })} />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditGroup(isEditing ? null : group.id)}>
                      {isEditing ? 'Fertig' : '✏'}
                    </button>
                    <button className="btn-icon" style={{ background: '#FEE2E2', color: '#991B1B', padding: '5px 7px' }} onClick={() => deleteGroup(group.id)}>
                      <IconTrash size={13} stroke={1.5} />
                    </button>
                  </div>
                </div>

                {/* Guest count summary */}
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--mocha)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <IconUsers size={12} stroke={1.5} />
                  {groupGuests.length} {groupGuests.length === 1 ? 'Person' : 'Personen'}
                </div>
                </>
                    )}
                  </SortablePhotoGroup>
                );
              })}
            </SortableContext>
          </DndContext>
        </div>

        <Moodboard page="photos" title="Moodboard / Shooting-Inspiration" />
      </div>

      {/* Add group modal */}
      {modal === 'addGroup' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h3>Fotogruppe hinzufügen</h3>
            <div className="form-group"><label className="form-label">Gruppenname *</label><input className="input" placeholder="z.B. Familie der Braut" value={form.name||''} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Beschreibung</label><input className="input" placeholder="Kurze Beschreibung" value={form.desc||''} onChange={e => setForm(f => ({...f, desc: e.target.value}))} /></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Ort / Location</label><input className="input" placeholder="z.B. Garten" value={form.location||''} onChange={e => setForm(f => ({...f, location: e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Dauer (Minuten)</label><input className="input" type="number" min="0" max="30" value={form.duration||1} onChange={e => setForm(f => ({...f, duration: e.target.value}))} /></div>
            </div>
            <div className="form-group"><label className="form-label">Priorität</label>
              <select className="input" value={form.priority||'medium'} onChange={e => setForm(f => ({...f, priority: e.target.value}))}>
                <option value="high">Wichtig</option>
                <option value="medium">Normal</option>
                <option value="low">Optional</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Hinweis für Fotografen</label><input className="input" placeholder="z.B. Goldene Stunde nutzen" value={form.note||''} onChange={e => setForm(f => ({...f, note: e.target.value}))} /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={addGroup}>Hinzufügen</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

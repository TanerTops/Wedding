import { useState } from 'react';
import { Plus, Trash2, X, Clock } from 'lucide-react';
import { loadState, saveState, defaultTimeline } from '../data/store';

const TYPE_COLORS = {
  ceremony: '#C4856A',
  photo: '#8B7355',
  reception: '#7A9E7E',
  dinner: '#C4B5A5',
  speech: '#B8A9C9',
  dance: '#C9A84C',
  party: '#5C4A35',
};
const TYPE_LABELS = {
  ceremony: '💒 Zeremonie', photo: '📸 Fotos', reception: '🥂 Empfang',
  dinner: '🍽️ Dinner', speech: '🎤 Reden', dance: '💃 Tanz', party: '🎉 Party',
};

const emptyEvent = { time: '', title: '', location: '', description: '', type: 'reception' };

export default function Timeline() {
  const [events, setEvents] = useState(() => loadState('timeline', defaultTimeline));
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyEvent);

  function save(updated) { setEvents(updated.sort((a, b) => a.time.localeCompare(b.time))); saveState('timeline', updated); }

  function addEvent() {
    if (!form.time || !form.title.trim()) return;
    const newId = Math.max(0, ...events.map(e => e.id)) + 1;
    save([...events, { ...form, id: newId }]);
    setModal(false);
  }

  function deleteEvent(id) { save(events.filter(e => e.id !== id)); }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Zeitplan</h1>
          <p style={{ color: 'var(--taupe)', fontSize: 13, marginTop: 2 }}>Ablaufplan für euren Hochzeitstag</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyEvent); setModal(true); }}>
          <Plus size={15} /> Ereignis hinzufügen
        </button>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 700 }}>
          {events.map((event, i) => (
            <div key={event.id} style={{ display: 'flex', gap: 20, marginBottom: 0 }}>
              {/* Time column */}
              <div style={{ width: 60, textAlign: 'right', paddingTop: 4, flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--espresso)' }}>{event.time}</div>
              </div>
              {/* Line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: TYPE_COLORS[event.type] || 'var(--mocha)',
                  border: '2px solid white',
                  boxShadow: '0 0 0 2px ' + (TYPE_COLORS[event.type] || 'var(--mocha)'),
                  marginTop: 4, flexShrink: 0
                }} />
                {i < events.length - 1 && (
                  <div style={{ width: 2, flex: 1, background: 'var(--sand)', minHeight: 30 }} />
                )}
              </div>
              {/* Content */}
              <div style={{ flex: 1, paddingBottom: 24 }}>
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: TYPE_COLORS[event.type], fontWeight: 600 }}>
                          {TYPE_LABELS[event.type] || event.type}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{event.title}</div>
                      {event.location && <div style={{ fontSize: 12, color: 'var(--taupe)', marginTop: 2 }}>📍 {event.location}</div>}
                      {event.description && <div style={{ fontSize: 13, color: 'var(--dark)', marginTop: 6 }}>{event.description}</div>}
                    </div>
                    <button className="btn-icon" style={{ padding: 5 }} onClick={() => deleteEvent(event.id)}><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {events.length === 0 && (
            <div className="card empty-state">
              <Clock size={32} style={{ color: 'var(--taupe)', margin: '0 auto 8px' }} />
              <p>Noch keine Ereignisse geplant</p>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3>Ereignis hinzufügen</h3>
              <button className="btn-icon" onClick={() => setModal(false)}><X size={16} /></button>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Uhrzeit *</label>
                <input className="input" type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Typ</label>
                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Titel *</label>
              <input className="input" placeholder="z.B. Standesamtliche Trauung" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Ort</label>
              <input className="input" placeholder="z.B. Rathaus Musterstadt" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Beschreibung</label>
              <input className="input" placeholder="Kurze Beschreibung" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={addEvent}>Hinzufügen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

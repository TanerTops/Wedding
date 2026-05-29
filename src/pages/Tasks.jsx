import { useState } from 'react';
import { Plus, Trash2, X, Check } from 'lucide-react';
import { loadState, saveState, defaultTasks } from '../data/store';

const CATEGORIES = ['Dienstleister', 'Catering', 'Gäste', 'Floristik', 'Musik', 'Outfit', 'Sonstiges'];
const emptyTask = { title: '', category: 'Sonstiges', priority: 'medium', dueDate: '', done: false };

export default function Tasks() {
  const [tasks, setTasks] = useState(() => loadState('tasks', defaultTasks));
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyTask);
  const [filter, setFilter] = useState('all');

  function save(updated) { setTasks(updated); saveState('tasks', updated); }
  function toggle(id) { save(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)); }
  function deleteTask(id) { save(tasks.filter(t => t.id !== id)); }
  function addTask() {
    if (!form.title.trim()) return;
    const newId = Math.max(0, ...tasks.map(t => t.id)) + 1;
    save([...tasks, { ...form, id: newId }]);
    setModal(false);
  }

  const filtered = tasks.filter(t =>
    filter === 'all' ? true : filter === 'open' ? !t.done : t.done
  ).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const pOrder = { high: 0, medium: 1, low: 2 };
    return pOrder[a.priority] - pOrder[b.priority];
  });

  const done = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const byCategory = CATEGORIES.map(cat => ({
    cat, tasks: filtered.filter(t => t.category === cat)
  })).filter(c => c.tasks.length > 0);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Aufgaben</h1>
          <p style={{ color: 'var(--taupe)', fontSize: 13, marginTop: 2 }}>{done} von {tasks.length} erledigt · {pct}%</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyTask); setModal(true); }}>
          <Plus size={15} /> Neue Aufgabe
        </button>
      </div>

      <div className="page-body">
        {/* Progress */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>Gesamtfortschritt</span>
            <span style={{ color: 'var(--taupe)' }}>{done} / {tasks.length} Aufgaben</span>
          </div>
          <div className="progress-bar" style={{ height: 10 }}>
            <div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'var(--green)' }} />
          </div>
        </div>

        <div className="tabs">
          {[['all', 'Alle'], ['open', 'Offen'], ['done', 'Erledigt']].map(([v, l]) => (
            <button key={v} className={`tab ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>

        {byCategory.map(({ cat, tasks: catTasks }) => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--taupe)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              {cat} · {catTasks.filter(t => !t.done).length} offen
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {catTasks.map((task, i) => (
                <div key={task.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderBottom: i < catTasks.length - 1 ? '1px solid var(--warm-white)' : 'none',
                  background: task.done ? 'var(--warm-white)' : 'white',
                  transition: 'background 0.15s'
                }}>
                  <button
                    onClick={() => toggle(task.id)}
                    style={{
                      width: 22, height: 22, borderRadius: '50%',
                      border: `2px solid ${task.done ? 'var(--green)' : 'var(--sand)'}`,
                      background: task.done ? 'var(--green)' : 'white',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 0.15s'
                    }}
                  >
                    {task.done && <Check size={12} color="white" strokeWidth={3} />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: task.done ? 'var(--taupe)' : 'var(--dark)', textDecoration: task.done ? 'line-through' : 'none' }}>
                      {task.title}
                    </div>
                    {task.dueDate && (
                      <div style={{ fontSize: 11, color: 'var(--taupe)', marginTop: 1 }}>
                        📅 {new Date(task.dueDate).toLocaleDateString('de-DE')}
                      </div>
                    )}
                  </div>
                  <span className={`badge badge-${task.priority}`}>{task.priority === 'high' ? 'Hoch' : task.priority === 'medium' ? 'Mittel' : 'Niedrig'}</span>
                  <button className="btn-icon" style={{ padding: 5 }} onClick={() => deleteTask(task.id)}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="card empty-state">
            <p>{filter === 'done' ? 'Noch keine erledigten Aufgaben' : '🎉 Alle Aufgaben erledigt!'}</p>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3>Neue Aufgabe</h3>
              <button className="btn-icon" onClick={() => setModal(false)}><X size={16} /></button>
            </div>
            <div className="form-group">
              <label>Aufgabe *</label>
              <input className="input" placeholder="Was muss erledigt werden?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Kategorie</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Priorität</label>
                <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="high">Hoch</option>
                  <option value="medium">Mittel</option>
                  <option value="low">Niedrig</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Fälligkeitsdatum</label>
              <input className="input" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={addTask}>Hinzufügen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

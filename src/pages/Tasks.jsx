import { useState, useEffect } from 'react';
import { IconPlus, IconTrash, IconX, IconCheck } from '@tabler/icons-react';
import { loadState, saveState, defaultTasks } from '../data/store';
import { getTasks, upsertTask, deleteTask as dbDeleteTask } from '../lib/db';

const CATEGORIES = ['Dienstleister', 'Catering', 'Gäste', 'Floristik', 'Musik', 'Outfit', 'Sonstiges'];
const emptyTask = { title: '', category: 'Sonstiges', priority: 'medium', due: '', done: false };

export default function Tasks() {
  const [tasks, setTasks] = useState(() => loadState('tasks', defaultTasks));
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyTask);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getTasks().then(({ data }) => {
      if (data && data.length > 0) {
        setTasks(data);
        saveState('tasks', data);
      }
    });
  }, []);

  function saveLocal(updated) { setTasks(updated); saveState('tasks', updated); }

  async function toggle(id) {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    saveLocal(updated);
    const task = updated.find(t => t.id === id);
    await upsertTask(task);
  }

  async function addTask() {
    if (!form.title.trim()) return;
    const newTask = { ...form, id: crypto.randomUUID() };
    saveLocal([...tasks, newTask]);
    await upsertTask(newTask);
    setModal(false);
    setForm(emptyTask);
  }

  async function removeTask(id) {
    saveLocal(tasks.filter(t => t.id !== id));
    await dbDeleteTask(id);
  }

  const filtered = tasks
    .filter(t => filter === 'all' ? true : filter === 'open' ? !t.done : t.done)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const p = { high: 0, medium: 1, low: 2 };
      return (p[a.priority] || 1) - (p[b.priority] || 1);
    });

  const done = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const byCategory = CATEGORIES.map(cat => ({
    cat, tasks: filtered.filter(t => t.category === cat)
  })).filter(c => c.tasks.length > 0);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Aufgaben</h1>
          <div className="topbar-sub">{done} von {tasks.length} erledigt · {pct}%</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyTask); setModal(true); }}>
          <IconPlus size={15} stroke={2} /> Neue Aufgabe
        </button>
      </div>

      <div className="page-body">
        {/* Progress */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>Gesamtfortschritt</span>
            <span style={{ color: 'var(--mocha)' }}>{done} / {tasks.length} Aufgaben</span>
          </div>
          <div style={{ height: 10, background: 'var(--sand)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--sage)', borderRadius: 10, transition: 'width .3s' }} />
          </div>
        </div>

        <div className="tabs" style={{ marginBottom: 16 }}>
          {[['all','Alle'],['open','Offen'],['done','Erledigt']].map(([v,l]) => (
            <button key={v} className={`tab${filter===v?' active':''}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>

        {byCategory.map(({ cat, tasks: catTasks }) => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mocha)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              {cat} · {catTasks.filter(t => !t.done).length} offen
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {catTasks.map((task, i) => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < catTasks.length-1 ? '1px solid var(--warm)' : 'none', background: task.done ? 'var(--warm)' : '#fff', transition: 'background .15s' }}>
                  <button onClick={() => toggle(task.id)} style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${task.done ? 'var(--sage)' : 'var(--sand)'}`, background: task.done ? 'var(--sage)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                    {task.done && <IconCheck size={12} stroke={3} color="#fff" />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: task.done ? 'var(--mocha)' : 'var(--espresso)', textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</div>
                    {(task.due || task.dueDate) && (
                      <div style={{ fontSize: 11, color: 'var(--mocha)', marginTop: 1 }}>
                        📅 {new Date(task.due || task.dueDate).toLocaleDateString('de-DE')}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: task.priority==='high'?'#FEE2E2':task.priority==='low'?'#F0F5EE':'var(--warm)', color: task.priority==='high'?'#991B1B':task.priority==='low'?'var(--sage)':'var(--mocha)', fontWeight: 500 }}>
                    {task.priority==='high'?'Hoch':task.priority==='medium'?'Mittel':'Niedrig'}
                  </span>
                  <button className="btn-icon" style={{ padding: 5 }} onClick={() => removeTask(task.id)}>
                    <IconTrash size={13} stroke={1.5} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--mocha)' }}>
            <p>{filter === 'done' ? 'Noch keine erledigten Aufgaben' : '🎉 Alle Aufgaben erledigt!'}</p>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3>Neue Aufgabe</h3>
              <button className="btn-icon" onClick={() => setModal(false)}><IconX size={16} stroke={2} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Aufgabe *</label>
              <input className="input" placeholder="Was muss erledigt werden?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Kategorie</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priorität</label>
                <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="high">Hoch</option>
                  <option value="medium">Mittel</option>
                  <option value="low">Niedrig</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Fälligkeitsdatum</label>
              <input className="input" type="date" value={form.due} onChange={e => setForm(f => ({ ...f, due: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={addTask}>Hinzufügen</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

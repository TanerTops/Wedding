import { useState, useEffect } from 'react';
import { IconPlus, IconTrash, IconX, IconCheck, IconCalendar } from '@tabler/icons-react';
import { loadState, saveState, defaultTasks } from '../data/store';
import { getTasks, upsertTask, deleteTask as dbDeleteTask, getWedding } from '../lib/db';

const CATEGORIES = ['Dienstleister', 'Catering', 'Gäste', 'Floristik', 'Musik', 'Outfit', 'Sonstiges'];
const emptyTask  = { title: '', category: 'Sonstiges', priority: 'medium', due: '', done: false, assignee: null };

const AV = ['#C4956A','#A8B5A0','#C4B5A5','#8B9E7A','#B8A9C9','#C9A884'];
const ini = n => n.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();

// Generate .ics file content for a task
function makeICS(task) {
  const now    = new Date().toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';
  const due    = task.due ? task.due.replace(/-/g,'') : null;
  if (!due) return null;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vince//Hochzeitsplaner//DE',
    'BEGIN:VEVENT',
    `UID:${task.id}@vince`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${due}`,
    `DTEND;VALUE=DATE:${due}`,
    `SUMMARY:${task.title}`,
    task.assignee ? `DESCRIPTION:Zugewiesen an: ${task.assignee}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

function downloadICS(task) {
  const ics = makeICS(task);
  if (!ics) return;
  const a      = document.createElement('a');
  a.href       = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
  a.download   = `${task.title.replace(/[^a-z0-9]/gi,'_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function Tasks() {
  const [tasks,   setTasks]   = useState([]);
  const [wedding, setWedding] = useState(null);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState(emptyTask);
  const [filter,  setFilter]  = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  useEffect(() => {
    getTasks().then(({ data }) => {
      if (data != null) { setTasks(data); saveState('tasks', data); }
    });
    getWedding().then(({ data }) => { if (data) setWedding(data); });
  }, []);

  // Build assignee options from wedding data
  const assignees = wedding ? [
    { id: 'bride',          label: wedding.bride,          color: AV[0] },
    { id: 'groom',          label: wedding.groom,          color: AV[1] },
    ...(wedding.witness_bride ? [{ id: 'witness_bride', label: wedding.witness_bride, color: AV[2] }] : []),
    ...(wedding.witness_groom ? [{ id: 'witness_groom', label: wedding.witness_groom, color: AV[3] }] : []),
  ] : [];

  function assigneeLabel(id) {
    return assignees.find(a => a.id === id)?.label || id || '—';
  }
  function assigneeColor(id) {
    return assignees.find(a => a.id === id)?.color || 'var(--mocha)';
  }

  function saveLocal(updated) { setTasks(updated); saveState('tasks', updated); }

  async function toggle(id) {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    saveLocal(updated);
    await upsertTask(updated.find(t => t.id === id));
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

  async function updateAssignee(id, assignee) {
    const updated = tasks.map(t => t.id === id ? { ...t, assignee } : t);
    saveLocal(updated);
    await upsertTask(updated.find(t => t.id === id));
  }

  // Filter chain
  const filtered = tasks
    .filter(t => {
      if (filter === 'open') return !t.done;
      if (filter === 'done') return t.done;
      return true;
    })
    .filter(t => {
      if (!assigneeFilter) return true;
      if (assigneeFilter === 'unassigned') return !t.assignee;
      return t.assignee === assigneeFilter;
    })
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const p = { high: 0, medium: 1, low: 2 };
      return (p[a.priority] || 1) - (p[b.priority] || 1);
    });

  const done = tasks.filter(t => t.done).length;
  const pct  = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

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
          <IconPlus size={15} stroke={2}/> Neue Aufgabe
        </button>
      </div>

      <div className="page-body">

        {/* Progress */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13 }}>
            <span style={{ fontWeight:600 }}>Gesamtfortschritt</span>
            <span style={{ color:'var(--mocha)' }}>{done} / {tasks.length} Aufgaben</span>
          </div>
          <div style={{ height:10, background:'var(--sand)', borderRadius:10, overflow:'hidden' }}>
            <div style={{ width:`${pct}%`, height:'100%', background:'var(--sage)', borderRadius:10, transition:'width .3s' }}/>
          </div>

          {/* Assignee breakdown */}
          {assignees.length > 0 && (
            <div style={{ display:'flex', gap:16, marginTop:12, flexWrap:'wrap' }}>
              {assignees.map(a => {
                const total  = tasks.filter(t => t.assignee === a.id).length;
                const doneN  = tasks.filter(t => t.assignee === a.id && t.done).length;
                if (!total) return null;
                return (
                  <div key={a.id} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12 }}>
                    <div style={{ width:22, height:22, borderRadius:'50%', background:a.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, color:'#fff', flexShrink:0 }}>
                      {ini(a.label)}
                    </div>
                    <span style={{ color:'var(--espresso)', fontWeight:500 }}>{a.label}</span>
                    <span style={{ color:'var(--mocha)' }}>{doneN}/{total}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <div className="tabs" style={{ margin:0 }}>
            {[['all','Alle'],['open','Offen'],['done','Erledigt']].map(([v,l]) => (
              <button key={v} className={`tab${filter===v?' active':''}`} onClick={()=>setFilter(v)}>{l}</button>
            ))}
          </div>

          {/* Assignee filter */}
          {assignees.length > 0 && (
            <select
              className="input"
              style={{ flex:'0 1 160px', fontSize:13 }}
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
            >
              <option value="">Alle Personen</option>
              {assignees.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              <option value="unassigned">Nicht zugewiesen</option>
            </select>
          )}
        </div>

        {/* Task list by category */}
        {byCategory.map(({ cat, tasks: catTasks }) => (
          <div key={cat} style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--mocha)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>
              {cat} · {catTasks.filter(t=>!t.done).length} offen
            </div>
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              {catTasks.map((task, i) => {
                const hasAssignee = task.assignee && task.assignee !== 'unassigned';
                const overdue     = task.due && !task.done && new Date(task.due) < new Date();
                return (
                  <div key={task.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom: i < catTasks.length-1 ? '1px solid var(--warm)' : 'none', background: task.done ? 'var(--warm)' : '#fff', transition:'background .15s' }}>

                    {/* Checkbox */}
                    <button onClick={()=>toggle(task.id)} style={{ width:22, height:22, borderRadius:'50%', border:`2px solid ${task.done?'var(--sage)':'var(--sand)'}`, background:task.done?'var(--sage)':'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .15s' }}>
                      {task.done && <IconCheck size={12} stroke={3} color="#fff"/>}
                    </button>

                    {/* Text */}
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13.5, fontWeight:500, color:task.done?'var(--mocha)':'var(--espresso)', textDecoration:task.done?'line-through':'none' }}>
                        {task.title}
                      </div>
                      {(task.due||task.dueDate) && (
                        <div style={{ fontSize:11, color:overdue?'#E57373':'var(--mocha)', marginTop:1, display:'flex', alignItems:'center', gap:4 }}>
                          {overdue && '⚠️ '}
                          📅 {new Date(task.due||task.dueDate).toLocaleDateString('de-DE')}
                        </div>
                      )}
                    </div>

                    {/* Priority badge */}
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, flexShrink:0, background:task.priority==='high'?'#FEE2E2':task.priority==='low'?'#F0F5EE':'var(--warm)', color:task.priority==='high'?'#991B1B':task.priority==='low'?'var(--sage)':'var(--mocha)', fontWeight:500 }}>
                      {task.priority==='high'?'Hoch':task.priority==='medium'?'Mittel':'Niedrig'}
                    </span>

                    {/* Assignee avatar — click to cycle */}
                    {assignees.length > 0 && (
                      <div style={{ position:'relative', flexShrink:0 }}>
                        <select
                          value={task.assignee||''}
                          onChange={e => updateAssignee(task.id, e.target.value || null)}
                          style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }}
                          title="Zuweisen"
                        />
                        {hasAssignee ? (
                          <div style={{ width:26, height:26, borderRadius:'50%', background:assigneeColor(task.assignee), display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#fff', cursor:'pointer', title:'Zuweisung ändern' }}>
                            {ini(assigneeLabel(task.assignee))}
                          </div>
                        ) : (
                          <div style={{ width:26, height:26, borderRadius:'50%', border:'1.5px dashed var(--sand)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'var(--mocha)', cursor:'pointer', background:'#fff' }}>
                            +
                          </div>
                        )}
                      </div>
                    )}

                    {/* Calendar export */}
                    {task.due && (
                      <button
                        className="btn-icon"
                        style={{ padding:5, flexShrink:0 }}
                        title="In Kalender eintragen"
                        onClick={() => downloadICS(task)}
                      >
                        <IconCalendar size={13} stroke={1.5}/>
                      </button>
                    )}

                    {/* Delete */}
                    <button className="btn-icon" style={{ padding:5, flexShrink:0 }} onClick={()=>removeTask(task.id)}>
                      <IconTrash size={13} stroke={1.5}/>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="card" style={{ textAlign:'center', padding:40, color:'var(--mocha)' }}>
            <p>{filter==='done' ? 'Noch keine erledigten Aufgaben' : '🎉 Alle Aufgaben erledigt!'}</p>
          </div>
        )}
      </div>

      {/* ── Modal: Neue Aufgabe ── */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3>Neue Aufgabe</h3>
              <button className="btn-icon" onClick={()=>setModal(false)}><IconX size={16} stroke={2}/></button>
            </div>

            <div className="form-group">
              <label className="form-label">Aufgabe *</label>
              <input className="input" placeholder="Was muss erledigt werden?" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Kategorie</label>
                <select className="input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priorität</label>
                <select className="input" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                  <option value="high">Hoch</option>
                  <option value="medium">Mittel</option>
                  <option value="low">Niedrig</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Fälligkeitsdatum</label>
                <input className="input" type="date" value={form.due} onChange={e=>setForm(f=>({...f,due:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Zugewiesen an</label>
                <select className="input" value={form.assignee||''} onChange={e=>setForm(f=>({...f,assignee:e.target.value||null}))}>
                  <option value="">— Niemand —</option>
                  {assignees.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn btn-secondary" onClick={()=>setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={addTask}>Hinzufügen</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

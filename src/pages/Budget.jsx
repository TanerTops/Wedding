import { useState, useEffect, useMemo } from 'react';
import { IconPlus, IconTrash, IconEdit, IconX, IconDownload, IconAlertCircle, IconClock } from '@tabler/icons-react';
import { getBudgetItems, upsertBudgetItem, deleteBudgetItem } from '../lib/db';
import { loadState, saveState, defaultBudgetItems, defaultBudgetCategories, defaultWedding } from '../data/store';

const fEU = n => Number(n).toLocaleString('de-DE') + ' €';
const fDE = d => { try { return new Date(d).toLocaleDateString('de-DE', { day:'numeric', month:'long', year:'numeric' }); } catch { return d; }};
const daysUntil = d => Math.ceil((new Date(d) - new Date()) / 86400000);

const DEFAULT_CATS = [
  { id:1, name:'Location',    budget:5000,  color:'#C4956A' },
  { id:2, name:'Catering',    budget:7000,  color:'#A8B5A0' },
  { id:3, name:'Fotografie',  budget:2500,  color:'#C9A884' },
  { id:4, name:'Floristik',   budget:1500,  color:'#B8A9C9' },
  { id:5, name:'Musik',       budget:1500,  color:'#C4B5A5' },
  { id:6, name:'Kleidung',    budget:3000,  color:'#8B9E7A' },
  { id:7, name:'Transport',   budget:500,   color:'#B5A88A' },
  { id:8, name:'Sonstiges',   budget:1000,  color:'#A89880' },
];

const CAT_COLORS = ['#C4956A','#A8B5A0','#C9A884','#B8A9C9','#C4B5A5','#8B9E7A','#B5A88A','#A89880','#C4956A','#9B8EA0'];

export default function Budget() {
  const [wedding]   = useState(() => loadState('wedding', defaultWedding));
  const [items, setItems]   = useState(() => loadState('budgetItems', defaultBudgetItems));
  const [cats, setCats]     = useState(() => loadState('budgetCategories', DEFAULT_CATS));
  const [tab, setTab]       = useState('overview');
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({});
  const [catModal, setCatModal] = useState(false);
  const [newCat, setNewCat] = useState({ name:'', budget:'', color:'#C4956A' });

  function saveItems(u) { setItems(u); saveState('budgetItems', u); }
  function saveCats(u)  { setCats(u);  saveState('budgetCategories', u); }

  // ── Calculations ───────────────────────────────────────────────
  const totalBudget   = wedding.budget;
  const totalSpent    = items.filter(i=>i.paid).reduce((s,i)=>s+i.amount,0);
  const totalCom      = items.reduce((s,i)=>s+i.amount,0);
  const remaining     = totalBudget - totalCom;
  const usedPct       = Math.min(100, Math.round(totalCom/totalBudget*100));
  const pending       = items.filter(i=>!i.paid);
  const pendingTotal  = pending.reduce((s,i)=>s+i.amount,0);

  // Upcoming (due within 30 days)
  const upcoming = pending
    .filter(i => i.due && daysUntil(i.due) <= 30)
    .sort((a,b) => new Date(a.due) - new Date(b.due));

  // Per category spending
  const catData = useMemo(() => cats.map(cat => {
    const catItems = items.filter(i => i.cat === cat.name);
    const spent    = catItems.filter(i=>i.paid).reduce((s,i)=>s+i.amount,0);
    const committed= catItems.reduce((s,i)=>s+i.amount,0);
    const pct      = cat.budget ? Math.min(100, Math.round(committed/cat.budget*100)) : 0;
    return { ...cat, spent, committed, pct };
  }), [cats, items]);

  // Budget calculator totals
  const calcTotal = cats.reduce((s,c)=>s+(parseFloat(c.budget)||0), 0);

  // ── CRUD ────────────────────────────────────────────────────────
  function openAdd() { setForm({ cat: cats[0]?.name||'', amount:'', paid:false, due:'', vendor:'', desc:'' }); setModal('add'); }
  function openEdit(item) { setForm({...item, amount:String(item.amount)}); setModal(item.id); }
  function handleSave() {
    const amount = parseFloat(form.amount)||0;
    if (!form.desc?.trim() || !amount) return;
    if (modal==='add') {
      saveItems([...items, { ...form, id:Math.max(0,...items.map(i=>i.id))+1, amount }]);
    } else {
      saveItems(items.map(i => i.id===modal ? {...form,id:i.id,amount} : i));
    }
    setModal(null);
  }
  function del(id) { if(confirm('Ausgabe löschen?')) saveItems(items.filter(i=>i.id!==id)); }
  function togglePaid(id) { saveItems(items.map(i=>i.id===id?{...i,paid:!i.paid}:i)); }
  function addCat() {
    if(!newCat.name.trim()) return;
    saveCats([...cats,{id:Math.max(0,...cats.map(c=>c.id))+1,...newCat,budget:parseFloat(newCat.budget)||0}]);
    setNewCat({name:'',budget:'',color:'#C4956A'}); setCatModal(false);
  }
  function updateCatBudget(id, val) {
    saveCats(cats.map(c=>c.id===id?{...c,budget:parseFloat(val)||0}:c));
  }

  function exportCSV() {
    const rows = [['Beschreibung','Vendor','Kategorie','Betrag','Bezahlt','Fällig'],...items.map(i=>[i.desc,i.vendor||'',i.cat,i.amount,i.paid?'Ja':'Nein',i.due||''])];
    const csv = rows.map(r=>r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
    a.download = 'budget.csv'; a.click();
  }

  const TABS = [
    {id:'overview',   label:'Übersicht'},
    {id:'expenses',   label:'Ausgaben'},
    {id:'categories', label:'Kategorien'},
    {id:'calculator', label:'Budgetrechner'},
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Budget</h1>
          <div className="topbar-sub">Kosten, Zahlungen & Ausgaben im Überblick</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
            <IconDownload size={14} stroke={1.5}/> Export
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <IconPlus size={15} stroke={2}/> Ausgabe
          </button>
        </div>
      </div>

      <div className="page-body">

        {/* ── KPI cards ── */}
        <div className="stats-grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:18}}>
          <div className="stat-card" style={{borderTopColor:'var(--mocha)'}}>
            <div className="stat-label">Gesamtbudget</div>
            <div className="stat-value">{fEU(totalBudget)}</div>
            <div className="stat-sub">Euer Hochzeitsbudget</div>
          </div>
          <div className="stat-card" style={{borderTopColor:'var(--sage)'}}>
            <div className="stat-label">Ausgegeben</div>
            <div className="stat-value">{fEU(totalSpent)}</div>
            <div className="stat-sub">{usedPct}% des Budgets</div>
          </div>
          <div className="stat-card" style={{borderTopColor:remaining<0?'var(--blush)':'var(--gold)'}}>
            <div className="stat-label">Verbleibend</div>
            <div className="stat-value" style={{color:remaining<0?'#E57373':'inherit'}}>{fEU(remaining)}</div>
            <div className="stat-sub">{100-usedPct}% übrig</div>
          </div>
          <div className="stat-card" style={{borderTopColor:'var(--blush)'}}>
            <div className="stat-label">Anstehende Zahlungen</div>
            <div className="stat-value">{fEU(pendingTotal)}</div>
            <div className="stat-sub">{pending.length} Zahlungen offen</div>
          </div>
        </div>

        {/* ── Upcoming payments banner ── */}
        {upcoming.length > 0 && (
          <div className="card" style={{marginBottom:18,padding:0,overflow:'hidden'}}>
            <div style={{padding:'12px 18px',background:'var(--warm)',borderBottom:'1px solid var(--sand)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <IconAlertCircle size={18} stroke={1.5} style={{color:'var(--terra)'}}/>
                <span style={{fontWeight:600,fontSize:14,color:'var(--espresso)'}}>Anstehende Zahlungen</span>
                <span style={{fontSize:12,color:'var(--mocha)'}}>{upcoming.length} Zahlung{upcoming.length!==1?'en':''} · {fEU(upcoming.reduce((s,i)=>s+i.amount,0))}</span>
              </div>
            </div>
            {upcoming.map(item => {
              const d = daysUntil(item.due);
              const urgent = d <= 7;
              return (
                <div key={item.id} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px',borderBottom:'1px solid #F5EFE4'}}>
                  <div style={{width:4,alignSelf:'stretch',background:urgent?'var(--blush)':'var(--gold)',borderRadius:4,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14,color:'var(--espresso)'}}>{item.desc}</div>
                    {item.vendor&&<div style={{fontSize:12,color:'var(--mocha)',marginTop:1}}>🏢 {item.vendor}</div>}
                    <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4,fontSize:12}}>
                      <IconClock size={13} stroke={1.5} style={{color:urgent?'var(--terra)':'var(--mocha)'}}/>
                      <span style={{color:urgent?'var(--terra)':'var(--mocha)'}}>
                        {d<=0?'Überfällig!':d===1?'Morgen fällig':`Fällig in ${d} Tagen`} · {fDE(item.due)}
                      </span>
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:700,fontSize:18,color:'var(--espresso)'}}>{fEU(item.amount)}</div>
                    <button className="btn btn-primary btn-sm" style={{marginTop:6}} onClick={()=>togglePaid(item.id)}>
                      Als bezahlt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="tabs" style={{marginBottom:18}}>
          {TABS.map(t=>(
            <button key={t.id} className={`tab${tab===t.id?' active':''}`} onClick={()=>setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab==='overview' && (
          <>
            {/* Big progress bar */}
            <div className="card" style={{marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:13}}>
                <span style={{fontWeight:600,color:'var(--espresso)'}}>Budget verwendet</span>
                <span style={{color:'var(--mocha)'}}>{fEU(totalCom)} von {fEU(totalBudget)} · {usedPct}%</span>
              </div>
              <div className="progress-bar" style={{height:12,borderRadius:6}}>
                <div className="progress-fill" style={{width:usedPct+'%',background:usedPct>90?'var(--blush)':usedPct>70?'var(--gold)':'var(--sage)',borderRadius:6}}/>
              </div>
              <div style={{display:'flex',gap:16,marginTop:10,flexWrap:'wrap'}}>
                {[['Bezahlt',totalSpent,'var(--sage)'],['Ausstehend',pendingTotal,'var(--gold)'],['Frei',Math.max(0,remaining),'var(--sand)']].map(([l,v,c])=>(
                  <div key={l} style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}>
                    <div style={{width:10,height:10,borderRadius:2,background:c,flexShrink:0}}/>
                    <span style={{color:'var(--mocha)'}}>{l}: <strong style={{color:'var(--espresso)'}}>{fEU(v)}</strong></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category overview cards */}
            <div className="grid-2">
              {catData.filter(c=>c.committed>0).map(cat=>(
                <div key={cat.id} className="card" style={{borderLeft:`3px solid ${cat.color}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                    <span style={{fontWeight:600,fontSize:14,color:'var(--espresso)'}}>{cat.name}</span>
                    <span style={{fontSize:13,color:'var(--mocha)'}}>{fEU(cat.committed)} / {fEU(cat.budget)}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width:cat.pct+'%',background:cat.pct>95?'var(--blush)':cat.pct>80?'var(--gold)':cat.color}}/>
                  </div>
                  <div style={{fontSize:11,color:'var(--mocha)',marginTop:5}}>{cat.pct}% · Bezahlt: {fEU(cat.spent)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── EXPENSES TAB ── */}
        {tab==='expenses' && (
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'10px 16px',background:'var(--warm)',borderBottom:'1px solid var(--sand)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,fontWeight:600,color:'var(--espresso)'}}>{fEU(totalSpent)} bezahlt von {fEU(totalCom)}</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Beschreibung</th>
                  <th>Vendor</th>
                  <th>Kategorie</th>
                  <th>Betrag</th>
                  <th>Fällig</th>
                  <th>Status</th>
                  <th style={{width:80}}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item=>{
                  const d = item.due ? daysUntil(item.due) : null;
                  const overdue = !item.paid && d !== null && d <= 0;
                  const soon = !item.paid && d !== null && d <= 7;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{fontWeight:500,color:'var(--espresso)'}}>{item.desc}</div>
                        {item.note&&<div style={{fontSize:11,color:'var(--mocha)',marginTop:1}}>{item.note}</div>}
                      </td>
                      <td style={{fontSize:12,color:'var(--mocha)'}}>{item.vendor||'—'}</td>
                      <td>
                        {(() => {
                          const cat = cats.find(c=>c.name===item.cat);
                          return <span style={{fontSize:11.5,color:'var(--mocha)',display:'flex',alignItems:'center',gap:4}}>
                            {cat&&<div style={{width:8,height:8,borderRadius:2,background:cat.color,flexShrink:0}}/>}
                            {item.cat}
                          </span>;
                        })()}
                      </td>
                      <td style={{fontWeight:600,color:'var(--espresso)'}}>{fEU(item.amount)}</td>
                      <td>
                        {item.due ? (
                          <span style={{fontSize:12,color:overdue?'#E57373':soon?'var(--terra)':'var(--mocha)'}}>
                            {overdue&&'⚠️ '}{soon&&!overdue&&'⏰ '}{fDE(item.due)}
                          </span>
                        ) : <span style={{color:'var(--taupe)'}}>—</span>}
                      </td>
                      <td>
                        <button
                          style={{display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:500,border:'none',cursor:'pointer',background:item.paid?'#E8F5E9':'#FFF8E1',color:item.paid?'#388E3C':'#F9A825'}}
                          onClick={()=>togglePaid(item.id)}>
                          {item.paid?'✓ Bezahlt':'○ Offen'}
                        </button>
                      </td>
                      <td>
                        <div style={{display:'flex',gap:4}}>
                          <button className="btn-icon" style={{padding:'4px 6px'}} onClick={()=>openEdit(item)}><IconEdit size={13} stroke={1.5}/></button>
                          <button className="btn-icon" style={{padding:'4px 6px',background:'#FEE2E2',color:'#991B1B'}} onClick={()=>del(item.id)}><IconTrash size={13} stroke={1.5}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{background:'var(--warm)'}}>
                  <td colSpan={3} style={{padding:'10px 14px',fontWeight:600,fontSize:13}}>Gesamt</td>
                  <td style={{padding:'10px 14px',fontWeight:700,color:'var(--espresso)'}}>{fEU(totalCom)}</td>
                  <td colSpan={3}/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── CATEGORIES TAB ── */}
        {tab==='categories' && (
          <>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
              <button className="btn btn-secondary btn-sm" onClick={()=>setCatModal(true)}>
                <IconPlus size={13} stroke={2}/> Kategorie
              </button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {catData.map(cat=>{
                const catItems = items.filter(i=>i.cat===cat.name);
                return (
                  <div key={cat.id} className="card">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:14,height:14,borderRadius:3,background:cat.color,flexShrink:0}}/>
                        <div>
                          <div style={{fontWeight:600,fontSize:15,color:'var(--espresso)'}}>{cat.name}</div>
                          <div style={{fontSize:12,color:'var(--mocha)'}}>{catItems.length} Ausgabe{catItems.length!==1?'n':''}</div>
                        </div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontWeight:600,fontSize:14,color:'var(--espresso)'}}>{fEU(cat.committed)}</div>
                        <div style={{fontSize:11,color:'var(--mocha)'}}>von {fEU(cat.budget)} Budget</div>
                      </div>
                    </div>
                    <div className="progress-bar" style={{marginBottom:8}}>
                      <div className="progress-fill" style={{width:cat.pct+'%',background:cat.pct>95?'var(--blush)':cat.pct>80?'var(--gold)':cat.color}}/>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--mocha)',marginBottom:catItems.length?10:0}}>
                      <span>{cat.pct}% des Budgets</span>
                      <span>Bezahlt: {fEU(cat.spent)}</span>
                    </div>
                    {catItems.length>0&&(
                      <div style={{borderTop:'1px solid var(--sand)',paddingTop:8}}>
                        {catItems.map(item=>(
                          <div key={item.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',fontSize:12.5}}>
                            <span style={{color:'var(--espresso)'}}>{item.desc}{item.vendor&&<span style={{color:'var(--mocha)',marginLeft:6}}>· {item.vendor}</span>}</span>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <span style={{fontWeight:500}}>{fEU(item.amount)}</span>
                              <span style={{fontSize:10,color:item.paid?'#388E3C':'#F9A825',fontWeight:500}}>{item.paid?'✓':'○'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── CALCULATOR TAB ── */}
        {tab==='calculator' && (
          <div>
            <div className="card" style={{marginBottom:16,padding:'14px 18px'}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:'var(--espresso)',marginBottom:4}}>Budgetrechner</div>
              <p style={{fontSize:13,color:'var(--mocha)',lineHeight:1.6}}>Plant eure Budgetverteilung. Die Prozentsätze beziehen sich auf euer Gesamtbudget von {fEU(totalBudget)}.</p>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
              {cats.map(cat=>{
                const pct = totalBudget ? Math.round(cat.budget/totalBudget*100) : 0;
                return (
                  <div key={cat.id} className="card" style={{padding:'12px 16px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:12,height:12,borderRadius:3,background:cat.color,flexShrink:0}}/>
                      <span style={{flex:1,fontSize:13.5,fontWeight:500,color:'var(--espresso)'}}>{cat.name}</span>
                      <span style={{fontSize:12,color:'var(--mocha)',width:48,textAlign:'right'}}>{pct}%</span>
                      <div style={{position:'relative',width:120}}>
                        <input
                          type="number"
                          min="0"
                          className="input"
                          style={{paddingRight:28,fontSize:13,textAlign:'right'}}
                          value={cat.budget}
                          onChange={e=>updateCatBudget(cat.id,e.target.value)}
                        />
                        <span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:12,color:'var(--mocha)',pointerEvents:'none'}}>€</span>
                      </div>
                    </div>
                    <div style={{marginTop:8}}>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width:pct+'%',background:cat.color}}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="card-warm" style={{padding:'14px 18px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}>
                <span style={{fontWeight:600,color:'var(--espresso)'}}>Summe aller Kategorien</span>
                <span style={{fontWeight:700,color:calcTotal>totalBudget?'#E57373':'var(--sage)'}}>{fEU(calcTotal)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--mocha)'}}>
                <span>Gesamtbudget</span>
                <span>{fEU(totalBudget)}</span>
              </div>
              {calcTotal !== totalBudget && (
                <div style={{marginTop:8,fontSize:12,color:calcTotal>totalBudget?'#E57373':'var(--sage)',fontWeight:500}}>
                  {calcTotal>totalBudget
                    ? `⚠️ ${fEU(calcTotal-totalBudget)} über Budget`
                    : `✓ ${fEU(totalBudget-calcTotal)} noch nicht verplant`}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Add/Edit expense ── */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <h3>{modal==='add'?'Ausgabe hinzufügen':'Ausgabe bearbeiten'}</h3>
              <button className="btn-icon" onClick={()=>setModal(null)}><IconX size={15} stroke={2}/></button>
            </div>
            <div className="form-group"><label className="form-label">Beschreibung *</label><input className="input" placeholder="z.B. Catering – Dinner" value={form.desc||''} onChange={e=>setForm(f=>({...f,desc:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Vendor / Dienstleister</label><input className="input" placeholder="z.B. Gasthof zum Schwan" value={form.vendor||''} onChange={e=>setForm(f=>({...f,vendor:e.target.value}))}/></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Kategorie</label>
                <select className="input" value={form.cat||''} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>
                  {cats.map(c=><option key={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Betrag (€) *</label><input className="input" type="number" min="0" value={form.amount||''} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></div>
            </div>
            <div className="form-group"><label className="form-label">Fälligkeitsdatum</label><input className="input" type="date" value={form.due||''} onChange={e=>setForm(f=>({...f,due:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Notiz</label><input className="input" placeholder="Optionale Anmerkung" value={form.note||''} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/></div>
            <div style={{marginBottom:14}}><label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13.5,color:'var(--brown)'}}>
              <input type="checkbox" checked={!!form.paid} onChange={e=>setForm(f=>({...f,paid:e.target.checked}))}/> Bereits bezahlt
            </label></div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn btn-secondary" onClick={()=>setModal(null)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={handleSave}>{modal==='add'?'Hinzufügen':'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Add category ── */}
      {catModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setCatModal(false)}>
          <div className="modal">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <h3>Kategorie hinzufügen</h3>
              <button className="btn-icon" onClick={()=>setCatModal(false)}><IconX size={15} stroke={2}/></button>
            </div>
            <div className="form-group"><label className="form-label">Name *</label><input className="input" value={newCat.name} onChange={e=>setNewCat(n=>({...n,name:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Budget (€)</label><input className="input" type="number" value={newCat.budget} onChange={e=>setNewCat(n=>({...n,budget:e.target.value}))}/></div>
            <div className="form-group">
              <label className="form-label">Farbe</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {CAT_COLORS.map(col=>(
                  <div key={col} onClick={()=>setNewCat(n=>({...n,color:col}))} style={{width:28,height:28,borderRadius:'50%',background:col,cursor:'pointer',border:`3px solid ${newCat.color===col?'var(--espresso)':'transparent'}`}}/>
                ))}
              </div>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn btn-secondary" onClick={()=>setCatModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={addCat}>Hinzufügen</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

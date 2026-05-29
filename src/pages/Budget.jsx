import { useState } from 'react';
import { Plus, Trash2, Edit2, X, TrendingUp } from 'lucide-react';
import { loadState, saveState, defaultBudgetItems, defaultBudgetCategories, defaultWedding } from '../data/store';

const CATEGORIES = ['Location', 'Catering', 'Fotografie', 'Floristik', 'Musik', 'Kleidung', 'Ringe', 'Transport', 'Sonstiges'];

const emptyItem = { description: '', category: 'Catering', amount: '', paid: false, dueDate: '' };

export default function Budget() {
  const [wedding] = useState(() => loadState('wedding', defaultWedding));
  const [items, setItems] = useState(() => loadState('budgetItems', defaultBudgetItems));
  const [categories] = useState(() => loadState('budgetCategories', defaultBudgetCategories));
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyItem);
  const [tab, setTab] = useState('expenses');

  function save(updated) { setItems(updated); saveState('budgetItems', updated); }

  function openAdd() { setForm(emptyItem); setModal('add'); }
  function openEdit(item) { setForm({ ...item, amount: String(item.amount) }); setModal(item); }
  function closeModal() { setModal(null); }

  function handleSubmit() {
    const amount = parseFloat(form.amount) || 0;
    if (!form.description.trim() || !amount) return;
    if (modal === 'add') {
      const newId = Math.max(0, ...items.map(i => i.id)) + 1;
      save([...items, { ...form, id: newId, amount }]);
    } else {
      save(items.map(i => i.id === modal.id ? { ...form, id: i.id, amount } : i));
    }
    closeModal();
  }

  function deleteItem(id) {
    if (confirm('Ausgabe löschen?')) save(items.filter(i => i.id !== id));
  }

  function togglePaid(id) {
    save(items.map(i => i.id === id ? { ...i, paid: !i.paid } : i));
  }

  const totalBudget = wedding.budget;
  const totalSpent = items.filter(i => i.paid).reduce((s, i) => s + i.amount, 0);
  const totalCommitted = items.reduce((s, i) => s + i.amount, 0);
  const remaining = totalBudget - totalCommitted;
  const budgetPct = Math.min(100, Math.round((totalCommitted / totalBudget) * 100));

  const pending = items.filter(i => !i.paid);
  const pendingTotal = pending.reduce((s, i) => s + i.amount, 0);

  // By category
  const byCat = CATEGORIES.map(cat => {
    const catItems = items.filter(i => i.category === cat);
    const spent = catItems.filter(i => i.paid).reduce((s, i) => s + i.amount, 0);
    const total = catItems.reduce((s, i) => s + i.amount, 0);
    const catBudget = categories.find(c => c.name === cat)?.budget || 0;
    return { cat, spent, total, catBudget, count: catItems.length };
  }).filter(c => c.count > 0 || c.catBudget > 0);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Budget</h1>
          <p style={{ color: 'var(--taupe)', fontSize: 13, marginTop: 2 }}>Ausgaben, Zahlungen & Kategorien im Überblick</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Ausgabe hinzufügen</button>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <div className="stat-card" style={{ borderTopColor: 'var(--mocha)' }}>
            <div className="stat-label">Gesamtbudget</div>
            <div className="stat-value">{totalBudget.toLocaleString('de-DE')} €</div>
            <div className="stat-sub">Geplantes Budget</div>
          </div>
          <div className="stat-card" style={{ borderTopColor: 'var(--green)' }}>
            <div className="stat-label">Bezahlt</div>
            <div className="stat-value">{totalSpent.toLocaleString('de-DE')} €</div>
            <div className="stat-sub">{Math.round((totalSpent / totalBudget) * 100)}% des Budgets</div>
          </div>
          <div className="stat-card" style={{ borderTopColor: 'var(--rose)' }}>
            <div className="stat-label">Ausstehend</div>
            <div className="stat-value">{pendingTotal.toLocaleString('de-DE')} €</div>
            <div className="stat-sub">{pending.length} Zahlung{pending.length !== 1 ? 'en' : ''} offen</div>
          </div>
          <div className="stat-card" style={{ borderTopColor: remaining >= 0 ? 'var(--gold)' : 'var(--rose)' }}>
            <div className="stat-label">Verbleibend</div>
            <div className="stat-value" style={{ color: remaining < 0 ? 'var(--rose)' : 'inherit' }}>
              {remaining.toLocaleString('de-DE')} €
            </div>
            <div className="stat-sub">{100 - budgetPct}% frei</div>
          </div>
        </div>

        {/* Budget progress */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>Budget verwendet: {totalCommitted.toLocaleString('de-DE')} €</span>
            <span style={{ color: 'var(--taupe)' }}>{budgetPct}% von {totalBudget.toLocaleString('de-DE')} €</span>
          </div>
          <div className="progress-bar" style={{ height: 12 }}>
            <div className="progress-bar-fill" style={{
              width: `${budgetPct}%`,
              background: budgetPct > 90 ? 'var(--rose)' : budgetPct > 70 ? 'var(--gold)' : 'var(--green)'
            }} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--green)' }} />
              <span style={{ color: 'var(--taupe)' }}>Bezahlt: {totalSpent.toLocaleString('de-DE')} €</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--gold)' }} />
              <span style={{ color: 'var(--taupe)' }}>Offen: {pendingTotal.toLocaleString('de-DE')} €</span>
            </div>
          </div>
        </div>

        <div className="tabs">
          {['expenses', 'categories', 'pending'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'expenses' ? 'Ausgaben' : t === 'categories' ? 'Kategorien' : 'Ausstehend'}
            </button>
          ))}
        </div>

        {tab === 'expenses' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Beschreibung</th>
                    <th>Kategorie</th>
                    <th>Betrag</th>
                    <th>Fällig</th>
                    <th>Status</th>
                    <th style={{ width: 100 }}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--taupe)' }}>Keine Ausgaben erfasst</td></tr>
                  ) : items.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.description}</td>
                      <td><span style={{ fontSize: 12, color: 'var(--mocha)' }}>{item.category}</span></td>
                      <td style={{ fontWeight: 600 }}>{item.amount.toLocaleString('de-DE')} €</td>
                      <td style={{ fontSize: 12, color: 'var(--taupe)' }}>
                        {item.dueDate ? new Date(item.dueDate).toLocaleDateString('de-DE') : '—'}
                      </td>
                      <td>
                        <button
                          className={`badge ${item.paid ? 'badge-paid' : 'badge-unpaid'}`}
                          style={{ border: 'none', cursor: 'pointer' }}
                          onClick={() => togglePaid(item.id)}
                        >
                          {item.paid ? '✓ Bezahlt' : '○ Offen'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" style={{ padding: 5 }} onClick={() => openEdit(item)}><Edit2 size={13} /></button>
                          <button className="btn-icon" style={{ padding: 5, background: '#FEE2E2', color: '#991B1B' }} onClick={() => deleteItem(item.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--warm-white)' }}>
                    <td colSpan={2} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>Gesamt</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--espresso)' }}>{totalCommitted.toLocaleString('de-DE')} €</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {tab === 'categories' && (
          <div className="grid-2">
            {byCat.map(({ cat, spent, total, catBudget }) => {
              const pct = catBudget ? Math.min(100, Math.round((total / catBudget) * 100)) : 0;
              return (
                <div key={cat} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{cat}</div>
                    <div style={{ fontSize: 13, color: 'var(--taupe)' }}>
                      {total.toLocaleString('de-DE')} € / {catBudget.toLocaleString('de-DE')} €
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{
                      width: `${pct}%`,
                      background: pct > 95 ? 'var(--rose)' : pct > 80 ? 'var(--gold)' : 'var(--green)'
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--taupe)', marginTop: 5 }}>
                    {pct}% · Bezahlt: {spent.toLocaleString('de-DE')} €
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.length === 0 ? (
              <div className="card empty-state"><p>🎉 Alle Zahlungen beglichen!</p></div>
            ) : pending.map(item => {
              const due = item.dueDate ? new Date(item.dueDate) : null;
              const daysUntil = due ? Math.ceil((due - new Date()) / 86400000) : null;
              return (
                <div key={item.id} className="card" style={{ borderLeft: `4px solid ${daysUntil !== null && daysUntil <= 7 ? 'var(--rose)' : 'var(--gold)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.description}</div>
                      <div style={{ fontSize: 12, color: 'var(--taupe)', marginTop: 2 }}>{item.category}</div>
                      {due && (
                        <div style={{ fontSize: 12, color: daysUntil <= 7 ? 'var(--rose)' : 'var(--taupe)', marginTop: 4 }}>
                          {daysUntil !== null && daysUntil <= 0 ? '⚠️ Überfällig!' : daysUntil !== null && daysUntil <= 7 ? `⏰ Fällig in ${daysUntil} Tagen` : `Fällig: ${due.toLocaleDateString('de-DE')}`}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--espresso)' }}>{item.amount.toLocaleString('de-DE')} €</div>
                      <button className="btn btn-sm btn-primary" style={{ marginTop: 8 }} onClick={() => togglePaid(item.id)}>
                        Als bezahlt markieren
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3>{modal === 'add' ? 'Ausgabe hinzufügen' : 'Ausgabe bearbeiten'}</h3>
              <button className="btn-icon" onClick={closeModal}><X size={16} /></button>
            </div>
            <div className="form-group">
              <label>Beschreibung *</label>
              <input className="input" placeholder="z.B. Catering – Dinner" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Kategorie</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Betrag (€) *</label>
                <input className="input" type="number" min="0" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Fälligkeitsdatum</label>
              <input className="input" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={form.paid} onChange={e => setForm(f => ({ ...f, paid: e.target.checked }))} />
                Bereits bezahlt
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={closeModal}>Abbrechen</button>
              <button className="btn btn-primary" onClick={handleSubmit}>{modal === 'add' ? 'Hinzufügen' : 'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

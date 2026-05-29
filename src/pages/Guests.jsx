import { useState } from 'react';
import { IconPlus, IconTrash, IconEdit, IconX, IconSearch } from '@tabler/icons-react';
import { loadState, saveState, defaultGuests } from '../data/store';

const GROUPS = ['Familie Braut', 'Familie Bräutigam', 'Freunde', 'Arbeit', 'Dienstleister', 'Sonstige'];
const MENUS = ['', 'Fleisch', 'Fisch', 'Vegetarisch', 'Vegan', 'Kinder'];
const AV = ['#C4956A','#A8B5A0','#C4B5A5','#8B9E7A','#B8A9C9','#C9A884','#9B8EA0','#B5A88A'];
const ini = n => n.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
const avc = id => AV[id % AV.length];

export default function Guests() {
  const [guests, setGuests] = useState(() => loadState('guests', defaultGuests));
  const [search, setSearch] = useState('');
  const [fGroup, setFGroup] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  function save(updated) { setGuests(updated); saveState('guests', updated); }
  function openAdd() { setForm({ name: '', email: '', group: 'Freunde', status: 'pending', menu: '', note: '' }); setModal('add'); }
  function openEdit(g) { setForm({ ...g }); setModal(g.id); }
  function handleSave() {
    if (!form.name?.trim()) return;
    if (modal === 'add') { save([...guests, { ...form, id: Math.max(0, ...guests.map(g => g.id)) + 1 }]); }
    else { save(guests.map(g => g.id === modal ? { ...form, id: g.id } : g)); }
    setModal(null);
  }
  function del(id) { if (confirm('Gast löschen?')) save(guests.filter(g => g.id !== id)); }

  const filtered = guests.filter(g => {
    const ms = g.name.toLowerCase().includes(search.toLowerCase()) || (g.email || '').toLowerCase().includes(search.toLowerCase());
    return ms && (!fGroup || g.group === fGroup) && (!fStatus || g.status === fStatus);
  });
  const confirmed = guests.filter(g => g.status === 'confirmed').length;
  const SL = { confirmed: 'Zugesagt', pending: 'Ausstehend', declined: 'Abgesagt' };

  return (
    <>
      <div className="topbar">
        <div><h1>Gäste</h1><div className="topbar-sub">RSVP, Menüwahl & Gruppen verwalten</div></div>
        <button className="btn btn-primary" onClick={openAdd}><IconPlus size={15} stroke={2} /> Gast hinzufügen</button>
      </div>
      <div className="page-body">
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[['Gesamt', guests.length, '', 'var(--mocha)'], ['Zugesagt', confirmed, guests.length ? Math.round(confirmed / guests.length * 100) + '%' : '', 'var(--sage)'], ['Ausstehend', guests.filter(g => g.status === 'pending').length, '', 'var(--gold)'], ['Abgesagt', guests.filter(g => g.status === 'declined').length, '', 'var(--blush)']].map(([l, v, s, a]) => (
            <div key={l} className="stat-card" style={{ borderTopColor: a }}>
              <div className="stat-label">{l}</div><div className="stat-value">{v}</div>
              {s && <div className="stat-sub">{s}</div>}
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: 16, padding: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 180px' }}>
              <IconSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--mocha)' }} />
              <input className="input" style={{ paddingLeft: 32 }} placeholder="Gäste suchen…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input" style={{ flex: '0 1 170px' }} value={fGroup} onChange={e => setFGroup(e.target.value)}>
              <option value="">Alle Gruppen</option>{GROUPS.map(g => <option key={g}>{g}</option>)}
            </select>
            <select className="input" style={{ flex: '0 1 150px' }} value={fStatus} onChange={e => setFStatus(e.target.value)}>
              <option value="">Alle Status</option>
              <option value="confirmed">Zugesagt</option>
              <option value="pending">Ausstehend</option>
              <option value="declined">Abgesagt</option>
            </select>
            {(search || fGroup || fStatus) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFGroup(''); setFStatus(''); }}>
                <IconX size={13} stroke={2} /> Reset
              </button>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Gast</th><th>Gruppe</th><th>Status</th><th>Menü</th><th>Notiz</th><th style={{ width: 90 }}>Aktionen</th></tr></thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div className="avatar" style={{ width: 30, height: 30, background: avc(g.id), fontSize: 10 }}>{ini(g.name)}</div>
                      <div><div style={{ fontWeight: 500, fontSize: 13 }}>{g.name}</div><div style={{ fontSize: 11, color: 'var(--mocha)' }}>{g.email || '—'}</div></div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--mocha)' }}>{g.group}</td>
                  <td><span className={`badge badge-${g.status}`}>{SL[g.status]}</span></td>
                  <td style={{ fontSize: 12.5 }}>{g.menu || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--mocha)' }}>{g.note || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-icon" onClick={() => openEdit(g)}><IconEdit size={13} stroke={1.5} /></button>
                      <button className="btn-icon" style={{ background: '#FEE2E2', color: '#991B1B' }} onClick={() => del(g.id)}><IconTrash size={13} stroke={1.5} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '8px 14px', background: 'var(--warm)', fontSize: 11, color: 'var(--mocha)', borderTop: '1px solid var(--sand)' }}>
            {filtered.length} von {guests.length} Gästen
          </div>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3>{modal === 'add' ? 'Gast hinzufügen 🌿' : 'Gast bearbeiten'}</h3>
              <button className="btn-icon" onClick={() => setModal(null)}><IconX size={15} stroke={2} /></button>
            </div>
            <div className="form-group"><label className="form-label">Name *</label><input className="input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">E-Mail</label><input className="input" type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Gruppe</label><select className="input" value={form.group || 'Freunde'} onChange={e => setForm(f => ({ ...f, group: e.target.value }))}>{GROUPS.map(g => <option key={g}>{g}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Status</label><select className="input" value={form.status || 'pending'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option value="confirmed">Zugesagt</option><option value="pending">Ausstehend</option><option value="declined">Abgesagt</option></select></div>
            </div>
            <div className="form-group"><label className="form-label">Menü</label><select className="input" value={form.menu || ''} onChange={e => setForm(f => ({ ...f, menu: e.target.value }))}>{MENUS.map(m => <option key={m} value={m}>{m || '– kein –'}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Notiz</label><input className="input" value={form.note || ''} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={handleSave}>{modal === 'add' ? 'Hinzufügen' : 'Speichern'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

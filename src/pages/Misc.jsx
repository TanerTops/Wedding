import { useState } from 'react';
import { loadState, saveState } from '../data/store';

export function MusicPage() {
  const [songs, setSongs] = useState(() => loadState('music', [
    { id: 1, title: "Can't Help Falling in Love", artist: 'Elvis Presley', type: 'Eröffnungstanz', addedBy: 'Brautpaar' },
    { id: 2, title: 'Perfect', artist: 'Ed Sheeran', type: 'Hintergrundmusik', addedBy: 'Brautpaar' },
    { id: 3, title: 'Marry You', artist: 'Bruno Mars', type: 'Party', addedBy: 'Gast' },
  ]));
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', artist: '', type: 'Party', addedBy: 'Brautpaar' });
  const types = ['Eröffnungstanz', 'Hintergrundmusik', 'Party', 'Einzug', 'Sonstiges'];

  function save(u) { setSongs(u); saveState('music', u); }
  function add() {
    if (!form.title.trim()) return;
    save([...songs, { ...form, id: Math.max(0, ...songs.map(s => s.id)) + 1 }]);
    setModal(false); setForm({ title: '', artist: '', type: 'Party', addedBy: 'Brautpaar' });
  }

  return (
    <>
      <div className="topbar">
        <div><h1>Musik</h1><div className="topbar-sub">{songs.length} Songs in der Playlist 🎵</div></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Song</button>
      </div>
      <div className="page-body">
        {types.map(type => {
          const ts = songs.filter(s => s.type === type);
          if (!ts.length) return null;
          return (
            <div key={type} style={{ marginBottom: 18 }}>
              <div className="section-title">{type}</div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {ts.map((song, i) => (
                  <div key={song.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < ts.length - 1 ? '1px solid #F5EFE4' : 'none' }}>
                    <div style={{ width: 36, height: 36, background: 'var(--warm)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>♪</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{song.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--mocha)' }}>{song.artist}</div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--mocha)' }}>von {song.addedBy}</span>
                    <button className="btn-icon" onClick={() => save(songs.filter(s => s.id !== song.id))}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <h3>Song hinzufügen 🎵</h3>
            <div className="form-group"><label className="form-label">Titel *</label><input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Künstler</label><input className="input" value={form.artist} onChange={e => setForm(f => ({ ...f, artist: e.target.value }))} /></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Typ</label><select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{types.map(t => <option key={t}>{t}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Von</label><input className="input" value={form.addedBy} onChange={e => setForm(f => ({ ...f, addedBy: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={add}>Hinzufügen</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function VenuePage() {
  const [venue, setVenue] = useState(() => loadState('venue', { name: 'Schloss Waldenburg', address: 'Waldenburgstraße 1, 74638 Waldenburg', contact: 'info@schloss-waldenburg.de', phone: '+49 7942 123456', notes: 'Parkplätze vorhanden.' }));
  function save() { saveState('venue', venue); alert('Gespeichert! 🌿'); }
  return (
    <>
      <div className="topbar"><h1>Location</h1></div>
      <div className="page-body">
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="section-title">Location Details</div>
          <div className="form-group"><label className="form-label">Name</label><input className="input" value={venue.name} onChange={e => setVenue(v => ({ ...v, name: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Adresse</label><input className="input" value={venue.address} onChange={e => setVenue(v => ({ ...v, address: e.target.value }))} /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">E-Mail</label><input className="input" value={venue.contact} onChange={e => setVenue(v => ({ ...v, contact: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Telefon</label><input className="input" value={venue.phone} onChange={e => setVenue(v => ({ ...v, phone: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="form-label">Notizen</label><textarea className="input" rows={4} value={venue.notes} onChange={e => setVenue(v => ({ ...v, notes: e.target.value }))} style={{ resize: 'vertical' }} /></div>
          <button className="btn btn-primary" onClick={save}>Speichern</button>
        </div>
      </div>
    </>
  );
}

export function RegistryPage() {
  const [items, setItems] = useState(() => loadState('registry', [
    { id: 1, title: 'Honeymoon-Kasse', desc: 'Beitrag zu unserer Hochzeitsreise', amount: 0, reserved: false, type: 'fund' },
    { id: 2, title: 'Küchenmaschine', desc: 'KitchenAid, Farbe: Creme', amount: 399, reserved: true, type: 'item' },
    { id: 3, title: 'Abendessen zu zweit', desc: 'Ein schöner Restaurant-Abend', amount: 120, reserved: false, type: 'item' },
  ]));
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', desc: '', amount: '', type: 'item' });
  function save(u) { setItems(u); saveState('registry', u); }
  function add() {
    if (!form.title.trim()) return;
    save([...items, { ...form, id: Math.max(0, ...items.map(i => i.id)) + 1, amount: parseFloat(form.amount) || 0, reserved: false }]);
    setModal(false); setForm({ title: '', desc: '', amount: '', type: 'item' });
  }
  return (
    <>
      <div className="topbar"><h1>Geschenke</h1><button className="btn btn-primary" onClick={() => setModal(true)}>+ Geschenk</button></div>
      <div className="page-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => (
            <div key={item.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, background: item.reserved ? '#E8F5E9' : 'var(--warm)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                {item.type === 'fund' ? '✈️' : '🎁'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, textDecoration: item.reserved ? 'line-through' : 'none', color: item.reserved ? 'var(--mocha)' : 'var(--espresso)' }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--mocha)' }}>{item.desc}</div>
              </div>
              {item.amount > 0 && <div style={{ fontWeight: 600 }}>{item.amount.toLocaleString('de-DE')} €</div>}
              <button className={`btn btn-sm ${item.reserved ? 'btn-secondary' : 'btn-primary'}`} onClick={() => save(items.map(i => i.id === item.id ? { ...i, reserved: !i.reserved } : i))}>
                {item.reserved ? 'Freigeben' : 'Reservieren'}
              </button>
              <button className="btn-icon" onClick={() => save(items.filter(i => i.id !== item.id))}>✕</button>
            </div>
          ))}
        </div>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <h3>Geschenk hinzufügen 🎁</h3>
            <div className="form-group"><label className="form-label">Titel *</label><input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Beschreibung</label><input className="input" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} /></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Betrag (€)</label><input className="input" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Typ</label><select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}><option value="item">Artikel</option><option value="fund">Kasse</option></select></div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={add}>Hinzufügen</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function NotesPage() {
  const [notes, setNotes] = useState(() => loadState('notes', ''));
  function save() { saveState('notes', notes); alert('Gespeichert! 🌿'); }
  return (
    <>
      <div className="topbar"><h1>Notizen</h1><button className="btn btn-primary" onClick={save}>Speichern</button></div>
      <div className="page-body">
        <div className="card" style={{ maxWidth: 680 }}>
          <textarea className="input" rows={22} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ideen, Gedanken, Notizen rund um die Hochzeitsplanung..." style={{ resize: 'vertical', lineHeight: 1.8, fontFamily: "'DM Sans', sans-serif" }} />
        </div>
      </div>
    </>
  );
}

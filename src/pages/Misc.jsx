import { useState, useEffect } from 'react';
import { getMusicWishes } from '../lib/db';
import { loadState, saveState } from '../data/store';

export function MusicPage() {
  const [songs, setSongs] = useState(() => loadState('music', [
    { id: 1, title: "Can't Help Falling in Love", artist: 'Elvis Presley', type: 'Eröffnungstanz', addedBy: 'Brautpaar' },
    { id: 2, title: 'Perfect', artist: 'Ed Sheeran', type: 'Hintergrundmusik', addedBy: 'Brautpaar' },
  ]));
  const [wishes, setWishes] = useState([]);
  const [tab, setTab] = useState('playlist');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', artist: '', type: 'Party', addedBy: 'Brautpaar' });
  const types = ['Eröffnungstanz', 'Einzug', 'Hintergrundmusik', 'Party', 'Sonstiges'];

  // Load wishes from Supabase
  useEffect(() => {
    getMusicWishes().then(({ data }) => {
      if (data) setWishes(data);
    });
  }, []);

  function saveSongs(u) { setSongs(u); saveState('music', u); }

  function addSong() {
    if (!form.title.trim()) return;
    saveSongs([...songs, { ...form, id: Math.max(0, ...songs.map(s => s.id)) + 1 }]);
    setModal(false);
    setForm({ title: '', artist: '', type: 'Party', addedBy: 'Brautpaar' });
  }

  function importWish(wish) {
    const songList = Array.isArray(wish.songs) ? wish.songs : [];
    let updated = [...songs];
    let nextId = Math.max(0, ...updated.map(s => s.id)) + 1;
    songList.forEach(s => {
      if (s.title?.trim()) {
        updated.push({ id: nextId++, title: s.title, artist: s.artist || '', type: 'Party', addedBy: wish.sender_name || 'Gast' });
      }
    });
    saveSongs(updated);
  }

  const fmtDate = d => { try { return new Date(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }};

  return (
    <>
      <div className="topbar">
        <div><h1>Musik</h1><div className="topbar-sub">{songs.length} Songs in der Playlist</div></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Song</button>
      </div>
      <div className="page-body">
        <div className="tabs" style={{ marginBottom: 18 }}>
          <button className={`tab${tab==='playlist'?' active':''}`} onClick={() => setTab('playlist')}>Playlist</button>
          <button className={`tab${tab==='wishes'?' active':''}`} onClick={() => setTab('wishes')}>
            Gästewünsche
            {wishes.length > 0 && <span style={{ marginLeft: 6, background: 'var(--terra)', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{wishes.length}</span>}
          </button>
        </div>

        {tab === 'playlist' && (
          <>
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
                        <button className="btn-icon" onClick={() => saveSongs(songs.filter(s => s.id !== song.id))}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {songs.length === 0 && (
              <div className="card empty-state"><p>Noch keine Songs — füge den ersten hinzu!</p></div>
            )}
          </>
        )}

        {tab === 'wishes' && (
          <div>
            {wishes.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🎵</div>
                <p style={{ color: 'var(--mocha)' }}>Noch keine Musikwünsche von Gästen</p>
              </div>
            ) : wishes.map(wish => {
              const songList = Array.isArray(wish.songs) ? wish.songs : [];
              return (
                <div key={wish.id} className="card" style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--espresso)' }}>
                        {wish.sender_name || 'Anonymer Gast'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--mocha)', marginTop: 2 }}>
                        🕐 {fmtDate(wish.submitted_at)} · {songList.length} Song{songList.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => importWish(wish)}>
                      + In Playlist übernehmen
                    </button>
                  </div>
                  {songList.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < songList.length - 1 ? '1px solid var(--sand)' : 'none' }}>
                      <span style={{ fontSize: 16 }}>♪</span>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--espresso)' }}>{s.title}</div>
                        {s.artist && <div style={{ fontSize: 12, color: 'var(--mocha)' }}>{s.artist}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
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
              <button className="btn btn-primary" onClick={addSong}>Hinzufügen</button>
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

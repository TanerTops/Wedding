import { useState, useEffect } from 'react';
import { getMusicWishes, getRegistry, upsertRegistryItem, deleteRegistryItem, getPlaylistSongs, upsertPlaylistSong, deletePlaylistSong } from '../lib/db';
import { supabase, hasSupabase } from '../lib/supabase';
import { loadState, saveState } from '../data/store';
import Moodboard from '../components/Moodboard';

const DEFAULT_SONGS = [
  { id: 1, title: "Can't Help Falling in Love", artist: 'Elvis Presley', type: 'Eröffnungstanz', addedBy: 'Brautpaar' },
  { id: 2, title: 'Perfect', artist: 'Ed Sheeran', type: 'Hintergrundmusik', addedBy: 'Brautpaar' },
];

export function MusicPage() {
  const [songs, setSongs] = useState(() => loadState('music', DEFAULT_SONGS));
  const [wishes, setWishes] = useState([]);
  const [importedWishes, setImportedWishes] = useState(() => loadState('importedWishes', []));
  const [tab, setTab] = useState('playlist');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', artist: '', type: 'Party', addedBy: 'Brautpaar' });
  const types = ['Eröffnungstanz', 'Einzug', 'Hintergrundmusik', 'Party', 'Sonstiges'];

  // Load wishes + playlist from Supabase (was: playlist only lived in localStorage,
  // so songs vanished on other devices/browsers — now synced per account)
  useEffect(() => {
    getMusicWishes().then(({ data }) => {
      if (data) setWishes(data);
    });
    getPlaylistSongs().then(async ({ data, error }) => {
      if (error) {
        // Table not reachable yet (e.g. migration not run) — keep showing
        // whatever is in localStorage instead of wiping the list.
        console.warn('[WeddingBuddy] playlist_songs not available yet, staying on local data:', error.message || error);
        return;
      }
      if (data && data.length > 0) {
        setSongs(data);
        saveState('music', data);
      } else if (hasSupabase()) {
        // Table exists and is genuinely empty for this account — one-time
        // migration: push any locally-stored songs up to Supabase.
        const local = loadState('music', []);
        if (local.length > 0) {
          await Promise.all(local.map(s => upsertPlaylistSong({ ...s, id: s.id && String(s.id).length > 10 ? s.id : crypto.randomUUID() })));
          const { data: refreshed, error: refreshErr } = await getPlaylistSongs();
          if (!refreshErr && refreshed) { setSongs(refreshed); saveState('music', refreshed); }
        }
      }
    });
  }, []);

  function saveSongs(u) { setSongs(u); saveState('music', u); }

  async function addSong() {
    if (!form.title.trim()) return;
    const newSong = { ...form, id: crypto.randomUUID() };
    saveSongs([...songs, newSong]);
    setModal(false);
    setForm({ title: '', artist: '', type: 'Party', addedBy: 'Brautpaar' });
    await upsertPlaylistSong(newSong);
  }

  async function removeSong(id) {
    saveSongs(songs.filter(s => s.id !== id));
    await deletePlaylistSong(id);
  }

  async function importWish(wish) {
    const songList = Array.isArray(wish.songs) ? wish.songs : [];
    const newSongs = songList
      .filter(s => s.title?.trim())
      .map(s => ({ id: crypto.randomUUID(), title: s.title, artist: s.artist || '', type: 'Party', addedBy: wish.sender_name || 'Gast' }));
    const updated = [...songs, ...newSongs];
    saveSongs(updated);
    await Promise.all(newSongs.map(s => upsertPlaylistSong(s)));
    // Mark wish as imported
    const updated2 = [...importedWishes, wish.id];
    setImportedWishes(updated2);
    saveState('importedWishes', updated2);
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
            {wishes.filter(w => !importedWishes.includes(w.id)).length > 0 && <span style={{ marginLeft: 6, background: 'var(--terra)', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{wishes.filter(w => !importedWishes.includes(w.id)).length}</span>}
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
                        <button className="btn-icon" onClick={() => removeSong(song.id)}>✕</button>
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
                    <button 
                      className={`btn btn-sm ${importedWishes.includes(wish.id) ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => !importedWishes.includes(wish.id) && importWish(wish)}
                      disabled={importedWishes.includes(wish.id)}
                      style={{ opacity: importedWishes.includes(wish.id) ? 0.6 : 1, cursor: importedWishes.includes(wish.id) ? 'default' : 'pointer' }}
                    >
                      {importedWishes.includes(wish.id) ? '✓ Hinzugefügt' : '+ In Playlist übernehmen'}
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
  const [venue, setVenue] = useState({ name: '', address: '', contact: '', phone: '', notes: '' });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from weddings table (venue is part of wedding data)
    if (hasSupabase()) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) { setLoading(false); return; }
        supabase.from('weddings').select('venue, venue_address, venue_contact, venue_phone, venue_notes')
          .eq('user_id', user.id).limit(1).single()
          .then(({ data }) => {
            if (data) setVenue({
              name:    data.venue || '',
              address: data.venue_address || '',
              contact: data.venue_contact || '',
              phone:   data.venue_phone || '',
              notes:   data.venue_notes || '',
            });
            setLoading(false);
          });
      });
    } else {
      setVenue(loadState('venue', { name: '', address: '', contact: '', phone: '', notes: '' }));
      setLoading(false);
    }
  }, []);

  async function save() {
    saveState('venue', venue);
    if (hasSupabase()) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('weddings').update({
          venue:         venue.name,
          venue_address: venue.address,
          venue_contact: venue.contact,
          venue_phone:   venue.phone,
          venue_notes:   venue.notes,
        }).eq('user_id', user.id);
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <div className="topbar">
        <div><h1>Location</h1><div className="topbar-sub">Venue & Anfahrt</div></div>
        <button className="btn btn-primary" onClick={save}>{saved ? '✓ Gespeichert' : 'Speichern'}</button>
      </div>
      <div className="page-body">
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--mocha)' }}>Wird geladen...</div>
        ) : (
          <div className="card" style={{ maxWidth: 560 }}>
            <div className="section-title" style={{ marginBottom: 16 }}>Location Details</div>
            <div className="form-group"><label className="form-label">Name</label><input className="input" placeholder="z.B. Schloss Waldenburg" value={venue.name} onChange={e => setVenue(v => ({ ...v, name: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Adresse</label><input className="input" placeholder="Straße, PLZ Ort" value={venue.address} onChange={e => setVenue(v => ({ ...v, address: e.target.value }))} /></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">E-Mail</label><input className="input" type="email" value={venue.contact} onChange={e => setVenue(v => ({ ...v, contact: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Telefon</label><input className="input" type="tel" value={venue.phone} onChange={e => setVenue(v => ({ ...v, phone: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label className="form-label">Notizen / Anfahrt</label><textarea className="input" rows={4} value={venue.notes} onChange={e => setVenue(v => ({ ...v, notes: e.target.value }))} style={{ resize: 'vertical' }} placeholder="Parkplätze, ÖPNV, Hinweise..." /></div>
            {venue.address && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent(venue.address)}`} target="_blank" rel="noopener"
                className="btn btn-secondary btn-sm" style={{ marginTop: 4 }}>
                🗺 In Google Maps öffnen
              </a>
            )}
          </div>
        )}

        <Moodboard page="venue" title="Moodboard" />
      </div>
    </>
  );
}

export function RegistryPage() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', amount: '', type: 'item', link: '' });

  useEffect(() => {
    getRegistry().then(({ data }) => {
      if (data && data.length > 0) {
        setItems(data);
        saveState('registry', data);
      }
    });
  }, []);

  async function add() {
    if (!form.title.trim()) return;
    const item = { ...form, amount: parseFloat(form.amount) || 0, reserved: false, id: crypto.randomUUID() };
    setItems(prev => [...prev, item]);
    saveState('registry', [...items, item]);
    await upsertRegistryItem(item);
    setModal(false);
    setForm({ title: '', description: '', amount: '', type: 'item', link: '' });
  }

  async function toggleReserved(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const updated = items.map(i => i.id === id ? { ...i, reserved: !i.reserved } : i);
    setItems(updated);
    saveState('registry', updated);
    await upsertRegistryItem({ ...item, reserved: !item.reserved });
  }

  async function remove(id) {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    saveState('registry', updated);
    await deleteRegistryItem(id);
  }

  const reserved = items.filter(i => i.reserved).length;
  const total = items.reduce((s, i) => s + (i.amount || 0), 0);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Geschenkeliste</h1>
          <div className="topbar-sub">{items.length} Wünsche · {reserved} reserviert · {total.toLocaleString('de-DE')} € Gesamtwert</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Wunsch</button>
      </div>
      <div className="page-body">
        {items.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🎁</div>
            <p style={{ color: 'var(--mocha)' }}>Noch keine Wünsche — füge deinen ersten hinzu!</p>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => (
            <div key={item.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: item.reserved ? 0.7 : 1, flexWrap: 'wrap' }}>
              <div style={{ width: 46, height: 46, background: item.reserved ? '#E8F5E9' : 'var(--warm)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {item.type === 'fund' ? '✈️' : '🎁'}
              </div>
              <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, textDecoration: item.reserved ? 'line-through' : 'none', color: item.reserved ? 'var(--mocha)' : 'var(--espresso)' }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--mocha)', marginTop: 1 }}>{item.description || item.desc}</div>
                {item.link && <a href={item.link} target="_blank" rel="noopener" style={{ fontSize: 11, color: 'var(--terra)' }}>🔗 Link</a>}
              </div>
              {item.amount > 0 && <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--espresso)', flexShrink: 0 }}>{item.amount.toLocaleString('de-DE')} €</div>}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 'auto' }}>
                <button className={`btn btn-sm ${item.reserved ? 'btn-secondary' : 'btn-primary'}`} onClick={() => toggleReserved(item.id)}>
                  {item.reserved ? '↩ Freigeben' : '✓ Reservieren'}
                </button>
                <button className="btn-icon" style={{ background: '#FEE2E2', color: '#991B1B', padding: '5px 7px' }} onClick={() => remove(item.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <h3>Wunsch hinzufügen 🎁</h3>
            <div className="form-group"><label className="form-label">Titel *</label><input className="input" placeholder="z.B. Küchenmaschine" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Beschreibung</label><input className="input" placeholder="Details, Farbe, Modell..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">Betrag (€)</label><input className="input" type="number" placeholder="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Typ</label>
                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="item">Artikel 🎁</option>
                  <option value="fund">Kasse ✈️</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Link (optional)</label><input className="input" placeholder="https://..." value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} /></div>
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
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabase()) { setLoading(false); return; }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      supabase.from('notes').select('id, content').eq('user_id', user.id).limit(1).single().then(({ data }) => {
      if (data?.content) {
        setNotes(data.content);
        saveState('notes', data.content);
      }
        setLoading(false);
      });
    });
  }, []);

  async function save() {
    saveState('notes', notes);
    if (hasSupabase()) {
      const { data } = await supabase.from('notes').select('id').limit(1).single();
      if (data?.id) {
        await supabase.from('notes').update({ content: notes, updated_at: new Date().toISOString() }).eq('id', data.id);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('notes').insert({ content: notes, user_id: user?.id });
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <div className="topbar">
        <div><h1>Notizen</h1><div className="topbar-sub">Ideen, Gedanken, alles rund um eure Hochzeit</div></div>
        <button className="btn btn-primary" onClick={save}>
          {saved ? '✓ Gespeichert' : 'Speichern'}
        </button>
      </div>
      <div className="page-body">
        <div className="card" style={{ maxWidth: 680 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--mocha)' }}>Wird geladen...</div>
          ) : (
            <textarea
              className="input" rows={24} value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ideen, Gedanken, Notizen rund um die Hochzeitsplanung..."
              style={{ resize: 'vertical', lineHeight: 1.8, fontFamily: "'DM Sans', sans-serif" }}
            />
          )}
        </div>
      </div>
    </>
  );
}

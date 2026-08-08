import { useState, useEffect, useRef } from 'react';
import { IconPlus, IconLink, IconTrash, IconX } from '@tabler/icons-react';
import { getMoodboardItems, uploadMoodboardImage, addMoodboardLink, deleteMoodboardItem } from '../lib/db';

// Reusable moodboard/inspiration board — used on Location (Venue) and Fotoplanung (Photos).
// `page` scopes items in the DB ('venue' | 'photos'), so both boards stay independent.
export default function Moodboard({ page, title = 'Moodboard' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkInput, setLinkInput] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    getMoodboardItems(page).then(({ data }) => { setItems(data || []); setLoading(false); });
  }, [page]);

  async function handleFiles(files) {
    if (!files || !files.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const { data, error } = await uploadMoodboardImage(file, page);
      if (!error && data) setItems(prev => [...prev, data]);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleAddLink(e) {
    e.preventDefault();
    const url = linkInput.trim();
    if (!url) return;
    const { data, error } = await addMoodboardLink(url, page);
    if (!error && data) setItems(prev => [...prev, data]);
    setLinkInput('');
    setShowLinkForm(false);
  }

  async function handleDelete(item) {
    setItems(prev => prev.filter(i => i.id !== item.id));
    await deleteMoodboardItem(item.id, page, item.storage_path);
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="section-title" style={{ margin: 0 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--mocha)', marginTop: 2 }}>Bilder hochladen oder Links (z.B. Pinterest) einfügen</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowLinkForm(s => !s)}>
            <IconLink size={14} stroke={1.5} /> Link
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <IconPlus size={14} stroke={2} /> {uploading ? 'Lädt…' : 'Bild'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)} />
        </div>
      </div>

      {showLinkForm && (
        <form onSubmit={handleAddLink} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            className="input" type="url" required autoFocus
            placeholder="Bild-URL einfügen (z.B. von Pinterest oder Instagram)…"
            value={linkInput} onChange={e => setLinkInput(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary btn-sm">Hinzufügen</button>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--mocha)', fontSize: 13.5 }}>Wird geladen…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--mocha)', fontSize: 13.5 }}>
          Noch keine Inspirationsbilder — füge Bilder oder Links hinzu, um euer Moodboard zu füllen.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
          {items.map(item => (
            <div
              key={item.id}
              onClick={() => setLightbox(item)}
              style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--sand)', cursor: 'pointer', background: 'var(--cream)' }}
            >
              <img src={item.url} alt={item.caption || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button
                type="button"
                onClick={e => { e.stopPropagation(); handleDelete(item); }}
                title="Entfernen"
                style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <IconTrash size={12} stroke={2} />
              </button>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <img src={lightbox.url} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <IconX size={20} stroke={2} />
          </button>
        </div>
      )}
    </div>
  );
}

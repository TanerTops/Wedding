import { useState, useRef, useEffect } from 'react';
import { IconPhoto, IconUpload, IconTrash, IconEye, IconEyeOff, IconX, IconPlus, IconTag, IconEdit } from '@tabler/icons-react';
import { loadState, saveState } from '../data/store';
import { getPhotos, updatePhoto, deletePhoto as dbDeletePhoto, uploadPhoto } from '../lib/db';

const DEFAULT_CATEGORIES = [
  { id: 'getting-ready', label: 'Getting Ready', emoji: '💄', color: '#C4956A' },
  { id: 'ceremony',      label: 'Zeremonie',     emoji: '💒', color: '#A8B5A0' },
  { id: 'couple',        label: 'Paarfotos',     emoji: '💑', color: '#C9A884' },
  { id: 'family',        label: 'Familie',       emoji: '👨‍👩‍👧‍👦', color: '#B8A9C9' },
  { id: 'reception',     label: 'Empfang',       emoji: '🥂', color: '#C4B5A5' },
  { id: 'dinner',        label: 'Dinner',        emoji: '🍽️', color: '#8B9E7A' },
  { id: 'party',         label: 'Party',         emoji: '🎉', color: '#C4956A' },
  { id: 'details',       label: 'Details & Deko',emoji: '🌸', color: '#B5A88A' },
  { id: 'other',         label: 'Sonstiges',     emoji: '📷', color: '#A89880' },
];

const DEMO_PHOTOS = [
  { id:1, url:'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80', thumb:'https://images.unsplash.com/photo-1519741497674-611481863552?w=300&q=70', name:'Getting Ready', uploader:'Sarah', uploadedBy:'admin', approved:true, date:'2026-10-15', category:'getting-ready' },
  { id:2, url:'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80', thumb:'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=300&q=70', name:'Die Zeremonie', uploader:'Tobias', uploadedBy:'admin', approved:true, date:'2026-10-15', category:'ceremony' },
  { id:3, url:'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=600&q=80', thumb:'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=300&q=70', name:'Tischdekoration', uploader:'Anna L.', uploadedBy:'guest', approved:false, date:'2026-10-15', category:'details' },
  { id:4, url:'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80', thumb:'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=70', name:'Party & Tanzfläche', uploader:'Michael B.', uploadedBy:'guest', approved:false, date:'2026-10-16', category:'party' },
  { id:5, url:'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80', thumb:'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=300&q=70', name:'Brautstrauß', uploader:'Sophie W.', uploadedBy:'guest', approved:true, date:'2026-10-15', category:'details' },
  { id:6, url:'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=80', thumb:'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=300&q=70', name:'Abendstimmung', uploader:'Klaus S.', uploadedBy:'guest', approved:false, date:'2026-10-15', category:'reception' },
];

export default function Memories() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPhotos().then(({ data }) => {
      if (data && data.length > 0) {
        setPhotos(data);
        saveState('memories', data);
      }
      setLoading(false);
    });
  }, []);
  const [categories, setCategories] = useState(() => loadState('memoryCategories', DEFAULT_CATEGORIES));
  const [activeTab, setActiveTab] = useState('all');      // 'all' | categoryId | 'pending' | 'guest'
  const [viewMode, setViewMode] = useState('grid');       // 'grid' | 'category'
  const [lightbox, setLightbox] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(null); // photo id being category-edited
  const [addCatModal, setAddCatModal] = useState(false);
  const [newCat, setNewCat] = useState({ label: '', emoji: '📷', color: '#C4956A' });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  function savePhotos(p) { setPhotos(p); saveState('memories', p); }
  function saveCats(c) { setCategories(c); saveState('memoryCategories', c); }

  async function toggleApproved(id) {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;
    const newApproved = !photo.approved;
    savePhotos(photos.map(p => p.id === id ? { ...p, approved: newApproved } : p));
    await updatePhoto(id, { approved: newApproved });
  }
  async function deletePhoto(id) {
    if (!confirm('Foto löschen?')) return;
    const photo = photos.find(p => p.id === id);
    savePhotos(photos.filter(p => p.id !== id));
    await dbDeletePhoto(id, photo?.storage_path);
  }
  async function setCategory(photoId, catId) {
    savePhotos(photos.map(p => p.id === photoId ? { ...p, category: catId } : p));
    await updatePhoto(photoId, { category: catId });
    setEditingPhoto(null);
  }

  function addCategory() {
    if (!newCat.label.trim()) return;
    const id = newCat.label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    saveCats([...categories, { ...newCat, id: id + '-' + Date.now() }]);
    setNewCat({ label: '', emoji: '📷', color: '#C4956A' });
    setAddCatModal(false);
  }

  function deleteCategory(id) {
    if (!confirm('Kategorie löschen? Fotos werden zu "Sonstiges" verschoben.')) return;
    savePhotos(photos.map(p => p.category === id ? { ...p, category: 'other' } : p));
    saveCats(categories.filter(c => c.id !== id));
  }

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const category = activeTab !== 'all' && activeTab !== 'pending' && activeTab !== 'guest' ? activeTab : 'other';
    for (const file of files) {
      const { data, error } = await uploadPhoto(file, 'Admin', 'admin');
      if (data) {
        const photo = { ...data, category, approved: true };
        await updatePhoto(data.id, { category, approved: true });
        setPhotos(prev => [photo, ...prev]);
      }
    }
    setUploading(false);
    // Reload from DB
    const { data } = await getPhotos();
    if (data) { setPhotos(data); saveState('memories', data); }
  }

  // Filter photos based on active tab
  const filteredPhotos = activeTab === 'all' ? photos
    : activeTab === 'pending' ? photos.filter(p => !p.approved)
    : activeTab === 'guest' ? photos.filter(p => p.uploadedBy === 'guest')
    : photos.filter(p => p.category === activeTab);

  const pending = photos.filter(p => !p.approved).length;
  const approved = photos.filter(p => p.approved).length;
  const guestUploads = photos.filter(p => p.uploadedBy === 'guest').length;

  const getCat = id => categories.find(c => c.id === id) || { label: 'Sonstiges', emoji: '📷', color: '#A89880' };

  const EMOJIS = ['📷','💄','💒','💑','👨‍👩‍👧','🥂','🍽️','🎉','🌸','✨','🎵','🌿','💐','🎂','🥳','🤍'];
  const COLORS = ['#C4956A','#A8B5A0','#C9A884','#B8A9C9','#C4B5A5','#8B9E7A','#B5A88A','#C4956A','#9B8EA0','#D4C4A8'];

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Erinnerungen</h1>
          <div className="topbar-sub">
            {photos.length} Fotos · {approved} freigegeben
            {pending > 0 && <> · <span style={{ color: 'var(--terra)' }}>{pending} ausstehend</span></>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileUpload} />
          <button className="btn btn-secondary btn-sm" onClick={() => setViewMode(v => v === 'grid' ? 'category' : 'grid')}>
            {viewMode === 'grid' ? '⊞ Kategorien' : '⊟ Galerie'}
          </button>
          <button className="btn btn-primary" onClick={() => fileRef.current.click()} disabled={uploading}>
            <IconUpload size={15} stroke={2} /> {uploading ? 'Lädt...' : 'Fotos'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--mocha)' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📷</div>
            <p>Fotos werden geladen...</p>
          </div>
        )}
        {!loading && <>
        {/* Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
          {[
            { label: 'Gesamt', value: photos.length, color: 'var(--mocha)' },
            { label: 'Freigegeben', value: approved, color: 'var(--sage)' },
            { label: 'Ausstehend', value: pending, color: 'var(--terra)' },
            { label: 'Gäste-Uploads', value: guestUploads, color: 'var(--gold)' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ borderTopColor: s.color }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>

        {/* CATEGORY VIEW */}
        {viewMode === 'category' ? (
          <div>
            {/* Category management */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'center' }}>
              {categories.map(cat => {
                const count = photos.filter(p => p.category === cat.id).length;
                return (
                  <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid var(--sand)', borderRadius: 30, padding: '5px 12px 5px 10px' }}>
                    <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--espresso)' }}>{cat.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--mocha)', background: 'var(--warm)', borderRadius: 20, padding: '1px 7px' }}>{count}</span>
                    {cat.id !== 'other' && (
                      <button onClick={() => deleteCategory(cat.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--mocha)', fontSize: 11, padding: 0 }}>✕</button>
                    )}
                  </div>
                );
              })}
              <button className="btn btn-secondary btn-sm" onClick={() => setAddCatModal(true)}>
                <IconPlus size={12} stroke={2} /> Kategorie
              </button>
            </div>

            {/* Photos grouped by category */}
            {categories.map(cat => {
              const catPhotos = photos.filter(p => p.category === cat.id);
              if (catPhotos.length === 0) return null;
              return (
                <div key={cat.id} style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                    <h3 style={{ fontSize: 18, color: 'var(--espresso)' }}>{cat.label}</h3>
                    <span style={{ fontSize: 12, color: 'var(--mocha)', background: 'var(--warm)', borderRadius: 20, padding: '2px 9px', border: '1px solid var(--sand)' }}>{catPhotos.length}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                    {catPhotos.map(photo => <PhotoCard key={photo.id} photo={photo} categories={categories} getCat={getCat} onApprove={() => toggleApproved(photo.id)} onDelete={() => deletePhoto(photo.id)} onLightbox={() => setLightbox(photo)} onEditCat={() => setEditingPhoto(editingPhoto === photo.id ? null : photo.id)} editingCat={editingPhoto === photo.id} onSetCat={catId => setCategory(photo.id, catId)} />)}
                  </div>
                </div>
              );
            })}

            {/* Uncategorised */}
            {(() => {
              const uncat = photos.filter(p => !p.category || !categories.find(c => c.id === p.category));
              if (uncat.length === 0) return null;
              return (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>📂</span>
                    <h3 style={{ fontSize: 18, color: 'var(--espresso)' }}>Nicht kategorisiert</h3>
                    <span style={{ fontSize: 12, color: 'var(--mocha)', background: 'var(--warm)', borderRadius: 20, padding: '2px 9px', border: '1px solid var(--sand)' }}>{uncat.length}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                    {uncat.map(photo => <PhotoCard key={photo.id} photo={photo} categories={categories} getCat={getCat} onApprove={() => toggleApproved(photo.id)} onDelete={() => deletePhoto(photo.id)} onLightbox={() => setLightbox(photo)} onEditCat={() => setEditingPhoto(editingPhoto === photo.id ? null : photo.id)} editingCat={editingPhoto === photo.id} onSetCat={catId => setCategory(photo.id, catId)} />)}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* GRID VIEW */
          <>
            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {[
                { id: 'all', label: 'Alle', count: photos.length },
                { id: 'pending', label: 'Ausstehend', count: pending },
                { id: 'guest', label: 'Gäste', count: guestUploads },
                ...categories.map(c => ({ id: c.id, label: c.emoji + ' ' + c.label, count: photos.filter(p => p.category === c.id).length })).filter(c => c.count > 0),
              ].map(tab => (
                <button key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '5px 14px', borderRadius: 30, border: '1px solid var(--sand)',
                    background: activeTab === tab.id ? 'var(--brown)' : '#fff',
                    color: activeTab === tab.id ? '#fff' : 'var(--mocha)',
                    fontSize: 12.5, fontWeight: activeTab === tab.id ? 500 : 400,
                    cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .15s',
                  }}>
                  {tab.label} {tab.count > 0 && <span style={{ opacity: 0.75 }}>({tab.count})</span>}
                </button>
              ))}
            </div>

            {filteredPhotos.length === 0 ? (
              <div className="card empty-state">
                <IconPhoto size={40} style={{ color: 'var(--taupe)', margin: '0 auto 10px' }} />
                <p>Keine Fotos in dieser Ansicht</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                {filteredPhotos.map(photo => <PhotoCard key={photo.id} photo={photo} categories={categories} getCat={getCat} onApprove={() => toggleApproved(photo.id)} onDelete={() => deletePhoto(photo.id)} onLightbox={() => setLightbox(photo)} onEditCat={() => setEditingPhoto(editingPhoto === photo.id ? null : photo.id)} editingCat={editingPhoto === photo.id} onSetCat={catId => setCategory(photo.id, catId)} />)}
              </div>
            )}
          </>
        )}
        </>}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setLightbox(null)}>
          <button style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
            onClick={() => setLightbox(null)}>
            <IconX size={18} stroke={2} />
          </button>
          {/* Approve toggle */}
          <button style={{ position: 'absolute', top: 16, right: 64, background: lightbox.approved ? 'rgba(110,231,183,0.2)' : 'rgba(252,211,77,0.2)', border: `1px solid ${lightbox.approved ? 'rgba(110,231,183,0.4)' : 'rgba(252,211,77,0.4)'}`, borderRadius: 30, padding: '6px 14px', cursor: 'pointer', color: '#fff', fontSize: 13, fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={e => { e.stopPropagation(); toggleApproved(lightbox.id); setLightbox(p => ({...p, approved: !p.approved})); }}>
            {lightbox.approved ? <><IconEyeOff size={14} stroke={2}/> Verstecken</> : <><IconEye size={14} stroke={2}/> Freigeben</>}
          </button>
          <img src={lightbox.url} alt={lightbox.name}
            style={{ maxWidth: '88vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 8 }}
            onClick={e => e.stopPropagation()}
          />
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', color: '#fff', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{lightbox.name}</div>
            <div style={{ fontSize: 12, opacity: 0.55, marginTop: 3 }}>
              {getCat(lightbox.category).emoji} {getCat(lightbox.category).label} · von {lightbox.uploader} · {lightbox.approved ? '✓ Freigegeben' : '○ Ausstehend'}
            </div>
          </div>
        </div>
      )}

      {/* Add category modal */}
      {addCatModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAddCatModal(false)}>
          <div className="modal">
            <h3>Kategorie hinzufügen</h3>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="input" placeholder="z.B. Getting Ready" value={newCat.label} onChange={e => setNewCat(n => ({...n, label: e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Emoji</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {EMOJIS.map(em => (
                  <button key={em} onClick={() => setNewCat(n => ({...n, emoji: em}))}
                    style={{ width: 36, height: 36, fontSize: 18, border: `2px solid ${newCat.emoji === em ? 'var(--terra)' : 'var(--sand)'}`, borderRadius: 8, background: newCat.emoji === em ? '#FDF5E8' : '#fff', cursor: 'pointer' }}>
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Farbe</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLORS.map(col => (
                  <div key={col} onClick={() => setNewCat(n => ({...n, color: col}))}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: col, cursor: 'pointer', border: `3px solid ${newCat.color === col ? 'var(--espresso)' : 'transparent'}` }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn btn-secondary" onClick={() => setAddCatModal(false)}>Abbrechen</button>
              <button className="btn btn-primary" onClick={addCategory}>Hinzufügen</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Photo Card ────────────────────────────────────────────────────
function PhotoCard({ photo, categories, getCat, onApprove, onDelete, onLightbox, onEditCat, editingCat, onSetCat }) {
  const cat = getCat(photo.category);
  return (
    <div className="card" style={{ padding: 0, overflow: 'visible', position: 'relative' }}>
      {/* Image */}
      <div style={{ position: 'relative', paddingTop: '75%', background: 'var(--sand)', borderRadius: '14px 14px 0 0', overflow: 'hidden', cursor: 'pointer' }}
        onClick={onLightbox}>
        <img src={photo.thumb} alt={photo.name}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.style.display='none'; }}
        />
        {/* Status badge */}
        <div style={{ position: 'absolute', top: 6, left: 6, background: photo.approved ? 'rgba(52,211,153,0.88)' : 'rgba(251,191,36,0.88)', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 600, color: '#fff', backdropFilter: 'blur(4px)' }}>
          {photo.approved ? '✓' : '○'}
        </div>
        {/* Guest badge */}
        {photo.uploadedBy === 'guest' && (
          <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(196,149,106,0.88)', borderRadius: 20, padding: '2px 7px', fontSize: 10, fontWeight: 600, color: '#fff' }}>
            Gast
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '9px 10px 10px' }}>
        <div style={{ fontWeight: 500, fontSize: 12.5, color: 'var(--espresso)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.name}</div>
        <div style={{ fontSize: 11, color: 'var(--mocha)', marginBottom: 8 }}>von {photo.uploader}</div>

        {/* Category pill */}
        <div style={{ position: 'relative' }}>
          <button onClick={onEditCat}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: cat.color + '18', border: `1px solid ${cat.color}44`, borderRadius: 20, padding: '3px 9px', fontSize: 11, color: 'var(--espresso)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", width: '100%', marginBottom: 8 }}>
            <span>{cat.emoji}</span>
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.label}</span>
            <IconTag size={11} stroke={1.5} style={{ color: 'var(--mocha)', flexShrink: 0 }} />
          </button>

          {/* Category dropdown */}
          {editingCat && (
            <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--sand)', borderRadius: 12, boxShadow: '0 4px 20px rgba(91,61,30,0.15)', zIndex: 50, maxHeight: 180, overflowY: 'auto', padding: 4 }}>
              {categories.map(c => (
                <div key={c.id} onClick={() => onSetCat(c.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', background: photo.category === c.id ? 'var(--warm)' : 'transparent', fontSize: 12.5 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--warm)'}
                  onMouseLeave={e => e.currentTarget.style.background = photo.category === c.id ? 'var(--warm)' : 'transparent'}>
                  <span>{c.emoji}</span>
                  <span style={{ color: 'var(--espresso)' }}>{c.label}</span>
                  {photo.category === c.id && <span style={{ marginLeft: 'auto', color: 'var(--sage)', fontSize: 12 }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={onApprove}
            className={`btn btn-sm ${photo.approved ? 'btn-secondary' : 'btn-primary'}`}
            style={{ flex: 1, justifyContent: 'center', fontSize: 11.5 }}>
            {photo.approved ? <><IconEyeOff size={11} stroke={2}/> Verstecken</> : <><IconEye size={11} stroke={2}/> Freigeben</>}
          </button>
          <button className="btn-icon" style={{ background: '#FEE2E2', color: '#991B1B', padding: '5px 7px' }} onClick={onDelete}>
            <IconTrash size={12} stroke={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';
import { IconPhoto, IconUpload, IconTrash, IconEye, IconEyeOff, IconDownload, IconCheck, IconX, IconShare } from '@tabler/icons-react';
import { loadState, saveState } from '../data/store';

const DEMO_PHOTOS = [
  { id:1, url:'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80', thumb:'https://images.unsplash.com/photo-1519741497674-611481863552?w=300&q=70', name:'Getting Ready', uploader:'Sarah', uploadedBy:'admin', approved:true, date:'2026-10-15' },
  { id:2, url:'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80', thumb:'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=300&q=70', name:'Die Zeremonie', uploader:'Tobias', uploadedBy:'admin', approved:true, date:'2026-10-15' },
  { id:3, url:'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=600&q=80', thumb:'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=300&q=70', name:'Tischdekoration', uploader:'Anna L.', uploadedBy:'guest', approved:false, date:'2026-10-15' },
  { id:4, url:'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80', thumb:'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=70', name:'Party & Tanzfläche', uploader:'Michael B.', uploadedBy:'guest', approved:false, date:'2026-10-16' },
  { id:5, url:'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80', thumb:'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=300&q=70', name:'Brautstrauß', uploader:'Sophie W.', uploadedBy:'guest', approved:true, date:'2026-10-15' },
  { id:6, url:'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=80', thumb:'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=300&q=70', name:'Abendstimmung', uploader:'Klaus S.', uploadedBy:'guest', approved:false, date:'2026-10-15' },
];

export default function Memories() {
  const [photos, setPhotos] = useState(() => loadState('memories', DEMO_PHOTOS));
  const [tab, setTab] = useState('all');
  const [lightbox, setLightbox] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  function save(p) { setPhotos(p); saveState('memories', p); }

  function toggleApproved(id) {
    save(photos.map(p => p.id === id ? { ...p, approved: !p.approved } : p));
  }

  function deletePhoto(id) {
    if (!confirm('Foto löschen?')) return;
    save(photos.filter(p => p.id !== id));
  }

  function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    // Simulate upload — in production this goes to Supabase Storage
    setTimeout(() => {
      const newPhotos = files.map((file, i) => ({
        id: Math.max(0, ...photos.map(p => p.id)) + i + 1,
        url: URL.createObjectURL(file),
        thumb: URL.createObjectURL(file),
        name: file.name.replace(/\.[^.]+$/, ''),
        uploader: 'Du',
        uploadedBy: 'admin',
        approved: true,
        date: new Date().toISOString().slice(0, 10),
      }));
      save([...photos, ...newPhotos]);
      setUploading(false);
    }, 800);
  }

  const displayed = tab === 'all' ? photos
    : tab === 'approved' ? photos.filter(p => p.approved)
    : tab === 'pending' ? photos.filter(p => !p.approved)
    : photos.filter(p => p.uploadedBy === 'guest');

  const pending = photos.filter(p => !p.approved).length;
  const approved = photos.filter(p => p.approved).length;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Erinnerungen</h1>
          <div className="topbar-sub">
            {photos.length} Fotos · {approved} freigegeben · {pending > 0 && <span style={{ color: 'var(--terra)' }}>{pending} ausstehend</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileUpload} />
          <button className="btn btn-primary" onClick={() => fileRef.current.click()} disabled={uploading}>
            <IconUpload size={15} stroke={2} /> {uploading ? 'Lädt...' : 'Fotos hinzufügen'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 18 }}>
          {[
            { label: 'Gesamt', value: photos.length, color: 'var(--mocha)' },
            { label: 'Freigegeben', value: approved, color: 'var(--sage)' },
            { label: 'Ausstehend', value: pending, color: 'var(--terra)' },
            { label: 'Gäste-Uploads', value: photos.filter(p=>p.uploadedBy==='guest').length, color: 'var(--gold)' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ borderTopColor: s.color }}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Upload hint */}
        <div className="card-warm" style={{ marginBottom: 18, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid var(--gold)' }}>
          <IconShare size={20} stroke={1.5} style={{ color: 'var(--terra)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--espresso)' }}>Gäste können Fotos hochladen</div>
            <div style={{ fontSize: 12, color: 'var(--mocha)', marginTop: 1 }}>
              Über den Memories-Bereich auf eurer Gästeseite können Gäste eigene Fotos hochladen. Diese erscheinen hier zur Freigabe.
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          {[['all','Alle'], ['approved','Freigegeben'], ['pending','Ausstehend'], ['guest','Gäste-Uploads']].map(([v,l]) => (
            <button key={v} className={`tab${tab===v?' active':''}`} onClick={() => setTab(v)}>
              {l}{v==='pending'&&pending>0?` (${pending})`:''}
            </button>
          ))}
        </div>

        {/* Photo grid */}
        {displayed.length === 0 ? (
          <div className="card empty-state">
            <IconPhoto size={40} style={{ color: 'var(--taupe)', margin: '0 auto 10px' }} />
            <p>Keine Fotos in dieser Ansicht</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {displayed.map(photo => (
              <div key={photo.id} className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                {/* Image */}
                <div style={{ position: 'relative', paddingTop: '75%', background: 'var(--sand)', cursor: 'pointer' }}
                  onClick={() => setLightbox(photo)}>
                  <img src={photo.thumb} alt={photo.name}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.style.display='none'; }}
                  />
                  {/* Approved badge */}
                  <div style={{ position: 'absolute', top: 8, left: 8, background: photo.approved ? 'rgba(52,211,153,0.9)' : 'rgba(251,191,36,0.9)', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600, color: '#fff' }}>
                    {photo.approved ? '✓ Freigegeben' : '○ Ausstehend'}
                  </div>
                  {/* Guest badge */}
                  {photo.uploadedBy === 'guest' && (
                    <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(196,149,106,0.9)', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 600, color: '#fff' }}>
                      Gast
                    </div>
                  )}
                </div>

                {/* Info + actions */}
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--espresso)', marginBottom: 2 }}>{photo.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--mocha)' }}>von {photo.uploader} · {photo.date}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button
                      className={`btn btn-sm ${photo.approved ? 'btn-secondary' : 'btn-primary'}`}
                      style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                      onClick={() => toggleApproved(photo.id)}
                    >
                      {photo.approved
                        ? <><IconEyeOff size={12} stroke={2}/> Verstecken</>
                        : <><IconEye size={12} stroke={2}/> Freigeben</>
                      }
                    </button>
                    <button className="btn-icon" style={{ background: '#FEE2E2', color: '#991B1B', padding: '5px 8px' }}
                      onClick={() => deletePhoto(photo.id)}>
                      <IconTrash size={13} stroke={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setLightbox(null)}>
          <button style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
            onClick={() => setLightbox(null)}>
            <IconX size={20} stroke={2} />
          </button>
          <div style={{ position: 'absolute', top: 20, right: 68, display: 'flex', gap: 8 }}>
            <button style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: lightbox.approved ? '#6ee7b7' : '#fcd34d' }}
              onClick={e => { e.stopPropagation(); toggleApproved(lightbox.id); setLightbox(p => ({...p, approved: !p.approved})); }}>
              {lightbox.approved ? <IconEyeOff size={18} stroke={2}/> : <IconEye size={18} stroke={2}/>}
            </button>
          </div>
          <img src={lightbox.url} alt={lightbox.name}
            style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }}
            onClick={e => e.stopPropagation()}
          />
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', color: '#fff', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{lightbox.name}</div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 3 }}>von {lightbox.uploader} · {lightbox.approved ? '✓ Freigegeben' : '○ Ausstehend'}</div>
          </div>
        </div>
      )}
    </>
  );
}

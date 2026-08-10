import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getMemoriesPageData } from '../lib/db';

// Public, standalone "Erinnerungen" gallery page — shared via its own link
// (separate from the main Gästeseite), showing only approved photos grouped by category.
export default function MemoriesSharePage() {
  const { slug } = useParams();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    getMemoriesPageData(slug).then(({ data }) => {
      setPageData(data);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #FDF8F0 0%, #F0E8D8 50%, #EAE0D0 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo-mark.png" alt="Wedding Buddy" style={{ width: 56, height: 56, display: 'block', margin: '0 auto 10px' }} />
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontStyle: 'italic', color: 'var(--espresso)', marginBottom: 8 }}>
            Wedding Buddy
          </div>
          <div style={{ fontSize: 13, color: 'var(--mocha)' }}>Wird geladen...</div>
        </div>
      </div>
    );
  }

  const wedding    = pageData?.wedding;
  const photos     = pageData?.photos || [];
  const categories = pageData?.memoryCategories || [];

  const catIds = [...new Set(photos.map(p => p.category).filter(Boolean))];
  const getCat = id => categories.find(c => c.id === id) || { label: id || 'Sonstiges', emoji: '📷' };
  const filtered = activeCategory === 'all' ? photos : photos.filter(p => p.category === activeCategory);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', fontFamily: "'DM Sans', sans-serif" }}>
      {/* HERO */}
      <section style={{ padding: '64px 24px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden', background: 'linear-gradient(160deg,#FDF8F0 0%,#F0E8D8 50%,#EAE0D0 100%)' }}>
        <div style={{ position: 'absolute', width: 400, height: 400, top: -120, right: -100, borderRadius: '50%', background: 'radial-gradient(circle,rgba(196,149,106,0.18) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 620, margin: '0 auto' }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16, color: 'var(--mocha)' }}>
            Erinnerungen
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontStyle: 'italic', lineHeight: 1.1, marginBottom: 12, color: 'var(--espresso)', fontSize: 'clamp(36px,6vw,56px)' }}>
            {wedding ? `${wedding.bride} & ${wedding.groom}` : 'Unsere Hochzeit'}
          </h1>
          {wedding?.date && (
            <div style={{ fontSize: 14, color: 'var(--mocha)' }}>
              {new Date(wedding.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
              {wedding.venue && ` · ${wedding.venue}`}
            </div>
          )}
        </div>
      </section>

      {/* GALLERY */}
      <section style={{ padding: '40px 24px 64px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {photos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--mocha)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📷</div>
              <p style={{ fontSize: 14 }}>Noch keine Fotos freigegeben — schaut bald wieder vorbei!</p>
            </div>
          ) : (
            <>
              {catIds.length > 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginBottom: 24 }}>
                  <button onClick={() => setActiveCategory('all')}
                    style={{ padding: '5px 14px', borderRadius: 30, border: '1px solid var(--sand)', background: activeCategory === 'all' ? 'var(--brown)' : '#fff', color: activeCategory === 'all' ? '#fff' : 'var(--mocha)', fontSize: 12.5, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .15s' }}>
                    Alle ({photos.length})
                  </button>
                  {catIds.map(id => {
                    const cat = getCat(id);
                    const count = photos.filter(p => p.category === id).length;
                    return (
                      <button key={id} onClick={() => setActiveCategory(id)}
                        style={{ padding: '5px 14px', borderRadius: 30, border: '1px solid var(--sand)', background: activeCategory === id ? 'var(--brown)' : '#fff', color: activeCategory === id ? '#fff' : 'var(--mocha)', fontSize: 12.5, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .15s' }}>
                        {cat.emoji} {cat.label} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {filtered.map(photo => {
                  const cat = getCat(photo.category);
                  return (
                    <div key={photo.id}
                      onClick={() => setLightbox(photo)}
                      style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3', background: 'var(--sand)', cursor: 'pointer', position: 'relative', transition: 'transform .2s', boxShadow: '0 2px 8px rgba(91,61,30,0.1)' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                      <img src={photo.thumb || photo.url} alt={photo.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                      <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(253,248,242,0.9)', backdropFilter: 'blur(4px)', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 500, color: 'var(--espresso)' }}>
                        {cat.emoji} {cat.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* LIGHTBOX */}
      {lightbox && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 18 }}>
            ✕
          </button>
          <img src={lightbox.url} alt={lightbox.name}
            style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }}
            onClick={e => e.stopPropagation()}
          />
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', color: '#fff', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{lightbox.name}</div>
            <div style={{ fontSize: 12, opacity: 0.55, marginTop: 2 }}>
              {getCat(lightbox.category).emoji} {getCat(lightbox.category).label}{lightbox.uploader && ` · von ${lightbox.uploader}`}
            </div>
          </div>
          {(() => {
            const idx = filtered.findIndex(p => p.id === lightbox.id);
            return <>
              {idx > 0 && <button onClick={e => { e.stopPropagation(); setLightbox(filtered[idx - 1]); }}
                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, fontSize: 20, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>}
              {idx < filtered.length - 1 && <button onClick={e => { e.stopPropagation(); setLightbox(filtered[idx + 1]); }}
                style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, fontSize: 20, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>}
            </>;
          })()}
        </div>
      )}

      {/* FOOTER */}
      <footer style={{ background: 'var(--warm)', borderTop: '1px solid var(--sand)', padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--taupe)', fontFamily: "'Cormorant Garamond',serif", fontStyle: 'italic' }}>mit Liebe geplant ♡</div>
      </footer>
    </div>
  );
}

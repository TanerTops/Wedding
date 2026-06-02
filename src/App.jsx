import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import {
  IconLayoutDashboard, IconUsers, IconWallet, IconCheckbox,
  IconLayoutColumns, IconClock, IconMapPin, IconMusic,
  IconGift, IconNotes, IconSettings, IconWorldWww, IconX, IconMenu2,
  IconPhoto, IconCamera, IconLogout
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { initializeUser } from './lib/db';
import Sidebar from './components/Sidebar';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Guests from './pages/Guests';
import Budget from './pages/Budget';
import Tasks from './pages/Tasks';
import Timeline from './pages/Timeline';
import Seating from './pages/Seating';
import Settings from './pages/Settings';
import GuestPage from './pages/GuestPage';
import GuestPageSettings from './pages/GuestPageSettings';
import Memories from './pages/Memories';
import Photos from './pages/Photos';
import { MusicPage, VenuePage, RegistryPage, NotesPage } from './pages/Misc';

// ── Bottom nav ────────────────────────────────────────────────────
const NAV_MAIN = [
  { to: '/',        icon: IconLayoutDashboard, label: 'Übersicht' },
  { to: '/guests',  icon: IconUsers,           label: 'Gäste'    },
  { to: '/budget',  icon: IconWallet,          label: 'Budget'   },
  { to: '/tasks',   icon: IconCheckbox,        label: 'Aufgaben' },
];

const NAV_MORE = [
  { to: '/seating',    icon: IconLayoutColumns, label: 'Sitzordnung'   },
  { to: '/timeline',   icon: IconClock,         label: 'Zeitplan'      },
  { to: '/venue',      icon: IconMapPin,        label: 'Location'      },
  { to: '/music',      icon: IconMusic,         label: 'Musik'         },
  { to: '/registry',   icon: IconGift,          label: 'Geschenke'     },
  { to: '/notes',      icon: IconNotes,         label: 'Notizen'       },
  { to: '/guest-page', icon: IconWorldWww,      label: 'Gästeseite'    },
  { to: '/memories',   icon: IconPhoto,         label: 'Erinnerungen'  },
  { to: '/photos',     icon: IconCamera,        label: 'Fotoplanung'   },
  { to: '/settings',   icon: IconSettings,      label: 'Einstellungen' },
];

function MobileNav({ onLogout }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const moreActive = NAV_MORE.some(n => location.pathname === n.to);

  return (
    <div className="mobile-nav-wrapper">
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 299, background: 'rgba(91,61,30,0.18)', backdropFilter: 'blur(2px)' }} />
      )}
      <div style={{ position: 'fixed', left: 0, right: 0, zIndex: 300, background: 'var(--warm)', borderTop: '1px solid var(--sand)', borderRadius: '20px 20px 0 0', padding: '16px 16px 8px', boxShadow: '0 -4px 24px rgba(91,61,30,0.12)', transform: open ? 'translateY(0)' : 'translateY(110%)', transition: 'transform 0.3s cubic-bezier(.32,.72,0,1)', bottom: 57 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--sand)', margin: '0 auto 14px' }} />
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mocha)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Alle Bereiche</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {NAV_MORE.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink key={to} to={to} onClick={() => setOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, textDecoration: 'none', background: isActive ? 'var(--sand)' : '#fff', border: `1px solid ${isActive ? 'var(--taupe)' : 'var(--sand)'}`, color: isActive ? 'var(--espresso)' : 'var(--brown)', transition: 'all .15s' }}>
                <Icon size={18} stroke={isActive ? 2 : 1.5} style={{ color: isActive ? 'var(--terra)' : 'var(--mocha)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400 }}>{label}</span>
              </NavLink>
            );
          })}
          <button onClick={onLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, textDecoration: 'none', background: '#fff', border: '1px solid var(--sand)', color: 'var(--brown)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            <IconLogout size={18} stroke={1.5} style={{ color: 'var(--mocha)', flexShrink: 0 }} />
            <span style={{ fontSize: 13 }}>Abmelden</span>
          </button>
        </div>
        <div style={{ height: 8 }} />
      </div>
      <nav style={{ display: 'flex', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301, background: 'var(--warm)', borderTop: '1px solid var(--sand)', paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}>
        {NAV_MAIN.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
            style={({ isActive }) => ({ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 0 4px', textDecoration: 'none', color: isActive ? 'var(--terra)' : 'var(--mocha)', fontSize: 10, fontWeight: isActive ? 600 : 400, transition: 'color .15s' })}>
            {({ isActive }) => (<><Icon size={21} stroke={isActive ? 2 : 1.5} /><span>{label}</span></>)}
          </NavLink>
        ))}
        <button onClick={() => setOpen(o => !o)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 0 4px', background: 'none', border: 'none', cursor: 'pointer', color: open || moreActive ? 'var(--terra)' : 'var(--mocha)', fontSize: 10, fontWeight: open || moreActive ? 600 : 400, fontFamily: "'DM Sans', sans-serif", transition: 'color .15s' }}>
          {open ? <IconX size={21} stroke={2} /> : <IconMenu2 size={21} stroke={1.5} />}
          <span>Mehr</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    // Get initial session
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session) initializeUser();
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) initializeUser(); // Set up template data for new users
    });
      return () => subscription.unsubscribe();
    } else {
      setSession(null); // No supabase = no auth required
    }
  }, []);

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
  }

  // Loading state
  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #FDF8F0 0%, #F0E8D8 50%, #EAE0D0 100%)' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontStyle: 'italic', color: 'var(--espresso)' }}>Vince</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public guest page — always accessible */}
        <Route path="/guest/:slug" element={<GuestPage />} />
        {/* Auth page — only show if not logged in */}
        <Route path="/login" element={!session && supabase ? <Auth onAuth={setSession} /> : <Navigate to="/" />} />
        {/* Admin — protected */}
        <Route path="/*" element={
          supabase && !session
            ? <Navigate to="/login" />
            : <AdminLayout onLogout={handleLogout} />
        } />
      </Routes>
    </BrowserRouter>
  );
}

function AdminLayout({ onLogout }) {
  return (
    <div className="app-layout">
      <Sidebar onLogout={onLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/guests"     element={<Guests />} />
          <Route path="/budget"     element={<Budget />} />
          <Route path="/tasks"      element={<Tasks />} />
          <Route path="/timeline"   element={<Timeline />} />
          <Route path="/seating"    element={<Seating />} />
          <Route path="/venue"      element={<VenuePage />} />
          <Route path="/music"      element={<MusicPage />} />
          <Route path="/registry"   element={<RegistryPage />} />
          <Route path="/notes"      element={<NotesPage />} />
          <Route path="/guest-page" element={<GuestPageSettings />} />
          <Route path="/memories"   element={<Memories />} />
          <Route path="/photos"     element={<Photos />} />
          <Route path="/settings"   element={<Settings />} />
        </Routes>
        <MobileNav onLogout={onLogout} />
      </main>
    </div>
  );
}

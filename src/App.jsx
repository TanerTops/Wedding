import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import {
  IconLayoutDashboard, IconUsers, IconWallet,
  IconCheckbox, IconLayoutColumns, IconMenu2, IconX
} from '@tabler/icons-react';
import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Guests from './pages/Guests';
import Budget from './pages/Budget';
import Tasks from './pages/Tasks';
import Timeline from './pages/Timeline';
import Seating from './pages/Seating';
import Settings from './pages/Settings';
import GuestPage from './pages/GuestPage';
import GuestPageSettings from './pages/GuestPageSettings';
import { MusicPage, VenuePage, RegistryPage, NotesPage } from './pages/Misc';

// ── Mobile bottom nav (inline — no separate file needed) ──────────
const MOBILE_NAV = [
  { to: '/',         icon: IconLayoutDashboard, label: 'Übersicht' },
  { to: '/guests',   icon: IconUsers,           label: 'Gäste'     },
  { to: '/budget',   icon: IconWallet,          label: 'Budget'    },
  { to: '/tasks',    icon: IconCheckbox,        label: 'Aufgaben'  },
  { to: '/seating',  icon: IconLayoutColumns,   label: 'Sitzplan'  },
];

function MobileNav() {
  return (
    <nav style={{
      display: 'flex',
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 200,
      background: 'var(--warm)',
      borderTop: '1px solid var(--sand)',
      paddingBottom: 'env(safe-area-inset-bottom, 4px)',
    }}>
      {MOBILE_NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            padding: '6px 0 4px',
            textDecoration: 'none',
            color: isActive ? 'var(--terra)' : 'var(--mocha)',
            fontSize: 10,
            fontWeight: isActive ? 600 : 400,
            transition: 'color .15s',
          })}
        >
          {({ isActive }) => (
            <>
              <Icon size={21} stroke={isActive ? 2 : 1.5} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/guest/:slug" element={<GuestPage />} />
        <Route path="/*" element={<AdminLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

function AdminLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
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
          <Route path="/settings"   element={<Settings />} />
        </Routes>
        {/* Mobile bottom navigation — hidden on desktop via CSS */}
        <MobileNav />
      </main>
    </div>
  );
}

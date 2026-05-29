import { BrowserRouter, Routes, Route } from 'react-router-dom';
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


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public guest page — completely separate from admin */}
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/guests" element={<Guests />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/seating" element={<Seating />} />
          <Route path="/venue" element={<VenuePage />} />
          <Route path="/music" element={<MusicPage />} />
          <Route path="/registry" element={<RegistryPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/guest-page" element={<GuestPageSettings />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>

      </main>
    </div>
  );
}

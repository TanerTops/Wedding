import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Debug: check Supabase env vars
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
console.log('=== Vince Debug ===');
console.log('SUPABASE_URL:', url ? '✅ ' + url.substring(0,30)+'...' : '❌ MISSING');
console.log('SUPABASE_KEY:', key ? '✅ set (' + key.length + ' chars)' : '❌ MISSING');
console.log('===================');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { supabase } from './lib/supabase.js'

// Debug: test Supabase connection
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
console.log('=== Vince Debug ===');
console.log('URL:', url ? '✅ ' + url : '❌ MISSING');
console.log('KEY:', key ? '✅ ' + key.length + ' chars' : '❌ MISSING');

if (supabase) {
  supabase.from('rsvp_responses').select('count').then(({ data, error }) => {
    if (error) console.error('❌ Supabase error:', error.message, error.code);
    else console.log('✅ Supabase connected! rsvp_responses reachable');
  });
} else {
  console.log('⚠️ Supabase client not initialized');
}
console.log('===================');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

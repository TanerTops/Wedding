/**
 * db.js — Unified data layer with user_id scoping
 * Falls back to localStorage when Supabase is not configured.
 */
import { supabase, hasSupabase } from './supabase';
import { loadState, saveState, defaultWedding, defaultGuests, defaultBudgetItems, defaultTimeline, makeInviteCode } from '../data/store';

// ── Default template data for new users ──────────────────────────
const TEMPLATE_WEDDING = {
  bride: 'Sarah', groom: 'Tobias',
  date: '2026-10-15', venue: 'Schloss Waldenburg',
  budget: 18000, notes: '',
};

const TEMPLATE_GUESTS = [
  { name: 'Ingrid Müller',     email: 'ingrid@email.de',    group_name: 'Familie Braut',     status: 'confirmed', menu: 'Rind',         note: '' },
  { name: 'Wolfgang Müller',   email: 'w.mueller@email.de', group_name: 'Familie Braut',     status: 'confirmed', menu: 'Rind',         note: '' },
  { name: 'Anna Lehmann',      email: 'anna@email.de',      group_name: 'Freunde',           status: 'confirmed', menu: 'Vegan',        note: '' },
  { name: 'Max Hartmann',      email: '',                   group_name: 'Freunde',           status: 'pending',   menu: '',             note: '' },
];

const TEMPLATE_BUDGET = [
  { description: 'Location – Schloss Waldenburg', vendor: 'Schloss Waldenburg GmbH', cat: 'Location',   amount: 4800, paid: true,  due: '2026-02-01', note: '' },
  { description: 'Catering – Dinner & Service',   vendor: 'Catering Müller',         cat: 'Catering',   amount: 6900, paid: false, due: '2026-09-21', note: '' },
  { description: 'Fotografie – Reportage 8h',     vendor: 'Foto Studio König',       cat: 'Fotografie', amount: 2200, paid: true,  due: '2026-03-15', note: '' },
];

const TEMPLATE_TIMELINE = [
  { time: '09:00', end_time: '12:30', title: 'Getting Ready Sarah',         type: 'getting-ready', loc: 'Hochzeitssuite',   description: 'Haare, Make-up und Ankleiden', guests: false, vendor: false },
  { time: '14:00', end_time: '14:45', title: 'Freie Trauung',               type: 'ceremony',      loc: 'Garten',           description: 'Zeremonie unter der alten Eiche', guests: true, vendor: true },
  { time: '14:45', end_time: '15:30', title: 'Sektempfang & Gratulationen', type: 'reception',     loc: 'Terrasse',         description: 'Aperitif und Gratulationsrunde', guests: true, vendor: true },
  { time: '17:00', end_time: '19:00', title: 'Abendessen',                  type: 'dinner',        loc: 'Festsaal',         description: '3-Gänge-Menü', guests: true, vendor: true },
  { time: '20:30', end_time: '21:00', title: 'Eröffnungstanz',              type: 'party',         loc: 'Festsaal',         description: 'Erster Tanz und Tortenanschnitt', guests: true, vendor: true },
  { time: '21:00', end_time: '02:00', title: 'Party & Tanz',                type: 'party',         loc: 'Festsaal',         description: 'DJ und Tanzfläche', guests: true, vendor: true },
];

const TEMPLATE_TASKS = [
  { title: 'Location buchen', category: 'Organisation', done: true,  due: '2025-12-01', note: '' },
  { title: 'Caterer anfragen', category: 'Catering',     done: false, due: '2026-01-15', note: '' },
  { title: 'Einladungen versenden', category: 'Gäste',   done: false, due: '2026-06-01', note: '' },
  { title: 'Fotografen buchen', category: 'Dienstleister', done: true, due: '2025-11-01', note: '' },
  { title: 'Ringe aussuchen', category: 'Sonstiges',     done: false, due: '2026-03-01', note: '' },
];

const TEMPLATE_REGISTRY = [
  { title: 'Honeymoon-Kasse', description: 'Beitrag zu unserer Hochzeitsreise', amount: 0,   type: 'fund', reserved: false, link: '' },
  { title: 'Küchenmaschine',  description: 'KitchenAid, Farbe: Creme',          amount: 399, type: 'item', reserved: false, link: '' },
];

const TEMPLATE_CONFIG = {
  heroTitle: '', heroSubtitle: 'Wir freuen uns, mit euch zu feiern.',
  heroImageUrl: '', heroImagePosition: 'center',
  sections: { rsvp: true, timeline: true, location: true, dresscode: true, music: true, registry: true, memories: true, schedule: true },
  dresscodeStyle: 'Elegant & Boho',
  dresscodeText: 'Wir wünschen uns elegante Kleidung in warmen Erdtönen.',
  dresscodeColors: ['#C4956A', '#C4B5A5', '#A8B5A0', '#D4C4A8', '#B8A9C9'],
  rsvpDeadlineOffset: 30,
  scheduleSlots: [
    { id: 1, time: 'Nach dem Dinner', label: 'Rede / Ansage', maxMin: 5 },
    { id: 2, time: 'Abends', label: 'Spiel / Aktion', maxMin: 10 },
  ],
};

// ── Get current user id ──────────────────────────────────────────
async function getUserId() {
  if (!hasSupabase()) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// ── Initialize new user with template data ───────────────────────
export async function initializeUser(customWedding = null) {
  if (!hasSupabase()) return;
  const userId = await getUserId();
  if (!userId) return;

  // Check if already initialized
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('initialized')
    .eq('id', userId)
    .single();

  if (profile?.initialized) return; // already done

  console.log('[Vince] First login — initializing with template data...');

  // Check for pending wedding data from registration (when email confirmation was needed)
  const pendingWedding = (() => {
    try { const d = localStorage.getItem('vince_pending_wedding'); return d ? JSON.parse(d) : null; } catch { return null; }
  })();
  if (pendingWedding) { localStorage.removeItem('vince_pending_wedding'); }
  const weddingInput = customWedding || pendingWedding;
  console.log('[Vince] weddingInput:', weddingInput);

  // Use custom wedding data if provided, otherwise use template
  const wedding = weddingInput ? {
    bride: weddingInput.bride || TEMPLATE_WEDDING.bride,
    groom: weddingInput.groom || TEMPLATE_WEDDING.groom,
    date: weddingInput.date || TEMPLATE_WEDDING.date,
    venue: weddingInput.venue || TEMPLATE_WEDDING.venue,
    budget: TEMPLATE_WEDDING.budget,
    notes: '',
  } : TEMPLATE_WEDDING;
  console.log('[Vince] final wedding:', wedding);

  // Create wedding (delete any existing first to avoid duplicates)
  const year = new Date(wedding.date).getFullYear();
  await supabase.from('weddings').delete().eq('user_id', userId);
  await supabase.from('weddings').insert({ ...wedding, user_id: userId });

  // Create guests with invite codes
  await supabase.from('guests').insert(
    TEMPLATE_GUESTS.map(g => ({ ...g, user_id: userId, invite_code: makeInviteCode(g.name, year) }))
  );

  // Create budget items
  await supabase.from('budget_items').insert(
    TEMPLATE_BUDGET.map(b => ({ ...b, user_id: userId }))
  );

  // Create timeline
  await supabase.from('timeline').insert(
    TEMPLATE_TIMELINE.map(e => ({ ...e, user_id: userId }))
  );

  // Create tasks
  await supabase.from('tasks').insert(
    TEMPLATE_TASKS.map(t => ({ ...t, user_id: userId }))
  );

  // Create registry
  await supabase.from('registry').insert(
    TEMPLATE_REGISTRY.map(r => ({ ...r, user_id: userId }))
  );

  // Create guest page config
  await supabase.from('guest_page_config').insert({ config: TEMPLATE_CONFIG, user_id: userId });

  // Mark as initialized
  await supabase.from('user_profiles').upsert({ id: userId, initialized: true });

  // Auto-sync local data to Supabase (in case user had prior localStorage data)
  const localTimeline = loadState('timeline', []);
  if (localTimeline.length > 0) {
    const { data: existingTl } = await supabase.from('timeline').select('id').eq('user_id', userId).limit(1);
    if (!existingTl || existingTl.length === 0) {
      await supabase.from('timeline').insert(localTimeline.map(e => ({
        time: e.time, end_time: e.endTime || e.end_time || '',
        title: e.title, type: e.type || 'other', loc: e.loc || '',
        description: e.desc || e.description || '',
        guests: e.guests || false, vendor: e.vendor || false, user_id: userId,
      })));
    }
  }
  console.log('[Vince] Initialization complete');
}

// ── Wedding ──────────────────────────────────────────────────────
export async function getWedding() {
  if (!hasSupabase()) return { data: loadState('wedding', null), error: null };
  const userId = await getUserId();
  const { data, error } = await supabase.from('weddings').select('*').eq('user_id', userId).limit(1).single();
  return { data, error };
}

export async function saveWedding(wedding) {
  if (!hasSupabase()) { saveState('wedding', wedding); return { error: null }; }
  const userId = await getUserId();
  const existing = await supabase.from('weddings').select('id').eq('user_id', userId).limit(1).single();
  if (existing.data?.id) {
    const { error } = await supabase.from('weddings').update({ ...wedding, user_id: userId }).eq('id', existing.data.id);
    return { error };
  } else {
    const { error } = await supabase.from('weddings').insert({ ...wedding, user_id: userId });
    return { error };
  }
}

// ── Guests ───────────────────────────────────────────────────────
export async function getGuests() {
  if (!hasSupabase()) return { data: loadState('guests', []), error: null };
  const userId = await getUserId();
  const { data, error } = await supabase.from('guests').select('*').eq('user_id', userId).order('name');
  return { data: data || [], error };
}

export async function upsertGuest(guest) {
  if (!hasSupabase()) {
    const guests = loadState('guests', []);
    const exists = guests.find(g => g.id === guest.id);
    saveState('guests', exists ? guests.map(g => g.id === guest.id ? guest : g) : [...guests, guest]);
    return { error: null };
  }
  const userId = await getUserId();
  // Remove 'group' alias - Supabase column is 'group_name'
  const { group, inviteCode, ...rest } = guest;
  const { error } = await supabase.from('guests').upsert({ 
    ...rest, 
    group_name: group || guest.group_name || 'Freunde',
    invite_code: inviteCode || guest.invite_code || '',
    user_id: userId 
  });
  return { error };
}

export async function deleteGuest(id) {
  if (!hasSupabase()) {
    saveState('guests', loadState('guests', []).filter(g => g.id !== id));
    return { error: null };
  }
  const { error } = await supabase.from('guests').delete().eq('id', id);
  return { error };
}

// ── RSVP ────────────────────────────────────────────────────────
export async function submitRSVP(rsvpData) {
  if (!hasSupabase()) {
    const rsvps = loadState('rsvp_responses', []);
    saveState('rsvp_responses', [...rsvps, { ...rsvpData, id: Date.now(), submitted_at: new Date().toISOString() }]);
    return { error: null };
  }
  const { error } = await supabase.from('rsvp_responses').insert({
    name: rsvpData.name, email: rsvpData.email,
    attending: rsvpData.attending, menu: rsvpData.menu,
    plus_one: rsvpData.plus_one || false,
    companions: rsvpData.companions || '',
    message: rsvpData.message,
    submitted_at: new Date().toISOString(),
  });

  // Auto-update guest status based on invite code
  if (!error && rsvpData.inviteCode) {
    // Find guest by invite_code and update their status + menu
    const { data: guests } = await supabase
      .from('guests')
      .select('id')
      .eq('invite_code', rsvpData.inviteCode.toUpperCase());
    
    if (guests && guests.length > 0) {
      await supabase.from('guests').update({
        status: rsvpData.attending === 'yes' ? 'confirmed' : 'declined',
        menu: rsvpData.menu || '',
      }).eq('invite_code', rsvpData.inviteCode.toUpperCase());
    }
  }

  return { error };
}

export async function getRSVPs() {
  if (!hasSupabase()) return { data: loadState('rsvp_responses', []), error: null };
  const { data, error } = await supabase.from('rsvp_responses').select('*').order('submitted_at', { ascending: false });
  return { data: data || [], error };
}

// ── Budget ───────────────────────────────────────────────────────
export async function getBudgetItems() {
  if (!hasSupabase()) return { data: loadState('budgetItems', []), error: null };
  const userId = await getUserId();
  const { data, error } = await supabase.from('budget_items').select('*').eq('user_id', userId).order('created_at');
  return { data: data || [], error };
}

export async function upsertBudgetItem(item) {
  if (!hasSupabase()) {
    const items = loadState('budgetItems', []);
    const exists = items.find(i => i.id === item.id);
    saveState('budgetItems', exists ? items.map(i => i.id === item.id ? item : i) : [...items, item]);
    return { error: null };
  }
  const userId = await getUserId();
  const { error } = await supabase.from('budget_items').upsert({ ...item, description: item.desc, user_id: userId });
  return { error };
}

export async function deleteBudgetItem(id) {
  if (!hasSupabase()) {
    saveState('budgetItems', loadState('budgetItems', []).filter(i => i.id !== id));
    return { error: null };
  }
  const { error } = await supabase.from('budget_items').delete().eq('id', id);
  return { error };
}

// ── Timeline ─────────────────────────────────────────────────────
export async function getTimeline() {
  if (!hasSupabase()) return { data: loadState('timeline', []), error: null };
  const userId = await getUserId();
  const { data, error } = await supabase.from('timeline').select('*').eq('user_id', userId).order('time');
  return { data: data || [], error };
}

export async function upsertTimelineEvent(event) {
  if (!hasSupabase()) {
    const tl = loadState('timeline', []);
    const exists = tl.find(e => e.id === event.id);
    saveState('timeline', exists ? tl.map(e => e.id === event.id ? event : e) : [...tl, event]);
    return { error: null };
  }
  const userId = await getUserId();
  const { error } = await supabase.from('timeline').upsert({
    ...event, user_id: userId,
    end_time: event.endTime || event.end_time || '',
    description: event.desc || event.description || '',
  });
  return { error };
}

export async function deleteTimelineEvent(id) {
  if (!hasSupabase()) {
    saveState('timeline', loadState('timeline', []).filter(e => e.id !== id));
    return { error: null };
  }
  const { error } = await supabase.from('timeline').delete().eq('id', id);
  return { error };
}

// ── Photos ───────────────────────────────────────────────────────
export async function getPhotos() {
  if (!hasSupabase()) return { data: loadState('memories', []), error: null };
  const userId = await getUserId();
  // Admin sees own photos, guests see approved photos (handled by RLS)
  const { data, error } = userId
    ? await supabase.from('photos').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    : await supabase.from('photos').select('*').eq('approved', true).order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function uploadPhoto(file, uploaderName, uploadedBy = 'guest') {
  if (!hasSupabase()) {
    const url = URL.createObjectURL(file);
    const photo = { id: Date.now(), url, thumb: url, name: file.name.replace(/\.[^.]+$/, ''), uploader: uploaderName, uploaded_by: uploadedBy, approved: uploadedBy === 'admin', category: 'other', created_at: new Date().toISOString() };
    saveState('memories', [...loadState('memories', []), photo]);
    return { data: photo, error: null };
  }
  const ext = file.name.split('.').pop();
  const path = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('wedding-photos').upload(path, file);
  if (uploadError) return { data: null, error: uploadError };
  const { data: { publicUrl } } = supabase.storage.from('wedding-photos').getPublicUrl(path);
  const userId = await getUserId();
  const photo = { url: publicUrl, thumb: publicUrl, name: file.name.replace(/\.[^.]+$/, ''), uploader: uploaderName, uploaded_by: uploadedBy, approved: uploadedBy === 'admin', category: 'other', storage_path: path, user_id: userId };
  const { data, error } = await supabase.from('photos').insert(photo).select().single();
  return { data, error };
}

export async function updatePhoto(id, updates) {
  if (!hasSupabase()) {
    saveState('memories', loadState('memories', []).map(p => p.id === id ? { ...p, ...updates } : p));
    return { error: null };
  }
  const { error } = await supabase.from('photos').update(updates).eq('id', id);
  return { error };
}

export async function deletePhoto(id, storagePath) {
  if (!hasSupabase()) {
    saveState('memories', loadState('memories', []).filter(p => p.id !== id));
    return { error: null };
  }
  if (storagePath) await supabase.storage.from('wedding-photos').remove([storagePath]);
  const { error } = await supabase.from('photos').delete().eq('id', id);
  return { error };
}

// ── Guest Page Data (public) ─────────────────────────────────────
export async function getGuestPageData(slug) {
  if (!hasSupabase()) {
    return {
      data: {
        wedding: loadState('wedding', null),
        config: loadState('guestPageConfig', {}),
        timeline: loadState('timeline', []),
        registry: loadState('registry', []),
        photos: loadState('memories', []).filter(p => p.approved),
        memoryCategories: loadState('memoryCategories', []),
        guests: loadState('guests', []),
      },
      error: null
    };
  }

  // Find wedding by slug (bride-groom format)
  const { data: weddings } = await supabase.from('weddings').select('*');
  let wedding = null;
  if (weddings && slug) {
    const clean = s => s.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
    wedding = weddings.find(w => `${clean(w.bride)}-${clean(w.groom)}` === slug);
  }
  if (!wedding && weddings?.length > 0) wedding = weddings[0];
  const userId = wedding?.user_id;

  const [config, timeline, guests, photos] = await Promise.all([
    userId ? supabase.from('guest_page_config').select('config').eq('user_id', userId).limit(1).single() : Promise.resolve({ data: null }),
    userId ? supabase.from('timeline').select('*').eq('user_id', userId).order('time') : Promise.resolve({ data: [] }),
    userId ? supabase.from('guests').select('id, name, invite_code, menu, status').eq('user_id', userId) : Promise.resolve({ data: [] }),
    supabase.from('photos').select('*').eq('approved', true).order('created_at', { ascending: false }),
  ]);

  const timelineData = (timeline.data?.length > 0) ? timeline.data.map(e => ({ ...e, endTime: e.end_time, desc: e.description })) : loadState('timeline', []);
  const mergedConfig = config.data?.config || loadState('guestPageConfig', {});
  const guestData = (guests.data || []).map(g => ({ ...g, inviteCode: g.invite_code }));

  return {
    data: {
      wedding,
      config: mergedConfig,
      timeline: timelineData,
      registry: loadState('registry', []),
      photos: photos.data || [],
      memoryCategories: loadState('memoryCategories', []),
      guests: guestData,
    },
    error: null,
  };
}

// ── Guest Page Config ────────────────────────────────────────────
export async function saveGuestPageConfig(config) {
  if (!hasSupabase()) { saveState('guestPageConfig', config); return { error: null }; }
  const userId = await getUserId();
  const existing = await supabase.from('guest_page_config').select('id').eq('user_id', userId).limit(1).single();
  if (existing.data?.id) {
    const { error } = await supabase.from('guest_page_config').update({ config, updated_at: new Date().toISOString() }).eq('id', existing.data.id);
    return { error };
  } else {
    const { error } = await supabase.from('guest_page_config').insert({ config, user_id: userId });
    return { error };
  }
}

// ── Schedule requests ────────────────────────────────────────────
export async function submitScheduleRequest(request) {
  if (!hasSupabase()) {
    const reqs = loadState('schedule_requests', []);
    saveState('schedule_requests', [...reqs, { ...request, id: Date.now(), status: 'pending', submitted_at: new Date().toISOString() }]);
    return { error: null };
  }
  const { error } = await supabase.from('schedule_requests').insert({ ...request, status: 'pending', submitted_at: new Date().toISOString() });
  return { error };
}

export async function getScheduleRequests() {
  if (!hasSupabase()) return { data: loadState('schedule_requests', []), error: null };
  const { data, error } = await supabase.from('schedule_requests').select('*').order('submitted_at', { ascending: false });
  return { data: data || [], error };
}

// ── Music wishes ─────────────────────────────────────────────────
export async function submitMusicWish(wish) {
  if (!hasSupabase()) {
    const wishes = loadState('music_wishes', []);
    saveState('music_wishes', [...wishes, { ...wish, id: Date.now(), submitted_at: new Date().toISOString() }]);
    return { error: null };
  }
  const { error } = await supabase.from('music_wishes').insert({ ...wish, submitted_at: new Date().toISOString() });
  return { error };
}

export async function getMusicWishes() {
  if (!hasSupabase()) return { data: loadState('music_wishes', []), error: null };
  const { data, error } = await supabase.from('music_wishes').select('*').order('submitted_at', { ascending: false });
  return { data: data || [], error };
}

// ── Sync: push localStorage to Supabase ──────────────────────────
export async function syncLocalToSupabase() {
  if (!hasSupabase()) return;
  const userId = await getUserId();
  if (!userId) return;

  const wedding = loadState('wedding', null);
  if (wedding) await saveWedding(wedding);

  const config = loadState('guestPageConfig', null);
  if (config) await saveGuestPageConfig(config);

  const timeline = loadState('timeline', []);
  if (timeline.length > 0) {
    await supabase.from('timeline').delete().eq('user_id', userId);
    await supabase.from('timeline').insert(timeline.map(e => ({
      time: e.time, end_time: e.endTime || '', title: e.title,
      type: e.type || 'other', loc: e.loc || '',
      description: e.desc || '', guests: e.guests || false,
      vendor: e.vendor || false, user_id: userId,
    })));
  }
  console.log('[Vince] Sync complete');
}

// ── Account deletion ─────────────────────────────────────────────
export async function deleteAccount() {
  if (!hasSupabase()) return { error: new Error('Supabase not configured') };

  // Get current session for auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: new Error('Not logged in') };

  // Call Edge Function which deletes data + auth user via service role
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  const result = await res.json();
  if (!res.ok || result.error) {
    return { error: new Error(result.error || 'Deletion failed') };
  }

  // Clear localStorage
  Object.keys(localStorage).filter(k => k.startsWith('vince_')).forEach(k => localStorage.removeItem(k));

  // Sign out locally
  await supabase.auth.signOut();
  return { error: null };
}

// ── Tasks ────────────────────────────────────────────────────────
export async function getTasks() {
  if (!hasSupabase()) return { data: loadState('tasks', []), error: null };
  const userId = await getUserId();
  const { data, error } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at');
  return { data: data || [], error };
}

export async function upsertTask(task) {
  if (!hasSupabase()) {
    const tasks = loadState('tasks', []);
    const exists = tasks.find(t => t.id === task.id);
    saveState('tasks', exists ? tasks.map(t => t.id === task.id ? task : t) : [...tasks, task]);
    return { error: null };
  }
  const userId = await getUserId();
  const { error } = await supabase.from('tasks').upsert({ ...task, user_id: userId });
  return { error };
}

export async function deleteTask(id) {
  if (!hasSupabase()) {
    saveState('tasks', loadState('tasks', []).filter(t => t.id !== id));
    return { error: null };
  }
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  return { error };
}

// ── Registry ─────────────────────────────────────────────────────
export async function getRegistry() {
  if (!hasSupabase()) return { data: loadState('registry', []), error: null };
  const userId = await getUserId();
  const { data, error } = await supabase.from('registry').select('*').eq('user_id', userId).order('created_at');
  return { data: data || [], error };
}

export async function upsertRegistryItem(item) {
  if (!hasSupabase()) {
    const items = loadState('registry', []);
    const exists = items.find(i => i.id === item.id);
    saveState('registry', exists ? items.map(i => i.id === item.id ? item : i) : [...items, item]);
    return { error: null };
  }
  const userId = await getUserId();
  const { error } = await supabase.from('registry').upsert({ ...item, user_id: userId });
  return { error };
}

export async function deleteRegistryItem(id) {
  if (!hasSupabase()) {
    saveState('registry', loadState('registry', []).filter(i => i.id !== id));
    return { error: null };
  }
  const { error } = await supabase.from('registry').delete().eq('id', id);
  return { error };
}

// ── Seating ──────────────────────────────────────────────────────
export async function getSeating() {
  if (!hasSupabase()) return { data: loadState('seating', null), error: null };
  const userId = await getUserId();
  const { data, error } = await supabase.from('seating').select('*').eq('user_id', userId).limit(1).single();
  return { data: data?.data || null, error };
}

export async function saveSeating(seatingData) {
  if (!hasSupabase()) { saveState('seating', seatingData); return { error: null }; }
  const userId = await getUserId();
  const existing = await supabase.from('seating').select('id').eq('user_id', userId).limit(1).single();
  if (existing.data?.id) {
    const { error } = await supabase.from('seating').update({ data: seatingData, updated_at: new Date().toISOString() }).eq('id', existing.data.id);
    return { error };
  } else {
    const { error } = await supabase.from('seating').insert({ data: seatingData, user_id: userId });
    return { error };
  }
}

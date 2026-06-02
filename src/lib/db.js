/**
 * db.js — Unified data layer
 * Falls back to localStorage when Supabase is not configured.
 * All functions return { data, error }.
 */
import { supabase, hasSupabase } from './supabase';
import { loadState, saveState } from '../data/store';

// ── Wedding / Config ──────────────────────────────────────────────
export async function getWedding() {
  if (!hasSupabase()) return { data: loadState('wedding', null), error: null };
  const { data, error } = await supabase.from('weddings').select('*').limit(1).single();
  return { data, error };
}

export async function saveWedding(wedding) {
  if (!hasSupabase()) { saveState('wedding', wedding); return { data: wedding, error: null }; }
  const { data, error } = await supabase.from('weddings').upsert(wedding).select().single();
  return { data, error };
}

// ── Guests ────────────────────────────────────────────────────────
export async function getGuests() {
  if (!hasSupabase()) return { data: loadState('guests', []), error: null };
  const { data, error } = await supabase.from('guests').select('*').order('name');
  return { data: data || [], error };
}

export async function upsertGuest(guest) {
  if (!hasSupabase()) {
    const guests = loadState('guests', []);
    const exists = guests.find(g => g.id === guest.id);
    const updated = exists ? guests.map(g => g.id === guest.id ? guest : g) : [...guests, guest];
    saveState('guests', updated);
    return { data: guest, error: null };
  }
  const { data, error } = await supabase.from('guests').upsert(guest).select().single();
  return { data, error };
}

export async function deleteGuest(id) {
  if (!hasSupabase()) {
    const guests = loadState('guests', []);
    saveState('guests', guests.filter(g => g.id !== id));
    return { error: null };
  }
  const { error } = await supabase.from('guests').delete().eq('id', id);
  return { error };
}

// ── RSVP ─────────────────────────────────────────────────────────
export async function submitRSVP(rsvpData) {
  if (!hasSupabase()) {
    // Store locally as pending
    const rsvps = loadState('rsvp_responses', []);
    saveState('rsvp_responses', [...rsvps, { ...rsvpData, id: Date.now(), submitted_at: new Date().toISOString() }]);
    return { data: rsvpData, error: null };
  }
  const { data, error } = await supabase.from('rsvp_responses').insert({
    name:        rsvpData.name,
    email:       rsvpData.email,
    attending:   rsvpData.attending,
    menu:        rsvpData.menu,
    plus_one:    rsvpData.plus_one || false,
    companions:  rsvpData.companions || '',
    message:     rsvpData.message,
    submitted_at: new Date().toISOString(),
  }).select().single();
  return { data, error };
}

export async function getRSVPs() {
  if (!hasSupabase()) return { data: loadState('rsvp_responses', []), error: null };
  const { data, error } = await supabase.from('rsvp_responses').select('*').order('submitted_at', { ascending: false });
  return { data: data || [], error };
}

// ── Budget ────────────────────────────────────────────────────────
export async function getBudgetItems() {
  if (!hasSupabase()) return { data: loadState('budgetItems', []), error: null };
  const { data, error } = await supabase.from('budget_items').select('*').order('created_at');
  return { data: data || [], error };
}

export async function upsertBudgetItem(item) {
  if (!hasSupabase()) {
    const items = loadState('budgetItems', []);
    const exists = items.find(i => i.id === item.id);
    const updated = exists ? items.map(i => i.id === item.id ? item : i) : [...items, item];
    saveState('budgetItems', updated);
    return { data: item, error: null };
  }
  const { data, error } = await supabase.from('budget_items').upsert({
    ...item,
    description: item.desc,  // 'desc' is reserved in SQL
  }).select().single();
  return { data, error };
}

export async function deleteBudgetItem(id) {
  if (!hasSupabase()) {
    saveState('budgetItems', loadState('budgetItems', []).filter(i => i.id !== id));
    return { error: null };
  }
  const { error } = await supabase.from('budget_items').delete().eq('id', id);
  return { error };
}

// ── Photos / Memories ────────────────────────────────────────────
export async function getPhotos() {
  if (!hasSupabase()) return { data: loadState('memories', []), error: null };
  const { data, error } = await supabase.from('photos').select('*').order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function uploadPhoto(file, uploaderName, uploadedBy = 'guest') {
  if (!hasSupabase()) {
    // LocalStorage fallback — use object URL (session only)
    const url = URL.createObjectURL(file);
    const photo = {
      id: Date.now(),
      url, thumb: url,
      name: file.name.replace(/\.[^.]+$/, ''),
      uploader: uploaderName,
      uploaded_by: uploadedBy,
      approved: uploadedBy === 'admin',
      category: 'other',
      created_at: new Date().toISOString(),
    };
    const photos = loadState('memories', []);
    saveState('memories', [...photos, photo]);
    return { data: photo, error: null };
  }

  // Upload file to Supabase Storage
  const ext = file.name.split('.').pop();
  const path = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('wedding-photos').upload(path, file);
  if (uploadError) return { data: null, error: uploadError };

  const { data: { publicUrl } } = supabase.storage.from('wedding-photos').getPublicUrl(path);

  const photo = {
    url: publicUrl,
    thumb: publicUrl,
    name: file.name.replace(/\.[^.]+$/, ''),
    uploader: uploaderName,
    uploaded_by: uploadedBy,
    approved: uploadedBy === 'admin',
    category: 'other',
    storage_path: path,
  };

  const { data, error } = await supabase.from('photos').insert(photo).select().single();
  return { data, error };
}

export async function updatePhoto(id, updates) {
  if (!hasSupabase()) {
    const photos = loadState('memories', []);
    saveState('memories', photos.map(p => p.id === id ? { ...p, ...updates } : p));
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
  if (storagePath) {
    await supabase.storage.from('wedding-photos').remove([storagePath]);
  }
  const { error } = await supabase.from('photos').delete().eq('id', id);
  return { error };
}

// ── Timeline ─────────────────────────────────────────────────────
export async function getTimeline() {
  if (!hasSupabase()) return { data: loadState('timeline', []), error: null };
  const { data, error } = await supabase.from('timeline').select('*').order('time');
  return { data: data || [], error };
}

export async function upsertTimelineEvent(event) {
  if (!hasSupabase()) {
    const tl = loadState('timeline', []);
    const exists = tl.find(e => e.id === event.id);
    saveState('timeline', exists ? tl.map(e => e.id === event.id ? event : e) : [...tl, event]);
    return { data: event, error: null };
  }
  const { data, error } = await supabase.from('timeline').upsert(event).select().single();
  return { data, error };
}

export async function deleteTimelineEvent(id) {
  if (!hasSupabase()) {
    saveState('timeline', loadState('timeline', []).filter(e => e.id !== id));
    return { error: null };
  }
  const { error } = await supabase.from('timeline').delete().eq('id', id);
  return { error };
}

// ── Schedule requests (programme slot requests) ───────────────────
export async function submitScheduleRequest(request) {
  if (!hasSupabase()) {
    const reqs = loadState('schedule_requests', []);
    saveState('schedule_requests', [...reqs, { ...request, id: Date.now(), status: 'pending', submitted_at: new Date().toISOString() }]);
    return { data: request, error: null };
  }
  const { data, error } = await supabase.from('schedule_requests').insert({
    ...request,
    status: 'pending',
    submitted_at: new Date().toISOString(),
  }).select().single();
  return { data, error };
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
    return { data: wish, error: null };
  }
  const { data, error } = await supabase.from('music_wishes').insert({
    ...wish,
    submitted_at: new Date().toISOString(),
  }).select().single();
  return { data, error };
}

export async function getMusicWishes() {
  if (!hasSupabase()) return { data: loadState('music_wishes', []), error: null };
  const { data, error } = await supabase.from('music_wishes').select('*').order('submitted_at', { ascending: false });
  return { data: data || [], error };
}

// ── Guest Page Config ────────────────────────────────────────────
export async function getGuestPageData() {
  if (!hasSupabase()) {
    return {
      data: {
        wedding:          loadState('wedding', null),
        config:           loadState('guestPageConfig', {}),
        timeline:         loadState('timeline', []),
        registry:         loadState('registry', []),
        photos:           loadState('memories', []).filter(p => p.approved),
        memoryCategories: loadState('memoryCategories', []),
        guests:           loadState('guests', []),
      },
      error: null
    };
  }

  // Load all data in parallel
  const [wedding, config, timeline, registry, photos, guests] = await Promise.all([
    supabase.from('weddings').select('*').limit(1).single(),
    supabase.from('guest_page_config').select('config').limit(1).single(),
    supabase.from('timeline').select('*').order('time'),
    supabase.from('registry').select('*'),
    supabase.from('photos').select('*').eq('approved', true).order('created_at', { ascending: false }),
    supabase.from('guests').select('id, name, invite_code, menu, status'),
  ]);

  // For timeline + registry: if Supabase is empty, fall back to localStorage
  // (they may not be synced to Supabase yet)
  const timelineData = (timeline.data && timeline.data.length > 0)
    ? timeline.data
    : loadState('timeline', []);

  const registryData = (registry.data && registry.data.length > 0)
    ? registry.data
    : loadState('registry', []);

  // Merge guest_page_config: Supabase config merged with localStorage fallback
  const localConfig = loadState('guestPageConfig', {});
  const supabaseConfig = config.data?.config || {};
  const mergedConfig = Object.keys(supabaseConfig).length > 0
    ? supabaseConfig
    : localConfig;

  return {
    data: {
      wedding:          wedding.data || loadState('wedding', null),
      config:           mergedConfig,
      timeline:         timelineData,
      registry:         registryData,
      photos:           photos.data || [],
      memoryCategories: loadState('memoryCategories', []),
      guests:           guests.data || [],
    },
    error: null,
  };
}

export async function saveGuestPageConfig(config) {
  if (!hasSupabase()) {
    loadState('guestPageConfig', {});
    saveState('guestPageConfig', config);
    return { error: null };
  }
  // Upsert — update the single config row
  const existing = await supabase.from('guest_page_config').select('id').limit(1).single();
  if (existing.data?.id) {
    const { error } = await supabase.from('guest_page_config')
      .update({ config, updated_at: new Date().toISOString() })
      .eq('id', existing.data.id);
    return { error };
  } else {
    const { error } = await supabase.from('guest_page_config').insert({ config });
    return { error };
  }
}

// ── Sync helpers (push localStorage data to Supabase) ────────────

// Call this once to push all local data to Supabase
export async function syncLocalToSupabase() {
  if (!hasSupabase()) return;

  // Sync wedding
  const wedding = loadState('wedding', null);
  if (wedding) {
    const existing = await supabase.from('weddings').select('id').limit(1).single();
    if (existing.data?.id) {
      await supabase.from('weddings').update(wedding).eq('id', existing.data.id);
    } else {
      await supabase.from('weddings').insert(wedding);
    }
  }

  // Sync guest page config
  const config = loadState('guestPageConfig', null);
  if (config) await saveGuestPageConfig(config);

  // Sync timeline events (upsert each)
  const timeline = loadState('timeline', []);
  if (timeline.length > 0) {
    // Delete existing and re-insert
    await supabase.from('timeline').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const mapped = timeline.map(e => ({
      time: e.time,
      end_time: e.endTime || e.end_time || '',
      title: e.title,
      type: e.type || 'other',
      loc: e.loc || '',
      description: e.desc || e.description || '',
      guests: e.guests || false,
      vendor: e.vendor || false,
    }));
    await supabase.from('timeline').insert(mapped);
  }

  console.log('[Vince] Sync complete');
}

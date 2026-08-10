/**
 * db.js — Unified data layer with user_id scoping
 * Falls back to localStorage when Supabase is not configured.
 */
import { supabase, hasSupabase } from './supabase';
import { loadState, saveState, defaultWedding, defaultGuests, defaultBudgetItems, defaultTimeline, makeInviteCode } from '../data/store';
import { compressImage, validateImageFile } from './imageUtils';

// ── Default template data for new users ──────────────────────────
const TEMPLATE_WEDDING = {
  bride: 'Sarah', groom: 'Tobias',
  date: '2026-10-15', venue: 'Schloss Waldenburg',
  budget: 18000, notes: '',
};

const TEMPLATE_GUESTS = [
  { name: 'Ingrid Müller',     email: 'ingrid@email.de',    group_name: 'Familie Braut',     status: 'confirmed', menu: 'Rind',         note: '', is_companion: false, parent_id: null },
  { name: 'Wolfgang Müller',   email: 'w.mueller@email.de', group_name: 'Familie Braut',     status: 'confirmed', menu: 'Rind',         note: '', is_companion: false, parent_id: null },
  { name: 'Anna Lehmann',      email: 'anna@email.de',      group_name: 'Freunde',           status: 'confirmed', menu: 'Vegan',        note: '', is_companion: false, parent_id: null },
  { name: 'Max Hartmann',      email: '',                   group_name: 'Freunde',           status: 'pending',   menu: '',             note: '', is_companion: false, parent_id: null },
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
  { title: 'Location buchen',       category: 'Organisation',   done: true,  due: '2025-12-01', note: '' },
  { title: 'Caterer anfragen',      category: 'Catering',       done: false, due: '2026-01-15', note: '' },
  { title: 'Einladungen versenden', category: 'Gäste',          done: false, due: '2026-06-01', note: '' },
  { title: 'Fotografen buchen',     category: 'Dienstleister',  done: true,  due: '2025-11-01', note: '' },
  { title: 'Ringe aussuchen',       category: 'Sonstiges',      done: false, due: '2026-03-01', note: '' },
];

const TEMPLATE_REGISTRY = [
  { title: 'Honeymoon-Kasse', description: 'Beitrag zu unserer Hochzeitsreise', amount: 0,   type: 'fund', reserved: false, link: '' },
  { title: 'Küchenmaschine',  description: 'KitchenAid, Farbe: Creme',          amount: 399, type: 'item', reserved: false, link: '' },
];

const TEMPLATE_CONFIG = {
  heroTitle: '', heroSubtitle: 'Wir freuen uns, mit euch zu feiern.',
  heroImageUrl: '', heroImagePosition: 'center',
  sections: { rsvp: true, timeline: true, location: true, dresscode: true, music: true, registry: true, memories: true, schedule: true, info: true },
  dresscodeStyle: 'Elegant & Boho',
  dresscodeText: 'Wir wünschen uns elegante Kleidung in warmen Erdtönen.',
  generalInfoTitle: 'Gut zu wissen',
  generalInfoText: '',
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

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('initialized')
    .eq('id', userId)
    .single();

  if (profile?.initialized) return;

  console.log('[Vince] First login — initializing with template data...');

  const pendingWedding = (() => {
    try { const d = localStorage.getItem('vince_pending_wedding'); return d ? JSON.parse(d) : null; } catch { return null; }
  })();
  if (pendingWedding) { localStorage.removeItem('vince_pending_wedding'); }
  const weddingInput = customWedding || pendingWedding;

  const wedding = weddingInput ? {
    bride:  weddingInput.bride  || TEMPLATE_WEDDING.bride,
    groom:  weddingInput.groom  || TEMPLATE_WEDDING.groom,
    date:   weddingInput.date   || TEMPLATE_WEDDING.date,
    venue:  weddingInput.venue  || TEMPLATE_WEDDING.venue,
    budget: TEMPLATE_WEDDING.budget,
    notes: '',
  } : TEMPLATE_WEDDING;

  const year = new Date(wedding.date).getFullYear();
  await supabase.from('weddings').delete().eq('user_id', userId);
  await supabase.from('weddings').insert({ ...wedding, user_id: userId });

  await supabase.from('guests').insert(
    TEMPLATE_GUESTS.map(g => ({
      ...g,
      user_id:      userId,
      invite_code:  makeInviteCode(g.name, year),
      is_companion: false,
      parent_id:    null,
    }))
  );

  await supabase.from('budget_items').insert(TEMPLATE_BUDGET.map(b => ({ ...b, user_id: userId })));
  await supabase.from('timeline').insert(TEMPLATE_TIMELINE.map(e => ({ ...e, user_id: userId })));
  await supabase.from('tasks').insert(TEMPLATE_TASKS.map(t => ({ ...t, user_id: userId })));
  await supabase.from('registry').insert(TEMPLATE_REGISTRY.map(r => ({ ...r, user_id: userId })));
  await supabase.from('guest_page_config').insert({ config: TEMPLATE_CONFIG, user_id: userId });
  await supabase.from('user_profiles').upsert({ id: userId, initialized: true });

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

export async function uploadCouplePhoto(file) {
  const invalid = validateImageFile(file);
  if (invalid) return { data: null, error: new Error(invalid) };
  if (!hasSupabase()) {
    const url = URL.createObjectURL(file);
    const wedding = loadState('wedding', defaultWedding);
    saveState('wedding', { ...wedding, couple_photo_url: url, couple_photo_path: '' });
    return { data: { url, path: '' }, error: null };
  }
  const compressed = await compressImage(file);
  const ext = compressed.name.split('.').pop();
  const path = `couple/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('wedding-photos').upload(path, compressed);
  if (uploadError) return { data: null, error: uploadError };
  const { data: { publicUrl } } = supabase.storage.from('wedding-photos').getPublicUrl(path);
  const userId = await getUserId();
  const existing = await supabase.from('weddings').select('id').eq('user_id', userId).limit(1).single();
  if (existing.data?.id) {
    await supabase.from('weddings').update({ couple_photo_url: publicUrl, couple_photo_path: path }).eq('id', existing.data.id);
  }
  return { data: { url: publicUrl, path }, error: null };
}

export async function removeCouplePhoto(storagePath) {
  if (!hasSupabase()) {
    const wedding = loadState('wedding', defaultWedding);
    saveState('wedding', { ...wedding, couple_photo_url: '', couple_photo_path: '' });
    return { error: null };
  }
  if (storagePath) await supabase.storage.from('wedding-photos').remove([storagePath]);
  const userId = await getUserId();
  const existing = await supabase.from('weddings').select('id').eq('user_id', userId).limit(1).single();
  if (existing.data?.id) {
    await supabase.from('weddings').update({ couple_photo_url: '', couple_photo_path: '' }).eq('id', existing.data.id);
  }
  return { error: null };
}

// ── Guests ───────────────────────────────────────────────────────
export async function getGuests() {
  if (!hasSupabase()) return { data: loadState('guests', []), error: null };
  const userId = await getUserId();
  const { data, error } = await supabase.from('guests').select('*').eq('user_id', userId).order('name');
  // Normalize: ensure is_companion and parent_id are always defined
  const normalized = (data || []).map(g => ({
    ...g,
    is_companion: g.is_companion === true,
    parent_id:    g.parent_id || null,
  }));
  return { data: normalized, error };
}

export async function upsertGuest(guest) {
  if (!hasSupabase()) {
    const guests = loadState('guests', []);
    const exists = guests.find(g => g.id === guest.id);
    saveState('guests', exists ? guests.map(g => g.id === guest.id ? guest : g) : [...guests, guest]);
    return { error: null };
  }
  const userId = await getUserId();

  // Explicitly strip frontend-only aliases and map to DB column names
  const {
    group,        // frontend alias → group_name
    inviteCode,   // frontend alias → invite_code
    ...rest
  } = guest;

  const { error } = await supabase.from('guests').upsert({
    ...rest,
    group_name:   group || guest.group_name || 'Freunde',
    invite_code:  inviteCode || guest.invite_code || '',
    is_companion: guest.is_companion === true,   // explicit boolean
    parent_id:    guest.parent_id || null,        // explicit null if missing
    user_id:      userId,
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
  // user_id kommt vom slug-aufgelösten Wedding-Datensatz (public Guest Page kennt
  // keine Session) — Pflicht, damit RSVPs sauber pro Hochzeit getrennt bleiben und
  // nicht plattformweit vermischt werden (Sicherheits-Fix, siehe getRSVPs unten).
  const { error } = await supabase.from('rsvp_responses').insert({
    name:         rsvpData.name,
    email:        rsvpData.email,
    attending:    rsvpData.attending,
    menu:         rsvpData.menu,
    plus_one:     rsvpData.plus_one || false,
    companions:   rsvpData.companions || '',
    message:      rsvpData.message,
    submitted_at: new Date().toISOString(),
    user_id:      rsvpData.userId || null,
  });

  if (!error && rsvpData.inviteCode && rsvpData.userId) {
    const { data: guests } = await supabase
      .from('guests')
      .select('id')
      .eq('invite_code', rsvpData.inviteCode.toUpperCase())
      .eq('user_id', rsvpData.userId);
    if (guests && guests.length > 0) {
      await supabase.from('guests').update({
        status: rsvpData.attending === 'yes' ? 'confirmed' : 'declined',
        menu:   rsvpData.menu || '',
      }).eq('invite_code', rsvpData.inviteCode.toUpperCase()).eq('user_id', rsvpData.userId);
    }
  }
  return { error };
}

// Serverseitige Prüfung eines Einladungscodes — gibt NUR Name + Menü des einen
// passenden Gasts zurück, nie die komplette Gästeliste (Sicherheits-Fix).
export async function verifyGuestCode(userId, code) {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) return { data: null, error: null };
  if (!hasSupabase()) {
    const guests = loadState('guests', []);
    const match = guests.find(g => (g.inviteCode || g.invite_code || '').toUpperCase() === cleanCode);
    return { data: match ? { name: match.name, menu: match.menu || '' } : null, error: null };
  }
  const { data, error } = await supabase.rpc('verify_guest_code', { p_user_id: userId, p_code: cleanCode });
  return { data: (data && data[0]) || null, error };
}

export async function getRSVPs() {
  if (!hasSupabase()) return { data: loadState('rsvp_responses', []), error: null };
  const userId = await getUserId();
  const { data, error } = await supabase.from('rsvp_responses').select('*').eq('user_id', userId).order('submitted_at', { ascending: false });
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
    end_time:    event.endTime || event.end_time || '',
    description: event.desc   || event.description || '',
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
  const { data, error } = userId
    ? await supabase.from('photos').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    : await supabase.from('photos').select('*').eq('approved', true).order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function uploadPhoto(file, uploaderName, uploadedBy = 'guest') {
  const invalid = validateImageFile(file);
  if (invalid) return { data: null, error: new Error(invalid) };
  if (!hasSupabase()) {
    const url = URL.createObjectURL(file);
    const photo = { id: Date.now(), url, thumb: url, name: file.name.replace(/\.[^.]+$/, ''), uploader: uploaderName, uploaded_by: uploadedBy, approved: uploadedBy === 'admin', category: 'other', created_at: new Date().toISOString() };
    saveState('memories', [...loadState('memories', []), photo]);
    return { data: photo, error: null };
  }
  const compressed = await compressImage(file);
  const ext = compressed.name.split('.').pop();
  const path = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('wedding-photos').upload(path, compressed);
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

// ── Moodboard (Location + Fotoplanung) ────────────────────────────
export async function getMoodboardItems(page) {
  if (!hasSupabase()) return { data: loadState(`moodboard_${page}`, []), error: null };
  const userId = await getUserId();
  const { data, error } = await supabase.from('moodboard_items').select('*')
    .eq('page', page).eq('user_id', userId).order('created_at');
  return { data: data || [], error };
}

export async function uploadMoodboardImage(file, page) {
  const invalid = validateImageFile(file);
  if (invalid) return { data: null, error: new Error(invalid) };
  if (!hasSupabase()) {
    const url = URL.createObjectURL(file);
    const item = { id: crypto.randomUUID(), page, type: 'upload', url, caption: '', created_at: new Date().toISOString() };
    const items = loadState(`moodboard_${page}`, []);
    saveState(`moodboard_${page}`, [...items, item]);
    return { data: item, error: null };
  }
  const compressed = await compressImage(file);
  const ext = compressed.name.split('.').pop();
  const path = `moodboard/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('wedding-photos').upload(path, compressed);
  if (uploadError) return { data: null, error: uploadError };
  const { data: { publicUrl } } = supabase.storage.from('wedding-photos').getPublicUrl(path);
  const userId = await getUserId();
  const item = { page, type: 'upload', url: publicUrl, caption: '', storage_path: path, user_id: userId };
  const { data, error } = await supabase.from('moodboard_items').insert(item).select().single();
  return { data, error };
}

export async function addMoodboardLink(url, page, caption = '') {
  if (!hasSupabase()) {
    const item = { id: crypto.randomUUID(), page, type: 'link', url, caption, created_at: new Date().toISOString() };
    const items = loadState(`moodboard_${page}`, []);
    saveState(`moodboard_${page}`, [...items, item]);
    return { data: item, error: null };
  }
  const userId = await getUserId();
  const item = { page, type: 'link', url, caption, user_id: userId };
  const { data, error } = await supabase.from('moodboard_items').insert(item).select().single();
  return { data, error };
}

export async function deleteMoodboardItem(id, page, storagePath) {
  if (!hasSupabase()) {
    saveState(`moodboard_${page}`, loadState(`moodboard_${page}`, []).filter(i => i.id !== id));
    return { error: null };
  }
  if (storagePath) await supabase.storage.from('wedding-photos').remove([storagePath]);
  const { error } = await supabase.from('moodboard_items').delete().eq('id', id);
  return { error };
}

// ── Guest Page Data (public) ─────────────────────────────────────
export async function getGuestPageData(slug) {
  if (!hasSupabase()) {
    return {
      data: {
        wedding:          loadState('wedding', null),
        config:           loadState('guestPageConfig', {}),
        timeline:         loadState('timeline', []),
        registry:         loadState('registry', []),
        guests:           loadState('guests', []),
      },
      error: null
    };
  }

  // Sicherheits-Fix: früher wurde die KOMPLETTE weddings-Tabelle (alle Paare,
  // inkl. Budget/Notizen) ungefiltert an jeden Besucher der Gästeseite
  // geschickt, nur um die eine passende Hochzeit per Slug zu finden. Jetzt
  // übernimmt eine serverseitige Funktion (SECURITY DEFINER) die Auflösung
  // und gibt nur die öffentlich nötigen Felder der EINEN passenden Hochzeit
  // zurück — kein Budget, keine Notizen, kein Kaufstatus, keine anderen Paare.
  let wedding = null;
  if (slug) {
    const { data } = await supabase.rpc('find_wedding_by_slug', { p_slug: slug });
    wedding = (data && data[0]) || null;
  }
  const userId = wedding?.user_id;

  const [config, timeline] = await Promise.all([
    userId ? supabase.from('guest_page_config').select('config').eq('user_id', userId).limit(1).single() : Promise.resolve({ data: null }),
    userId ? supabase.from('timeline').select('*').eq('user_id', userId).order('time') : Promise.resolve({ data: [] }),
  ]);

  const timelineData  = (timeline.data?.length > 0) ? timeline.data.map(e => ({ ...e, endTime: e.end_time, desc: e.description })) : loadState('timeline', []);
  const mergedConfig  = config.data?.config || loadState('guestPageConfig', {});

  return {
    data: {
      wedding,
      config:           mergedConfig,
      timeline:         timelineData,
      registry:         loadState('registry', []),
    },
    error: null,
  };
}

// ── Memories Share Page (public — approved photos only) ───────────
export async function getMemoriesPageData(slug) {
  if (!hasSupabase()) {
    return {
      data: {
        wedding:          loadState('wedding', null),
        photos:           loadState('memories', []).filter(p => p.approved),
        memoryCategories: loadState('memoryCategories', []),
      },
      error: null,
    };
  }

  // Gleicher Sicherheits-Fix wie in getGuestPageData: Auflösung per RPC statt
  // ungefilterter Abfrage der kompletten weddings-Tabelle.
  let wedding = null;
  if (slug) {
    const { data } = await supabase.rpc('find_wedding_by_slug', { p_slug: slug });
    wedding = (data && data[0]) || null;
  }
  const userId = wedding?.user_id;

  const { data: photos } = userId
    ? await supabase.from('photos').select('*').eq('approved', true).eq('user_id', userId).order('created_at', { ascending: false })
    : { data: [] };

  return {
    data: {
      wedding: wedding ? { bride: wedding.bride, groom: wedding.groom, date: wedding.date, venue: wedding.venue } : null,
      photos: photos || [],
      memoryCategories: loadState('memoryCategories', []),
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
// Sicherheits-Fix: fehlte bisher komplett an user_id-Scoping — jedes Paar
// sah beim Laden ALLE Programmwünsche ALLER Hochzeiten vermischt (exakt
// dasselbe Muster wie der bereits behobene RSVP-Bug, siehe submitRSVP).
export async function submitScheduleRequest(request) {
  if (!hasSupabase()) {
    const reqs = loadState('schedule_requests', []);
    saveState('schedule_requests', [...reqs, { ...request, id: Date.now(), status: 'pending', submitted_at: new Date().toISOString() }]);
    return { error: null };
  }
  const { userId, ...rest } = request;
  const { error } = await supabase.from('schedule_requests').insert({ ...rest, status: 'pending', submitted_at: new Date().toISOString(), user_id: userId || null });
  return { error };
}

export async function getScheduleRequests() {
  if (!hasSupabase()) return { data: loadState('schedule_requests', []), error: null };
  const userId = await getUserId();
  const { data, error } = await supabase.from('schedule_requests').select('*').eq('user_id', userId).order('submitted_at', { ascending: false });
  return { data: data || [], error };
}

// ── Music wishes ─────────────────────────────────────────────────
// Gleicher Sicherheits-Fix wie bei den Programmwünschen (siehe oben).
export async function submitMusicWish(wish) {
  if (!hasSupabase()) {
    const wishes = loadState('music_wishes', []);
    saveState('music_wishes', [...wishes, { ...wish, id: Date.now(), submitted_at: new Date().toISOString() }]);
    return { error: null };
  }
  const { userId, ...rest } = wish;
  const { error } = await supabase.from('music_wishes').insert({ ...rest, submitted_at: new Date().toISOString(), user_id: userId || null });
  return { error };
}

export async function getMusicWishes() {
  if (!hasSupabase()) return { data: loadState('music_wishes', []), error: null };
  const userId = await getUserId();
  const { data, error } = await supabase.from('music_wishes').select('*').eq('user_id', userId).order('submitted_at', { ascending: false });
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
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: new Error('Not logged in') };
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
  });
  const result = await res.json();
  if (!res.ok || result.error) return { error: new Error(result.error || 'Deletion failed') };
  Object.keys(localStorage).filter(k => k.startsWith('vince_')).forEach(k => localStorage.removeItem(k));
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

// ── Playlist songs ──────────────────────────────────────────────
export async function getPlaylistSongs() {
  if (!hasSupabase()) return { data: loadState('music', []), error: null };
  const userId = await getUserId();
  const { data, error } = await supabase.from('playlist_songs').select('*').eq('user_id', userId).order('created_at');
  return { data: data || [], error };
}

export async function upsertPlaylistSong(song) {
  if (!hasSupabase()) {
    const songs = loadState('music', []);
    const exists = songs.find(s => s.id === song.id);
    saveState('music', exists ? songs.map(s => s.id === song.id ? song : s) : [...songs, song]);
    return { error: null };
  }
  const userId = await getUserId();
  const { error } = await supabase.from('playlist_songs').upsert({ ...song, user_id: userId });
  return { error };
}

export async function deletePlaylistSong(id) {
  if (!hasSupabase()) {
    saveState('music', loadState('music', []).filter(s => s.id !== id));
    return { error: null };
  }
  const { error } = await supabase.from('playlist_songs').delete().eq('id', id);
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

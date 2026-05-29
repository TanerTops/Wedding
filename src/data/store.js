// Default wedding data
export const defaultWedding = {
  bride: 'Sarah',
  groom: 'Tobias',
  date: '2026-10-15',
  venue: 'Schloss Waldenburg',
  budget: 18000,
  notes: '',
};

export function makeSlug(wedding) {
  const clean = s => s.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
  return `${clean(wedding.bride)}-${clean(wedding.groom)}`;
}

export const defaultGuests = [
  { id: 1, name: 'Ingrid Müller', email: 'ingrid@email.de', group: 'Familie Braut', status: 'confirmed', menu: 'Rind', note: '' },
  { id: 2, name: 'Wolfgang Müller', email: 'w.mueller@email.de', group: 'Familie Braut', status: 'confirmed', menu: 'Rind', note: '' },
  { id: 3, name: 'Lisa Müller', email: 'lisa@email.de', group: 'Familie Braut', status: 'confirmed', menu: 'Vegetarisch', note: '' },
  { id: 4, name: 'Klaus Schneider', email: 'k.s@email.de', group: 'Familie Bräutigam', status: 'confirmed', menu: 'Rind', note: '' },
  { id: 5, name: 'Monika Schneider', email: 'm.s@email.de', group: 'Familie Bräutigam', status: 'confirmed', menu: 'Rind', note: '' },
  { id: 6, name: 'Anna Lehmann', email: 'anna@email.de', group: 'Freunde', status: 'confirmed', menu: 'Vegan', note: '' },
  { id: 7, name: 'Max Hartmann', email: '', group: 'Freunde', status: 'confirmed', menu: 'Rind', note: '' },
  { id: 8, name: 'Sophie Wagner', email: 'sophie@email.de', group: 'Freunde', status: 'confirmed', menu: 'Fisch', note: '' },
  { id: 9, name: 'Tim Huber', email: 'tim@email.de', group: 'Freunde', status: 'declined', menu: '', note: '' },
  { id: 10, name: 'Sarah Bergmann', email: 's.b@email.de', group: 'Freunde', status: 'pending', menu: '', note: '' },
  { id: 11, name: 'Johannes Roth', email: 'j.roth@email.de', group: 'Freunde', status: 'pending', menu: '', note: '' },
  { id: 12, name: 'Dr. Martin Schreiber', email: 'm.s@firma.de', group: 'Arbeit', status: 'confirmed', menu: 'Rind', note: '' },
  { id: 13, name: 'Sandra Peters', email: 's.p@firma.de', group: 'Arbeit', status: 'confirmed', menu: 'Vegan', note: '' },
  { id: 14, name: 'Oliver Haas', email: 'o.h@firma.de', group: 'Arbeit', status: 'pending', menu: '', note: '' },
];

export const defaultBudgetItems = [
  { id: 1, desc: 'Schloss Waldenburg – Saalmiete', cat: 'Location', amount: 4800, paid: true, due: '2026-02-01' },
  { id: 2, desc: 'Catering – Dinner & Service', cat: 'Catering', amount: 6900, paid: false, due: '2026-09-21' },
  { id: 3, desc: 'Fotografie – Reportage 8h', cat: 'Fotografie', amount: 2200, paid: true, due: '2026-03-15' },
  { id: 4, desc: 'Floristik – Tischdeko & Brautstrauß', cat: 'Floristik', amount: 1450, paid: false, due: '2026-09-14' },
  { id: 5, desc: 'DJ Max – Abendmusik', cat: 'Musik', amount: 1200, paid: true, due: '2026-04-01' },
];

export const defaultBudgetCategories = [
  { id: 1, name: 'Location', budget: 5000, color: '#8B7355' },
  { id: 2, name: 'Catering', budget: 7000, color: '#C4956A' },
  { id: 3, name: 'Fotografie', budget: 2500, color: '#A8B5A0' },
  { id: 4, name: 'Floristik', budget: 1500, color: '#D4B896' },
  { id: 5, name: 'Musik', budget: 1500, color: '#B8A9C9' },
];

export const defaultTasks = [
  { id: 1, title: 'Fotografin buchen', cat: 'Dienstleister', priority: 'high', due: '2026-01-15', done: true },
  { id: 2, title: 'Catering Angebot einholen', cat: 'Catering', priority: 'high', due: '2026-02-01', done: true },
  { id: 3, title: 'Einladungen versenden', cat: 'Gäste', priority: 'high', due: '2026-03-01', done: true },
  { id: 4, title: 'Blumendeko besprechen', cat: 'Floristik', priority: 'medium', due: '2026-06-01', done: false },
  { id: 5, title: 'Sitzplan erstellen', cat: 'Gäste', priority: 'medium', due: '2026-08-01', done: false },
  { id: 6, title: 'Musik-Playlist abstimmen', cat: 'Musik', priority: 'low', due: '2026-07-15', done: false },
  { id: 7, title: 'Menüs finalisieren', cat: 'Catering', priority: 'high', due: '2026-09-01', done: false },
  { id: 8, title: 'Ringe abholen', cat: 'Sonstiges', priority: 'high', due: '2026-09-15', done: false },
];

export const defaultTimeline = [
  { id: 1, time: '10:00', title: 'Standesamtliche Trauung', loc: 'Rathaus', type: 'ceremony' },
  { id: 2, time: '11:30', title: 'Sektempfang & Fotos', loc: 'Rathausplatz', type: 'photo' },
  { id: 3, time: '13:00', title: 'Kirchliche Trauung', loc: 'St. Marien Kirche', type: 'ceremony' },
  { id: 4, time: '14:30', title: 'Empfang & Aperitif', loc: 'Schloss – Terrasse', type: 'reception' },
  { id: 5, time: '16:00', title: 'Dinner', loc: 'Schloss – Festsaal', type: 'dinner' },
  { id: 6, time: '20:00', title: 'Eröffnungstanz', loc: 'Festsaal', type: 'dance' },
  { id: 7, time: '20:30', title: 'Party & Musik', loc: 'Festsaal', type: 'party' },
];

export const defaultSeating = {
  tables: [
    { id: 1, name: 'Tisch 1 – Brautpaar', shape: 'round', seats: 8, guests: [1, 2, 3, 4], x: 120, y: 80 },
    { id: 2, name: 'Tisch 2 – Familie', shape: 'round', seats: 8, guests: [5, 6, 7], x: 340, y: 80 },
    { id: 3, name: 'Tisch 3 – Freunde', shape: 'rect', seats: 10, guests: [8, 12, 13], x: 120, y: 280 },
    { id: 4, name: 'Tisch 4 – Arbeit', shape: 'rect', seats: 8, guests: [], x: 340, y: 280 },
  ]
};

// LocalStorage helpers
export function loadState(key, defaultValue) {
  try {
    const stored = localStorage.getItem(`vince_${key}`);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function saveState(key, value) {
  try {
    localStorage.setItem(`vince_${key}`, JSON.stringify(value));
  } catch {}
}

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  IconBuildingStore, IconSearch, IconChevronDown, IconChevronUp,
  IconClock, IconExternalLink
} from '@tabler/icons-react';
import { getBudgetItems } from '../lib/db';

const fEU = n => Number(n || 0).toLocaleString('de-DE') + ' €';
const fDE = d => { try { return new Date(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return d; } };
const daysUntil = d => Math.ceil((new Date(d) - new Date()) / 86400000);

export default function Vendors() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | open | paid
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    getBudgetItems().then(({ data }) => {
      setItems((data || []).map(i => ({ ...i, desc: i.description || i.desc })));
      setLoading(false);
    });
  }, []);

  // ── Aggregate budget items into vendor rollups ──────────────────
  const { vendors, unassignedCount, unassignedTotal } = useMemo(() => {
    const map = new Map();
    let unassignedCount = 0, unassignedTotal = 0;

    for (const item of items) {
      const name = (item.vendor || '').trim();
      if (!name) {
        unassignedCount++;
        unassignedTotal += item.amount || 0;
        continue;
      }
      if (!map.has(name)) {
        map.set(name, { name, items: [], committed: 0, paid: 0, categories: new Set() });
      }
      const v = map.get(name);
      v.items.push(item);
      v.committed += item.amount || 0;
      if (item.paid) v.paid += item.amount || 0;
      if (item.cat) v.categories.add(item.cat);
    }

    let vendors = Array.from(map.values()).map(v => ({
      ...v,
      categories: Array.from(v.categories),
      open: v.committed - v.paid,
      openCount: v.items.filter(i => !i.paid).length,
      nextDue: v.items
        .filter(i => !i.paid && i.due)
        .sort((a, b) => new Date(a.due) - new Date(b.due))[0]?.due || null,
    }));

    vendors.sort((a, b) => b.committed - a.committed);
    return { vendors, unassignedCount, unassignedTotal };
  }, [items]);

  const filtered = vendors
    .filter(v => v.name.toLowerCase().includes(search.toLowerCase()))
    .filter(v => {
      if (statusFilter === 'open') return v.openCount > 0;
      if (statusFilter === 'paid') return v.openCount === 0;
      return true;
    });

  const totalVendors = vendors.length;
  const totalCommitted = vendors.reduce((s, v) => s + v.committed, 0);
  const totalOpen = vendors.reduce((s, v) => s + v.open, 0);
  const upcomingCount = vendors.filter(v => v.nextDue && daysUntil(v.nextDue) <= 30).length;

  if (loading) {
    return (
      <div className="page-body">
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--mocha)' }}>Wird geladen…</div>
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Dienstleister</h1>
          <div className="topbar-sub">Übersicht aller Vendors aus euren Budget-Ausgaben</div>
        </div>
      </div>

      <div className="page-body">

        {/* KPI cards */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 18 }}>
          <div className="stat-card" style={{ borderTopColor: 'var(--mocha)' }}>
            <div className="stat-label">Dienstleister</div>
            <div className="stat-value">{totalVendors}</div>
          </div>
          <div className="stat-card" style={{ borderTopColor: 'var(--sage)' }}>
            <div className="stat-label">Beauftragt gesamt</div>
            <div className="stat-value">{fEU(totalCommitted)}</div>
          </div>
          <div className="stat-card" style={{ borderTopColor: 'var(--blush)' }}>
            <div className="stat-label">Offene Zahlungen</div>
            <div className="stat-value" style={{ color: totalOpen > 0 ? '#E57373' : 'inherit' }}>{fEU(totalOpen)}</div>
          </div>
          <div className="stat-card" style={{ borderTopColor: 'var(--gold)' }}>
            <div className="stat-label">Bald fällig (30 Tage)</div>
            <div className="stat-value">{upcomingCount}</div>
          </div>
        </div>

        {/* Hint if items have no vendor set */}
        {unassignedCount > 0 && (
          <div className="card-warm" style={{ marginBottom: 16, borderLeft: '3px solid var(--gold)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: 13, color: 'var(--espresso)' }}>
              {unassignedCount} Budget-Ausgabe{unassignedCount !== 1 ? 'n' : ''} ({fEU(unassignedTotal)}) {unassignedCount !== 1 ? 'haben' : 'hat'} noch keinen Dienstleister hinterlegt.
            </div>
            <Link to="/budget" className="btn btn-secondary btn-sm">
              <IconExternalLink size={13} stroke={1.5} /> Im Budget ergänzen
            </Link>
          </div>
        )}

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <IconSearch size={14} stroke={1.5} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--mocha)' }} />
            <input
              className="input"
              style={{ paddingLeft: 30 }}
              placeholder="Dienstleister suchen…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="tabs" style={{ margin: 0 }}>
            {[['all', 'Alle'], ['open', 'Offene Zahlungen'], ['paid', 'Vollständig bezahlt']].map(([v, l]) => (
              <button key={v} className={`tab${statusFilter === v ? ' active' : ''}`} onClick={() => setStatusFilter(v)}>{l}</button>
            ))}
          </div>
        </div>

        {/* Vendor list */}
        {filtered.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--mocha)' }}>
            <IconBuildingStore size={32} stroke={1.5} style={{ marginBottom: 10, opacity: 0.5 }} />
            <p>{vendors.length === 0 ? 'Noch keine Dienstleister — trage bei euren Budget-Ausgaben einen Vendor-Namen ein.' : 'Keine Dienstleister gefunden.'}</p>
            {vendors.length === 0 && (
              <Link to="/budget" className="btn btn-primary btn-sm" style={{ marginTop: 10, display: 'inline-flex' }}>
                Zum Budget
              </Link>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(v => {
            const isOpen = expanded === v.name;
            const fullyPaid = v.openCount === 0;
            return (
              <div key={v.name} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div
                  onClick={() => setExpanded(isOpen ? null : v.name)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--warm)', border: '1px solid var(--sand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconBuildingStore size={17} stroke={1.5} style={{ color: 'var(--terra)' }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--espresso)' }}>{v.name}</span>
                      {v.categories.map(c => (
                        <span key={c} style={{ fontSize: 10.5, color: 'var(--mocha)', background: 'var(--warm)', padding: '1px 8px', borderRadius: 20, border: '1px solid var(--sand)' }}>{c}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--mocha)', marginTop: 2 }}>
                      {v.items.length} Ausgabe{v.items.length !== 1 ? 'n' : ''}
                      {v.nextDue && !fullyPaid && (
                        <span style={{ marginLeft: 8, color: daysUntil(v.nextDue) <= 7 ? '#E57373' : 'var(--terra)' }}>
                          <IconClock size={11} stroke={1.5} style={{ verticalAlign: -2 }} /> fällig {fDE(v.nextDue)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--espresso)' }}>{fEU(v.committed)}</div>
                    {fullyPaid ? (
                      <span style={{ fontSize: 10.5, color: '#388E3C', fontWeight: 500 }}>✓ Vollständig bezahlt</span>
                    ) : (
                      <span style={{ fontSize: 10.5, color: 'var(--terra)', fontWeight: 500 }}>{fEU(v.open)} offen · {v.openCount}×</span>
                    )}
                  </div>

                  {isOpen ? <IconChevronUp size={16} stroke={1.5} style={{ color: 'var(--mocha)', flexShrink: 0 }} /> : <IconChevronDown size={16} stroke={1.5} style={{ color: 'var(--mocha)', flexShrink: 0 }} />}
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--sand)', background: 'var(--warm)' }}>
                    {v.items.map(item => {
                      const overdue = !item.paid && item.due && daysUntil(item.due) <= 0;
                      return (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid #F0E8D8' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--espresso)' }}>{item.desc}</div>
                            <div style={{ fontSize: 11, color: 'var(--mocha)', marginTop: 1 }}>
                              {item.cat}{item.due && <> · {overdue && '⚠️ '}fällig {fDE(item.due)}</>}
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--espresso)', flexShrink: 0 }}>{fEU(item.amount)}</div>
                          <span style={{ fontSize: 10.5, padding: '2px 9px', borderRadius: 20, fontWeight: 500, flexShrink: 0, background: item.paid ? '#E8F5E9' : '#FFF8E1', color: item.paid ? '#388E3C' : '#F9A825' }}>
                            {item.paid ? '✓ Bezahlt' : '○ Offen'}
                          </span>
                        </div>
                      );
                    })}
                    <div style={{ padding: '10px 18px' }}>
                      <Link to="/budget" className="btn btn-secondary btn-sm">
                        <IconExternalLink size={13} stroke={1.5} /> Im Budget bearbeiten
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

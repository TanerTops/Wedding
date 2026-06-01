import { useState, useRef } from 'react';
import { IconPlus, IconTrash, IconX, IconRotateClockwise } from '@tabler/icons-react';
import { loadState, saveState, defaultSeating, defaultGuests } from '../data/store';

const AV_COLORS = ['#C4956A','#A8B5A0','#C4B5A5','#8B9E7A','#B8A9C9','#C9A884','#9B8EA0','#B5A88A'];
const ini = n => n.split(' ').map(x => x[0]).slice(0,2).join('').toUpperCase();
const avc = id => AV_COLORS[id % AV_COLORS.length];

const CANVAS_W = 820, CANVAS_H = 540;
const SEAT_R = 13;
const BLOCKED_COLOR = '#EAE0D0';
const PROXIMITY = 4; // px — only block seats that are truly inside/touching the other table

// ── geometry helpers ─────────────────────────────────────────────
function deg2rad(d) { return d * Math.PI / 180; }

// Get table dimensions based on shape and seat count
function getTableDims(shape, seats) {
  if (shape === 'round')  return { rx: Math.max(38, 18 + seats * 5.5), ry: Math.max(38, 18 + seats * 5.5) };
  if (shape === 'rect')   return { rx: Math.max(72, 28 + seats * 7), ry: 34 };
  /* square */            return { rx: Math.max(46, 28 + seats * 4), ry: Math.max(46, 28 + seats * 4) };
}

// Generate seat positions in LOCAL space (cx=0,cy=0, no rotation)
function getSeatPositionsLocal(shape, seats, rx, ry) {
  const pos = [];
  if (shape === 'round') {
    const r = rx + 30;
    for (let i = 0; i < seats; i++) {
      const a = (i / seats) * 2 * Math.PI - Math.PI / 2;
      pos.push({ lx: r * Math.cos(a), ly: r * Math.sin(a), sideAngle: a });
    }
  } else {
    // rect / square: distribute seats on 4 sides, store which side each belongs to
    const sides = [
      { name: 'top',    normal: -Math.PI/2 },
      { name: 'bottom', normal:  Math.PI/2 },
      { name: 'left',   normal:  Math.PI   },
      { name: 'right',  normal:  0         },
    ];
    const perSide = [
      Math.round(seats * (rx / (2*(rx+ry)))),  // top
      Math.round(seats * (rx / (2*(rx+ry)))),  // bottom
      0, 0
    ];
    let used = perSide[0] + perSide[1];
    const rem = seats - used;
    perSide[2] = Math.ceil(rem/2);
    perSide[3] = rem - perSide[2];
    // Ensure total matches
    while (perSide.reduce((a,b)=>a+b,0) < seats) perSide[0]++;
    while (perSide.reduce((a,b)=>a+b,0) > seats) { for(let i=0;i<4;i++){if(perSide[i]>0){perSide[i]--;break;}} }

    const distribute = (n, len, normal, ox, oy) => {
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const offset = -len + len * 2 * t;
        let lx, ly;
        if (normal === -Math.PI/2) { lx = offset; ly = -(ry + 28); }
        else if (normal === Math.PI/2) { lx = offset; ly = (ry + 28); }
        else if (normal === Math.PI) { lx = -(rx + 28); ly = offset * (ry/rx); }
        else { lx = (rx + 28); ly = offset * (ry/rx); }
        pos.push({ lx, ly, sideAngle: normal });
      }
    };
    distribute(perSide[0], rx, -Math.PI/2);
    distribute(perSide[1], rx,  Math.PI/2);
    distribute(perSide[2], ry,  Math.PI);
    distribute(perSide[3], ry,  0);
  }
  return pos;
}

// Rotate a point around origin
function rotatePoint(px, py, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return { x: px * cos - py * sin, y: px * sin + py * cos };
}

// Get world-space seat positions (with rotation + translation)
function getWorldSeats(table) {
  const { rx, ry } = getTableDims(table.shape, table.seats);
  const local = getSeatPositionsLocal(table.shape, table.seats, rx, ry);
  const rot = deg2rad(table.rotation || 0);
  return local.map(s => {
    const r = rotatePoint(s.lx, s.ly, rot);
    return { ...s, wx: table.x + r.x, wy: table.y + r.y, worldAngle: s.sideAngle + rot };
  });
}

// Get 4 corners of a rect/square table in world space
function getTableCorners(table) {
  const { rx, ry } = getTableDims(table.shape, table.seats);
  const rot = deg2rad(table.rotation || 0);
  const corners = [[-rx,-ry],[rx,-ry],[rx,ry],[-rx,ry]];
  return corners.map(([lx,ly]) => {
    const r = rotatePoint(lx, ly, rot);
    return { x: table.x + r.x, y: table.y + r.y };
  });
}

// Project point onto axis and get interval
function projectOntoAxis(corners, ax, ay) {
  const dots = corners.map(c => c.x * ax + c.y * ay);
  return { min: Math.min(...dots), max: Math.max(...dots) };
}

// Check overlap on one axis (SAT)
function overlaps(a, b) { return a.max >= b.min && b.max >= a.min; }

// Get separation gap between two OBBs using SAT
function getOBBSeparation(t1, t2) {
  const corners1 = getTableCorners(t1);
  const corners2 = getTableCorners(t2);
  const rot1 = deg2rad(t1.rotation||0), rot2 = deg2rad(t2.rotation||0);
  const axes = [
    { ax: Math.cos(rot1),  ay: Math.sin(rot1)  },
    { ax: -Math.sin(rot1), ay: Math.cos(rot1)  },
    { ax: Math.cos(rot2),  ay: Math.sin(rot2)  },
    { ax: -Math.sin(rot2), ay: Math.cos(rot2)  },
  ];
  let minSep = Infinity, minAxis = null;
  for (const { ax, ay } of axes) {
    const p1 = projectOntoAxis(corners1, ax, ay);
    const p2 = projectOntoAxis(corners2, ax, ay);
    if (!overlaps(p1, p2)) return { separated: true, gap: 0 };
    const sep = Math.min(p1.max - p2.min, p2.max - p1.min);
    if (sep < minSep) { minSep = sep; minAxis = { ax, ay }; }
  }
  return { separated: false, gap: -minSep, axis: minAxis };
}

// Blocked seat detection.
// Rules:
//   - Long side (side seats of rect): only block seats that are PHYSICALLY INSIDE the neighbour body
//   - Head end (short ends of rect): block ALL seats on that end of BOTH tables when they touch
function getBlockedSeats(tables) {
  const blocked = {};

  function pointInside(wx, wy, table, pad = SEAT_R) {
    const { rx, ry } = getTableDims(table.shape, table.seats);
    const rot = deg2rad(table.rotation || 0);
    const dx = wx - table.x, dy = wy - table.y;
    const cos = Math.cos(-rot), sin = Math.sin(-rot);
    return Math.abs(dx*cos - dy*sin) < rx + pad && Math.abs(dx*sin + dy*cos) < ry + pad;
  }

  function localX(wx, wy, table) {
    const rot = deg2rad(table.rotation || 0);
    const dx = wx - table.x, dy = wy - table.y;
    return dx * Math.cos(-rot) - dy * Math.sin(-rot);
  }

  function localY(wx, wy, table) {
    const rot = deg2rad(table.rotation || 0);
    const dx = wx - table.x, dy = wy - table.y;
    return dx * Math.sin(-rot) + dy * Math.cos(-rot);
  }

  function isH2H(t1, t2) {
    const rot1 = deg2rad(t1.rotation || 0);
    const dx = t2.x - t1.x, dy = t2.y - t1.y;
    const lx = dx*Math.cos(-rot1) - dy*Math.sin(-rot1);
    const ly = dx*Math.sin(-rot1) + dy*Math.cos(-rot1);
    return Math.abs(lx) > Math.abs(ly) * 1.1;
  }

  for (let i = 0; i < tables.length; i++) {
    const t1 = tables[i];
    if (t1.shape === 'round') continue;
    const { rx: rx1, ry: ry1 } = getTableDims(t1.shape, t1.seats);
    const seats1 = getWorldSeats(t1);

    for (let j = 0; j < tables.length; j++) {
      if (i === j) continue;
      const t2 = tables[j];
      if (t2.shape === 'round') continue;
      const { rx: rx2, ry: ry2 } = getTableDims(t2.shape, t2.seats);

      const ddx = t1.x - t2.x, ddy = t1.y - t2.y;
      if (Math.sqrt(ddx*ddx + ddy*ddy) > (Math.max(rx1,ry1) + Math.max(rx2,ry2))*2 + 90) continue;

      const seats2 = getWorldSeats(t2);
      const h2h = isH2H(t1, t2);

      seats1.forEach((seat, si) => {
        const lx1 = localX(seat.wx, seat.wy, t1);
        const ly1 = localY(seat.wx, seat.wy, t1);
        const isHead = Math.abs(lx1) > rx1 * 0.55;

        let minD = Infinity, minIdx = -1;
        seats2.forEach((s2, si2) => {
          const d = Math.hypot(s2.wx - seat.wx, s2.wy - seat.wy);
          if (d < minD) { minD = d; minIdx = si2; }
        });
        if (minIdx < 0) return;

        if (h2h && isHead && minD < SEAT_R * 5) {
          const isCentre = Math.abs(ly1) < ry1 * 0.35;
          if (isCentre) {
            blocked[`${t1.id}_${si}`] = true;
            blocked[`${t2.id}_${minIdx}`] = true;
          } else {
            if (i < j) {
              blocked[`${t2.id}_${minIdx}`] = true;
            }
          }
        } else if (!h2h && pointInside(seat.wx, seat.wy, t2)) {
          blocked[`${t1.id}_${si}`] = true;
          if (pointInside(seats2[minIdx].wx, seats2[minIdx].wy, t1)) {
            blocked[`${t2.id}_${minIdx}`] = true;
          }
        }
      });
    }
  }

  return blocked;
}



export default function Seating() {
  const [seating, setSeating] = useState(() => {
    const s = loadState('seating', defaultSeating);
    return {
      ...s,
      tables: s.tables.map((t, i) => ({
        shape: 'round', rotation: 0,
        x: 130 + (i % 3) * 240, y: 110 + Math.floor(i / 3) * 250,
        seatOrder: [], ...t,
      }))
    };
  });
  const [guests] = useState(() => loadState('guests', defaultGuests));
  const [panel, setPanel] = useState(null);
  const [editTable, setEditTable] = useState(null);
  const [draggingTable, setDraggingTable] = useState(null);
  const [rotatingTable, setRotatingTable] = useState(null); // { id, startAngle, startRot }
  const [draggingGuest, setDraggingGuest] = useState(null);
  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [newTable, setNewTable] = useState({ name: '', shape: 'round', seats: 8 });
  const svgRef = useRef();

  function save(updated) { setSeating(updated); saveState('seating', updated); }

  const assignedIds = seating.tables.flatMap(t => t.guests);
  const unassigned = guests.filter(g => !assignedIds.includes(g.id) && g.status !== 'declined');
  const blockedSeats = getBlockedSeats(seating.tables);

  // ── SVG coords ─────────────────────────────────────────────────
  function getSVGPoint(e) {
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  // ── Table drag ──────────────────────────────────────────────────
  function onTableMouseDown(e, tableId) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const p = getSVGPoint(e);
    const t = seating.tables.find(t => t.id === tableId);
    setDraggingTable({ id: tableId, offX: p.x - t.x, offY: p.y - t.y });
    setSelectedTable(tableId);
  }

  // ── Rotation handle ─────────────────────────────────────────────
  function onRotateMouseDown(e, tableId) {
    e.stopPropagation();
    e.preventDefault();
    const p = getSVGPoint(e);
    const t = seating.tables.find(t => t.id === tableId);
    const startAngle = Math.atan2(p.y - t.y, p.x - t.x) * 180 / Math.PI;
    setRotatingTable({ id: tableId, startAngle, startRot: t.rotation || 0 });
  }

  function onSvgMouseMove(e) {
    const p = getSVGPoint(e);
    if (draggingTable) {
      const newX = Math.max(60, Math.min(CANVAS_W - 60, p.x - draggingTable.offX));
      const newY = Math.max(60, Math.min(CANVAS_H - 60, p.y - draggingTable.offY));
      setSeating(s => ({ ...s, tables: s.tables.map(t => t.id === draggingTable.id ? { ...t, x: newX, y: newY } : t) }));
    }
    if (rotatingTable) {
      const t = seating.tables.find(t => t.id === rotatingTable.id);
      const curAngle = Math.atan2(p.y - t.y, p.x - t.x) * 180 / Math.PI;
      let newRot = rotatingTable.startRot + (curAngle - rotatingTable.startAngle);
      // Snap to 15° increments when close
      const snap = 15;
      const snapped = Math.round(newRot / snap) * snap;
      if (Math.abs(snapped - newRot) < 5) newRot = snapped;
      setSeating(s => ({ ...s, tables: s.tables.map(t => t.id === rotatingTable.id ? { ...t, rotation: newRot } : t) }));
    }
  }

  function onSvgMouseUp() {
    if (draggingTable || rotatingTable) saveState('seating', seating);
    setDraggingTable(null);
    setRotatingTable(null);
  }

  // ── Guest drag ──────────────────────────────────────────────────
  function onGuestDragStart(e, guestId, fromTable) {
    setDraggingGuest({ guestId, fromTable: fromTable || 'unassigned' });
    e.dataTransfer.effectAllowed = 'move';
  }

  function onSeatDrop(e, tableId, seatIndex) {
    e.preventDefault();
    if (!draggingGuest) return;
    const key = `${tableId}_${seatIndex}`;
    if (blockedSeats[key]) return;
    const { guestId, fromTable } = draggingGuest;
    let newTables = seating.tables.map(t => {
      if (t.id === fromTable) {
        return { ...t, guests: t.guests.filter(g => g !== guestId), seatOrder: (t.seatOrder||[]).map(g => g === guestId ? null : g) };
      }
      if (t.id === tableId) {
        const newGuests = t.guests.includes(guestId) ? t.guests : [...t.guests, guestId];
        const newOrder = [...(t.seatOrder||[])];
        newOrder[seatIndex] = guestId;
        return { ...t, guests: newGuests, seatOrder: newOrder };
      }
      return t;
    });
    if (fromTable === 'unassigned') {
      newTables = newTables.map(t => {
        if (t.id !== tableId) return t;
        const newGuests = t.guests.includes(guestId) ? t.guests : [...t.guests, guestId];
        const newOrder = [...(t.seatOrder||[])];
        newOrder[seatIndex] = guestId;
        return { ...t, guests: newGuests, seatOrder: newOrder };
      });
    }
    save({ ...seating, tables: newTables });
    setDraggingGuest(null); setHoveredSeat(null);
  }

  function removeFromSeat(tableId, guestId, si) {
    save({ ...seating, tables: seating.tables.map(t => {
      if (t.id !== tableId) return t;
      return { ...t, guests: t.guests.filter(g => g !== guestId), seatOrder: (t.seatOrder||[]).map((g,i) => i===si ? null : g) };
    })});
  }

  function addTableToCanvas() {
    if (!newTable.name.trim()) return;
    const id = Math.max(0, ...seating.tables.map(t => t.id)) + 1;
    save({ ...seating, tables: [...seating.tables, { id, name: newTable.name, shape: newTable.shape, seats: newTable.seats, guests: [], seatOrder: [], rotation: 0, x: 180 + Math.random() * 380, y: 130 + Math.random() * 240 }] });
    setNewTable({ name: '', shape: 'round', seats: 8 });
    setPanel(null);
  }

  function deleteTable(id) {
    if (!confirm('Tisch löschen?')) return;
    save({ ...seating, tables: seating.tables.filter(t => t.id !== id) });
    if (selectedTable === id) setSelectedTable(null);
    if (editTable?.id === id) { setEditTable(null); setPanel(null); }
  }

  function updateTable(id, updates) {
    const updated = { ...seating, tables: seating.tables.map(t => t.id === id ? { ...t, ...updates } : t) };
    save(updated);
    setEditTable(et => et ? { ...et, ...updates } : null);
  }

  // ── Render tables ───────────────────────────────────────────────
  // Group detection: find touching table clusters for continuous seat numbering
  const seatOffsets = (() => {
    const tables = seating.tables;

    function areTouching(t1, t2) {
      if (t1.shape === 'round' || t2.shape === 'round') return false;
      const s1 = getWorldSeats(t1);
      const { rx: rx2, ry: ry2 } = getTableDims(t2.shape, t2.seats);
      const rot2 = deg2rad(t2.rotation || 0);
      const cos2 = Math.cos(-rot2), sin2 = Math.sin(-rot2);
      return s1.some(seat => {
        const dx = seat.wx - t2.x, dy = seat.wy - t2.y;
        const lx = dx*cos2 - dy*sin2, ly = dx*sin2 + dy*cos2;
        return Math.abs(lx) < rx2 + SEAT_R + 4 && Math.abs(ly) < ry2 + SEAT_R + 4;
      });
    }

    // Union-Find
    const parent = {};
    tables.forEach(t => { parent[t.id] = t.id; });
    function find(id) { return parent[id] === id ? id : (parent[id] = find(parent[id])); }
    function union(a, b) { parent[find(a)] = find(b); }
    for (let i = 0; i < tables.length; i++)
      for (let j = i+1; j < tables.length; j++)
        if (areTouching(tables[i], tables[j])) union(tables[i].id, tables[j].id);

    // Group and sort left-to-right, top-to-bottom
    const groups = {};
    tables.forEach(t => {
      const root = find(t.id);
      if (!groups[root]) groups[root] = [];
      groups[root].push(t);
    });
    Object.values(groups).forEach(g => g.sort((a,b) => a.x - b.x || a.y - b.y));

    // Assign offsets: skip blocked seats so numbers are truly sequential
    const offsets = {};
    Object.values(groups).forEach(group => {
      let counter = 0;
      group.forEach(t => {
        offsets[t.id] = counter;
        getWorldSeats(t).forEach((_, si) => {
          if (!blockedSeats[`${t.id}_${si}`]) counter++;
        });
      });
    });
    return offsets;
  })();

  function renderTable(table) {
    const { rx, ry } = getTableDims(table.shape, table.seats);
    const rot = table.rotation || 0;
    const worldSeats = getWorldSeats(table);
    const seatOrder = table.seatOrder || [];
    const isSelected = selectedTable === table.id;
    const isDragging = draggingTable?.id === table.id;
    const tableOffset = seatOffsets[table.id] ?? 0;
    // Build a local map: seatLocalIndex -> globalSeatNumber (skipping blocked)
    const globalSeatNum = {};
    let globalCounter = tableOffset;
    getWorldSeats(table).forEach((_, si) => {
      if (!blockedSeats[`${table.id}_${si}`]) {
        globalSeatNum[si] = globalCounter + 1;
        globalCounter++;
      }
    });

    // Rotation handle position (top of table in world space)
    const rHandleLocal = { x: 0, y: -(Math.max(rx,ry) + 48) };
    const rHandleWorld = rotatePoint(rHandleLocal.x, rHandleLocal.y, deg2rad(rot));
    const rHx = table.x + rHandleWorld.x, rHy = table.y + rHandleWorld.y;

    // Arm from table to handle
    const armLocal = { x: 0, y: -(Math.max(rx,ry) + 4) };
    const armWorld = rotatePoint(armLocal.x, armLocal.y, deg2rad(rot));

    return (
      <g key={table.id} style={{ cursor: isDragging ? 'grabbing' : 'grab', filter: isDragging ? 'drop-shadow(0 4px 12px rgba(91,61,30,0.2))' : 'none' }}>

        {/* Seat circles */}
        {worldSeats.map((seat, si) => {
          const key = `${table.id}_${si}`;
          const blocked = blockedSeats[key];
          const occupantId = seatOrder[si];
          const occupant = occupantId ? guests.find(g => g.id === occupantId) : null;
          const isHovered = hoveredSeat?.tableId === table.id && hoveredSeat?.seatIndex === si;

          return (
            <g key={si}
              onDragOver={e => { if (!blocked) { e.preventDefault(); setHoveredSeat({ tableId: table.id, seatIndex: si }); }}}
              onDragLeave={() => setHoveredSeat(null)}
              onDrop={e => onSeatDrop(e, table.id, si)}
            >
              {/* Seat */}
              <circle
                cx={seat.wx} cy={seat.wy} r={SEAT_R}
                fill={blocked ? BLOCKED_COLOR : occupant ? avc(occupant.id) : isHovered ? '#E8D5C0' : '#fff'}
                stroke={blocked ? '#D4C0A8' : occupant ? avc(occupant.id) : isHovered ? 'var(--terra)' : '#C4A882'}
                strokeWidth={isHovered && !blocked ? 2 : 1.5}
                strokeDasharray={!occupant && !blocked ? '3,2' : 'none'}
                style={{ cursor: blocked ? 'not-allowed' : occupant ? 'grab' : 'copy', transition: 'fill .15s' }}
                draggable={!!occupant}
                onDragStart={occupant ? e => onGuestDragStart(e, occupant.id, table.id) : undefined}
                onDragEnd={() => setDraggingGuest(null)}
              />
              {/* X icon for blocked */}
              {blocked && <>
                <line x1={seat.wx-5} y1={seat.wy-5} x2={seat.wx+5} y2={seat.wy+5} stroke="#C4A882" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
                <line x1={seat.wx+5} y1={seat.wy-5} x2={seat.wx-5} y2={seat.wy+5} stroke="#C4A882" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
              </>}
              {/* Initials or number */}
              {!blocked && (
                <text x={seat.wx} y={seat.wy+1} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 8, fontWeight: 600, fill: occupant ? '#fff' : '#C4A882', fontFamily: 'DM Sans,sans-serif', pointerEvents: 'none', userSelect: 'none' }}>
                  {occupant ? ini(occupant.name) : (globalSeatNum[si] ?? '')}
                </text>
              )}
              {/* Tooltip on hover for assigned guest */}
              {occupant && isHovered && (
                <g style={{ pointerEvents: 'none' }}>
                  <rect x={seat.wx - 36} y={seat.wy - 32} width={72} height={16} rx={4} fill="rgba(60,36,16,0.85)" />
                  <text x={seat.wx} y={seat.wy - 22} textAnchor="middle" dominantBaseline="middle"
                    style={{ fontSize: 8.5, fill: '#FAF7F0', fontFamily: 'DM Sans,sans-serif' }}>
                    {occupant.name.length > 14 ? occupant.name.slice(0,13)+'…' : occupant.name}
                  </text>
                </g>
              )}
              {/* Remove dot on occupied non-blocked seat */}
              {occupant && !blocked && (
                <circle cx={seat.wx+9} cy={seat.wy-9} r={5} fill="#FFEBEE" stroke="#FFCDD2" strokeWidth={1}
                  style={{ cursor: 'pointer', opacity: 0, transition: 'opacity .15s' }}
                  onMouseEnter={e => e.target.style.opacity = 1}
                  onMouseLeave={e => e.target.style.opacity = 0}
                  onClick={e => { e.stopPropagation(); removeFromSeat(table.id, occupant.id, si); }}
                />
              )}
            </g>
          );
        })}

        {/* Table body */}
        <g onMouseDown={e => onTableMouseDown(e, table.id)}>
          {table.shape === 'round' ? (
            <circle cx={table.x} cy={table.y} r={rx}
              fill={isSelected ? '#FDF5E8' : '#FDF8F2'}
              stroke={isSelected ? 'var(--terra)' : '#DDD3C0'}
              strokeWidth={isSelected ? 2.5 : 1.5}
            />
          ) : (
            <rect x={table.x-rx} y={table.y-ry} width={rx*2} height={ry*2}
              rx={table.shape==='rect' ? 8 : 4}
              fill={isSelected ? '#FDF5E8' : '#FDF8F2'}
              stroke={isSelected ? 'var(--terra)' : '#DDD3C0'}
              strokeWidth={isSelected ? 2.5 : 1.5}
              transform={`rotate(${rot},${table.x},${table.y})`}
            />
          )}
          <text x={table.x} y={table.y-4} textAnchor="middle"
            style={{ fontSize: 10, fontWeight: 600, fill: 'var(--espresso)', fontFamily: 'DM Sans,sans-serif', pointerEvents: 'none', userSelect: 'none' }}>
            {table.name.length > 14 ? table.name.slice(0,13)+'…' : table.name}
          </text>
          <text x={table.x} y={table.y+9} textAnchor="middle"
            style={{ fontSize: 9, fill: 'var(--mocha)', fontFamily: 'DM Sans,sans-serif', pointerEvents: 'none', userSelect: 'none' }}>
            {table.guests.length}/{table.seats}
          </text>
        </g>

        {/* Rotation handle – only for rect/square */}
        {table.shape !== 'round' && isSelected && (
          <g>
            {/* Arm line */}
            <line x1={table.x + armWorld.x} y1={table.y + armWorld.y} x2={rHx} y2={rHy}
              stroke="#C4A882" strokeWidth={1.5} strokeDasharray="3,2" style={{ pointerEvents: 'none' }} />
            {/* Handle circle */}
            <circle cx={rHx} cy={rHy} r={10}
              fill={rotatingTable?.id === table.id ? 'var(--terra)' : '#FDF8F2'}
              stroke="var(--terra)" strokeWidth={2}
              style={{ cursor: 'crosshair' }}
              onMouseDown={e => onRotateMouseDown(e, table.id)}
            />
            {/* Rotate icon text */}
            <text x={rHx} y={rHy+1} textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize: 11, fill: rotatingTable?.id === table.id ? '#fff' : 'var(--terra)', fontFamily: 'DM Sans,sans-serif', pointerEvents: 'none', userSelect: 'none' }}>
              ↻
            </text>
            {/* Rotation angle label */}
            <text x={rHx+16} y={rHy+1} dominantBaseline="middle"
              style={{ fontSize: 9, fill: 'var(--mocha)', fontFamily: 'DM Sans,sans-serif', pointerEvents: 'none', userSelect: 'none' }}>
              {Math.round(((rot % 360) + 360) % 360)}°
            </text>
          </g>
        )}

        {/* Edit button when selected */}
        {isSelected && (() => {
          const btnY = table.y + Math.max(ry, rx) + 30;
          return (
            <g style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setEditTable(table); setPanel('editTable'); }}>
              <rect x={table.x-30} y={btnY} width={60} height={20} rx={10} fill="var(--brown)" />
              <text x={table.x} y={btnY+10} textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 9, fill: '#fff', fontFamily: 'DM Sans,sans-serif', pointerEvents: 'none', userSelect: 'none' }}>
                Bearbeiten
              </text>
            </g>
          );
        })()}
      </g>
    );
  }

  const selTable = seating.tables.find(t => t.id === selectedTable);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <div className="topbar" style={{ flexShrink: 0 }}>
        <div>
          <h1>Sitzordnung</h1>
          <div className="topbar-sub">
            {assignedIds.length} / {guests.filter(g=>g.status==='confirmed').length} Gäste platziert
            · Tische ziehen & drehen · Sitze per Drag &amp; Drop
            · <span style={{ color:'var(--terra)' }}>✕ = gesperrter Sitz (Tische zu nah)</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setPanel('addTable')}>
          <IconPlus size={15} stroke={2}/> Tisch hinzufügen
        </button>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* LEFT: guest list */}
        <div style={{ width:190, flexShrink:0, borderRight:'1px solid var(--sand)', background:'var(--warm)', overflowY:'auto', padding:12 }}>
          <div className="section-title" style={{ marginBottom:6 }}>Nicht zugewiesen</div>
          <div style={{ fontSize:11, color:'var(--mocha)', marginBottom:10, lineHeight:1.4 }}>Auf einen Sitz ziehen</div>
          {unassigned.length === 0 && (
            <div style={{ textAlign:'center', padding:'16px 0', fontSize:12, color:'var(--mocha)' }}>Alle platziert 🌸</div>
          )}
          {unassigned.map(g => (
            <div key={g.id} draggable
              onDragStart={e => onGuestDragStart(e, g.id, 'unassigned')}
              onDragEnd={() => setDraggingGuest(null)}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 8px', borderRadius:8, marginBottom:4, background:'#fff', border:'1px solid var(--sand)', cursor:'grab', opacity: draggingGuest?.guestId===g.id ? 0.4 : 1 }}>
              <div className="avatar" style={{ width:24, height:24, background:avc(g.id), fontSize:9, flexShrink:0 }}>{ini(g.name)}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11.5, fontWeight:500, color:'var(--espresso)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{g.name}</div>
                {g.menu && <div style={{ fontSize:10, color:'var(--mocha)' }}>{g.menu}</div>}
              </div>
            </div>
          ))}

          <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid var(--sand)' }}>
            <div className="section-title" style={{ marginBottom:8 }}>Am Tisch</div>
            {seating.tables.map(table => {
              const tg = table.guests.map(id=>guests.find(g=>g.id===id)).filter(Boolean);
              if (!tg.length) return null;
              return (
                <div key={table.id} style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10.5, fontWeight:600, color:'var(--brown)', marginBottom:4, cursor:'pointer' }} onClick={() => setSelectedTable(table.id)}>
                    {table.name}
                  </div>
                  {tg.map(g => (
                    <div key={g.id} draggable
                      onDragStart={e => onGuestDragStart(e, g.id, table.id)}
                      onDragEnd={() => setDraggingGuest(null)}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 0', cursor:'grab', opacity: draggingGuest?.guestId===g.id ? 0.4 : 1 }}>
                      <div className="avatar" style={{ width:16, height:16, background:avc(g.id), fontSize:8 }}>{ini(g.name)}</div>
                      <span style={{ fontSize:11, color:'var(--espresso)' }}>{g.name}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTRE: SVG canvas */}
        <div style={{ flex:1, overflow:'hidden', background:'#FBF7F0', position:'relative' }}>
          <svg width="100%" height="100%" style={{ position:'absolute', top:0, left:0, pointerEvents:'none', opacity:0.35 }}>
            <defs>
              <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#C4A882"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)"/>
          </svg>

          <svg ref={svgRef}
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            style={{ width:'100%', height:'100%', cursor: (draggingTable||rotatingTable) ? 'grabbing' : 'default', userSelect:'none' }}
            onMouseMove={onSvgMouseMove}
            onMouseUp={onSvgMouseUp}
            onMouseLeave={onSvgMouseUp}
            onClick={e => { if (e.target === svgRef.current) setSelectedTable(null); }}
          >
            {seating.tables.map(renderTable)}
          </svg>

          {seating.tables.length === 0 && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
              <div style={{ textAlign:'center', color:'var(--mocha)' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🌿</div>
                <div style={{ fontSize:15, fontFamily:"'Cormorant Garamond',serif", fontStyle:'italic', color:'var(--espresso)' }}>Noch keine Tische angelegt</div>
                <div style={{ fontSize:12, marginTop:4 }}>Klicke oben auf „Tisch hinzufügen"</div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div style={{ position:'absolute', bottom:12, right:14, background:'rgba(253,248,242,0.9)', borderRadius:10, border:'1px solid var(--sand)', padding:'8px 12px', fontSize:11, color:'var(--mocha)', display:'flex', gap:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:14, height:14, borderRadius:'50%', background:'#fff', border:'1.5px dashed #C4A882' }}/>
              Freier Platz
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:14, height:14, borderRadius:'50%', background:'#C4956A' }}/>
              Belegt
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:14, height:14, borderRadius:'50%', background:BLOCKED_COLOR, border:'1px solid #D4C0A8', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontSize:8, color:'#C4A882' }}>✕</span>
              </div>
              Gesperrt
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:14, height:14, borderRadius:'50%', background:'#FDF8F2', border:'2px solid #C9A884', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontSize:9, color:'var(--terra)' }}>↻</span>
              </div>
              Drehen (auswählen)
            </div>
          </div>
        </div>

        {/* RIGHT: panel */}
        {panel && (
          <div style={{ width:260, flexShrink:0, borderLeft:'1px solid var(--sand)', background:'#fff', overflowY:'auto', padding:18 }}>

            {panel === 'addTable' && (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:19, color:'var(--espresso)' }}>Tisch anlegen</div>
                  <button className="btn-icon" onClick={()=>setPanel(null)}><IconX size={14} stroke={2}/></button>
                </div>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="input" placeholder="z.B. Tisch 1 – Familie" value={newTable.name} onChange={e=>setNewTable(n=>({...n,name:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Form</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                    {[{shape:'round',label:'Rund',icon:'⬤'},{shape:'rect',label:'Eckig',icon:'▬'},{shape:'square',label:'Quadr.',icon:'■'}].map(s=>(
                      <div key={s.shape} onClick={()=>setNewTable(n=>({...n,shape:s.shape}))} style={{ padding:'10px 6px', borderRadius:10, border:`2px solid ${newTable.shape===s.shape?'var(--terra)':'var(--sand)'}`, background:newTable.shape===s.shape?'#FDF5E8':'#fff', cursor:'pointer', textAlign:'center', transition:'all .15s' }}>
                        <div style={{ fontSize:16, marginBottom:3 }}>{s.icon}</div>
                        <div style={{ fontSize:10.5, color:'var(--espresso)', fontWeight:newTable.shape===s.shape?600:400 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Sitzplätze</label>
                  <input className="input" type="number" min="2" max="20" value={newTable.seats} onChange={e=>setNewTable(n=>({...n,seats:parseInt(e.target.value)||8}))}/>
                </div>
                <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={addTableToCanvas}>
                  Tisch anlegen
                </button>
              </>
            )}

            {panel === 'editTable' && editTable && (() => {
              const liveTable = seating.tables.find(t=>t.id===editTable.id) || editTable;
              return (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:19, color:'var(--espresso)' }}>Bearbeiten</div>
                    <button className="btn-icon" onClick={()=>{setPanel(null);setEditTable(null);}}><IconX size={14} stroke={2}/></button>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input className="input" value={liveTable.name} onChange={e=>updateTable(liveTable.id,{name:e.target.value})}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Form</label>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                      {[{shape:'round',label:'Rund',icon:'⬤'},{shape:'rect',label:'Eckig',icon:'▬'},{shape:'square',label:'Quadr.',icon:'■'}].map(s=>(
                        <div key={s.shape} onClick={()=>updateTable(liveTable.id,{shape:s.shape})} style={{ padding:'10px 6px', borderRadius:10, border:`2px solid ${liveTable.shape===s.shape?'var(--terra)':'var(--sand)'}`, background:liveTable.shape===s.shape?'#FDF5E8':'#fff', cursor:'pointer', textAlign:'center', transition:'all .15s' }}>
                          <div style={{ fontSize:16, marginBottom:3 }}>{s.icon}</div>
                          <div style={{ fontSize:10.5, color:'var(--espresso)', fontWeight:liveTable.shape===s.shape?600:400 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sitzplätze</label>
                    <input className="input" type="number" min="2" max="20" value={liveTable.seats} onChange={e=>updateTable(liveTable.id,{seats:parseInt(e.target.value)||8})}/>
                  </div>
                  {liveTable.shape !== 'round' && (
                    <div className="form-group">
                      <label className="form-label">Rotation: {Math.round(((liveTable.rotation||0)%360+360)%360)}°</label>
                      <input type="range" className="input" min="0" max="360" step="5" value={Math.round(((liveTable.rotation||0)%360+360)%360)}
                        onChange={e=>updateTable(liveTable.id,{rotation:parseInt(e.target.value)})}
                        style={{ padding:'4px 0', cursor:'pointer' }}/>
                      <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                        {[0,45,90,135,180].map(deg=>(
                          <button key={deg} className="btn btn-secondary btn-sm" onClick={()=>updateTable(liveTable.id,{rotation:deg})}>{deg}°</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seat assignments */}
                  <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--sand)' }}>
                    <div className="section-title" style={{ marginBottom:10 }}>Sitzplatzbelegung</div>
                    {Array.from({length:liveTable.seats}).map((_,si)=>{
                      const blocked = blockedSeats[`${liveTable.id}_${si}`];
                      const seatOrder = liveTable.seatOrder||[];
                      const occupantId = seatOrder[si];
                      const occupant = occupantId ? guests.find(g=>g.id===occupantId) : null;
                      const available = [
                        {id:null,name:'– frei –'},
                        ...guests.filter(g=>g.status!=='declined'&&(!assignedIds.includes(g.id)||occupantId===g.id))
                      ];
                      return (
                        <div key={si} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                          <div style={{ width:22, height:22, borderRadius:'50%', background:blocked?BLOCKED_COLOR:occupant?avc(occupant.id):'var(--sand)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:600, color:blocked?'#C4A882':occupant?'#fff':'var(--mocha)', flexShrink:0 }}>
                            {blocked ? '✕' : occupant ? ini(occupant.name) : si+1}
                          </div>
                          {blocked ? (
                            <span style={{ fontSize:11, color:'var(--mocha)', fontStyle:'italic' }}>Gesperrt</span>
                          ) : (
                            <select className="input" style={{ fontSize:12, padding:'4px 8px' }} value={occupantId||''}
                              onChange={e=>{
                                const newGid = e.target.value ? parseInt(e.target.value) : null;
                                const oldOrder = [...(liveTable.seatOrder||[])];
                                let newGuests = [...(liveTable.guests||[])];
                                if (oldOrder[si]) newGuests = newGuests.filter(g=>g!==oldOrder[si]);
                                oldOrder[si] = newGid;
                                if (newGid&&!newGuests.includes(newGid)) newGuests.push(newGid);
                                updateTable(liveTable.id,{guests:newGuests,seatOrder:oldOrder});
                              }}>
                              {available.map(g=><option key={g.id||'null'} value={g.id||''}>{g.name||g.id}</option>)}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button className="btn btn-danger btn-sm" style={{ marginTop:14, width:'100%', justifyContent:'center' }} onClick={()=>deleteTable(liveTable.id)}>
                    <IconTrash size={13} stroke={1.5}/> Tisch löschen
                  </button>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

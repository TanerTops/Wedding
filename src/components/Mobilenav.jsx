import { NavLink } from 'react-router-dom';
import {
  IconLayoutDashboard, IconUsers, IconWallet,
  IconCheckbox, IconLayoutColumns, IconDotsCircleHorizontal
} from '@tabler/icons-react';
import { useState } from 'react';

const MAIN_NAV = [
  { to: '/', icon: IconLayoutDashboard, label: 'Übersicht' },
  { to: '/guests', icon: IconUsers, label: 'Gäste' },
  { to: '/budget', icon: IconWallet, label: 'Budget' },
  { to: '/tasks', icon: IconCheckbox, label: 'Aufgaben' },
  { to: '/seating', icon: IconLayoutColumns, label: 'Sitzplan' },
];

export default function MobileNav() {
  return (
    <nav className="mobile-nav">
      {MAIN_NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0', textDecoration: 'none', color: 'var(--mocha)', fontSize: 10, fontWeight: 400, transition: 'color .15s' }}
          className={({ isActive }) => isActive ? 'mobile-nav-active' : ''}
        >
          {({ isActive }) => (
            <>
              <Icon size={20} stroke={isActive ? 2 : 1.5} style={{ color: isActive ? 'var(--terra)' : 'var(--mocha)' }} />
              <span style={{ color: isActive ? 'var(--terra)' : 'var(--mocha)', fontWeight: isActive ? 600 : 400 }}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

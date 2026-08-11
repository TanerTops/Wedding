import { useState } from 'react';
import { IconLock } from '@tabler/icons-react';
import { STRIPE_PAYMENT_LINK, FULL_ACCESS_PRICE } from '../data/store';
import CheckoutConsentModal from './CheckoutConsentModal';

// Shown instead of a locked page/section for accounts without full access.
// `compact` renders a smaller inline version (used e.g. inside Budget tabs).
export default function UpgradeGate({ feature, wedding, compact = false }) {
  const [showConsent, setShowConsent] = useState(false);
  const userId = wedding?.user_id || '';
  const checkoutUrl = userId
    ? `${STRIPE_PAYMENT_LINK}?client_reference_id=${encodeURIComponent(userId)}`
    : STRIPE_PAYMENT_LINK;

  return (
    <div style={{ textAlign: 'center', padding: compact ? '36px 24px' : '80px 24px', maxWidth: 460, margin: '0 auto' }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <IconLock size={22} stroke={1.5} style={{ color: 'var(--terra)' }} />
      </div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: compact ? 22 : 26, fontStyle: 'italic', color: 'var(--espresso)', marginBottom: 8 }}>
        {feature} ist Teil der Vollversion
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--mocha)', lineHeight: 1.6, marginBottom: 20 }}>
        Schaltet alle Planungs-Tools frei — Zeitplan, Sitzordnung, Location, Musik, Geschenke, Gästeseite, Erinnerungen und mehr.
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: 'var(--espresso)', fontFamily: "'Cormorant Garamond',serif" }}>{FULL_ACCESS_PRICE} €</span>
        <span style={{ fontSize: 12, color: 'var(--mocha)' }}>einmalig</span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--mocha)', marginBottom: 20 }}>
        Rabattcode? Einfach beim Bezahlen eingeben.
      </div>
      <button onClick={() => setShowConsent(true)} className="btn btn-primary" style={{ justifyContent: 'center' }}>
        Jetzt freischalten
      </button>

      {showConsent && (
        <CheckoutConsentModal checkoutUrl={checkoutUrl} onClose={() => setShowConsent(false)} />
      )}
    </div>
  );
}

import { useState } from 'react';
import { IconX } from '@tabler/icons-react';

// Zwischenschritt vor der Weiterleitung zu Stripe: sammelt die nach § 356
// Abs. 4 BGB nötige AUSDRÜCKLICHE Zustimmung + Kenntnisbestätigung zum
// vorzeitigen Erlöschen des Widerrufsrechts, BEVOR gezahlt wird.
//
// Wichtig: Diese Checkbox ist die Gegenstelle zur Widerrufsbelehrung unter
// /widerruf — die Belehrung allein holt keine Zustimmung ein, das passiert
// erst hier. Ohne diesen Schritt bleibt das Widerrufsrecht bestehen, auch
// mit korrekter Belehrung auf der Seite.
//
// Bewusst NICHT vorangehakt (checked=false als Startwert) und als einzige
// Erklärung in diesem Fenster dargestellt — nicht mit AGB o.ä. vermischt,
// wie es die Rechtsprechung zu § 356 Abs. 4/5 BGB verlangt.
export default function CheckoutConsentModal({ checkoutUrl, onClose }) {
  const [agreed, setAgreed] = useState(false);

  function proceed() {
    if (!agreed) return;
    window.open(checkoutUrl, '_blank', 'noopener');
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Vor dem Kauf</h3>
          <button className="btn-icon" onClick={onClose}><IconX size={14} stroke={2} /></button>
        </div>

        <p style={{ fontSize: 13.5, color: 'var(--mocha)', lineHeight: 1.6, marginBottom: 16 }}>
          Der Vollzugriff wird direkt nach der Zahlung freigeschaltet. Das
          hat eine rechtliche Konsequenz für euer 14-tägiges Widerrufsrecht —
          Details in unserer{' '}
          <a href="/widerruf" target="_blank" rel="noopener" style={{ color: 'var(--terra)' }}>
            Widerrufsbelehrung
          </a>.
        </p>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--espresso)', cursor: 'pointer', marginBottom: 20, lineHeight: 1.5 }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0, width: 16, height: 16, accentColor: 'var(--terra)' }}
          />
          <span>
            Ich stimme ausdrücklich zu, dass mit der Ausführung (Freischaltung
            des Vollzugriffs) vor Ablauf der 14-tägigen Widerrufsfrist
            begonnen wird, und weiß, dass ich dadurch mein Widerrufsrecht
            verliere, sobald die Leistung vollständig erbracht ist.
          </span>
        </label>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Abbrechen</button>
          <button
            className="btn btn-primary"
            onClick={proceed}
            disabled={!agreed}
            style={{ opacity: agreed ? 1 : 0.5, cursor: agreed ? 'pointer' : 'not-allowed' }}
          >
            Weiter zur Zahlung
          </button>
        </div>
      </div>
    </div>
  );
}

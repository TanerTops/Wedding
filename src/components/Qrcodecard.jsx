import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { IconDownload } from '@tabler/icons-react';

// Reusable QR code tile with a PNG download button — used for the
// Gästeseite- and Foto-Galerie-Links so couples can print them on invitations.
export default function QrCodeCard({ label, sub, url, filename }) {
  const wrapRef = useRef(null);

  function download() {
    const canvas = wrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = filename || 'qr-code.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <div style={{ textAlign: 'center', padding: 16, background: 'var(--warm)', borderRadius: 12, border: '1px solid var(--sand)', flex: '1 1 200px' }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--espresso)', marginBottom: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--mocha)', marginBottom: 10 }}>{sub}</div>}
      <div ref={wrapRef} style={{ display: 'inline-block', padding: 12, background: '#fff', borderRadius: 10, border: '1px solid var(--sand)', marginTop: sub ? 0 : 8 }}>
        <QRCodeCanvas value={url} size={160} level="M" includeMargin={false} fgColor="#3D2817" bgColor="#ffffff" />
      </div>
      <div style={{ marginTop: 10 }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={download}>
          <IconDownload size={13} stroke={1.5} /> PNG herunterladen
        </button>
      </div>
    </div>
  );
}

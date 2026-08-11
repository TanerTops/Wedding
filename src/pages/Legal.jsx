import { useNavigate } from 'react-router-dom';
import { IconArrowLeft } from '@tabler/icons-react';

function LegalLayout({ title, children }) {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mocha)', fontSize: 13, marginBottom: 32, fontFamily: "'DM Sans',sans-serif" }}>
          <IconArrowLeft size={16} stroke={1.5} /> Zurück
        </button>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 36, fontStyle: 'italic', color: 'var(--espresso)', marginBottom: 32 }}>
          {title}
        </div>
        <div style={{ fontSize: 14, color: 'var(--espresso)', lineHeight: 1.9 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function H2({ children }) {
  return <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: 'var(--espresso)', marginTop: 36, marginBottom: 10, fontWeight: 400 }}>{children}</h2>;
}
function P({ children }) {
  return <p style={{ marginBottom: 12, color: 'var(--brown)' }}>{children}</p>;
}

export function Impressum() {
  return (
    <LegalLayout title="Impressum">
      <H2>Angaben gemäß § 5 DDG</H2>
      <P>Taner Topsakal<br />An den Eichen 17<br />35644 Hohenahr<br />Deutschland</P>

      <H2>Kontakt</H2>
      <P>E-Mail: taner@tops-agency.de</P>

      <H2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</H2>
      <P>Taner Topsakal<br />An den Eichen 17<br />35644 Hohenahr</P>

      <H2>Haftung für Inhalte</H2>
      <P>Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</P>

      <H2>Haftung für Links</H2>
      <P>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.</P>

      <H2>Urheberrecht</H2>
      <P>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.</P>
    </LegalLayout>
  );
}

export function Datenschutz() {
  return (
    <LegalLayout title="Datenschutzerklärung">
      <H2>1. Datenschutz auf einen Blick</H2>
      <P>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.</P>

      <H2>2. Verantwortliche Stelle</H2>
      <P>Verantwortlich für die Datenverarbeitung auf dieser Website:<br /><br />Taner Topsakal<br />An den Eichen 17<br />35644 Hohenahr<br />E-Mail: taner@tops-agency.de</P>

      <H2>3. Welche Daten wir erheben</H2>
      <P><strong>Bei der Registrierung:</strong> E-Mail-Adresse und Passwort (verschlüsselt gespeichert).</P>
      <P><strong>Bei der Nutzung:</strong> Von Ihnen eingegebene Hochzeitsplanungsdaten (Gäste, Budget, Zeitplan etc.), Fotos die Sie hochladen, sowie technische Zugriffsdaten (IP-Adresse, Browser, Betriebssystem).</P>
      <P><strong>Von Gästen:</strong> RSVP-Angaben (Name, E-Mail, Menüwahl, Nachricht), Musikwünsche und hochgeladene Fotos.</P>
      <P>Im freiwilligen Nachrichtenfeld des RSVP-Formulars sowie im internen Notizfeld der Gästeliste können Gäste bzw. das Brautpaar freiwillig gesundheitsbezogene Angaben hinterlegen (z.B. Allergien oder Unverträglichkeiten für die Essensplanung). Diese Angaben zählen nach Art. 9 DSGVO zu einer besonderen Kategorie personenbezogener Daten.</P>

      <H2>4. Wie wir Ihre Daten nutzen</H2>
      <P>Ihre Daten werden ausschließlich zur Bereitstellung des Hochzeitsplanungs-Services verwendet. Wir geben Ihre Daten nicht an Dritte weiter, mit Ausnahme unserer technischen Dienstleister (siehe Punkt 6).</P>

      <H2>5. Rechtsgrundlage</H2>
      <P>Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) sowie Art. 6 Abs. 1 lit. a DSGVO (Einwilligung bei optionalen Angaben). Für freiwillig mitgeteilte gesundheitsbezogene Angaben (siehe Punkt 3) ist Rechtsgrundlage die ausdrückliche Einwilligung nach Art. 9 Abs. 2 lit. a DSGVO, die durch die freiwillige Eingabe im entsprechend gekennzeichneten Feld erteilt wird.</P>

      <H2>6. Technische Dienstleister</H2>
      <P><strong>Supabase (Supabase Inc., USA):</strong> Datenbankhosting und Authentifizierung. Daten werden in der EU (Frankfurt) gespeichert. Datenschutzerklärung: supabase.com/privacy</P>
      <P><strong>Netlify (Netlify Inc., USA):</strong> Hosting der Webanwendung. Datenschutzerklärung: netlify.com/privacy</P>
      <P><strong>Stripe (Stripe Payments Europe, Ltd., Irland):</strong> Zahlungsabwicklung beim Kauf der Vollversion. Dabei werden Name, E-Mail-Adresse und Zahlungsdaten an Stripe übermittelt. Datenschutzerklärung: stripe.com/de/privacy</P>

      <H2>7. Speicherdauer</H2>
      <P>Ihre Daten werden gespeichert, solange Ihr Account aktiv ist. Bei Account-Löschung werden alle Daten unwiderruflich gelöscht. Gäste-RSVP-Daten werden nach dem Hochzeitsdatum auf Wunsch gelöscht.</P>

      <H2>8. Ihre Rechte</H2>
      <P>Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung Ihrer Daten sowie das Recht auf Datenübertragbarkeit. Sie können Ihren Account und alle Daten jederzeit unter Einstellungen → Account löschen entfernen.</P>
      <P>Bei Fragen zum Datenschutz wenden Sie sich an: taner@tops-agency.de</P>

      <H2>9. Beschwerderecht</H2>
      <P>Sie haben das Recht, sich bei der zuständigen Datenschutzbehörde zu beschweren. In Deutschland ist dies der Bundesbeauftragte für den Datenschutz und die Informationsfreiheit (BfDI).</P>

      <H2>10. Cookies</H2>
      <P>Diese App verwendet technisch notwendige Cookies ausschließlich für die Authentifizierung (Session-Management). Es werden keine Tracking- oder Marketing-Cookies eingesetzt.</P>

      <P style={{ marginTop: 40, fontSize: 12, color: 'var(--mocha)' }}>Stand: August 2026</P>
    </LegalLayout>
  );
}

// Basiert auf der gesetzlichen Muster-Widerrufsbelehrung (Anlage 1 zu
// Art. 246a § 1 Abs. 2 EGBGB) und dem Muster-Widerrufsformular (Anlage 2),
// angepasst für ein Dienstleistungsprodukt mit digitalem Sofortzugang
// (§ 356 Abs. 4 BGB). Der Erlöschen-Absatz entspricht dem dafür in der
// Anlage vorgesehenen Gestaltungshinweis. Ersetzt NICHT die separate,
// aktive Zustimmungs-Checkbox vor Zahlung (die belehrt hier nur — sie
// holt die Zustimmung nicht ein, das passiert im Kaufprozess selbst).
export function Widerruf() {
  return (
    <LegalLayout title="Widerrufsbelehrung">
      <H2>Widerrufsrecht</H2>
      <P>Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.</P>
      <P>Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses.</P>
      <P>Um Ihr Widerrufsrecht auszuüben, müssen Sie uns</P>
      <P>Taner Topsakal<br />An den Eichen 17<br />35644 Hohenahr<br />Deutschland<br />E-Mail: taner@tops-agency.de</P>
      <P>mittels einer eindeutigen Erklärung (z.B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das untenstehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.</P>
      <P>Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.</P>

      <H2>Folgen des Widerrufs</H2>
      <P>Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.</P>
      <P>Haben Sie verlangt, dass die Dienstleistung während der Widerrufsfrist beginnen soll, so haben Sie uns einen angemessenen Betrag zu zahlen, der dem Anteil der bis zu dem Zeitpunkt, zu dem Sie uns von der Ausübung des Widerrufsrechts hinsichtlich dieses Vertrags unterrichten, bereits erbrachten Dienstleistungen im Vergleich zum Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen entspricht.</P>

      <H2>Erlöschen des Widerrufsrechts</H2>
      <P>Ihr Widerrufsrecht erlischt vorzeitig, wenn wir die Dienstleistung vollständig erbracht haben und mit der Ausführung der Dienstleistung erst begonnen haben, nachdem Sie dazu Ihre ausdrückliche Zustimmung gegeben und gleichzeitig Ihre Kenntnis davon bestätigt haben, dass Sie durch Ihre Zustimmung mit Beginn der Ausführung des Vertrags Ihr Widerrufsrecht verlieren.</P>

      <H2>Muster-Widerrufsformular</H2>
      <P>Wenn Sie den Vertrag widerrufen wollen, können Sie dieses Formular ausfüllen und an uns zurücksenden.</P>
      <div style={{ border: '1px solid var(--sand)', borderRadius: 12, padding: '20px 24px', fontSize: 13, color: 'var(--brown)', lineHeight: 1.9, marginTop: 8 }}>
        An<br />
        Taner Topsakal<br />
        An den Eichen 17<br />
        35644 Hohenahr<br />
        E-Mail: taner@tops-agency.de<br /><br />
        Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Erbringung der folgenden Dienstleistung: Vollzugriff Wedding Buddy<br /><br />
        Bestellt am (*): ______________________<br /><br />
        Name des/der Verbraucher(s): ______________________<br /><br />
        Anschrift des/der Verbraucher(s): ______________________<br /><br />
        Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): ______________________<br /><br />
        Datum: ______________________<br /><br />
        <span style={{ fontSize: 11, color: 'var(--mocha)' }}>(*) Unzutreffendes streichen.</span>
      </div>

      <P style={{ marginTop: 32, fontSize: 12, color: 'var(--mocha)' }}>Stand: August 2026</P>
    </LegalLayout>
  );
}

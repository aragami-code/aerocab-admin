import { deriveBrand } from '../lib/brand';

interface Props {
  primary: string;
  accent: string;
  logoUrl: string | null;
  appName: string;
}

/** Faux téléphone : applique deriveBrand (même algo que le mobile) en temps réel. */
export function BrandPreview({ primary, accent, logoUrl, appName }: Props) {
  const b = deriveBrand(primary, accent);
  return (
    <div
      style={{
        width: 300, height: 600, border: '8px solid #222', borderRadius: 32,
        overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)', flexShrink: 0,
      }}
    >
      <div style={{ background: b.primary, color: b.onPrimary, padding: 16, display: 'flex', alignItems: 'center', gap: 8, minHeight: 56 }}>
        {logoUrl
          ? <img src={logoUrl} alt="logo" style={{ height: 28, maxWidth: 140, objectFit: 'contain' }} />
          : <strong style={{ fontSize: 18 }}>{appName}</strong>}
      </div>
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ height: 12, background: '#eee', borderRadius: 6, width: '80%' }} />
        <div style={{ height: 12, background: '#eee', borderRadius: 6, width: '60%' }} />
        <div style={{ height: 90, background: b.primaryLight, borderRadius: 12 }} />
        <div style={{ height: 40, background: b.accentLight, borderRadius: 8 }} />
        <div style={{ marginTop: 'auto' }}>
          <button style={{ width: '100%', background: b.accent, color: b.onAccent, border: 'none', padding: 14, borderRadius: 12, fontWeight: 700, fontSize: 16 }}>
            Réserver
          </button>
        </div>
      </div>
    </div>
  );
}

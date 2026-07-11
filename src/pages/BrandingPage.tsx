import { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { BrandPreview } from '../components/BrandPreview';

type Palette = { id: string; name: string; primary: string; accent: string };

export function BrandingPage() {
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [primaryColor, setPrimary] = useState('#C0102E');
  const [accentColor, setAccent] = useState('#1E1E1E');
  const [paletteId, setPaletteId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [appNamePassenger, setAppNamePassenger] = useState('AeroGo');
  const [appNameDriver, setAppNameDriver] = useState('AeroGo Driver');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminApi.getPalettes().then(setPalettes).catch(() => {});
    adminApi.getBranding().then((b) => {
      setPrimary(b.primaryColor);
      setAccent(b.accentColor);
      setLogoUrl(b.logoUrl);
      setAppNamePassenger(b.appNamePassenger);
      setAppNameDriver(b.appNameDriver);
    }).catch(() => {});
  }, []);

  function pick(p: Palette) {
    setPrimary(p.primary);
    setAccent(p.accent);
    setPaletteId(p.id);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await adminApi.updateBranding({ primaryColor, accentColor, paletteId, logoUrl, appNamePassenger, appNameDriver });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 32, padding: 24, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 320, maxWidth: 520 }}>
        <h1 style={{ marginBottom: 16 }}>Apparence</h1>

        <h3>Palettes</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
          {palettes.map((p) => (
            <button
              key={p.id}
              onClick={() => pick(p)}
              title={p.name}
              style={{
                border: paletteId === p.id ? '2px solid #000' : '1px solid #ccc',
                borderRadius: 8, padding: 0, overflow: 'hidden', cursor: 'pointer', height: 40,
              }}
            >
              <div style={{ height: '100%', display: 'flex' }}>
                <div style={{ flex: 2, background: p.primary }} />
                <div style={{ flex: 1, background: p.accent }} />
              </div>
            </button>
          ))}
        </div>

        <h3>Personnalisé</h3>
        <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
          <label>Primaire{' '}
            <input type="color" value={primaryColor}
              onChange={(e) => { setPrimary(e.target.value.toUpperCase()); setPaletteId(null); }} />
          </label>
          <label>Accent{' '}
            <input type="color" value={accentColor}
              onChange={(e) => { setAccent(e.target.value.toUpperCase()); setPaletteId(null); }} />
          </label>
        </div>

        <h3>Logo (URL)</h3>
        <input value={logoUrl ?? ''} onChange={(e) => setLogoUrl(e.target.value || null)}
          placeholder="https://.../logo.png" style={{ width: '100%', marginBottom: 20, padding: 8 }} />

        <h3>Noms d'app</h3>
        <input value={appNamePassenger} onChange={(e) => setAppNamePassenger(e.target.value)}
          placeholder="Nom app passager" style={{ width: '100%', marginBottom: 8, padding: 8 }} />
        <input value={appNameDriver} onChange={(e) => setAppNameDriver(e.target.value)}
          placeholder="Nom app chauffeur" style={{ width: '100%', padding: 8 }} />

        <div style={{ marginTop: 24 }}>
          <button onClick={save} disabled={saving} style={{ padding: '12px 24px', fontWeight: 600 }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {saved && <span style={{ marginLeft: 12, color: 'green' }}>✓ Enregistré</span>}
        </div>
      </div>

      <BrandPreview primary={primaryColor} accent={accentColor} logoUrl={logoUrl} appName={appNamePassenger} />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Lock, Phone, KeyRound, Loader2, X } from 'lucide-react';
import { adminApi } from '../services/api';
import { useAdminAuthStore } from '../stores/authStore';

export function SessionExpiredModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAdminAuthStore(s => s.login);
  const logout = useAdminAuthStore(s => s.logout);
  const user = useAdminAuthStore(s => s.user);

  useEffect(() => {
    const handler = () => {
      // Pré-remplir le téléphone si connu
      if (user?.phone) setPhone(user.phone);
      setStep('phone');
      setCode('');
      setError('');
      setOpen(true);
    };
    window.addEventListener('admin-session-expired', handler);
    return () => window.removeEventListener('admin-session-expired', handler);
  }, [user]);

  const handleSendOtp = async () => {
    if (!phone.trim()) { setError('Numéro requis'); return; }
    setLoading(true); setError('');
    try {
      await adminApi.sendOtp(phone.trim());
      setStep('otp');
    } catch (e: any) {
      setError(e.message || 'Erreur envoi OTP');
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (!code.trim()) { setError('Code requis'); return; }
    setLoading(true); setError('');
    try {
      const res = await adminApi.login(phone.trim(), code.trim());
      login(res.user, res.accessToken);
      setOpen(false);
      setCode('');
    } catch (e: any) {
      setError(e.message || 'Code incorrect');
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    logout();
    setOpen(false);
    window.location.href = '/login';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-white">Session expirée</h2>
            <p className="text-xs text-white/70">Reconnectez-vous pour continuer</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          {step === 'phone' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Numéro de téléphone</label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/30">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                    placeholder="+237 6XX XXX XXX"
                    autoFocus
                    className="flex-1 text-sm text-gray-800 outline-none bg-transparent"
                  />
                </div>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Envoi…' : 'Envoyer le code OTP'}
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                Code envoyé au <span className="font-semibold text-gray-700">{phone}</span>
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Code OTP</label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/30">
                  <KeyRound className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleVerify()}
                    placeholder="000000"
                    autoFocus
                    className="flex-1 text-sm text-gray-800 outline-none bg-transparent tracking-widest font-mono"
                  />
                </div>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                onClick={handleVerify}
                disabled={loading || code.length < 4}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Vérification…' : 'Se reconnecter'}
              </button>
              <button onClick={() => setStep('phone')} className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1">
                ← Changer de numéro
              </button>
            </>
          )}

          <button onClick={handleLogout} className="w-full text-xs text-red-400 hover:text-red-600 transition-colors py-1">
            Se déconnecter complètement
          </button>
        </div>
      </div>
    </div>
  );
}

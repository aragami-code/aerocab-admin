import { useState } from 'react';
import { Plane, Phone, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { useAdminAuthStore } from '../stores/authStore';
import { adminApi } from '../services/api';

export function LoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAdminAuthStore((s) => s.login);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError('');
    try {
      await adminApi.sendOtp(phone);
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur envoi OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await adminApi.login(phone, otp);
      if (result.user.role !== 'admin') {
        setError('Acces reserve aux administrateurs');
        return;
      }
      login(result.user, result.accessToken);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-[#0a1628] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-2xl shadow-lg shadow-accent/20 mb-4">
            <Plane className="w-8 h-8 text-primary-dark" />
          </div>
          <h1 className="text-2xl font-bold text-white font-heading tracking-tight">
            AeroCab Connect
          </h1>
          <p className="text-sm text-white/40 mt-1">Panneau d'administration</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/20 p-8">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-gray-900">
              {step === 'phone' ? 'Connexion admin' : 'Verification'}
            </h2>
          </div>

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp}>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Numero de telephone
              </label>
              <div className="relative mb-4">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+237 6XX XXX XXX"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  autoFocus
                />
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 rounded-xl">
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Recevoir le code
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <p className="text-sm text-gray-500 mb-4">
                Code envoye au <span className="font-semibold text-gray-900">{phone}</span>
              </p>

              <label className="block text-sm font-medium text-gray-600 mb-2">
                Code de verification
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-center text-xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all mb-4"
                autoFocus
              />

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 rounded-xl">
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mb-3"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Verifier
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="w-full text-sm text-gray-400 hover:text-primary transition-colors cursor-pointer"
              >
                Changer de numero
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          AeroCab Connect v0.1.0
        </p>
      </div>
    </div>
  );
}

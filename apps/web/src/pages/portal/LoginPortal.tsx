import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuthStore } from '../../store/portalAuth.store';
import { Eye, EyeOff, GraduationCap, UserPlus, ArrowLeft } from 'lucide-react';

type Mode = 'login' | 'activar';

export default function LoginPortal() {
  const navigate = useNavigate();
  const { login, activarCuenta, isLoading, accessToken } = usePortalAuthStore();

  const [mode, setMode] = useState<Mode>('login');
  const [run, setRun] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (accessToken) navigate('/portal', { replace: true });
  }, [accessToken, navigate]);

  const formatRut = (val: string) => {
    const cleaned = val.replace(/[^0-9kK]/g, '').toUpperCase();
    if (cleaned.length <= 1) return cleaned;
    return `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'activar' && password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      if (mode === 'login') {
        await login(run, password);
      } else {
        await activarCuenta(run, email, password);
      }
      navigate('/portal');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Error al iniciar sesión';
      setError(msg);
    }
  };

  const C = { purple: '#8b5cf6', muted: 'var(--muted)', border: 'var(--border)' };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1.5 text-sm mb-6 transition-colors hover:text-[var(--text-primary)]"
          style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={15} /> Acceso personal del colegio
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: C.purple }}>
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Portal Apoderado</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>Accede a la información de tu pupilo</p>
        </div>

        <div className="rounded-2xl border p-8" style={{ background: 'var(--card)', borderColor: C.border }}>
          {mode === 'login' ? (
            <>
              <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Iniciar sesión</h2>
              <p className="text-xs mb-6" style={{ color: C.muted }}>Ingresa con tu RUT y contraseña</p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Primera vez</h2>
              <p className="text-xs mb-6" style={{ color: C.muted }}>Activa tu cuenta con el RUT y correo registrado en el colegio</p>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* RUT */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted }}>RUT del apoderado</label>
              <input
                type="text"
                value={run}
                onChange={(e) => setRun(formatRut(e.target.value))}
                required
                placeholder="12345678-9"
                maxLength={10}
                className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: 'var(--input-bg)', border: `1px solid ${C.border}`, color: 'var(--text-primary)' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = C.purple; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
              />
            </div>

            {/* Email (solo activación) */}
            {mode === 'activar' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted }}>Correo registrado en el colegio</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="ejemplo@correo.cl"
                  className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                  style={{ background: 'var(--input-bg)', border: `1px solid ${C.border}`, color: 'var(--text-primary)' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = C.purple; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted }}>
                {mode === 'activar' ? 'Crea tu contraseña' : 'Contraseña'}
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none"
                  style={{ background: 'var(--input-bg)', border: `1px solid ${C.border}`, color: 'var(--text-primary)' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = C.purple; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm password (activación) */}
            {mode === 'activar' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: C.muted }}>Confirmar contraseña</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                  style={{ background: 'var(--input-bg)', border: `1px solid ${C.border}`, color: 'var(--text-primary)' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = C.purple; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                />
              </div>
            )}

            {error && (
              <div className="rounded-lg px-3 py-2 text-sm text-[#ef4444]"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm mt-2 disabled:opacity-60"
              style={{ background: C.purple }}>
              {isLoading ? 'Procesando...' : mode === 'login' ? 'Ingresar al Portal' : 'Activar cuenta'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t" style={{ borderColor: C.border }}>
            {mode === 'login' ? (
              <button
                onClick={() => { setMode('activar'); setError(''); }}
                className="flex items-center gap-2 text-xs w-full justify-center transition-colors"
                style={{ color: C.purple, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <UserPlus size={14} /> Primera vez? Activa tu cuenta
              </button>
            ) : (
              <button
                onClick={() => { setMode('login'); setError(''); }}
                className="text-xs w-full text-center transition-colors"
                style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Ya tengo contraseña → Iniciar sesión
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: C.muted }}>
          Powered by <span style={{ color: C.purple }}>FlowMind AI</span> · 24/7
        </p>
      </div>
    </div>
  );
}

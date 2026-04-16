import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { Eye, EyeOff, GraduationCap, ArrowLeft } from 'lucide-react';

export default function LoginApoderado() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      // After login, the user's role is set in the store
      const user = useAuthStore.getState().user;
      if (user?.rol === 'APODERADO') {
        navigate('/apoderado');
      } else if (user?.rol) {
        // Staff member accidentally used apoderado login — redirect to main
        navigate('/dashboard');
      } else {
        setError('Esta cuenta no tiene acceso al Portal de Apoderados');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Credenciales inválidas';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        {/* Back link */}
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-sm mb-6 transition-colors hover:text-[var(--text-primary)]"
          style={{ color: 'var(--muted)' }}
        >
          <ArrowLeft size={15} /> Acceso personal del colegio
        </Link>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#8b5cf6] rounded-2xl mb-4">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Portal Apoderado</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Colegio San Andrés</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border p-8" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Bienvenido/a</h2>
          <p className="text-xs mb-6" style={{ color: 'var(--muted)' }}>
            Ingresa con las credenciales entregadas por la secretaría del colegio.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="ejemplo@correo.cl"
                className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-colors"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none transition-colors"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg px-3 py-2 text-sm text-[#ef4444]"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm mt-2"
            >
              {isLoading ? 'Ingresando...' : 'Ingresar al Portal'}
            </button>
          </form>
        </div>

        <div className="rounded-xl border px-4 py-3 mt-4" style={{ background: 'var(--card)', opacity: 0.8, borderColor: 'var(--border)' }}>
          <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
            ¿Olvidaste tu contraseña o no tienes acceso?
            <br />
            Comunícate con la secretaría del colegio.
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--muted)' }}>
          Powered by <span className="text-[#8b5cf6]">FlowMind AI</span> · 24/7
        </p>
      </div>
    </div>
  );
}

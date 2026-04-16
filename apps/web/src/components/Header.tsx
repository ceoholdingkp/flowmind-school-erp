import React, { useEffect, useState } from 'react';
import { Wifi, Sun, Moon, Menu } from 'lucide-react';
import { useThemeStore } from '../store/theme.store';
import { useUIStore } from '../store/ui.store';

export default function Header() {
  const [now, setNow] = useState(new Date());
  const { theme, toggle } = useThemeStore();
  const { toggleMobileSidebar } = useUIStore();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const dateStr = now.toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <header className="h-14 border-b flex items-center justify-between px-4 lg:px-6 transition-colors"
      style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3">
        {/* Hamburger — only visible on mobile */}
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--muted)' }}
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Colegio San Andrés</h1>
          <p className="text-xs capitalize hidden sm:block" style={{ color: 'var(--muted)' }}>{dateStr}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#10b981]">
          <Wifi size={13} />
          <span>En línea</span>
        </div>
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="p-2 rounded-lg transition-colors"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}

import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore, Toast, ToastType } from '../store/toast.store';

// Inject animation styles once
const style = document.createElement('style');
style.textContent = `
  @keyframes toast-in { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes toast-out { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(110%); } }
  .toast-item { animation: toast-in 0.25s ease-out; }
  .toast-leaving { animation: toast-out 0.2s ease-in forwards; }
`;
if (!document.head.querySelector('#toast-styles')) {
  style.id = 'toast-styles';
  document.head.appendChild(style);
}

const CONFIG: Record<ToastType, { bg: string; border: string; icon: React.ReactNode }> = {
  success: {
    bg: '#10b981',
    border: '#059669',
    icon: <CheckCircle2 size={18} />,
  },
  error: {
    bg: '#ef4444',
    border: '#dc2626',
    icon: <XCircle size={18} />,
  },
  warning: {
    bg: '#f59e0b',
    border: '#d97706',
    icon: <AlertTriangle size={18} />,
  },
  info: {
    bg: '#3b82f6',
    border: '#2563eb',
    icon: <Info size={18} />,
  },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [leaving, setLeaving] = useState(false);
  const cfg = CONFIG[toast.type];

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => onRemove(toast.id), 200);
  };

  return (
    <div
      className={leaving ? 'toast-leaving' : 'toast-item'}
      role="alert"
      style={{
        minWidth: 280,
        maxWidth: 400,
        padding: '14px 18px',
        borderRadius: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        background: cfg.bg,
        color: '#fff',
        borderLeft: `4px solid ${cfg.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 1.4,
      }}
    >
      <span style={{ flexShrink: 0 }}>{cfg.icon}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={dismiss}
        aria-label="Cerrar notificación"
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          opacity: 0.8,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, remove } = useToastStore();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={toast} onRemove={remove} />
        </div>
      ))}
    </div>
  );
}

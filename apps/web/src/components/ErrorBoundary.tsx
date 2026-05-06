import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2rem',
            textAlign: 'center',
            gap: '16px',
          }}
        >
          <AlertTriangle size={48} color="#ef4444" />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Algo salió mal
          </h2>
          {this.state.error?.message && (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', maxWidth: 420, margin: 0 }}>
              {this.state.error.message}
            </p>
          )}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                padding: '9px 20px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Reintentar
            </button>
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              style={{
                padding: '9px 20px',
                background: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Volver al dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

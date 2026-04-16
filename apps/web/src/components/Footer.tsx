import React from 'react';

export default function Footer() {
  return (
    <footer className="h-9 border-t flex items-center justify-center" style={{ background: 'var(--sidebar)', borderColor: 'var(--border)' }}>
      <span className="text-xs" style={{ color: 'var(--muted)' }}>
        Powered by <span className="text-[#3b82f6] font-medium">FlowMind AI</span> · 24/7
      </span>
    </footer>
  );
}

import React from 'react';

// Inject shimmer styles once
const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer {
    from { background-position: -200% 0; }
    to { background-position: 200% 0; }
  }
  .skeleton {
    background: linear-gradient(90deg, var(--border) 25%, var(--nav-hover) 50%, var(--border) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
  }
`;
if (!document.head.querySelector('#skeleton-styles')) {
  style.id = 'skeleton-styles';
  document.head.appendChild(style);
}

export function SkeletonLine({
  width = '100%',
  height = 16,
  className = '',
}: {
  width?: string | number;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: 4, flexShrink: 0 }}
    />
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '12px',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          borderRadius: '8px 8px 0 0',
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} height={12} width="60%" />
        ))}
      </div>
      {/* data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '12px',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            background: r % 2 === 0 ? 'var(--card)' : 'var(--card-deep)',
          }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} height={14} width={c === 0 ? '80%' : '60%'} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <SkeletonLine height={18} width="55%" />
      <SkeletonLine height={14} />
      <SkeletonLine height={14} width="90%" />
      <SkeletonLine height={14} width="75%" />
    </div>
  );
}

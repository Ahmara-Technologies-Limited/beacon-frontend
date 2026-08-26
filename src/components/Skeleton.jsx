import React from 'react';

// Shared shimmering placeholder building blocks. Kept intentionally generic
// (a plain block + a few layout helpers) so every view can compose its own
// skeleton shape without pulling in a new dependency.

export function SkeletonBlock({ width = '100%', height = '14px', radius = '4px', style = {} }) {
  return (
    <span
      className="skeleton-block"
      style={{ width, height, borderRadius: radius, display: 'inline-block', ...style }}
    />
  );
}

export function SkeletonTableRows({ columns = 5, rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="skeleton-row">
          {Array.from({ length: columns }).map((__, c) => (
            <td key={c}>
              <SkeletonBlock width={c === 0 ? '70%' : '85%'} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonCards({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card skeleton-card">
          <SkeletonBlock width="50%" height="12px" style={{ marginBottom: '12px' }} />
          <SkeletonBlock width="80%" height="24px" style={{ marginBottom: '8px' }} />
          <SkeletonBlock width="60%" height="12px" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonListRows({ count = 5, lines = 2 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card skeleton-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: lines }).map((__, l) => (
            <SkeletonBlock key={l} width={l === 0 ? '40%' : '75%'} height={l === 0 ? '14px' : '11px'} />
          ))}
        </div>
      ))}
    </div>
  );
}

// One-time global styles for the shimmer animation + skeleton surface color.
// Injected via a style tag rather than a CSS module so it works regardless
// of how each view is bundled.
export function SkeletonStyles() {
  return (
    <style>{`
      .skeleton-block, .skeleton-card {
        background: linear-gradient(90deg, #EDEFF2 25%, #F5F6F8 37%, #EDEFF2 63%);
        background-size: 400% 100%;
        animation: skeleton-shimmer 1.4s ease infinite;
      }
      .skeleton-card {
        border: 1px solid var(--border-color, #E4E7EC);
      }
      .skeleton-row td {
        padding: 14px 12px;
      }
      @keyframes skeleton-shimmer {
        0% { background-position: 100% 50%; }
        100% { background-position: 0 50%; }
      }
    `}</style>
  );
}

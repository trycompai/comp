import type { CSSProperties, ReactNode } from 'react';

const PAGE_STYLE: CSSProperties = {
  width: 240,
  height: 312,
  background: '#ffffff',
  border: '1px solid var(--border)',
  borderRadius: 4,
  boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 8px 24px -10px rgba(0,0,0,0.18)',
  padding: '20px 18px',
  display: 'flex',
  flexDirection: 'column',
  color: '#111',
  fontSize: 8,
  lineHeight: 1.35,
  overflow: 'hidden',
  flex: 'none',
  position: 'relative',
};

export function ReportPage({ children }: { children: ReactNode }) {
  return <div style={PAGE_STYLE}>{children}</div>;
}

export function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 5.5,
          color: '#999',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 1,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 7, color: '#222' }}>{value}</div>
    </div>
  );
}

export function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 7 }}>
      <div
        style={{
          fontSize: 5.5,
          color: '#999',
          fontWeight: 700,
          letterSpacing: '0.1em',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 6.5, color: '#333', lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}

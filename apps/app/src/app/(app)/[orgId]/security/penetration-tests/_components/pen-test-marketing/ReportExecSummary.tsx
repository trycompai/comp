import { ReportPage } from './report-page';

const COUNTERS: Array<{ n: number; l: string; c: string }> = [
  { n: 0, l: 'CRITICAL', c: '#b8290c' },
  { n: 3, l: 'HIGH', c: '#c25b1f' },
  { n: 2, l: 'MEDIUM', c: '#8a6b1a' },
  { n: 2, l: 'LOW', c: '#3c6b8a' },
  { n: 1, l: 'INFO', c: '#777' },
];

export function ReportExecSummary() {
  return (
    <ReportPage>
      <div
        style={{
          fontSize: 6.5,
          fontWeight: 700,
          letterSpacing: '0.22em',
          color: '#888',
          marginBottom: 8,
        }}
      >
        1. EXECUTIVE SUMMARY
      </div>
      <div style={{ fontSize: 7, color: '#333', marginBottom: 10, lineHeight: 1.45 }}>
        This penetration test was conducted on the staging environment to identify security
        vulnerabilities and misconfigurations that could be exploited by malicious actors.
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 6px',
          fontSize: 6,
          fontWeight: 700,
          letterSpacing: '0.1em',
          background: '#fff2f0',
          color: '#b8290c',
          borderRadius: 2,
          marginBottom: 12,
        }}
      >
        OVERALL RISK · HIGH
      </div>
      <div
        style={{
          fontSize: 6.5,
          color: '#666',
          fontWeight: 700,
          letterSpacing: '0.1em',
          marginBottom: 6,
        }}
      >
        KEY FINDINGS
      </div>
      <ul
        style={{
          paddingLeft: 10,
          margin: '0 0 16px',
          fontSize: 6.5,
          color: '#333',
          lineHeight: 1.5,
        }}
      >
        <li>CORS misconfiguration allowing cross-origin requests with credentials</li>
        <li>Custom authentication headers exposed via CORS preflight</li>
        <li>API documentation publicly accessible, revealing structure</li>
        <li>Information disclosure via observability integration</li>
      </ul>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 4,
          marginTop: 'auto',
        }}
      >
        {COUNTERS.map((s) => (
          <div
            key={s.l}
            style={{
              textAlign: 'center',
              padding: '6px 2px',
              border: '0.5px solid #e4e4e4',
              borderRadius: 2,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: s.c,
                lineHeight: 1,
                marginBottom: 3,
              }}
            >
              {s.n}
            </div>
            <div style={{ fontSize: 5, fontWeight: 700, letterSpacing: '0.1em', color: '#555' }}>
              {s.l}
            </div>
          </div>
        ))}
      </div>
    </ReportPage>
  );
}

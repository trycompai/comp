import { Meta, ReportPage } from './report-page';

export function ReportCover() {
  return (
    <ReportPage>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 6.5,
          fontWeight: 700,
          letterSpacing: '0.32em',
          color: '#3c3c3c',
          marginBottom: 26,
        }}
      >
        <span>C O M P&nbsp;&nbsp;A I</span>
        <span style={{ color: '#777' }}>CONFIDENTIAL</span>
      </div>
      <div style={{ fontSize: 7, color: '#777', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
        yourapp.example.com
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          lineHeight: 1.15,
          marginBottom: 4,
          color: '#111',
        }}
      >
        Web Application Penetration Test
      </div>
      <div style={{ fontSize: 8, color: '#555', marginBottom: 28 }}>Security Assessment Report</div>
      <div
        style={{
          fontSize: 6,
          fontWeight: 700,
          letterSpacing: '0.22em',
          color: '#888',
          paddingBottom: 6,
          borderBottom: '0.5px solid #ddd',
          marginBottom: 12,
        }}
      >
        PENETRATION TEST REPORT
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4, fontSize: 7, color: '#333' }}>
        <Meta label="Assessment Period" value="May 5, 2026 — May 5, 2026" />
        <Meta label="Report Date" value="May 5, 2026" />
        <Meta label="Version" value="1.0" />
        <Meta label="Reference" value="pentest-1777989012736" />
      </div>
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 5.5,
          color: '#888',
        }}
      >
        <span>Comp AI — Penetration Test Report</span>
        <span>1 of 33</span>
      </div>
    </ReportPage>
  );
}

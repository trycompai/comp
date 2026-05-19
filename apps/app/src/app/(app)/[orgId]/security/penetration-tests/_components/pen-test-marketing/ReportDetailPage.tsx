import { FieldRow, ReportPage } from './report-page';

export function ReportDetailPage() {
  return (
    <ReportPage>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div style={{ fontSize: 5.5, fontWeight: 700, letterSpacing: '0.12em', color: '#888' }}>
          CORS VULN 01
        </div>
        <div
          style={{
            fontSize: 5.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
            padding: '2px 5px',
            background: '#fff2f0',
            color: '#b8290c',
            borderRadius: 2,
          }}
        >
          HIGH
        </div>
      </div>
      <div
        style={{
          fontSize: 9,
          fontWeight: 500,
          color: '#111',
          marginBottom: 8,
          lineHeight: 1.25,
        }}
      >
        CORS Misconfiguration with Credentials
      </div>
      <FieldRow label="AFFECTED ASSETS" value="enterprise-api.example.com" />
      <FieldRow
        label="DESCRIPTION"
        value="The endpoint has a critical CORS misconfiguration allowing cross-origin requests from any domain while also permitting credentials."
      />
      <div
        style={{
          fontSize: 5.5,
          color: '#999',
          fontWeight: 700,
          letterSpacing: '0.1em',
          marginBottom: 3,
        }}
      >
        EVIDENCE
      </div>
      <pre
        style={{
          background: '#0f0f0f',
          color: '#cccccc',
          borderRadius: 2,
          padding: '5px 6px',
          fontFamily: 'var(--font-mono)',
          fontSize: 5.5,
          lineHeight: 1.4,
          marginBottom: 8,
          overflow: 'hidden',
        }}
      >
        {`HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST,`}
      </pre>
      <FieldRow
        label="REMEDIATION"
        value="Immediately change Access-Control-Allow-Origin from wildcard to a specific allowlist of trusted domains."
      />
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 5.5,
          color: '#888',
        }}
      >
        <span>Effort: Low · Priority: HIGH</span>
        <span>8 of 33</span>
      </div>
    </ReportPage>
  );
}

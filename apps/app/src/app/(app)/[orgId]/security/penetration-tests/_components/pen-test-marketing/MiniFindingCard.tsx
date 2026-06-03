const FINDING = {
  id: 'F-031',
  cvss: 9.8,
  cwe: 'CWE-89',
  title: 'SQL injection in /api/v2/reports filter parameter',
  endpoint: 'POST /api/v2/reports',
  summary:
    'The status filter is interpolated into a SQL WHERE clause without parameterization. The allowlist regex permits an escape via UNION SELECT, exposing the full reports table across all tenants.',
  found: 'discovered by sql-injection-agent · 6 min into scan',
};

const AGENT_LOG = `> 5 of 9 agents · 47 min elapsed · ETA ~1h
> sql-injection-agent: response-time delta 5.02s
> exploit confirmed: UNION SELECT  ✓
> writing PoC + remediation diff`;

/**
 * The "what a finding looks like" sample card. Mirrors the real finding-detail
 * surface from the pentest product so the marketing screenshot feels like the
 * actual app, not a polished mockup.
 */
export function MiniFindingCard() {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-background shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2.5 sm:gap-2.5 sm:px-4 sm:py-3">
        <span className="rounded-sm bg-[oklch(0.55_0.22_27)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
          CRITICAL · {FINDING.cvss}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">{FINDING.cwe}</span>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">{FINDING.id}</span>
      </div>
      <div className="px-3 py-3 sm:px-4 sm:py-3.5">
        <div className="mb-1 text-[14px] leading-[1.35]">{FINDING.title}</div>
        <div className="mb-2.5 font-mono text-[11px] text-muted-foreground">
          {FINDING.endpoint}
        </div>
        <p className="mb-3 text-[12px] leading-[1.55] text-muted-foreground">{FINDING.summary}</p>
        <pre className="overflow-x-auto rounded-sm bg-[#0b0b0b] px-3 py-2.5 font-mono text-[11px] leading-[1.5] text-[#d4d4d4]">
          {AGENT_LOG}
        </pre>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-border bg-muted/30 px-3 py-2.5 sm:px-4">
        <span className="font-mono text-[11px] text-muted-foreground">{FINDING.found}</span>
        <span className="text-[11px] text-muted-foreground">
          Maps to <span className="font-mono text-foreground">SOC 2 · CC7.1</span> and{' '}
          <span className="font-mono text-foreground">ISO 27001 · A.12.6</span>
        </span>
      </div>
    </div>
  );
}

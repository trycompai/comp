interface RunRow {
  id: string;
  target: string;
  when: string;
  state: 'running' | 'completed' | 'clean';
  count: number;
}

const ROWS: RunRow[] = [
  { id: 'PT-0042', target: 'app.staging.trycomp.ai', when: '2 min ago', state: 'running', count: 7 },
  { id: 'PT-0041', target: 'app.trycomp.ai', when: 'Apr 22', state: 'completed', count: 6 },
  { id: 'PT-0040', target: 'api.trycomp.ai', when: 'Apr 20', state: 'completed', count: 3 },
  { id: 'PT-0038', target: 'app.trycomp.ai', when: 'Apr 17', state: 'clean', count: 0 },
];

/**
 * Pen-test-specific decorative "recent scans" preview rendered inside the
 * marketing hero. The values are deliberately plausible — not real data — so
 * the screenshot reads as a real product surface, not a glossy mockup.
 */
export function MiniRunList() {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-background shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Recent scans
          </span>
          <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
            {ROWS.length}
          </span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">{ROWS[0].target}</span>
      </div>
      {ROWS.map((r, i) => (
        <div
          key={r.id}
          className="grid grid-cols-[64px_minmax(0,1fr)_auto_auto] items-center gap-2.5 px-3 py-2.5 sm:grid-cols-[76px_minmax(0,1fr)_auto_auto] sm:gap-3 sm:px-3.5 sm:py-3"
          style={{
            borderBottom: i === ROWS.length - 1 ? undefined : '1px solid var(--border)',
            background:
              i === 0 ? 'color-mix(in oklab, var(--primary) 4%, transparent)' : undefined,
          }}
        >
          <span className="font-mono text-[11px] text-muted-foreground">{r.id}</span>
          <span className="min-w-0 truncate font-mono text-[12px]">{r.target}</span>
          {r.state === 'running' && (
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-primary/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              RUNNING
            </span>
          )}
          {r.state === 'completed' && (
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {r.count} FINDINGS
            </span>
          )}
          {r.state === 'clean' && (
            <span className="rounded-sm bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              CLEAN
            </span>
          )}
          <span className="font-mono text-[11px] text-muted-foreground">{r.when}</span>
        </div>
      ))}
    </div>
  );
}

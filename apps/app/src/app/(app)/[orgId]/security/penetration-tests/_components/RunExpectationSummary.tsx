interface RunExpectationSummaryProps {
  runtimeEstimate: string;
  effectiveLabel: string;
  checksError?: string;
}

export function RunExpectationSummary({
  runtimeEstimate,
  effectiveLabel,
  checksError,
}: RunExpectationSummaryProps) {
  const rows = [
    ['Estimated duration', runtimeEstimate],
    ['Output', 'Findings + markdown & PDF report'],
    ['Mode', effectiveLabel],
  ];

  return (
    <div className="mb-5 rounded border border-border bg-muted/50 p-3.5">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        What to expect
      </div>
      <dl className="space-y-1 text-xs leading-loose">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-words font-mono sm:text-right">{value}</dd>
          </div>
        ))}
      </dl>
      {checksError && <p className="mt-2 text-[11px] text-destructive">{checksError}</p>}
    </div>
  );
}

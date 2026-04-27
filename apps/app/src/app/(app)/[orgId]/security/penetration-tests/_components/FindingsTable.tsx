'use client';

import { cn } from '@trycompai/design-system/cn';
import type { PentestIssue } from '@/lib/security/penetration-tests-client';
import { SevChip } from './SevChip';
import { SEVERITY_INDEX } from './severity';

interface FindingsTableProps {
  issues: PentestIssue[];
  onRowClick?: (issue: PentestIssue) => void;
  /** IDs of findings that should briefly highlight — e.g. just-landed. */
  highlightedIds?: ReadonlySet<string>;
  emptyState?: React.ReactNode;
  className?: string;
}

export function FindingsTable({
  issues,
  onRowClick,
  highlightedIds,
  emptyState,
  className,
}: FindingsTableProps) {
  const sorted = [...issues].sort(
    (a, b) =>
      (SEVERITY_INDEX[a.severity] ?? 99) - (SEVERITY_INDEX[b.severity] ?? 99),
  );

  if (sorted.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[var(--radius)] border border-border',
        className,
      )}
    >
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/50">
          <tr className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            <th className="px-3 py-2 font-semibold">Severity</th>
            <th className="px-3 py-2 font-semibold">CVSS</th>
            <th className="px-3 py-2 font-semibold">Title</th>
            <th className="px-3 py-2 font-semibold">Affected</th>
            <th className="w-8 px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((issue) => (
            <tr
              key={issue.id}
              className={cn(
                'border-t border-border transition-colors',
                onRowClick && 'cursor-pointer hover:bg-muted',
                highlightedIds?.has(issue.id) && 'pt-row-land',
              )}
              style={
                highlightedIds?.has(issue.id)
                  ? ({
                      ['--pt-row-tint' as string]: `var(--pt-sev-${issue.severity}-bg)`,
                    } as React.CSSProperties)
                  : undefined
              }
              onClick={() => onRowClick?.(issue)}
            >
              <td className="px-3 py-2.5 align-middle">
                <SevChip severity={issue.severity} size="sm" />
              </td>
              <td className="px-3 py-2.5 align-middle font-mono text-xs tabular-nums">
                {typeof issue.cvssScore === 'number'
                  ? issue.cvssScore.toFixed(1)
                  : '—'}
              </td>
              <td className="px-3 py-2.5 align-middle">
                <div className="font-medium">{issue.title}</div>
                {issue.cweId ? (
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {issue.cweId}
                  </div>
                ) : null}
              </td>
              <td className="px-3 py-2.5 align-middle font-mono text-xs text-muted-foreground">
                {issue.affectedEndpoint ?? '—'}
              </td>
              <td className="px-3 py-2.5 text-right align-middle text-muted-foreground">
                {onRowClick ? '›' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

'use client';

import { Badge } from '@trycompai/ui/badge';
import { ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Finding } from '../types';
import type { CheckGroup } from './check-groups';

/**
 * Per-check display cap. If a single check produces more failing rows
 * than this we render the first N and surface a "Show all N" affordance
 * — keeps the browser responsive on the rare account with hundreds of
 * resources of a single kind.
 */
const PER_CHECK_DISPLAY_LIMIT = 100;

const SEVERITY_DOTS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  info: 'bg-gray-400',
};

export interface CheckGroupBlockProps {
  group: CheckGroup;
  /** Active severity filter from the parent — used to filter failing rows. */
  severityFilter: string | null;
  /** Renders the per-finding row (FindingRow lives in the parent file). */
  renderRow: (finding: Finding) => React.ReactNode;
}

export function CheckGroupBlock({
  group,
  severityFilter,
  renderRow,
}: CheckGroupBlockProps) {
  const [showAll, setShowAll] = useState(false);
  const [revealedMore, setRevealedMore] = useState(false);

  // Apply severity filter to the failing rows shown by default.
  const visibleFailing = useMemo(() => {
    if (!severityFilter) return group.failed;
    return group.failed.filter(
      (f) => f.severity?.toLowerCase() === severityFilter,
    );
  }, [group.failed, severityFilter]);

  // When user toggles "Show all results" we render every instance (passed +
  // failed). Severity filter is intentionally ignored in this mode because
  // the user is explicitly asking for a full audit list.
  const fullList = group.all;
  const rendered = showAll ? fullList : visibleFailing;
  const displayCap = revealedMore ? Infinity : PER_CHECK_DISPLAY_LIMIT;
  const visibleRows = rendered.slice(0, displayCap);
  const hiddenRowsCount = Math.max(0, rendered.length - visibleRows.length);

  // Compact line for checks with no failures (and no severity filter).
  if (group.failed.length === 0 && !showAll) {
    if (severityFilter) return null;
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-primary">
        <ShieldCheck className="h-3 w-3" />
        <span className="font-medium">{group.checkTitle}</span>
        <span className="text-muted-foreground">
          — all {group.all.length} passing
        </span>
        {group.all.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="ml-auto text-[10px] font-medium text-primary hover:underline"
          >
            Show resources
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            SEVERITY_DOTS[group.severity] ?? SEVERITY_DOTS.info
          }`}
        />
        <span className="text-xs font-medium truncate flex-1">
          {group.checkTitle}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {group.failed.length} of {group.all.length} failing
        </span>
        {group.all.length > group.failed.length && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted"
            aria-pressed={showAll}
          >
            {showAll ? (
              <>
                <ChevronDown className="h-2.5 w-2.5" />
                Hide passing
              </>
            ) : (
              <>
                <ChevronRight className="h-2.5 w-2.5" />
                Show all {group.all.length} results
              </>
            )}
          </button>
        )}
      </div>
      {visibleRows.length === 0 && severityFilter && (
        <div className="px-4 py-3 text-xs text-muted-foreground">
          No {severityFilter}-severity failures for this check.
        </div>
      )}
      {visibleRows.map((finding) => (
        <div key={finding.id}>{renderRow(finding)}</div>
      ))}
      {hiddenRowsCount > 0 && !revealedMore && (
        <button
          type="button"
          onClick={() => setRevealedMore(true)}
          className="flex w-full items-center justify-center gap-1.5 px-4 py-2 text-xs text-primary hover:bg-muted/40"
        >
          <ChevronDown className="h-3 w-3" />
          Show {hiddenRowsCount} more results
        </button>
      )}
    </div>
  );
}

export { PER_CHECK_DISPLAY_LIMIT };

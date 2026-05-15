'use client';

import { useApi } from '@/hooks/use-api';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@trycompai/ui/button';
import { Loader2, ShieldCheck, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';

interface ResolutionRow {
  id: string;
  checkId: string;
  resourceId: string;
  resourceType: string | null;
  resolvedAt: string;
  resolutionMethod:
    | 'platform_fix'
    | 'external_fix'
    | 'resource_deleted'
    | 'exception_marked';
  daysOpen: number | null;
}

interface ExceptionRow {
  id: string;
  checkId: string;
  resourceId: string;
  reason: string;
  reviewedBy: string | null;
  expiresAt: string | null;
  markedAt: string;
}

interface RegressionRow {
  id: string;
  checkId: string;
  resourceId: string;
  previouslyResolvedAt: string;
  regressedAt: string;
  daysClean: number | null;
}

interface HistoryPayload {
  summary: {
    resolutions: number;
    platformFixes: number;
    externalFixes: number;
    resourceDeleted: number;
    exceptionMarked: number;
    activeExceptions: number;
    regressions: number;
  };
  resolutions: ResolutionRow[];
  exceptions: ExceptionRow[];
  regressions: RegressionRow[];
  // Server may cap rows at 200/100; this signals the UI to show
  // "showing N of M" when the response is partial.
  truncated?: {
    resolutions: boolean;
    exceptions: boolean;
    regressions: boolean;
  };
}

const RESOLUTION_METHOD_LABEL: Record<
  ResolutionRow['resolutionMethod'],
  string
> = {
  platform_fix: 'Fixed via platform',
  external_fix: 'Fixed externally',
  resource_deleted: 'Resource deleted',
  exception_marked: 'Marked as exception',
};

export interface HistoryTabProps {
  connectionId: string;
}

/**
 * Renders the audit trail for a connection — resolutions, active
 * exceptions, and regressions. Pulls from
 * GET /v1/cloud-security/history?connectionId=...
 */
export function HistoryTab({ connectionId }: HistoryTabProps) {
  const api = useApi();
  const { hasPermission } = usePermissions();
  const canRevoke = hasPermission('integration', 'update');

  const { data, error, isLoading, mutate } = api.useSWR<{
    data: HistoryPayload;
  }>(`/v1/cloud-security/history?connectionId=${connectionId}`, {
    revalidateOnFocus: false,
  });

  const handleRevoke = async (exceptionId: string) => {
    const response = await api.delete(
      `/v1/cloud-security/exceptions/${exceptionId}`,
    );
    if (response.error) {
      toast.error(
        typeof response.error === 'string'
          ? response.error
          : 'Could not revoke exception',
      );
      return;
    }
    toast.success('Exception revoked');
    mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/20 py-12 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading history…
      </div>
    );
  }
  if (error || !data?.data?.data) {
    return (
      <div className="rounded-lg border bg-muted/20 py-12 text-center text-xs text-muted-foreground">
        Could not load history for this connection.
      </div>
    );
  }

  const payload = data.data.data;
  const isEmpty =
    payload.resolutions.length === 0 &&
    payload.exceptions.length === 0 &&
    payload.regressions.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12 text-center">
        <ShieldCheck className="mb-3 h-7 w-7 text-muted-foreground/30" />
        <p className="text-sm font-medium">No audit history yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Resolutions, exceptions, and regressions are recorded automatically
          on each scan.
        </p>
      </div>
    );
  }

  const truncated = payload.truncated;
  const sectionCount = (total: number, shown: number, isTruncated: boolean) =>
    isTruncated ? `${shown} of ${total}` : `${total}`;

  return (
    <div className="space-y-6">
      <SummaryCard summary={payload.summary} />
      {payload.resolutions.length > 0 && (
        <Section
          title="Resolutions"
          count={sectionCount(
            payload.summary.resolutions,
            payload.resolutions.length,
            truncated?.resolutions ?? false,
          )}
          subtitle={`${payload.summary.platformFixes} platform · ${payload.summary.externalFixes} external · ${payload.summary.resourceDeleted} deleted · ${payload.summary.exceptionMarked} exception`}
        >
          {payload.resolutions.map((row) => (
            <ResolutionRowView key={row.id} row={row} />
          ))}
        </Section>
      )}
      {payload.exceptions.length > 0 && (
        <Section
          title="Active exceptions"
          count={sectionCount(
            payload.summary.activeExceptions,
            payload.exceptions.length,
            truncated?.exceptions ?? false,
          )}
          subtitle="Findings the customer has documented as accepted or not applicable."
        >
          {payload.exceptions.map((row) => (
            <ExceptionRowView
              key={row.id}
              row={row}
              canRevoke={canRevoke}
              onRevoke={() => handleRevoke(row.id)}
            />
          ))}
        </Section>
      )}
      {payload.regressions.length > 0 && (
        <Section
          title="Regressions"
          count={sectionCount(
            payload.summary.regressions,
            payload.regressions.length,
            truncated?.regressions ?? false,
          )}
          subtitle="Findings that were previously resolved and are failing again."
        >
          {payload.regressions.map((row) => (
            <RegressionRowView key={row.id} row={row} />
          ))}
        </Section>
      )}
    </div>
  );
}

function SummaryCard({ summary }: { summary: HistoryPayload['summary'] }) {
  return (
    <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/20 p-3 text-xs">
      <div>
        <p className="text-muted-foreground">Resolved</p>
        <p className="mt-0.5 text-lg font-semibold tabular-nums">
          {summary.resolutions}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">Active exceptions</p>
        <p className="mt-0.5 text-lg font-semibold tabular-nums">
          {summary.activeExceptions}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">Regressions</p>
        <p className="mt-0.5 text-lg font-semibold tabular-nums text-orange-600 dark:text-orange-400">
          {summary.regressions}
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle: string;
  count: number | string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border">
      <div className="border-b bg-muted/20 px-4 py-2">
        <p className="text-xs font-medium">
          {title} <span className="text-muted-foreground">({count})</span>
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
      <div className="divide-y">{children}</div>
    </div>
  );
}

function ResolutionRowView({ row }: { row: ResolutionRow }) {
  return (
    <div className="space-y-1 px-4 py-3 text-xs">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="font-medium">
          {row.checkId} · {row.resourceType ? `${row.resourceType}: ` : ''}
          {row.resourceId}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {RESOLUTION_METHOD_LABEL[row.resolutionMethod]}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground pl-5.5">
        Resolved {new Date(row.resolvedAt).toLocaleString()}
        {row.daysOpen !== null ? ` — was open ${row.daysOpen}d` : ''}
      </p>
    </div>
  );
}

function ExceptionRowView({
  row,
  canRevoke,
  onRevoke,
}: {
  row: ExceptionRow;
  canRevoke: boolean;
  onRevoke: () => void;
}) {
  return (
    <div className="space-y-2 px-4 py-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-medium">
          {row.checkId} · {row.resourceId}
        </span>
        {canRevoke && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRevoke}
            className="ml-auto"
          >
            <X className="mr-1 h-3 w-3" />
            Remove exception
          </Button>
        )}
      </div>
      <p className="leading-relaxed text-muted-foreground">{row.reason}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span>Marked {new Date(row.markedAt).toLocaleDateString()}</span>
        {row.reviewedBy && <span>· Reviewed by: {row.reviewedBy}</span>}
        {row.expiresAt && (
          <span>· Auto-review: {new Date(row.expiresAt).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}

function RegressionRowView({ row }: { row: RegressionRow }) {
  return (
    <div className="space-y-1 px-4 py-3 text-xs">
      <div className="flex items-center gap-2">
        <RotateCcw className="h-3.5 w-3.5 text-orange-500 shrink-0" />
        <span className="font-medium">
          {row.checkId} · {row.resourceId}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground pl-5.5">
        Was clean {row.daysClean ?? '?'}d (previously resolved{' '}
        {new Date(row.previouslyResolvedAt).toLocaleDateString()}). Failing
        again as of {new Date(row.regressedAt).toLocaleString()}.
      </p>
    </div>
  );
}

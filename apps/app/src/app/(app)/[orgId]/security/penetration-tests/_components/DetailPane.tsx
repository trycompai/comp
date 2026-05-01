'use client';

import { ErrorFilled, InProgress } from '@trycompai/design-system/icons';
import type {
  PentestAgentEvent,
  PentestIssue,
  PentestRun,
} from '@/lib/security/penetration-tests-client';
import { CompletedDetail } from './CompletedDetail';
import { FailedDetail } from './FailedDetail';
import { FindingDetail } from './FindingDetail';
import { RunningDetail } from './RunningDetail';
import { isRunInProgress } from './severity';

interface DetailPaneProps {
  run: PentestRun | undefined;
  issues: PentestIssue[];
  events: PentestAgentEvent[];
  isLoading: boolean;
  error: Error | undefined;
  selectedFinding: PentestIssue | null;
  onOpenFinding: (issue: PentestIssue) => void;
  onCloseFinding: () => void;
  onDownloadMarkdown: () => void;
  onDownloadPdf: () => void;
}

/**
 * Picks the correct detail variant for a selected run:
 * finding-detail → failed → clean → completed → running (default).
 */
export function DetailPane({
  run,
  issues,
  events,
  isLoading,
  error,
  selectedFinding,
  onOpenFinding,
  onCloseFinding,
  onDownloadMarkdown,
  onDownloadPdf,
}: DetailPaneProps) {
  if (selectedFinding) {
    return <FindingDetail issue={selectedFinding} onBack={onCloseFinding} />;
  }

  if (isLoading && !run) {
    return (
      <div className="flex h-full items-center justify-center">
        <InProgress className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center">
        <div className="max-w-md space-y-2 text-sm text-muted-foreground">
          <ErrorFilled className="mx-auto h-8 w-8 text-destructive" />
          <p className="font-medium text-foreground">Unable to load scan</p>
          <p>{error?.message ?? 'No scan found for this organization.'}</p>
        </div>
      </div>
    );
  }

  if (run.status === 'failed' || run.status === 'cancelled') {
    return <FailedDetail run={run} />;
  }

  if (run.status === 'completed') {
    // Always the rich CompletedDetail layout — even with zero findings. The
    // findings table handles the "No issues found" state inline. Keeps the
    // user's eye on target / run ID / actions instead of a standalone
    // celebration that hid important context.
    return (
      <CompletedDetail
        run={run}
        issues={issues}
        events={events}
        onOpenFinding={onOpenFinding}
        onDownloadMarkdown={onDownloadMarkdown}
        onDownloadPdf={onDownloadPdf}
      />
    );
  }

  if (isRunInProgress(run.status)) {
    return (
      <RunningDetail
        run={run}
        issues={issues}
        events={events}
        onOpenFinding={onOpenFinding}
      />
    );
  }

  // Fallback — shouldn't happen but keeps the component total.
  return (
    <CompletedDetail
      run={run}
      issues={issues}
      events={events}
      onOpenFinding={onOpenFinding}
      onDownloadMarkdown={onDownloadMarkdown}
      onDownloadPdf={onDownloadPdf}
    />
  );
}

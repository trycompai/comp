'use client';

import type { PentestRun } from '@/lib/security/penetration-tests-client';
import { Button } from '@trycompai/design-system';
import { Renew, Warning } from '@trycompai/design-system/icons';
import { formatReportDate } from '../lib';
import { StatusPill } from './StatusPill';

interface FailedDetailProps {
  run: PentestRun;
  onRetry?: () => void;
}

export function FailedDetail({ run, onRetry }: FailedDetailProps) {
  const reason = run.failedReason ?? run.error ?? 'Unknown error';

  return (
    <div className="min-h-0 overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <StatusPill status={run.status} />
            <span className="font-mono text-xs text-muted-foreground">{run.id}</span>
          </div>
          <h1 className="truncate text-[26px] font-medium tracking-[-0.02em]">{run.targetUrl}</h1>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>Started {formatReportDate(run.createdAt)}</span>
            <span>Failed {formatReportDate(run.updatedAt)}</span>
          </div>
        </header>

        <div className="rounded-[var(--radius)] border border-destructive/30 bg-destructive/10 p-5">
          <div className="flex items-start gap-3">
            <Warning className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-destructive">
                Run error
              </div>
              <p className="text-sm leading-relaxed text-destructive">{reason}</p>
            </div>
          </div>
        </div>

        {onRetry ? (
          <div>
            <Button onClick={onRetry}>
              <Renew className="h-3.5 w-3.5" />
              Retry scan
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

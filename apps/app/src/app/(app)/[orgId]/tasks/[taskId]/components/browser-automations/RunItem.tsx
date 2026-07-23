'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@trycompai/design-system';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, Image as ImageIcon } from '@trycompai/design-system/icons';
import { useState } from 'react';
import type { BrowserAutomationRun } from '../../hooks/types';
import { RunStepLedger } from './RunStepLedger';

interface RunItemProps {
  run: BrowserAutomationRun;
  isLatest: boolean;
}

export function RunItem({ run, isLatest }: RunItemProps) {
  const [expanded, setExpanded] = useState(isLatest);

  const timeAgo = formatDistanceToNow(new Date(run.createdAt), { addSuffix: true });
  const hasFailed = run.status === 'failed';
  const isBlocked = run.status === 'blocked';
  const isCompleted = run.status === 'completed';
  const hasScreenshot = !!run.screenshotUrl;
  const evaluationPassed = run.evaluationStatus === 'pass';
  const evaluationFailed = run.evaluationStatus === 'fail';

  // Determine overall status: failed run, or completed but evaluation failed
  const hasIssue = hasFailed || isBlocked || evaluationFailed;
  const statusColor = hasIssue
    ? 'text-destructive'
    : isCompleted
      ? 'text-primary'
      : 'text-muted-foreground';
  const statusText = isBlocked
    ? 'Blocked'
    : hasFailed
      ? 'Failed'
      : evaluationFailed
      ? 'Issues Found'
      : evaluationPassed
        ? 'Passed'
        : isCompleted
          ? 'Completed'
          : run.status;

  return (
    <div
      className={cn(
        'rounded-md border transition-all',
        isLatest ? 'border-primary/20 bg-primary/2' : 'border-border/30 bg-muted/20',
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2.5 flex items-center gap-3"
      >
        <div
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            hasIssue ? 'bg-destructive' : isCompleted ? 'bg-primary' : 'bg-muted-foreground',
          )}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className={cn('font-medium', statusColor)}>{statusText}</span>
            {run.evaluationStatus && (
              <>
                <span className="text-muted-foreground">•</span>
                <Badge
                  variant={evaluationPassed ? 'default' : 'destructive'}
                >
                  {evaluationPassed ? 'Pass' : 'Fail'}
                </Badge>
              </>
            )}
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{timeAgo}</span>
            {hasScreenshot && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-primary flex items-center gap-1">
                  <ImageIcon size={12} />
                  Screenshot
                </span>
              </>
            )}
          </div>
        </div>

        <ChevronDown
          size={14}
          className={cn(
            'text-muted-foreground transition-transform duration-300',
            expanded && 'rotate-180',
          )}
        />
      </button>

      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/30">
            {/* Per-step evidence ledger (designer option C3): each step's
                verdict + reason + close-up "proof" and full-page context. */}
            <RunStepLedger run={run} />

            {/* Completion time */}
            {run.completedAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Completed:</span>
                <span>
                  {new Date(run.completedAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

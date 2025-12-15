'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@comp/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, ExternalLink, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import type { BrowserAutomationRun } from '../../hooks/types';

interface RunItemProps {
  run: BrowserAutomationRun;
  isLatest: boolean;
}

export function RunItem({ run, isLatest }: RunItemProps) {
  const [expanded, setExpanded] = useState(isLatest);
  const [imageError, setImageError] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(run.createdAt), { addSuffix: true });
  const hasFailed = run.status === 'failed';
  const isCompleted = run.status === 'completed';
  const hasScreenshot = !!run.screenshotUrl;
  const evaluationPassed = run.evaluationStatus === 'pass';
  const evaluationFailed = run.evaluationStatus === 'fail';

  // Determine overall status: failed run, or completed but evaluation failed
  const hasIssue = hasFailed || evaluationFailed;
  const statusColor = hasIssue
    ? 'text-destructive'
    : isCompleted
      ? 'text-primary'
      : 'text-muted-foreground';
  const statusText = hasFailed
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
                  className="text-[10px] px-1.5 py-0"
                >
                  {evaluationPassed ? '✓ Pass' : '✗ Fail'}
                </Badge>
              </>
            )}
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{timeAgo}</span>
            {hasScreenshot && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-primary flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  Screenshot
                </span>
              </>
            )}
          </div>
        </div>

        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-muted-foreground transition-transform duration-300',
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
            {/* Evaluation Result */}
            {run.evaluationReason && (
              <div
                className={cn(
                  'p-2 rounded-md border',
                  run.evaluationStatus === 'pass'
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-destructive/5 border-destructive/20',
                )}
              >
                <p className="text-xs font-medium mb-1">
                  {run.evaluationStatus === 'pass' ? 'Evaluation Passed' : 'Evaluation Failed'}
                </p>
                <p
                  className={cn(
                    'text-xs',
                    run.evaluationStatus === 'pass' ? 'text-foreground' : 'text-destructive',
                  )}
                >
                  {run.evaluationReason}
                </p>
              </div>
            )}

            {/* Error */}
            {run.error && (
              <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-destructive">{run.error}</p>
              </div>
            )}

            {/* Screenshot */}
            {hasScreenshot && !imageError && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Screenshot</p>
                  <a
                    href={run.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open full size
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="relative rounded-md overflow-hidden border border-border/50 bg-muted/30">
                  <Image
                    src={run.screenshotUrl!}
                    alt="Automation screenshot"
                    width={800}
                    height={450}
                    className="w-full h-auto object-contain"
                    onError={() => setImageError(true)}
                  />
                </div>
              </div>
            )}

            {/* Image load error fallback */}
            {hasScreenshot && imageError && (
              <div className="p-3 rounded-md bg-muted/50 border border-border/30 text-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Screenshot unavailable</p>
                <a
                  href={run.screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  Try direct link
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

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



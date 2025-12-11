'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { addDays, formatDistanceToNow, isBefore, setHours, setMinutes } from 'date-fns';
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Loader2,
  MonitorPlay,
  Plus,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { BrowserAutomation, BrowserAutomationRun } from '../../hooks/types';

interface BrowserAutomationsListProps {
  automations: BrowserAutomation[];
  hasContext: boolean;
  runningAutomationId: string | null;
  onRun: (automationId: string) => void;
  onCreateClick: () => void;
}

// Calculate next scheduled run (daily at 5 AM UTC)
const getNextScheduledRun = () => {
  const now = new Date();
  let nextRun = setMinutes(setHours(new Date(), 5), 0); // 5:00 AM UTC today

  // If we're past 5 AM UTC today, schedule for tomorrow
  if (isBefore(nextRun, now)) {
    nextRun = addDays(nextRun, 1);
  }

  return nextRun;
};

export function BrowserAutomationsList({
  automations,
  hasContext,
  runningAutomationId,
  onRun,
  onCreateClick,
}: BrowserAutomationsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Show next run if there are any automations
  const nextRun = automations.length > 0 ? getNextScheduledRun() : null;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-muted">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Browser Automations</h3>
              <p className="text-xs text-muted-foreground">
                Capture screenshots from authenticated web pages
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {nextRun && (
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Next run
                </div>
                <div className="text-sm font-medium text-foreground">
                  {formatDistanceToNow(nextRun, { addSuffix: true })}
                </div>
              </div>
            )}
            {hasContext && (
              <Badge variant="outline" className="text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                Connected
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="space-y-2">
          {automations.map((automation) => (
            <AutomationItem
              key={automation.id}
              automation={automation}
              isRunning={runningAutomationId === automation.id}
              isExpanded={expandedId === automation.id}
              onToggleExpand={() =>
                setExpandedId(expandedId === automation.id ? null : automation.id)
              }
              onRun={() => onRun(automation.id)}
            />
          ))}
        </div>

        <button
          onClick={onCreateClick}
          className="w-full flex items-center justify-center gap-2 py-2.5 mt-3 rounded-lg border border-dashed border-border/60 hover:border-border hover:bg-muted/30 transition-all text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Another
        </button>
      </div>
    </div>
  );
}

function AutomationItem({
  automation,
  isRunning,
  isExpanded,
  onToggleExpand,
  onRun,
}: {
  automation: BrowserAutomation;
  isRunning: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRun: () => void;
}) {
  const runs = automation.runs || [];
  const latestRun = runs[0];
  const hasFailed = latestRun?.status === 'failed';
  const isCompleted = latestRun?.status === 'completed';

  const dotColor = hasFailed
    ? 'bg-destructive shadow-[0_0_8px_rgba(255,0,0,0.3)]'
    : isCompleted
      ? 'bg-primary shadow-[0_0_8px_rgba(0,77,64,0.4)]'
      : 'bg-muted-foreground';

  return (
    <div
      className={cn(
        'rounded-lg border transition-all duration-300',
        isExpanded
          ? 'border-primary/30 shadow-sm bg-primary/[0.02]'
          : 'border-border/50 hover:border-border hover:shadow-sm',
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', dotColor)} />

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm tracking-tight">{automation.name}</p>
          {latestRun ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last ran {formatDistanceToNow(new Date(latestRun.createdAt), { addSuffix: true })}
              {latestRun.status === 'completed' && (
                <span className="ml-2 text-green-600">
                  <CheckCircle2 className="inline h-3 w-3" />
                </span>
              )}
              {latestRun.status === 'failed' && (
                <span className="ml-2 text-destructive">
                  <XCircle className="inline h-3 w-3" />
                </span>
              )}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">Never run</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRun} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <MonitorPlay className="mr-1.5 h-3 w-3" />
                Run
              </>
            )}
          </Button>
          {runs.length > 0 && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onToggleExpand}>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform duration-300',
                  isExpanded && 'rotate-180',
                )}
              />
            </Button>
          )}
        </div>
      </div>

      {/* Expandable Run History */}
      <div
        className={cn(
          'grid transition-all duration-500 ease-in-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-4">
            <RunHistory runs={runs} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RunHistory({ runs }: { runs: BrowserAutomationRun[] }) {
  const [showAll, setShowAll] = useState(false);
  const maxRuns = 5;

  const groupedRuns = useMemo(() => {
    const groups: Record<string, BrowserAutomationRun[]> = {};
    const displayRuns = showAll ? runs : runs.slice(0, maxRuns);

    displayRuns.forEach((run) => {
      const date = new Date(run.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(run);
    });

    return groups;
  }, [runs, showAll]);

  if (runs.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-2">No runs yet</p>;
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedRuns).map(([date, dateRuns]) => (
        <div key={date} className="space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {date}
          </p>
          <div className="space-y-2">
            {dateRuns.map((run, index) => (
              <RunItem
                key={run.id}
                run={run}
                isLatest={index === 0 && date === Object.keys(groupedRuns)[0]}
              />
            ))}
          </div>
        </div>
      ))}

      {runs.length > maxRuns && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          {showAll ? 'Show less' : `Show ${runs.length - maxRuns} more runs`}
        </button>
      )}
    </div>
  );
}

function RunItem({ run, isLatest }: { run: BrowserAutomationRun; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(isLatest);
  const [imageError, setImageError] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(run.createdAt), { addSuffix: true });
  const hasFailed = run.status === 'failed';
  const isCompleted = run.status === 'completed';
  const hasScreenshot = !!run.screenshotUrl;

  const statusColor = hasFailed
    ? 'text-destructive'
    : isCompleted
      ? 'text-primary'
      : 'text-muted-foreground';
  const statusText = hasFailed ? 'Failed' : isCompleted ? 'Completed' : run.status;

  return (
    <div
      className={cn(
        'rounded-md border transition-all',
        isLatest ? 'border-primary/20 bg-primary/[0.02]' : 'border-border/30 bg-muted/20',
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2.5 flex items-center gap-3"
      >
        <div
          className={cn(
            'h-1.5 w-1.5 rounded-full flex-shrink-0',
            hasFailed ? 'bg-destructive' : isCompleted ? 'bg-primary' : 'bg-muted-foreground',
          )}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className={cn('font-medium', statusColor)}>{statusText}</span>
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

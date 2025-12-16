'use client';

import { cn } from '@/lib/utils';
import { Button } from '@comp/ui/button';
import { ChevronDown, Loader2, MonitorPlay, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { BrowserAutomation, BrowserAutomationRun } from '../../hooks/types';
import { RunHistory } from './RunHistory';

interface AutomationItemProps {
  automation: BrowserAutomation;
  isRunning: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRun: () => void;
  onEdit: () => void;
}

export function AutomationItem({
  automation,
  isRunning,
  isExpanded,
  onToggleExpand,
  onRun,
  onEdit,
}: AutomationItemProps) {
  const runs: BrowserAutomationRun[] = automation.runs || [];
  const latestRun = runs[0];

  // status dot
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
          ? 'border-primary/30 shadow-sm bg-primary/2'
          : 'border-border/50 hover:border-border hover:shadow-sm',
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', dotColor)} />

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm tracking-tight">
            {automation.name}
          </p>
          {latestRun ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last ran {formatDistanceToNow(new Date(latestRun.createdAt), { addSuffix: true })}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">Never run</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit automation">
            <Settings className="h-4 w-4" />
          </Button>

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



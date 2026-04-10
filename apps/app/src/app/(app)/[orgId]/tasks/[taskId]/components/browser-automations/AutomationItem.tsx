'use client';

import { cn } from '@/lib/utils';
import { Button } from '@trycompai/ui/button';
import {
  ChevronDown,
  Loader2,
  MonitorPlay,
  Pencil,
  Power,
  PowerOff,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import type { BrowserAutomation, BrowserAutomationRun } from '../../hooks/types';
import { RunHistory } from './RunHistory';

interface AutomationItemProps {
  automation: BrowserAutomation;
  isRunning: boolean;
  isExpanded: boolean;
  readOnly?: boolean;
  onToggleExpand: () => void;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: (enabled: boolean) => void;
}

export function AutomationItem({
  automation,
  isRunning,
  isExpanded,
  readOnly,
  onToggleExpand,
  onRun,
  onEdit,
  onDelete,
  onToggleEnabled,
}: AutomationItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const runs: BrowserAutomationRun[] = automation.runs || [];
  const latestRun = runs[0];

  // status dot
  const hasFailed = latestRun?.status === 'failed';
  const isCompleted = latestRun?.status === 'completed';
  const isDisabled = !automation.isEnabled;
  const dotColor = isDisabled
    ? 'bg-muted-foreground/40'
    : hasFailed
      ? 'bg-destructive shadow-[0_0_8px_rgba(255,0,0,0.3)]'
      : isCompleted
        ? 'bg-primary shadow-[0_0_8px_rgba(0,77,64,0.4)]'
        : 'bg-muted-foreground';

  return (
    <div
      className={cn(
        'rounded-lg border transition-all duration-300',
        isDisabled && 'opacity-60',
        isExpanded
          ? 'border-primary/30 shadow-sm bg-primary/2'
          : 'border-border/50 hover:border-border hover:shadow-sm',
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', dotColor)} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground text-sm tracking-tight">
              {automation.name}
            </p>
            {isDisabled && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                Paused
              </span>
            )}
          </div>
          {latestRun ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Last ran {formatDistanceToNow(new Date(latestRun.createdAt), { addSuffix: true })}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">Never run</p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {!readOnly && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleEnabled(!automation.isEnabled)}
              aria-label={automation.isEnabled ? 'Pause automation' : 'Enable automation'}
            >
              {automation.isEnabled ? (
                <Power className="h-3.5 w-3.5 text-primary" />
              ) : (
                <PowerOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          )}

          {!readOnly && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
              aria-label="Edit automation"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}

          {!readOnly && (
            confirmDelete ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { onDelete(); setConfirmDelete(false); }}
                >
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete automation"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
            )
          )}

          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRun}
              disabled={isRunning || isDisabled}
            >
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
          )}

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



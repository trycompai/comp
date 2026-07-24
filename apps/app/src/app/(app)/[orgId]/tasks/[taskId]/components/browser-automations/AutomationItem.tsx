'use client';

import { VendorLogo } from '@/components/VendorLogo';
import { cn } from '@/lib/utils';
import { Button } from '@trycompai/design-system';
import { ChevronDown, Edit, Play, TrashCan } from '@trycompai/design-system/icons';
import { useState } from 'react';
import type { BrowserAutomation, BrowserAutomationRun } from '../../hooks/types';
import { AutomationMetaLine } from './AutomationMetaLine';
import { RunHistory } from './RunHistory';

interface AutomationItemProps {
  automation: BrowserAutomation;
  /** Ordered vendor hostnames the automation's steps run on (GH → AWS → OK). */
  vendorChain?: string[];
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
  vendorChain,
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
      {/* Mobile: the full-width actions bar wraps onto its own line below the
          content (flex-wrap + w-full). Desktop: everything sits on one row. */}
      <div className="flex flex-wrap items-start gap-3 px-4 py-3 sm:items-center">
        <div className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full sm:mt-0', dotColor)} />

        <div className="flex-1 min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            {/* Names/instructions can be long — keep the row one line; the full
                text is on hover (title). */}
            <p
              className="truncate font-semibold text-foreground text-sm tracking-tight"
              title={automation.name}
            >
              {automation.name}
            </p>
            {isDisabled && (
              <span className="flex-none text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                Paused
              </span>
            )}
          </div>
          {vendorChain && vendorChain.length > 0 && (
            <div className="mt-1 flex items-center gap-1">
              {vendorChain.map((host, index) => (
                <span key={`${host}-${index}`} className="flex items-center gap-1" title={host}>
                  {index > 0 && (
                    <span className="text-[10px] text-muted-foreground/50">→</span>
                  )}
                  <VendorLogo hostname={host} size={16} />
                </span>
              ))}
            </div>
          )}
          {/* One muted meta line, one fact per clause, tuned per state
              (never-run / ran-ok / failed / paused). Cadence is editable via
              the Run split's ▾ caret, so it is read-only here. */}
          <AutomationMetaLine
            scheduleFrequency={automation.scheduleFrequency}
            lastRunAt={automation.lastRunAt ?? null}
            latestRun={latestRun}
            isPaused={isDisabled}
          />
          {latestRun?.failureCode && (
            <p className="mt-1 text-xs text-destructive">
              {latestRun.blockedReason ||
                latestRun.error ||
                latestRun.failureCode.replaceAll('_', ' ')}
            </p>
          )}
        </div>

        <div className="flex w-full items-center gap-1.5 sm:w-auto sm:flex-none">
          {!readOnly && (
            // A real on/off switch so the paused state is visible at a glance
            // (teal = scheduled runs on, gray = paused).
            <button
              type="button"
              role="switch"
              aria-checked={automation.isEnabled}
              aria-label={automation.isEnabled ? 'Pause runs' : 'Resume runs'}
              title={automation.isEnabled ? 'Pause runs' : 'Resume runs'}
              onClick={() => onToggleEnabled(!automation.isEnabled)}
              className={cn(
                'relative inline-block h-[18px] w-8 flex-none cursor-pointer rounded-full border-0 p-0 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60',
                automation.isEnabled ? 'bg-primary' : 'bg-border',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-all',
                  automation.isEnabled ? 'right-0.5' : 'left-0.5',
                )}
              />
            </button>
          )}

          {!readOnly && (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onEdit}
              aria-label="Edit automation"
            >
              <Edit size={14} className="text-muted-foreground" />
            </Button>
          )}

          {!readOnly && (
            confirmDelete ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { onDelete(); setConfirmDelete(false); }}
                >
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete automation"
              >
                <TrashCan size={14} className="text-muted-foreground hover:text-destructive" />
              </Button>
            )
          )}

          {/* Run + the run-history toggle, pushed right on mobile. The schedule
              lives once in the section header (task-wide), so it's not here. */}
          <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
            {!readOnly && (
              <Button
                variant="default"
                size="sm"
                aria-busy={isRunning}
                disabled={isDisabled}
                onClick={() => {
                  if (!isRunning && !isDisabled) onRun();
                }}
                iconLeft={
                  isRunning ? (
                    // Same 14px footprint as the Play icon, so swapping to the
                    // spinner keeps the button's width fixed — no layout shift.
                    <span
                      aria-hidden
                      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                    />
                  ) : (
                    <Play size={14} />
                  )
                }
              >
                Run
              </Button>
            )}

            {runs.length > 0 && (
              <Button size="icon-sm" variant="ghost" onClick={onToggleExpand}>
                <ChevronDown
                  size={14}
                  className={cn(
                    'transition-transform duration-300',
                    isExpanded && 'rotate-180',
                  )}
                />
              </Button>
            )}
          </div>
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

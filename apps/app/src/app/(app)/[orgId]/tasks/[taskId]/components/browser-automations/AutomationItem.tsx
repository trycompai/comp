'use client';

import { VendorLogo } from '@/components/VendorLogo';
import { cn } from '@/lib/utils';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@trycompai/design-system';
import { Edit, OverflowMenuVertical, Play, TrashCan } from '@trycompai/design-system/icons';
import { useState } from 'react';
import type { BrowserAutomation, BrowserAutomationRun } from '../../hooks/types';
import { AutomationMetaLine } from './AutomationMetaLine';
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

/** Hostname (for the vendor logo) from a step's target URL. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
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
  const isDisabled = !automation.isEnabled;

  // One line per step (designer 2B): number + vendor + what it does. Legacy
  // single-step automations fall back to the inline target/instruction.
  const stepLines =
    automation.steps && automation.steps.length > 0
      ? automation.steps.map((step) => ({
          key: step.id,
          host: hostOf(step.targetUrl),
          instruction: step.instruction,
        }))
      : [
          {
            key: automation.id,
            host: hostOf(automation.targetUrl),
            instruction: automation.instruction,
          },
        ];

  // The whole row is the expand target (designer 1B/2B — no separate chevron);
  // the interactive controls stop propagation so they don't also toggle it.
  const canExpand = runs.length > 0 && !confirmDelete;
  const handleRowClick = () => {
    if (canExpand) onToggleExpand();
  };
  const handleRowKeyDown = (event: React.KeyboardEvent) => {
    if (!canExpand) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggleExpand();
    }
  };

  // In editable mode the switch (left) IS the state, so the health dot is
  // dropped to avoid showing state twice. Read-only rows keep the dot.
  const hasFailed = latestRun?.status === 'failed';
  const isCompleted = latestRun?.status === 'completed';
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
      {/* Mobile: the actions cluster wraps onto its own line (flex-wrap + w-full).
          Desktop: switch · content · actions on one row, the row click-expands. */}
      <div
        className={cn(
          'flex flex-wrap items-start gap-3 px-4 py-3 sm:flex-nowrap sm:items-center',
          canExpand && 'cursor-pointer hover:bg-muted/30',
        )}
        onClick={canExpand ? handleRowClick : undefined}
        role={canExpand ? 'button' : undefined}
        tabIndex={canExpand ? 0 : undefined}
        aria-expanded={canExpand ? isExpanded : undefined}
        // Explicit label so the row's nested controls aren't read as its name.
        aria-label={canExpand ? `${automation.name} — show run history` : undefined}
        onKeyDown={canExpand ? handleRowKeyDown : undefined}
      >
        {/* 1B: on/off switch on the left, beside the name it governs. */}
        {!readOnly && !confirmDelete && (
          <button
            type="button"
            role="switch"
            aria-checked={automation.isEnabled}
            aria-label={automation.isEnabled ? 'Pause runs' : 'Resume runs'}
            title={automation.isEnabled ? 'Pause runs' : 'Resume runs'}
            onClick={(event) => {
              event.stopPropagation();
              onToggleEnabled(!automation.isEnabled);
            }}
            className={cn(
              'relative mt-0.5 inline-block h-[18px] w-8 flex-none cursor-pointer rounded-full border-0 p-0 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 sm:mt-0',
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

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex min-w-0 items-center gap-2">
            {/* Read-only rows have no switch, so the dot carries the status. */}
            {readOnly && (
              <span className={cn('h-1.5 w-1.5 flex-none rounded-full', dotColor)} />
            )}
            <p
              className="truncate text-sm font-semibold tracking-tight text-foreground"
              title={automation.name}
            >
              {automation.name}
            </p>
            {isDisabled && (
              <span className="flex-none rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Paused
              </span>
            )}
            {/* Schedule meta rides inline on desktop; mobile drops it for space. */}
            <div className="hidden sm:contents">
              <AutomationMetaLine
                scheduleFrequency={automation.scheduleFrequency}
                lastRunAt={automation.lastRunAt ?? null}
                latestRun={latestRun}
                isPaused={isDisabled}
                inline
              />
            </div>
          </div>

          {/* 2B: one compact line per step — what happens, in order. */}
          <div className="flex flex-col gap-[3px] pl-[14px]">
            {stepLines.map((step, index) => (
              <div key={step.key} className="flex min-w-0 items-center gap-1.5">
                <span className="w-2 flex-none font-mono text-[9px] text-muted-foreground">
                  {index + 1}
                </span>
                <VendorLogo hostname={step.host} size={14} />
                <span
                  className="min-w-0 truncate text-[11px] text-muted-foreground"
                  title={step.instruction}
                >
                  {step.instruction}
                </span>
              </div>
            ))}
          </div>

          {latestRun?.failureCode && (
            <p className="text-xs text-destructive">
              {latestRun.blockedReason ||
                latestRun.error ||
                latestRun.failureCode.replaceAll('_', ' ')}
            </p>
          )}
        </div>

        {/* Actions never expand the row: they stop the click from bubbling up. */}
        {!readOnly && (
          <div
            className="flex w-full items-center gap-1.5 sm:w-auto sm:flex-none"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
            {confirmDelete ? (
              <>
                <span className="text-xs text-muted-foreground">Delete this automation?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onDelete();
                    setConfirmDelete(false);
                  }}
                >
                  Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
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
                      // spinner keeps the width fixed — no layout shift.
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
                <DropdownMenu>
                  <DropdownMenuTrigger variant="ellipsis" aria-label="More actions">
                    <OverflowMenuVertical />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit size={16} />
                      Edit steps
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                      <TrashCan size={16} />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        )}
      </div>

      <div
        className={cn(
          'grid transition-all duration-500 ease-in-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 border-t border-border/50 px-4 pb-4 pt-2">
            <RunHistory runs={runs} />
          </div>
        </div>
      </div>
    </div>
  );
}

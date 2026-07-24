'use client';

import { VendorLogo } from '@/components/VendorLogo';
import { formatMonthDayUtc, nextRunAfter } from '@/components/schedule-utils';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@trycompai/design-system';
import { Add, Calendar, ChevronDown, OverflowMenuVertical } from '@trycompai/design-system/icons';
import type { TaskFrequency } from '@db';
import type { BrowserAutomation } from '../../hooks/types';

/** Cadence options for the task-wide schedule control (matches TaskFrequency). */
const FREQUENCY_LABELS: Record<TaskFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};
const FREQUENCIES = Object.keys(FREQUENCY_LABELS) as TaskFrequency[];
const MAX_VENDOR_LOGOS = 4;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Distinct vendor hostnames across every automation's steps, in first-seen order. */
function distinctVendorHosts(automations: BrowserAutomation[]): string[] {
  const seen = new Set<string>();
  const hosts: string[] = [];
  for (const automation of automations) {
    const urls =
      automation.steps && automation.steps.length > 0
        ? automation.steps.map((step) => step.targetUrl)
        : [automation.targetUrl];
    for (const url of urls) {
      const host = hostOf(url);
      if (host && !seen.has(host)) {
        seen.add(host);
        hosts.push(host);
      }
    }
  }
  return hosts;
}

type HealthTone = 'ok' | 'attention' | 'muted';

/** Aggregate last-run health across the task's automations (their latest run). */
function aggregateHealth(automations: BrowserAutomation[]): { tone: HealthTone; label: string } {
  const withRuns = automations.filter((a) => a.runs && a.runs.length > 0);
  if (withRuns.length === 0) return { tone: 'muted', label: 'Not run yet' };
  const failing = withRuns.filter((a) => {
    const run = a.runs![0];
    return run.status === 'failed' || run.status === 'blocked' || run.evaluationStatus === 'fail';
  });
  if (failing.length > 0) return { tone: 'attention', label: `${failing.length} failing` };
  return { tone: 'ok', label: 'All passing' };
}

/** Task-wide next run: cadence applied to the most recent last-run, or null. */
function nextRunLabel(automations: BrowserAutomation[], cadence: TaskFrequency): string | null {
  const times = automations
    .map((a) => a.lastRunAt)
    .filter((t): t is string => Boolean(t))
    .map((t) => new Date(t).getTime())
    .filter((t) => Number.isFinite(t));
  if (times.length === 0) return null;
  return formatMonthDayUtc(nextRunAfter(cadence, new Date(Math.max(...times))));
}

const HEALTH_DOT: Record<HealthTone, string> = {
  ok: 'var(--success)',
  attention: 'var(--destructive)',
  muted: 'var(--muted-foreground)',
};

interface BrowserEvidenceHeaderProps {
  automations: BrowserAutomation[];
  currentCadence: TaskFrequency;
  canUpdate: boolean;
  canCreate: boolean;
  onSetTaskSchedule: (frequency: TaskFrequency) => void;
  onConnectAnother?: () => void;
  onCreate?: () => void;
}

/**
 * "Browser evidence" section header (designer option A): title + subtitle on the
 * left, a quiet status strip (health · vendors · next run) centered in the free
 * space so the header reads as a live surface, and the actions on the right. On
 * mobile the strip drops to its own line and the schedule + connect fold into a
 * ⋯ menu. Degrades cleanly: read-only keeps the strip and drops the actions.
 */
export function BrowserEvidenceHeader({
  automations,
  currentCadence,
  canUpdate,
  canCreate,
  onSetTaskSchedule,
  onConnectAnother,
  onCreate,
}: BrowserEvidenceHeaderProps) {
  const count = automations.length;
  const health = aggregateHealth(automations);
  const vendors = distinctVendorHosts(automations);
  const nextRun = nextRunLabel(automations, currentCadence);

  const showSchedule = canUpdate && count > 0;
  const showConnect = Boolean(onConnectAnother) && canCreate;
  const showCreate = Boolean(onCreate) && canCreate;
  const mobileHasOverflow = showSchedule || showConnect;

  const scheduleRadio = (
    <DropdownMenuRadioGroup
      value={currentCadence}
      onValueChange={(value) => {
        if (value) onSetTaskSchedule(value as TaskFrequency);
      }}
    >
      {FREQUENCIES.map((freq) => (
        <DropdownMenuRadioItem key={freq} value={freq}>
          {FREQUENCY_LABELS[freq]}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border px-5 py-4 lg:flex-nowrap">
      {/* Title — always first. */}
      <div className="order-1 min-w-0 lg:flex-none">
        <h3 className="text-base font-medium tracking-tight text-foreground">Browser evidence</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {count} {count === 1 ? 'automation' : 'automations'} · run in order, unattended.
        </p>
      </div>

      {/* Status strip — centered between title and actions on desktop; on its own
          line below on mobile (basis-full). Scrolls if it can't fit. */}
      {count > 0 && (
        <div className="order-3 flex basis-full items-center gap-2.5 overflow-x-auto whitespace-nowrap text-[11px] text-muted-foreground lg:order-2 lg:basis-auto lg:flex-1 lg:justify-center">
          <span className="inline-flex flex-none items-center gap-1.5">
            <span
              className="h-[7px] w-[7px] flex-none rounded-full"
              style={{ background: HEALTH_DOT[health.tone] }}
            />
            <span
              className={cn(
                health.tone === 'attention' && 'text-destructive',
                health.tone === 'ok' && 'text-foreground',
                health.tone === 'muted' && 'text-muted-foreground',
              )}
            >
              {health.label}
            </span>
          </span>

          {vendors.length > 0 && (
            <>
              <span className="h-3 w-px flex-none bg-border" />
              <span
                className="flex flex-none items-center"
                title={`${vendors.length} ${vendors.length === 1 ? 'vendor' : 'vendors'}: ${vendors.join(', ')}`}
              >
                {vendors.slice(0, MAX_VENDOR_LOGOS).map((host, index) => (
                  <span
                    key={host}
                    className={cn('inline-flex rounded-[5px] ring-2 ring-card', index > 0 && '-ml-1.5')}
                  >
                    <VendorLogo hostname={host} size={16} />
                  </span>
                ))}
                {vendors.length > MAX_VENDOR_LOGOS && (
                  <span className="ml-1.5 flex-none">+{vendors.length - MAX_VENDOR_LOGOS}</span>
                )}
              </span>
            </>
          )}

          {nextRun && (
            <>
              <span className="h-3 w-px flex-none bg-border" />
              <span className="flex-none font-mono">next {nextRun}</span>
            </>
          )}
        </div>
      )}

      {/* Actions — right of the title on mobile, far right on desktop. */}
      {(showSchedule || showConnect || showCreate) && (
        <div className="order-2 ml-auto flex items-center gap-2 lg:order-3 lg:ml-0 lg:flex-none">
          {/* Desktop: schedule + connect inline. */}
          <div className="hidden items-center gap-2 lg:flex">
            {showSchedule && (
              <DropdownMenu>
                {/* One schedule for all of this task's browser evidence. */}
                <DropdownMenuTrigger
                  aria-label="Change schedule for all browser evidence"
                  className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/40"
                >
                  <Calendar size={14} className="text-muted-foreground" />
                  {FREQUENCY_LABELS[currentCadence]}
                  <ChevronDown size={12} className="text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">{scheduleRadio}</DropdownMenuContent>
              </DropdownMenu>
            )}
            {showConnect && (
              <button
                onClick={onConnectAnother}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/40"
              >
                Connect another vendor
              </button>
            )}
          </div>

          {/* New evidence — primary, on every breakpoint. */}
          {showCreate && (
            <button
              onClick={onCreate}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Add size={14} />
              New evidence
            </button>
          )}

          {/* Mobile: schedule + connect fold into a ⋯ menu. */}
          {mobileHasOverflow && (
            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger variant="ellipsis" aria-label="More actions">
                  <OverflowMenuVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {showConnect && (
                    <DropdownMenuItem onClick={onConnectAnother}>
                      Connect another vendor
                    </DropdownMenuItem>
                  )}
                  {showSchedule && scheduleRadio}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

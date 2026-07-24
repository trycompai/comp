'use client';

import { usePermissions } from '@/hooks/use-permissions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@trycompai/design-system';
import { Add, Calendar, ChevronDown, Renew } from '@trycompai/design-system/icons';
import { TaskFrequency } from '@db';
import { useEffect, useMemo, useState } from 'react';
import type { BrowserAuthProfile, BrowserAutomation } from '../../hooks/types';
import { AutomationItem } from './AutomationItem';

const PAGE_SIZE = 8;

/** Cadence options for the task-wide schedule control (matches TaskFrequency). */
const FREQUENCY_LABELS: Record<TaskFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};
const FREQUENCIES = Object.keys(FREQUENCY_LABELS) as TaskFrequency[];

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

interface BrowserAutomationsListProps {
  automations: BrowserAutomation[];
  profiles: BrowserAuthProfile[];
  runningAutomationId: string | null;
  /** A just-finished manual run to auto-expand, so its results show at once. */
  autoExpand?: { id: string } | null;
  onRun: (automationId: string) => void;
  onReconnect: (url: string) => void;
  /** Create a new automation. Omitted for read-only tasks. */
  onCreate?: () => void;
  /** Connect a new vendor. Omitted for read-only tasks. */
  onConnectAnother?: () => void;
  onEditClick: (automation: BrowserAutomation) => void;
  onDelete: (automationId: string) => void;
  onToggleEnabled: (automationId: string, enabled: boolean) => void;
  /** Set one cadence for all browser evidence on this task (section header). */
  onSetTaskSchedule: (frequency: TaskFrequency) => void;
}

/**
 * Automation-centric list (design 4a). Each row is one automation — which can
 * span several vendors — showing its ordered vendor chain, schedule, last-run
 * verdict, and actions. Connection health/management lives on the Connections
 * page; here a row only flags when one of its connections needs reconnecting.
 */
export function BrowserAutomationsList({
  automations,
  profiles,
  runningAutomationId,
  autoExpand,
  onRun,
  onReconnect,
  onCreate,
  onConnectAnother,
  onEditClick,
  onDelete,
  onToggleEnabled,
  onSetTaskSchedule,
}: BrowserAutomationsListProps) {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('integration', 'create');
  const canUpdate = hasPermission('integration', 'update');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Auto-expand a just-finished manual run so its results (screenshots +
  // verdict) show without a second click. `autoExpand` is a fresh object per
  // completion, so re-running the same automation re-expands it too.
  useEffect(() => {
    if (autoExpand?.id) setExpandedId(autoExpand.id);
  }, [autoExpand]);
  // Browser evidence shares one cadence per task; the automations are kept in
  // sync, so any one of them reflects the task's current schedule.
  const currentCadence: TaskFrequency = automations[0]?.scheduleFrequency ?? 'daily';
  const [visible, setVisible] = useState(PAGE_SIZE);

  const profileById = useMemo(() => {
    const map = new Map<string, BrowserAuthProfile>();
    for (const profile of profiles) map.set(profile.id, profile);
    return map;
  }, [profiles]);
  const profileByHost = useMemo(() => {
    const map = new Map<string, BrowserAuthProfile>();
    for (const profile of profiles) map.set(profile.hostname, profile);
    return map;
  }, [profiles]);

  const rows = useMemo(() => {
    return automations.map((automation) => {
      const steps =
        automation.steps && automation.steps.length > 0
          ? automation.steps
          : [{ profileId: null, targetUrl: automation.targetUrl }];
      const conns = steps.map((step) =>
        step.profileId
          ? profileById.get(step.profileId)
          : profileByHost.get(hostnameFromUrl(step.targetUrl ?? '')),
      );
      const needing = conns.find(
        (conn) => conn && (conn.status === 'needs_reauth' || conn.status === 'blocked'),
      );
      return {
        automation,
        reconnectUrl: needing ? `https://${needing.hostname}` : undefined,
      };
    });
  }, [automations, profileById, profileByHost]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-medium tracking-tight text-foreground">
              Browser evidence
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {automations.length} {automations.length === 1 ? 'automation' : 'automations'} · run
              in order, unattended.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canUpdate && automations.length > 0 && (
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
                <DropdownMenuContent align="end">
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
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {onConnectAnother && canCreate && (
              <button
                onClick={onConnectAnother}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted/40"
              >
                Connect another vendor
              </button>
            )}
            {onCreate && canCreate && (
              <button
                onClick={onCreate}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
              >
                <Add size={14} />
                New evidence
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 p-4">
          {rows.slice(0, visible).map(({ automation, reconnectUrl }) => (
            <div key={automation.id} className="flex flex-col gap-1.5">
              <AutomationItem
                automation={automation}
                isRunning={runningAutomationId === automation.id}
                isExpanded={expandedId === automation.id}
                readOnly={!canUpdate}
                onToggleExpand={() =>
                  setExpandedId(expandedId === automation.id ? null : automation.id)
                }
                onRun={() => onRun(automation.id)}
                onEdit={() => onEditClick(automation)}
                onDelete={() => onDelete(automation.id)}
                onToggleEnabled={(enabled) => onToggleEnabled(automation.id, enabled)}
              />
              {reconnectUrl && canUpdate && (
                <div
                  className="flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-[11.5px]"
                  style={{
                    border: '1px solid color-mix(in oklab, var(--warning) 45%, transparent)',
                    background: 'color-mix(in oklab, var(--warning) 10%, transparent)',
                  }}
                >
                  <span className="text-foreground">
                    A connection this automation uses needs to be reconnected.
                  </span>
                  <button
                    onClick={() => onReconnect(reconnectUrl)}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground"
                  >
                    <Renew size={11} />
                    Reconnect
                  </button>
                </div>
              )}
            </div>
          ))}

          {rows.length > visible && (
            <button
              onClick={() => setVisible((current) => current + PAGE_SIZE)}
              className="mt-1 w-full rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
            >
              Load more ({rows.length - visible} more)
            </button>
          )}
        </div>
      </div>
  );
}

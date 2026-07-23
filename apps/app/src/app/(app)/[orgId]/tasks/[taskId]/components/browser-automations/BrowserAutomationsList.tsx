'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { Add, Renew } from '@trycompai/design-system/icons';
import type { TaskFrequency } from '@db';
import { useMemo, useState } from 'react';
import type { BrowserAuthProfile, BrowserAutomation } from '../../hooks/types';
import { AutomationItem } from './AutomationItem';
import { RunDetailOverlay } from './RunDetailOverlay';
import { RunHistoryStrip, type RunSummary } from './RunHistoryStrip';

const PAGE_SIZE = 8;

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
  onRun: (automationId: string) => void;
  onReconnect: (url: string) => void;
  /** Create a new automation. Omitted for read-only tasks. */
  onCreate?: () => void;
  /** Connect a new vendor. Omitted for read-only tasks. */
  onConnectAnother?: () => void;
  onEditClick: (automation: BrowserAutomation) => void;
  onDelete: (automationId: string) => void;
  onToggleEnabled: (automationId: string, enabled: boolean) => void;
  onChangeSchedule: (automationId: string, frequency: TaskFrequency) => void;
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
  onRun,
  onReconnect,
  onCreate,
  onConnectAnother,
  onEditClick,
  onDelete,
  onToggleEnabled,
  onChangeSchedule,
}: BrowserAutomationsListProps) {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('integration', 'create');
  const canUpdate = hasPermission('integration', 'update');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<RunSummary | null>(null);
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
      const chain = steps.map(
        (step, index) => conns[index]?.hostname ?? hostnameFromUrl(step.targetUrl ?? ''),
      );
      const needing = conns.find(
        (conn) => conn && (conn.status === 'needs_reauth' || conn.status === 'blocked'),
      );
      return {
        automation,
        chain,
        reconnectUrl: needing ? `https://${needing.hostname}` : undefined,
      };
    });
  }, [automations, profileById, profileByHost]);

  const allRuns: RunSummary[] = useMemo(
    () =>
      automations
        .flatMap((automation) =>
          (automation.runs ?? []).map((run) => ({
            run,
            automationId: automation.id,
            automationName: automation.name,
          })),
        )
        .sort(
          (a, b) => new Date(b.run.createdAt).getTime() - new Date(a.run.createdAt).getTime(),
        ),
    [automations],
  );

  return (
    <>
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
          {rows.slice(0, visible).map(({ automation, chain, reconnectUrl }) => (
            <div key={automation.id} className="flex flex-col gap-1.5">
              <AutomationItem
                automation={automation}
                vendorChain={chain}
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
                onChangeSchedule={(frequency) => onChangeSchedule(automation.id, frequency)}
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

          {allRuns.length > 0 && <RunHistoryStrip runs={allRuns} onSelect={setSelectedRun} />}
        </div>
      </div>

      <RunDetailOverlay
        selected={selectedRun}
        onClose={() => setSelectedRun(null)}
        onRerun={canUpdate ? onRun : undefined}
      />
    </>
  );
}

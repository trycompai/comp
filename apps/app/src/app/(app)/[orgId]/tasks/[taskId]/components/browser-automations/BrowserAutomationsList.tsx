'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { Add, Renew } from '@trycompai/design-system/icons';
import type { TaskFrequency } from '@db';
import { useMemo, useState } from 'react';
import type {
  BrowserAuthProfile,
  BrowserAuthProfileStatus,
  BrowserAutomation,
} from '../../hooks/types';
import { AutomationItem } from './AutomationItem';
import { ConnectionManageMenu } from './ConnectionManageMenu';
import { RunDetailOverlay } from './RunDetailOverlay';
import { RunHistoryStrip, type RunSummary } from './RunHistoryStrip';

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const STATUS_PILL: Record<BrowserAuthProfileStatus, { label: string; bg: string; fg: string }> = {
  verified: {
    label: 'Connected',
    bg: 'color-mix(in oklab, var(--success) 15%, transparent)',
    fg: 'oklch(0.45 0.14 145)',
  },
  needs_reauth: { label: 'Needs reconnect', bg: 'var(--muted)', fg: 'var(--foreground)' },
  blocked: {
    label: 'Needs your action',
    bg: 'color-mix(in oklab, var(--warning) 20%, transparent)',
    fg: 'oklch(0.5 0.14 85)',
  },
  unverified: { label: 'Not connected', bg: 'var(--muted)', fg: 'var(--muted-foreground)' },
};

interface ConnectionGroup {
  hostname: string;
  url: string;
  profile?: BrowserAuthProfile;
  automations: BrowserAutomation[];
}

interface BrowserAutomationsListProps {
  automations: BrowserAutomation[];
  profiles: BrowserAuthProfile[];
  runningAutomationId: string | null;
  onRun: (automationId: string) => void;
  onReconnect: (url: string) => void;
  onCreateClick?: () => void;
  onEditClick: (automation: BrowserAutomation) => void;
  onDelete: (automationId: string) => void;
  onToggleEnabled: (automationId: string, enabled: boolean) => void;
  onChangeSchedule: (automationId: string, frequency: TaskFrequency) => void;
  /** Called after a connection is edited or removed, to refresh the list. */
  onConnectionChanged?: () => void;
}

export function BrowserAutomationsList({
  automations,
  profiles,
  runningAutomationId,
  onRun,
  onReconnect,
  onCreateClick,
  onEditClick,
  onDelete,
  onToggleEnabled,
  onChangeSchedule,
  onConnectionChanged,
}: BrowserAutomationsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<RunSummary | null>(null);
  const { hasPermission } = usePermissions();
  const canCreateIntegration = hasPermission('integration', 'create');
  const canUpdateIntegration = hasPermission('integration', 'update');

  const groups = useMemo<ConnectionGroup[]>(() => {
    const byHost = new Map<string, ConnectionGroup>();
    for (const automation of automations) {
      const hostname = hostnameFromUrl(automation.targetUrl);
      const existing = byHost.get(hostname);
      if (existing) {
        existing.automations.push(automation);
      } else {
        byHost.set(hostname, {
          hostname,
          url: automation.targetUrl,
          profile: profiles.find((p) => p.hostname === hostname),
          automations: [automation],
        });
      }
    }
    return [...byHost.values()];
  }, [automations, profiles]);

  return (
    <>
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-medium tracking-tight text-foreground">
              Browser evidence
            </h3>
            <span
              className="inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
              style={{
                backgroundColor: 'color-mix(in oklab, var(--success) 15%, transparent)',
                color: 'var(--success)',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              Active
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Comp signs in to your vendors and captures screenshots as evidence — on a
            schedule, unattended.
          </p>
        </div>
        {onCreateClick && canCreateIntegration && (
          <button
            onClick={onCreateClick}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
          >
            <Add size={14} />
            Add instruction
          </button>
        )}
      </div>

      <div className="flex flex-col gap-5 p-5">
        {groups.map((group) => {
          const pill = STATUS_PILL[group.profile?.status ?? 'unverified'];
          const needsReconnect =
            group.profile?.status === 'needs_reauth' || group.profile?.status === 'blocked';
          const groupRuns: RunSummary[] = group.automations
            .flatMap((automation) =>
              (automation.runs ?? []).map((run) => ({
                run,
                automationId: automation.id,
                automationName: automation.name,
              })),
            )
            .sort(
              (a, b) =>
                new Date(b.run.createdAt).getTime() - new Date(a.run.createdAt).getTime(),
            );
          return (
            <div key={group.hostname} className="flex flex-col gap-4">
              {/* Connection */}
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Connection
                </div>
                <div className="flex items-center gap-3 rounded-md border border-border p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-muted text-[11px] font-bold uppercase text-foreground">
                    {group.hostname.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-foreground">
                      {group.profile?.displayName ?? group.hostname}
                    </div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground">
                      {group.hostname}
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                    style={{ backgroundColor: pill.bg, color: pill.fg }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: 'currentColor' }}
                    />
                    {pill.label}
                  </span>
                  {needsReconnect && canUpdateIntegration && (
                    <button
                      onClick={() => onReconnect(group.url)}
                      className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground"
                    >
                      <Renew size={11} />
                      {group.profile?.status === 'blocked' ? 'Sign in once' : 'Reconnect'}
                    </button>
                  )}
                  {group.profile && canUpdateIntegration && (
                    <ConnectionManageMenu
                      profile={group.profile}
                      onChanged={onConnectionChanged}
                    />
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Instructions
                </div>
                <div className="flex flex-col gap-2 rounded-md border border-border/60 p-2">
                  {group.automations.map((automation) => (
                    <AutomationItem
                      key={automation.id}
                      automation={automation}
                      isRunning={runningAutomationId === automation.id}
                      isExpanded={expandedId === automation.id}
                      readOnly={!canUpdateIntegration}
                      onToggleExpand={() =>
                        setExpandedId(expandedId === automation.id ? null : automation.id)
                      }
                      onRun={() => onRun(automation.id)}
                      onEdit={() => onEditClick(automation)}
                      onDelete={() => onDelete(automation.id)}
                      onToggleEnabled={(enabled) => onToggleEnabled(automation.id, enabled)}
                      onChangeSchedule={(frequency) => onChangeSchedule(automation.id, frequency)}
                    />
                  ))}
                </div>
              </div>

              {/* Run history */}
              {groupRuns.length > 0 && (
                <RunHistoryStrip runs={groupRuns} onSelect={setSelectedRun} />
              )}
            </div>
          );
        })}

        {onCreateClick && canCreateIntegration && (
          <button
            onClick={onCreateClick}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 py-2.5 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted/30 hover:text-foreground"
          >
            <Add size={14} />
            Add another instruction
          </button>
        )}
      </div>
    </div>

    <RunDetailOverlay
      selected={selectedRun}
      onClose={() => setSelectedRun(null)}
      onRerun={canUpdateIntegration ? onRun : undefined}
    />
    </>
  );
}

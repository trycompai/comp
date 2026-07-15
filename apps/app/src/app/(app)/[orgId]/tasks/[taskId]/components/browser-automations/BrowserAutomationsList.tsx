'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { Add, Renew } from '@trycompai/design-system/icons';
import { useMemo, useState } from 'react';
import type {
  BrowserAuthProfile,
  BrowserAuthProfileStatus,
  BrowserAutomation,
} from '../../hooks/types';
import { AutomationItem } from './AutomationItem';

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
}: BrowserAutomationsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Browser automations</h3>
          <p className="text-xs text-muted-foreground">Evidence captured from vendor sites</p>
        </div>
        {onCreateClick && canCreateIntegration && (
          <button
            onClick={onCreateClick}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
          >
            <Add size={14} />
            New automation
          </button>
        )}
      </div>

      <div className="flex flex-col gap-5 p-5">
        {groups.map((group) => {
          const pill = STATUS_PILL[group.profile?.status ?? 'unverified'];
          const needsReconnect =
            group.profile?.status === 'needs_reauth' || group.profile?.status === 'blocked';
          return (
            <div key={group.hostname} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-muted text-[10px] font-bold uppercase text-foreground">
                  {group.hostname.charAt(0)}
                </span>
                <span className="font-mono text-xs text-foreground">{group.hostname}</span>
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
                    className="ml-auto flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground"
                  >
                    <Renew size={11} />
                    {group.profile?.status === 'blocked' ? 'Sign in once' : 'Reconnect'}
                  </button>
                )}
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
                  />
                ))}
              </div>
            </div>
          );
        })}

        {onCreateClick && canCreateIntegration && (
          <button
            onClick={onCreateClick}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 py-2.5 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted/30 hover:text-foreground"
          >
            <Add size={14} />
            Create Another
          </button>
        )}
      </div>
    </div>
  );
}

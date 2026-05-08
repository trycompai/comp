'use client';

import type { ConnectionListItem, IntegrationProvider } from '@/hooks/use-integration-platform';
import { Button } from '@trycompai/design-system';
import { Add, Launch, Settings } from '@trycompai/design-system/icons';
import Image from 'next/image';
import { AccountSelector } from './AccountSelector';
import { getConnectionDisplayLabel } from './connection-display';

type HeroProps = {
  provider: IntegrationProvider;
  isConnected: boolean;
  activeConnections: ConnectionListItem[];
  selectedConnection: ConnectionListItem | null;
  onSelectConnection: (id: string) => void;
  onOpenSettings: () => void;
  onAddAccount: () => void;
};

export function IntegrationProviderHero({
  provider,
  isConnected,
  activeConnections,
  selectedConnection,
  onSelectConnection,
  onOpenSettings,
  onAddAccount,
}: HeroProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted/30 via-background to-muted/20 dark:from-muted/10 dark:via-background dark:to-muted/5">
      <div className="px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {provider.logoUrl ? (
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background sm:h-11 sm:w-11">
                <Image
                  src={provider.logoUrl}
                  alt={provider.name}
                  width={28}
                  height={28}
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  {provider.name}
                </h1>
                {isConnected ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-2 py-px text-[10px] font-medium text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300">
                    {activeConnections.length === 1
                      ? 'Connected'
                      : `${activeConnections.length} accounts`}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-px text-[10px] font-medium text-muted-foreground">
                    Not connected
                  </span>
                )}
              </div>
              <p className="line-clamp-2 max-w-2xl text-pretty text-xs leading-snug text-muted-foreground">
                {provider.description}
              </p>
            </div>
          </div>

          <div
            className="flex w-full min-w-0 flex-col items-stretch gap-1.5 border-t border-border/40 pt-2 sm:items-end lg:w-auto lg:border-t-0 lg:pt-0"
            role="toolbar"
            aria-label="Integration actions"
          >
            {provider.docsUrl || isConnected ? (
              <div className="flex w-full flex-wrap items-center justify-end gap-1.5">
                {!isConnected && provider.docsUrl ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    iconLeft={<Launch size={12} />}
                    onClick={() => {
                      window.open(provider.docsUrl!, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    Docs
                  </Button>
                ) : null}
                {isConnected ? (
                  <div className="flex w-full min-w-0 flex-col items-end gap-1.5">
                    {/* Row 1: Docs + Settings */}
                    <div className="inline-flex min-w-0 rounded-md border border-border">
                      <div className="flex flex-nowrap items-stretch divide-x divide-border">
                        {provider.docsUrl ? (
                          <div className="flex shrink-0 items-center p-0.5">
                            <Button
                              variant="ghost"
                              size="xs"
                              iconLeft={<Launch size={12} />}
                              onClick={() => {
                                window.open(provider.docsUrl!, '_blank', 'noopener,noreferrer');
                              }}
                            >
                              Docs
                            </Button>
                          </div>
                        ) : null}
                        <div className="flex shrink-0 items-center p-0.5">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={onOpenSettings}
                            iconLeft={<Settings size={12} />}
                          >
                            Settings
                          </Button>
                        </div>
                      </div>
                    </div>
                    {/* Row 2: account + Add */}
                    <div className="flex w-full max-w-full min-w-0 justify-end sm:max-w-sm">
                      <div className="inline-flex w-full min-w-0 rounded-md border border-border sm:w-auto">
                        <div className="flex min-w-0 flex-nowrap items-stretch divide-x divide-border">
                          {activeConnections.length === 1 && selectedConnection ? (
                            <div className="flex min-w-0 items-center px-2.5 py-1">
                              <span className="flex items-center gap-1.5 truncate text-[11px] tabular-nums text-foreground">
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                {getConnectionDisplayLabel(selectedConnection)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex min-w-0 flex-1 items-center px-1 py-0.5 sm:min-w-[9.5rem] sm:max-w-[13rem]">
                              <AccountSelector
                                compact
                                embedded
                                connections={activeConnections}
                                selectedId={selectedConnection?.id ?? ''}
                                onSelect={onSelectConnection}
                              />
                            </div>
                          )}
                          <div className="flex shrink-0 items-center p-0.5">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={onAddAccount}
                              iconLeft={<Add size={12} />}
                              aria-label="Add another account"
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  Separator,
  Skeleton,
} from '@trycompai/design-system';
import { InProgress, Renew } from '@trycompai/design-system/icons';
import { usePermissions } from '@/hooks/use-permissions';
import { formatTimeAgo } from '../lib/device-source';
import { useDeviceSync } from '../hooks/useDeviceSync';

const NO_SYNC_VALUE = '__no_sync__';

/**
 * Picks which connected integration supplies device inventory for this org —
 * the device-sync counterpart of the People tab's sync source selects
 * (TwoFactorSourceSelector / people sync). Always visible for users with
 * integration:update: shows a "Connect an integration" slot when the org has
 * no device-sync-capable connection, and lists broken (errored) connections
 * as disabled options marked "Reconnect".
 */
export function DeviceSyncProviderSelector() {
  const { orgId } = useParams<{ orgId: string }>();
  const { hasPermission } = usePermissions();
  // Selecting a provider and triggering syncs are integration:update actions.
  // Gate the hook itself so users without the permission never hit any
  // device-sync API, and hide the controls below.
  const canManageDeviceSync = hasPermission('integration', 'update');
  const {
    selectedProvider,
    isSyncing,
    isLoading,
    availableProviders,
    syncDevices,
    setSyncProvider,
  } = useDeviceSync({ organizationId: orgId, enabled: canManageDeviceSync });

  if (!canManageDeviceSync) {
    return null;
  }

  if (isLoading) {
    return <Skeleton style={{ height: 48, width: '100%' }} />;
  }

  const connectedProviders = availableProviders.filter((p) => p.connected);
  // Broken connections (e.g. expired OAuth) — shown as disabled options so the
  // user knows device sync exists and a reconnect brings it back.
  const erroredProviders = availableProviders.filter(
    (p) => !p.connected && p.connectionStatus === 'error',
  );
  const selected = connectedProviders.find((p) => p.slug === selectedProvider);
  // The saved sync source's own connection is broken — the daily sync is
  // failing, which the closed trigger must surface even when other providers
  // are still connected.
  const selectedIsErrored = erroredProviders.some(
    (p) => p.slug === selectedProvider,
  );

  // Empty slot instead of nothing: the labeled placeholder shows exactly what
  // this setting is and how to unlock it (mirrors TwoFactorSourceSelector).
  // Right-aligned like the populated control so the slot doesn't jump sides.
  if (connectedProviders.length === 0 && erroredProviders.length === 0) {
    return (
      <div className="flex justify-end">
        <div className="flex w-full max-w-[280px] flex-col gap-1">
          <span className="text-xs text-muted-foreground">Device sync</span>
          <Link
            href={`/${orgId}/integrations`}
            className="border-border text-muted-foreground hover:bg-muted flex h-8 items-center justify-between rounded-md border border-dashed px-3 text-sm transition-colors"
          >
            Connect an integration
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    );
  }

  const handleValueChange = (value: string | null) => {
    if (!value) return;
    if (value === NO_SYNC_VALUE) {
      void setSyncProvider(null);
      return;
    }
    void syncDevices(value);
  };

  const handleSyncNow = async () => {
    if (!selected) return;
    await syncDevices(selected.slug);
  };

  return (
    // Right-aligned inline row: "Synced Xh ago · [provider select] · [↻]".
    // The provider name + refresh affordance say what this is; the last-synced
    // text gives the freshness at a glance without opening the dropdown.
    <div className="flex flex-wrap items-center justify-end gap-2">
      {selected?.lastSyncAt && (
        <span className="text-xs text-muted-foreground">
          Synced {formatTimeAgo(selected.lastSyncAt)}
        </span>
      )}
      <div className="w-full max-w-[240px]">
        {/* Uncontrolled on purpose — mirrors the (working) people-sync select. */}
        <Select onValueChange={handleValueChange} disabled={isSyncing}>
          <SelectTrigger aria-label="Sync devices from">
            {isSyncing ? (
              <div className="flex items-center gap-2">
                <InProgress size={16} className="animate-spin" />
                Syncing...
              </div>
            ) : selected ? (
              <div className="flex items-center gap-2">
                {selected.logoUrl && (
                  <Image
                    src={selected.logoUrl}
                    alt=""
                    width={16}
                    height={16}
                    className="rounded-sm"
                    unoptimized
                  />
                )}
                <span className="truncate">{selected.name}</span>
              </div>
            ) : selectedIsErrored ||
              (connectedProviders.length === 0 && erroredProviders.length > 0) ? (
              // The saved provider's connection is broken, or the only
              // connection(s) are — say so on the closed trigger instead of
              // the misleading "Not syncing".
              <span className="text-amber-600 dark:text-amber-500">
                Needs reconnection
              </span>
            ) : (
              <span className="text-muted-foreground">Not syncing</span>
            )}
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 py-1.5 text-xs text-muted-foreground space-y-1">
              {selected ? (
                <>
                  <div>Auto-syncs daily</div>
                  {selected.lastSyncAt && (
                    <div className="text-muted-foreground/80">
                      Last sync: {new Date(selected.lastSyncAt).toLocaleString()}
                    </div>
                  )}
                  {selected.nextSyncAt && (
                    <div className="text-muted-foreground/80">
                      Next sync: {new Date(selected.nextSyncAt).toLocaleString()}
                    </div>
                  )}
                </>
              ) : (
                'Select a provider to import devices'
              )}
            </div>
            <Separator />
            {connectedProviders.map((p) => (
              <SelectItem key={p.slug} value={p.slug}>
                <div className="flex items-center gap-2">
                  {p.logoUrl && (
                    <Image
                      src={p.logoUrl}
                      alt=""
                      width={16}
                      height={16}
                      className="rounded-sm"
                      unoptimized
                    />
                  )}
                  {p.name}
                  {selectedProvider === p.slug && (
                    <span className="ml-auto text-xs text-muted-foreground">Active</span>
                  )}
                </div>
              </SelectItem>
            ))}
            {erroredProviders.map((p) => (
              <SelectItem key={p.slug} value={p.slug} disabled>
                <div className="flex items-center gap-2">
                  {p.logoUrl && (
                    <Image
                      src={p.logoUrl}
                      alt=""
                      width={16}
                      height={16}
                      className="rounded-sm"
                      unoptimized
                    />
                  )}
                  {p.name}
                  <span className="ml-auto text-xs text-amber-600 dark:text-amber-500">
                    Reconnect
                  </span>
                </div>
              </SelectItem>
            ))}
            <Separator />
            <SelectItem value={NO_SYNC_VALUE}>
              <div className="flex items-center gap-2">
                <span>Don&apos;t auto-sync</span>
                {/* Keyed on the saved slug, not the resolved connected
                    provider: a saved provider whose connection broke is still
                    the user's choice — auto-sync was never disabled. */}
                {!selectedProvider && (
                  <span className="ml-auto text-xs text-muted-foreground">Active</span>
                )}
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selected && (
        // Icon-only re-sync in the brand primary: the select already says
        // what's syncing — aria-label + title keep it accessible.
        <Button
          size="icon-lg"
          onClick={handleSyncNow}
          disabled={isSyncing}
          loading={isSyncing}
          aria-label="Sync now"
          title="Sync now"
        >
          {!isSyncing && <Renew />}
        </Button>
      )}
    </div>
  );
}

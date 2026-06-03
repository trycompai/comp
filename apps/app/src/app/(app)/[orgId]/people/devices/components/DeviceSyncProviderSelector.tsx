'use client';

import { useParams } from 'next/navigation';
import { Button, Skeleton } from '@trycompai/design-system';
import { Renew } from '@trycompai/design-system/icons';
import { usePermissions } from '@/hooks/use-permissions';
import { useDeviceSync } from '../hooks/useDeviceSync';

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
    getProviderName,
    getProviderLogo,
    hasAnyConnection,
  } = useDeviceSync({ organizationId: orgId, enabled: canManageDeviceSync });

  if (!canManageDeviceSync) {
    return null;
  }

  if (isLoading) {
    return <Skeleton style={{ height: 48, width: '100%' }} />;
  }

  if (!hasAnyConnection) {
    return null;
  }

  const connectedProviders = availableProviders.filter((p) => p.connected);

  const handleSync = async () => {
    if (!selectedProvider) return;
    await syncDevices(selectedProvider);
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    void setSyncProvider(e.target.value || null);
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        {selectedProvider ? (
          <>
            <img
              src={getProviderLogo(selectedProvider)}
              alt=""
              className="h-6 w-6 rounded"
            />
            <div>
              <div className="text-sm font-medium">
                {getProviderName(selectedProvider)}
              </div>
              {(() => {
                const info = availableProviders.find(
                  (p) => p.slug === selectedProvider,
                );
                if (!info?.lastSyncAt) return null;
                const lastSync = new Date(info.lastSyncAt);
                return (
                  <div className="text-xs text-muted-foreground">
                    Last synced{' '}
                    {lastSync.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                );
              })()}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            Select an integration to sync devices
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {connectedProviders.length > 1 ||
        !connectedProviders.some((p) => p.slug === selectedProvider) ? (
          <select
            value={selectedProvider ?? ''}
            onChange={handleProviderChange}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="">Select provider...</option>
            {connectedProviders.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        ) : null}

        {selectedProvider && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            loading={isSyncing}
            iconLeft={!isSyncing ? <Renew /> : undefined}
          >
            {isSyncing ? 'Syncing...' : 'Sync now'}
          </Button>
        )}
      </div>
    </div>
  );
}

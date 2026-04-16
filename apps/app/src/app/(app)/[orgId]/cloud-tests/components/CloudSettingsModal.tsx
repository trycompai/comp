'use client';

import { useApi } from '@/hooks/use-api';
import { useIntegrationMutations } from '@/hooks/use-integration-platform';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import {
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  cn,
} from '@trycompai/design-system';
import { TrashCan } from '@trycompai/design-system/icons';
import { useState } from 'react';
import { toast } from 'sonner';

interface CloudProvider {
  id: string;
  connectionId: string;
  name: string;
  status: string;
  accountId?: string;
  regions?: string[];
  isLegacy?: boolean;
}

interface CloudSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectedProviders: CloudProvider[];
  onUpdate: () => void;
}

const getStatusColorClass = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'text-green-600 dark:text-green-400';
    case 'error':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-muted-foreground';
  }
};

export function CloudSettingsModal({
  open,
  onOpenChange,
  connectedProviders,
  onUpdate,
}: CloudSettingsModalProps) {
  const api = useApi();
  const { hasPermission } = usePermissions();
  const canDelete = hasPermission('integration', 'delete');
  const [activeProvider, setActiveProvider] = useState<string>(connectedProviders[0]?.connectionId || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteConnection } = useIntegrationMutations();

  const currentProvider = connectedProviders.find((p) => p.connectionId === activeProvider) ?? connectedProviders[0];

  const handleDisconnect = async (provider: CloudProvider) => {
    if (!confirm('Are you sure? All scan results will be deleted.')) return;

    try {
      setIsDeleting(true);
      if (provider.isLegacy) {
        const response = await api.delete(`/v1/cloud-security/legacy/${provider.connectionId}`);
        if (!response.error) {
          toast.success('Cloud provider disconnected');
          onUpdate();
          onOpenChange(false);
        } else {
          toast.error('Failed to disconnect');
        }
        return;
      }
      const result = await deleteConnection(provider.connectionId);
      if (result.success) {
        toast.success('Cloud provider disconnected');
        onUpdate();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to disconnect');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  if (connectedProviders.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Connection Settings</DialogTitle>
          <DialogDescription>
            Manage your cloud provider connections.
          </DialogDescription>
        </DialogHeader>

        {/* Provider selector (if multiple) */}
        {connectedProviders.length > 1 && (
          <Tabs value={activeProvider} onValueChange={setActiveProvider}>
            <TabsList variant="default">
              {connectedProviders.map((p) => (
                <TabsTrigger key={p.connectionId} value={p.connectionId}>
                  {p.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {currentProvider && (
          <ConnectionTab
            provider={currentProvider}
            canDelete={canDelete}
            isDeleting={isDeleting}
            onDisconnect={handleDisconnect}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Connection Tab ─────────────────────────────────────────────────────

function ConnectionTab({
  provider,
  canDelete,
  isDeleting,
  onDisconnect,
}: {
  provider: CloudProvider;
  canDelete: boolean;
  isDeleting: boolean;
  onDisconnect: (p: CloudProvider) => void;
}) {
  return (
    <div className="space-y-4 pt-3">
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status</span>
          <span className={cn('text-sm capitalize font-medium', getStatusColorClass(provider.status))}>
            {provider.status}
          </span>
        </div>
        {provider.accountId && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Account</span>
            <span className="text-sm font-mono">{provider.accountId}</span>
          </div>
        )}
        {provider.regions && provider.regions.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Regions</span>
            <span className="text-sm">{provider.regions.length} region{provider.regions.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {provider.id === 'aws'
          ? 'To update credentials, disconnect and reconnect with new IAM role settings.'
          : provider.id === 'gcp'
            ? 'To update credentials, disconnect and reconnect with your Google account.'
            : 'To update credentials, disconnect and reconnect with your Microsoft account.'}
      </p>

      {canDelete && (
        <Button
          variant="destructive"
          onClick={() => onDisconnect(provider)}
          disabled={isDeleting}
          loading={isDeleting}
          iconLeft={!isDeleting ? <TrashCan size={16} /> : undefined}
        >
          {isDeleting ? 'Disconnecting...' : 'Disconnect'}
        </Button>
      )}
    </div>
  );
}

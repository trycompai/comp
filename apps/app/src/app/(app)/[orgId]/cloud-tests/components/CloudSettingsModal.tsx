'use client';

import { useApi } from '@/hooks/use-api';
import { useIntegrationMutations } from '@/hooks/use-integration-platform';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import { Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface CloudProvider {
  id: string; // Provider slug (aws, gcp, azure)
  connectionId: string; // The actual connection ID
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

/**
 * Get the appropriate text color class based on connection status
 */
const getStatusColorClass = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'text-green-600 dark:text-green-400';
    case 'error':
      return 'text-red-600 dark:text-red-400';
    case 'pending':
      return 'text-amber-600 dark:text-amber-400';
    case 'paused':
    case 'disconnected':
      return 'text-muted-foreground';
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
  const [activeTab, setActiveTab] = useState<string>(connectedProviders[0]?.connectionId || 'aws');
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteConnection } = useIntegrationMutations();

  const handleDisconnect = async (provider: CloudProvider) => {
    if (
      !confirm(
        'Are you sure you want to disconnect this cloud provider? All scan results will be deleted.',
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);

      if (provider.isLegacy) {
        // Legacy providers use the old Integration table
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

      // New platform providers use the IntegrationConnection table
      const result = await deleteConnection(provider.connectionId);
      if (result.success) {
        toast.success('Cloud provider disconnected');
        onUpdate();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  if (connectedProviders.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Cloud Connections</DialogTitle>
          <DialogDescription>
            Manage your cloud provider connections. To update credentials, disconnect and reconnect.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList
            className="grid w-full"
            style={{ gridTemplateColumns: `repeat(${connectedProviders.length}, 1fr)` }}
          >
            {connectedProviders.map((provider) => (
              <TabsTrigger key={provider.connectionId} value={provider.connectionId}>
                {provider.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {connectedProviders.map((provider) => (
            <TabsContent
              key={provider.connectionId}
              value={provider.connectionId}
              className="space-y-4"
            >
              <div className="bg-muted/50 rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">
                  {provider.name} is connected. Credentials are securely stored and encrypted at
                  rest.
                </p>
                {(provider.accountId || provider.regions?.length) && (
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    {provider.accountId && <p>Account: {provider.accountId}</p>}
                    {provider.regions?.length && <p>Regions: {provider.regions.join(', ')}</p>}
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Connection Status</span>
                  <span className={cn('text-sm capitalize', getStatusColorClass(provider.status))}>
                    {provider.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  To update credentials, disconnect this provider and reconnect with new IAM role
                  settings.
                </p>
              </div>

              <DialogFooter className="flex justify-end">
                {canDelete && (
                <Button
                  variant="destructive"
                  onClick={() => handleDisconnect(provider)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Disconnect
                    </>
                  )}
                </Button>
                )}
              </DialogFooter>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

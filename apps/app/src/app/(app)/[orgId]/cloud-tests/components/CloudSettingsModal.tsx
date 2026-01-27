'use client';

import { useIntegrationMutations } from '@/hooks/use-integration-platform';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import { Loader2, RotateCw, Trash2, Unplug } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface CloudProvider {
  id: string; // Provider slug (aws, gcp, azure)
  connectionId: string; // The actual connection ID
  name: string;
  status: string;
}

interface CloudSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectedProviders: CloudProvider[];
  onUpdate: () => void;
}

export function CloudSettingsModal({
  open,
  onOpenChange,
  connectedProviders,
  onUpdate,
}: CloudSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<string>(connectedProviders[0]?.id || 'aws');
  const [disconnecting, setDisconnecting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { disconnectConnection, deleteConnection } = useIntegrationMutations();

  const handleDisconnect = async (provider: CloudProvider) => {
    if (
      !confirm(
        'Are you sure you want to disconnect this cloud provider? All scan results will be deleted.',
      )
    ) {
      return;
    }

    try {
      setDisconnecting(true);
      const result = await disconnectConnection(provider.connectionId);

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
      setDisconnecting(false);
    }
  };

  const handleDelete = async (provider: CloudProvider) => {
    if (
      !confirm(
        'Are you sure you want to delete this cloud provider? All scan results will be deleted.',
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const result = await deleteConnection(provider.connectionId);
      if (result.success) {
        toast.success('Integration removed');
        onUpdate();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to remove');
      }
    } catch {
      toast.error('Failed to remove');
    } finally {
      setDeleting(false);
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
              <TabsTrigger key={provider.id} value={provider.id}>
                {provider.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {connectedProviders.map((provider) => (
            <TabsContent key={provider.id} value={provider.id} className="space-y-4">
              <div className="bg-muted/50 rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">
                  {provider.name} is connected. Credentials are securely stored using IAM Role assumption.
                </p>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Connection Status</span>
                  <span className="text-sm capitalize text-green-600 dark:text-green-400">{provider.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  To update credentials, disconnect this provider and reconnect with new IAM role settings.
                </p>
              </div>

              <DialogFooter className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleDisconnect(provider)}
                  disabled={disconnecting}
                >
                  {disconnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <Unplug className="mr-2 h-4 w-4" />
                      Disconnect
                    </>
                  )}
                </Button>
                <Button>
                  <RotateCw className="mr-2 h-4 w-4" />
                  Reconnect
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(provider)}
                  disabled={disconnecting || deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </>
                  )}
                </Button>
              </DialogFooter>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useApi } from '@/hooks/use-api';
import {
  useIntegrationConnection,
  useIntegrationMutations,
} from '@/hooks/use-integration-platform';
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
import { ScanModeSwitchDialog } from './ScanModeSwitchDialog';
import type { AwsScanModeChoice } from '../../integrations/[slug]/components/AwsScanModeStep';

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

      {/* AWS-only — scan engine switcher. Lets the customer change between
          Comp AI scanners and Security Hub on an existing connection.
          Surfaces the current mode + a "Change" button that opens
          ScanModeSwitchDialog with the right confirmation copy. */}
      {provider.id === 'aws' && !provider.isLegacy && (
        <AwsScanModeSection connectionId={provider.connectionId} canEdit={canDelete} />
      )}

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

// ─── AWS Scan Mode Section ──────────────────────────────────────────────

const SCAN_MODE_LABEL: Record<AwsScanModeChoice, string> = {
  comp_scanners: 'Comp AI Scanners',
  security_hub: 'AWS Security Hub',
};

/**
 * Renders the current scan engine for an AWS connection and a "Change"
 * button that opens the switch dialog. Reads the connection's
 * `variables.awsScanMode` to determine the current mode, falling back
 * to 'comp_scanners' when the field is missing (pre-feature connections).
 */
function AwsScanModeSection({
  connectionId,
  canEdit,
}: {
  connectionId: string;
  canEdit: boolean;
}) {
  const { connection, isLoading, refresh } = useIntegrationConnection(connectionId);
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);

  if (isLoading || !connection) {
    return null;
  }

  // awsScanMode lives in metadata (non-secret, frontend-readable),
  // mirroring how `awsType`, `roleArn`, `regions` are surfaced. Missing
  // field = today's default = comp_scanners.
  const metadata = (connection.metadata ?? {}) as Record<string, unknown>;
  const currentMode: AwsScanModeChoice =
    metadata.awsScanMode === 'security_hub' ? 'security_hub' : 'comp_scanners';
  const targetMode: AwsScanModeChoice =
    currentMode === 'comp_scanners' ? 'security_hub' : 'comp_scanners';

  return (
    <>
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Scan engine</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {SCAN_MODE_LABEL[currentMode]}
            </p>
          </div>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSwitchDialogOpen(true)}
            >
              Switch to {SCAN_MODE_LABEL[targetMode]}
            </Button>
          )}
        </div>
      </div>
      <ScanModeSwitchDialog
        open={switchDialogOpen}
        onOpenChange={setSwitchDialogOpen}
        connectionId={connectionId}
        currentMode={currentMode}
        targetMode={targetMode}
        onSwitched={() => {
          refresh();
        }}
      />
    </>
  );
}

'use client';

import type { IntegrationProvider } from '@/hooks/use-integration-platform';
import {
  useIntegrationConnection,
  useIntegrationMutations,
} from '@/hooks/use-integration-platform';
import { Button } from '@trycompai/design-system';
import { Badge } from '@trycompai/ui/badge';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AccountSettingsInfoRow } from './account-settings-shared-ui';
import {
  OAuthConnectionVariablesForm,
  type OAuthVariableRow,
} from './oauth-connection-variables-form';

interface VariablesResponse {
  connectionId: string;
  providerSlug: string;
  variables: OAuthVariableRow[];
}

type AccountSettingsOAuthProps = {
  open: boolean;
  connectionId: string;
  provider: IntegrationProvider;
  onUpdated?: () => void;
  onOpenChange: (open: boolean) => void;
};

export function AccountSettingsOAuthBody({
  open,
  connectionId,
  provider,
  onUpdated,
  onOpenChange,
}: AccountSettingsOAuthProps) {
  const { connection, isLoading } = useIntegrationConnection(
    open ? connectionId : null,
  );
  const {
    getConnectionVariables,
    saveConnectionVariables,
    getVariableOptions,
    deleteConnection,
  } = useIntegrationMutations();

  const [variables, setVariables] = useState<OAuthVariableRow[]>([]);
  const [variableValues, setVariableValues] = useState<
    Record<string, string | number | boolean | string[]>
  >({});
  const [loadingVariables, setLoadingVariables] = useState(false);
  const [savingVariables, setSavingVariables] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [dynamicOptions, setDynamicOptions] = useState<
    Record<string, { value: string; label: string }[]>
  >({});
  const [loadingOptions, setLoadingOptions] = useState<Record<string, boolean>>({});

  const loadVariables = useCallback(async () => {
    setLoadingVariables(true);
    try {
      const result = await getConnectionVariables<VariablesResponse>(connectionId);
      if (result.data?.variables) {
        setVariables(result.data.variables);
        const next: Record<string, string | number | boolean | string[]> = {};
        for (const v of result.data.variables) {
          if (v.currentValue !== undefined) {
            next[v.id] = v.currentValue as string | number | boolean | string[];
          }
        }
        setVariableValues(next);
      }
      if (result.error) toast.error('Failed to load settings');
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoadingVariables(false);
    }
  }, [connectionId, getConnectionVariables]);

  useEffect(() => {
    if (!open) return;
    void loadVariables();
  }, [open, loadVariables]);

  const fetchOptions = useCallback(
    async (variableId: string) => {
      setLoadingOptions((p) => ({ ...p, [variableId]: true }));
      try {
        const result = await getVariableOptions(connectionId, variableId);
        if (result.options) {
          setDynamicOptions((p) => ({ ...p, [variableId]: result.options! }));
        }
      } finally {
        setLoadingOptions((p) => ({ ...p, [variableId]: false }));
      }
    },
    [connectionId, getVariableOptions],
  );

  const handleSaveVariables = useCallback(async () => {
    setSavingVariables(true);
    try {
      const result = await saveConnectionVariables(connectionId, variableValues);
      if (!result.success) {
        toast.error(result.error || 'Failed to save');
        return;
      }
      toast.success('Settings saved');
      onUpdated?.();
      await loadVariables();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingVariables(false);
    }
  }, [connectionId, saveConnectionVariables, variableValues, onUpdated, loadVariables]);

  const handleDisconnect = useCallback(async () => {
    if (!confirm('Are you sure? All associated data will be removed.')) return;
    setDisconnecting(true);
    try {
      const result = await deleteConnection(connectionId);
      if (result.success) {
        toast.success('Disconnected');
        onOpenChange(false);
        onUpdated?.();
      } else toast.error(result.error || 'Failed');
    } catch {
      toast.error('Failed');
    } finally {
      setDisconnecting(false);
    }
  }, [connectionId, deleteConnection, onOpenChange, onUpdated]);

  if (!open) {
    return null;
  }

  if (isLoading || loadingVariables) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 py-5">
      <div className="rounded-md border bg-muted/20 px-3 py-2.5 space-y-1">
        <AccountSettingsInfoRow
          label="Integration"
          value={provider.name}
          valueTruncate
        />
        <AccountSettingsInfoRow
          label="Status"
          badge={
            connection?.status === 'active' ? (
              <Badge
                variant="outline"
                className="gap-1 text-[9px] px-1.5 py-0 border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                {connection?.status}
              </Badge>
            )
          }
        />
        {connection?.createdAt && (
          <AccountSettingsInfoRow
            label="Created"
            value={new Date(connection.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
            valueTruncate
          />
        )}
      </div>

      <OAuthConnectionVariablesForm
        variables={variables}
        variableValues={variableValues}
        setVariableValues={setVariableValues}
        dynamicOptions={dynamicOptions}
        loadingOptions={loadingOptions}
        fetchOptions={fetchOptions}
        onSave={handleSaveVariables}
        savingVariables={savingVariables}
      />

      <div className="rounded-md border border-destructive/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium">Disconnect</p>
              <p className="text-[10px] text-muted-foreground">
                Remove this account and all data
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={() => void handleDisconnect()}
            loading={disconnecting}
            disabled={disconnecting}
            size="sm"
          >
            Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
}

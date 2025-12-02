'use client';

import {
  useIntegrationConnections,
  useIntegrationMutations,
} from '@/hooks/use-integration-platform';
import { api } from '@/lib/api-client';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import MultipleSelector from '@comp/ui/multiple-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Loader2, Trash2, Unplug } from 'lucide-react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface CheckVariable {
  id: string;
  label: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multi-select';
  required: boolean;
  default?: string | number | boolean | string[];
  options?: { value: string; label: string }[];
  hasDynamicOptions?: boolean;
}

interface VariableWithValue extends CheckVariable {
  currentValue?: string | number | boolean | string[];
}

interface VariablesResponse {
  connectionId: string;
  providerSlug: string;
  variables: VariableWithValue[];
}

interface ManageIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  integrationId: string;
  integrationName: string;
  integrationLogoUrl: string;
  /** If true, shows only configuration without disconnect/delete options */
  configureOnly?: boolean;
  onDisconnected?: () => void;
  onDeleted?: () => void;
  onSaved?: () => void;
}

export function ManageIntegrationDialog({
  open,
  onOpenChange,
  connectionId,
  integrationId,
  integrationName,
  integrationLogoUrl,
  configureOnly = false,
  onDisconnected,
  onDeleted,
  onSaved,
}: ManageIntegrationDialogProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const { disconnectConnection, deleteConnection } = useIntegrationMutations();
  const { refresh: refreshConnections } = useIntegrationConnections();

  // Variables state
  const [variables, setVariables] = useState<CheckVariable[]>([]);
  const [variableValues, setVariableValues] = useState<
    Record<string, string | number | boolean | string[]>
  >({});
  const [loadingVariables, setLoadingVariables] = useState(false);
  const [savingVariables, setSavingVariables] = useState(false);
  const [dynamicOptions, setDynamicOptions] = useState<
    Record<string, { value: string; label: string }[]>
  >({});
  const [loadingDynamicOptions, setLoadingDynamicOptions] = useState<Record<string, boolean>>({});

  // Action states
  const [disconnecting, setDisconnecting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch variables when dialog opens
  const loadVariables = useCallback(async () => {
    if (!connectionId || !orgId) return;

    setLoadingVariables(true);
    setDynamicOptions({});
    try {
      const response = await api.get<VariablesResponse>(
        `/v1/integrations/variables/connections/${connectionId}?organizationId=${orgId}`,
      );
      if (response.data) {
        const vars = response.data.variables || [];
        setVariables(vars);
        // Extract current values from each variable
        const values: Record<string, string | number | boolean | string[]> = {};
        for (const v of vars) {
          if (v.currentValue !== undefined) {
            values[v.id] = v.currentValue;
          }
        }
        setVariableValues(values);
      }
    } catch {
      toast.error('Failed to load configuration');
    } finally {
      setLoadingVariables(false);
    }
  }, [connectionId, orgId]);

  useEffect(() => {
    if (open && connectionId) {
      loadVariables();
    }
  }, [open, connectionId, loadVariables]);

  const fetchDynamicOptions = useCallback(
    async (variableId: string) => {
      if (!connectionId || !orgId) return;

      setLoadingDynamicOptions((prev) => ({ ...prev, [variableId]: true }));
      try {
        const response = await api.get<{ options: { value: string; label: string }[] }>(
          `/v1/integrations/variables/connections/${connectionId}/options/${variableId}?organizationId=${orgId}`,
        );
        if (response.data?.options) {
          setDynamicOptions((prev) => ({ ...prev, [variableId]: response.data!.options }));
        }
      } catch {
        toast.error('Failed to load options');
      } finally {
        setLoadingDynamicOptions((prev) => ({ ...prev, [variableId]: false }));
      }
    },
    [connectionId, orgId],
  );

  const handleSaveVariables = async () => {
    if (!connectionId || !orgId) return;

    setSavingVariables(true);
    try {
      await api.post(
        `/v1/integrations/variables/connections/${connectionId}?organizationId=${orgId}`,
        { variables: variableValues },
      );
      toast.success('Configuration saved');
      refreshConnections();
      onSaved?.();
    } catch {
      toast.error('Failed to save configuration');
    } finally {
      setSavingVariables(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connectionId) return;

    setDisconnecting(true);
    try {
      const result = await disconnectConnection(connectionId);
      if (result.success) {
        toast.success('Integration disconnected');
        onOpenChange(false);
        refreshConnections();
        onDisconnected?.();
      } else {
        toast.error(result.error || 'Failed to disconnect');
      }
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleDelete = async () => {
    if (!connectionId) return;

    setDeleting(true);
    try {
      const result = await deleteConnection(connectionId);
      if (result.success) {
        toast.success('Integration removed');
        onOpenChange(false);
        refreshConnections();
        onDeleted?.();
      } else {
        toast.error(result.error || 'Failed to remove');
      }
    } catch {
      toast.error('Failed to remove');
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state
    setVariables([]);
    setVariableValues({});
    setDynamicOptions({});
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden">
              <Image
                src={integrationLogoUrl}
                alt={integrationName}
                width={20}
                height={20}
                className="object-contain"
              />
            </div>
            {configureOnly ? `Configure ${integrationName}` : `Manage ${integrationName}`}
          </DialogTitle>
          <DialogDescription>
            {configureOnly
              ? 'Set up your integration to start automated checks.'
              : 'Configure your integration settings or disconnect.'}
          </DialogDescription>
        </DialogHeader>

        {loadingVariables ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Variables Configuration */}
            {variables.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Configuration</h4>
                {variables.map((variable) => {
                  const options = dynamicOptions[variable.id] || variable.options || [];
                  const isLoadingOptions = loadingDynamicOptions[variable.id];

                  return (
                    <div key={variable.id} className="space-y-2">
                      <Label htmlFor={variable.id}>
                        {variable.label}
                        {variable.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {variable.description && (
                        <p className="text-xs text-muted-foreground">{variable.description}</p>
                      )}

                      {variable.type === 'multi-select' ? (
                        <MultiSelectVariable
                          variable={variable}
                          options={options}
                          isLoadingOptions={isLoadingOptions}
                          value={variableValues[variable.id]}
                          onChange={(val) =>
                            setVariableValues((prev) => ({
                              ...prev,
                              [variable.id]: val,
                            }))
                          }
                          onLoadOptions={() => fetchDynamicOptions(variable.id)}
                        />
                      ) : variable.type === 'select' ? (
                        <Select
                          value={String(variableValues[variable.id] || '')}
                          onValueChange={(val) =>
                            setVariableValues((prev) => ({ ...prev, [variable.id]: val }))
                          }
                          onOpenChange={(isOpen) => {
                            if (isOpen && variable.hasDynamicOptions && !options.length) {
                              fetchDynamicOptions(variable.id);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${variable.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingOptions ? (
                              <div className="py-2 px-3 text-sm text-muted-foreground flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Loading...
                              </div>
                            ) : options.length === 0 ? (
                              <div className="py-2 px-3 text-sm text-muted-foreground">
                                No options available
                              </div>
                            ) : (
                              options.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      ) : variable.type === 'boolean' ? (
                        <Select
                          value={String(variableValues[variable.id] ?? variable.default ?? 'false')}
                          onValueChange={(val) =>
                            setVariableValues((prev) => ({
                              ...prev,
                              [variable.id]: val === 'true',
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={variable.id}
                          type={variable.type === 'number' ? 'number' : 'text'}
                          value={String(variableValues[variable.id] || '')}
                          onChange={(e) =>
                            setVariableValues((prev) => ({
                              ...prev,
                              [variable.id]:
                                variable.type === 'number'
                                  ? Number(e.target.value)
                                  : e.target.value,
                            }))
                          }
                          placeholder={`Enter ${variable.label.toLowerCase()}`}
                        />
                      )}
                    </div>
                  );
                })}

                <Button onClick={handleSaveVariables} disabled={savingVariables} className="w-full">
                  {savingVariables ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Configuration'
                  )}
                </Button>
              </div>
            )}

            {variables.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No configuration options available for this integration.
              </p>
            )}
          </div>
        )}

        {!configureOnly && (
          <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnecting || deleting}
              className="flex-1"
            >
              {disconnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <Unplug className="h-4 w-4 mr-2" />
                  Disconnect
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={disconnecting || deleting}
              className="flex-1"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper component for multi-select variables with lazy loading
function MultiSelectVariable({
  variable,
  options,
  isLoadingOptions,
  value,
  onChange,
  onLoadOptions,
}: {
  variable: CheckVariable;
  options: { value: string; label: string }[];
  isLoadingOptions: boolean;
  value: string | number | boolean | string[] | undefined;
  onChange: (val: string[]) => void;
  onLoadOptions: () => void;
}) {
  const selectedValues = Array.isArray(value) ? value : [];
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (
      variable.hasDynamicOptions &&
      options.length === 0 &&
      !hasLoadedRef.current &&
      !isLoadingOptions
    ) {
      hasLoadedRef.current = true;
      onLoadOptions();
    }
  }, []);

  return (
    <MultipleSelector
      value={selectedValues.map((v) => ({
        value: v,
        label: options.find((o) => o.value === v)?.label || v,
      }))}
      onChange={(selected) => onChange(selected.map((s) => s.value))}
      defaultOptions={options.map((o) => ({ value: o.value, label: o.label }))}
      options={options.map((o) => ({ value: o.value, label: o.label }))}
      placeholder={`Select ${variable.label.toLowerCase()}...`}
      emptyIndicator={
        isLoadingOptions ? (
          <div className="py-2 px-3 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading options...
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">No options available</p>
        )
      }
    />
  );
}

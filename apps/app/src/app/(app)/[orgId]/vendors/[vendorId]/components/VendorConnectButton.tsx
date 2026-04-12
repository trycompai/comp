'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  useVendorIntegrations,
  useVendorIntegrationActions,
} from '@/hooks/use-vendor-integrations';
import { useApi } from '@/hooks/use-api';
import { usePermissions } from '@/hooks/use-permissions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  HStack,
  Input,
  Label,
  Select,
  Skeleton,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Spinner,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Connect, Add, Locked, Search, TrashCan } from '@trycompai/design-system/icons';

interface VendorConnectButtonProps {
  vendorId: string;
}

export function VendorConnectButton({ vendorId }: VendorConnectButtonProps) {
  const params = useParams<{ orgId: string }>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('vendor', 'update');

  const {
    connected,
    available,
    hasConnections,
    mutate: refreshIntegrations,
  } = useVendorIntegrations(vendorId);

  const { startOAuthConnect, disconnect } = useVendorIntegrationActions();

  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [disconnectConfirmId, setDisconnectConfirmId] = useState<string | null>(null);
  const [connectingSlug, setConnectingSlug] = useState<string | null>(null);

  const handleConnect = async (providerSlug: string) => {
    if (!canUpdate) return;
    setConnectingSlug(providerSlug);
    try {
      const orgId = params?.orgId;
      const redirectUrl = orgId
        ? `${window.location.origin}/${orgId}/vendors/${vendorId}`
        : undefined;
      const result = await startOAuthConnect({ vendorId, providerSlug, redirectUrl });
      window.location.href = result.authorizationUrl;
    } catch {
      toast.error('Failed to start connection');
      setConnectingSlug(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!canUpdate) return;
    setDisconnectingId(connectionId);
    try {
      await disconnect({ vendorId, connectionId });
      toast.success('Integration disconnected');
      await refreshIntegrations();
    } catch {
      toast.error('Failed to disconnect integration');
    } finally {
      setDisconnectingId(null);
    }
  };

  // Don't show anything if no integrations are connected or available
  if (!hasConnections && available.length === 0) return null;

  return (
    <>
      {hasConnections ? (
        <Button variant="default" size="sm" onClick={() => setDialogOpen(true)} iconLeft={<Connect />}>
          Connected
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // If there's exactly one available OAuth integration, skip the dialog
            if (available.length === 1 && available[0].authType === 'oauth2') {
              void handleConnect(available[0].providerSlug);
              return;
            }
            setDialogOpen(true);
          }}
          iconLeft={<Add />}
        >
          Connect Integration
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent style={{ maxWidth: 540 }}>
          {connected.length === 1 && available.length === 0 ? (
            // Single connected integration — show settings directly
            <SingleConnectionDialog
              connection={connected[0]}
              canUpdate={canUpdate}
              disconnectingId={disconnectingId}
              onDisconnect={() => setDisconnectConfirmId(connected[0].connectionId)}
              onClose={() => setDialogOpen(false)}
            />
          ) : (
            // Multiple integrations or mixed state
            <>
              <DialogHeader>
                <DialogTitle>Vendor Integrations</DialogTitle>
              </DialogHeader>
              <Stack gap="md">
                {connected.map((integration) => (
                  <Stack gap="sm" key={integration.connectionId}>
                    <HStack justify="between" align="center">
                      <HStack gap="xs" align="center">
                        <Text size="sm" weight="medium">{integration.providerName}</Text>
                        <Badge variant={integration.status === 'active' ? 'default' : 'secondary'}>
                          {integration.status}
                        </Badge>
                      </HStack>
                      {canUpdate && (
                        <Button
                          variant="destructive"
                          size="sm"
                          iconLeft={<TrashCan />}
                          onClick={() => setDisconnectConfirmId(integration.connectionId)}
                          disabled={disconnectingId === integration.connectionId}
                        >
                          Disconnect
                        </Button>
                      )}
                    </HStack>
                    <ConnectionVariablesForm connectionId={integration.connectionId} />
                  </Stack>
                ))}

                {available.length > 0 && connected.length > 0 && <Separator />}

                {available.map((integration) => (
                  <AvailableRow
                    key={integration.providerSlug}
                    integration={integration}
                    canUpdate={canUpdate}
                    isConnecting={connectingSlug === integration.providerSlug}
                    onConnect={() => handleConnect(integration.providerSlug)}
                  />
                ))}

                {connected.length === 0 && available.length === 0 && (
                  <div className="py-8 text-center">
                    <Text size="sm" variant="muted">
                      No integrations available for this vendor.
                    </Text>
                  </div>
                )}
              </Stack>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={disconnectConfirmId !== null}
        onOpenChange={(open) => { if (!open) setDisconnectConfirmId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Integration</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the integration from this vendor. Check results and history will be preserved but no new checks will run. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnectingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={disconnectingId !== null}
              onClick={async () => {
                if (disconnectConfirmId) {
                  await handleDisconnect(disconnectConfirmId);
                  setDisconnectConfirmId(null);
                  setDialogOpen(false);
                }
              }}
            >
              {disconnectingId ? 'Disconnecting…' : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// --- Single connection dialog content ---

function SingleConnectionDialog({
  connection,
  canUpdate,
  disconnectingId,
  onDisconnect,
  onClose,
}: {
  connection: { connectionId: string; providerName: string };
  canUpdate: boolean;
  disconnectingId: string | null;
  onDisconnect: () => void;
  onClose: () => void;
}) {
  const [saveHandler, setSaveHandler] = useState<(() => Promise<void>) | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!saveHandler) return;
    setIsSaving(true);
    try {
      await saveHandler();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{connection.providerName} Settings</DialogTitle>
      </DialogHeader>
      <ConnectionVariablesForm
        connectionId={connection.connectionId}
        onSave={onClose}
        onSaveReady={(fn) => setSaveHandler(() => fn)}
        hideSubmit
      />
      <Separator />
      <HStack justify="between" align="center">
        {canUpdate && (
          <Button
            variant="destructive"
            iconLeft={<TrashCan />}
            onClick={onDisconnect}
            disabled={disconnectingId === connection.connectionId}
          >
            Disconnect
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={isSaving || !saveHandler}
          loading={isSaving}
        >
          Save Settings
        </Button>
      </HStack>
    </>
  );
}

// --- Variable configuration form ---

interface VariableDef {
  id: string;
  label: string;
  type: string;
  required: boolean;
  default?: string | number | boolean | string[];
  helpText?: string;
  placeholder?: string;
  hasDynamicOptions: boolean;
  currentValue?: unknown;
  options?: Array<{ value: string; label: string }>;
}

function ConnectionVariablesForm({
  connectionId,
  onSave,
  onSaveReady,
  hideSubmit,
}: {
  connectionId: string;
  onSave?: () => void;
  onSaveReady?: (save: () => Promise<void>) => void;
  hideSubmit?: boolean;
}) {
  const api = useApi();
  const [variables, setVariables] = useState<VariableDef[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, Array<{ value: string; label: string }>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState<Set<string>>(new Set());

  // Load variable definitions + current values
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await api.get<{ variables: VariableDef[] }>(
          `/v1/integrations/variables/connections/${connectionId}`,
        );
        const vars = (res.data as unknown as { variables: VariableDef[] })?.variables ?? [];
        setVariables(vars);
        const initial: Record<string, unknown> = {};
        for (const v of vars) {
          if (v.currentValue !== undefined) initial[v.id] = v.currentValue;
        }
        setValues(initial);

        // Fetch dynamic options for variables that need them
        for (const v of vars) {
          if (v.hasDynamicOptions) {
            void fetchOptions(v.id);
          }
        }
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId]);

  const fetchOptions = useCallback(async (variableId: string) => {
    setLoadingOptions((prev) => new Set(prev).add(variableId));
    try {
      const res = await api.get<{ options: Array<{ value: string; label: string }> }>(
        `/v1/integrations/variables/connections/${connectionId}/options/${variableId}`,
      );
      const opts = (res.data as unknown as { options: Array<{ value: string; label: string }> })?.options ?? [];
      setDynamicOptions((prev) => ({ ...prev, [variableId]: opts }));
    } catch {
      // Silently fail — static options will be used
    } finally {
      setLoadingOptions((prev) => {
        const next = new Set(prev);
        next.delete(variableId);
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.post(`/v1/integrations/variables/connections/${connectionId}`, {
        variables: values,
      });
      toast.success('Settings saved');
      onSave?.();
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Expose save handler to parent
  useEffect(() => {
    onSaveReady?.(handleSave);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner />
      </div>
    );
  }

  if (variables.length === 0) {
    return (
      <Text size="sm" variant="muted">No configuration required.</Text>
    );
  }

  return (
    <Stack gap="md">
        {variables.map((v) => {
          const opts = dynamicOptions[v.id] ?? v.options ?? [];
          const isLoadingOpts = loadingOptions.has(v.id);
          const currentVal = values[v.id];

          if (v.type === 'multi-select') {
            return (
              <MultiSelectVariable
                key={v.id}
                variable={v}
                options={opts}
                isLoading={isLoadingOpts}
                selectedValues={Array.isArray(currentVal) ? (currentVal as string[]) : []}
                onChange={(next) => setValues((prev) => ({ ...prev, [v.id]: next }))}
              />
            );
          }

          // Number input
          if (v.type === 'number') {
            return (
              <Stack gap="xs" key={v.id}>
                <Label>{v.label}{v.required && <span className="text-destructive"> *</span>}</Label>
                {v.helpText && <Text size="xs" variant="muted">{v.helpText}</Text>}
                <Input
                  type="number"
                  placeholder={v.placeholder || ''}
                  value={currentVal != null ? String(currentVal) : String(v.default ?? '')}
                  onChange={(e) => setValues((prev) => ({ ...prev, [v.id]: Number(e.target.value) }))}
                />
              </Stack>
            );
          }

          // Text input
          if (v.type === 'text') {
            return (
              <Stack gap="xs" key={v.id}>
                <Label>{v.label}{v.required && <span className="text-destructive"> *</span>}</Label>
                {v.helpText && <Text size="xs" variant="muted">{v.helpText}</Text>}
                <Input
                  placeholder={v.placeholder || ''}
                  value={typeof currentVal === 'string' ? currentVal : String(v.default ?? '')}
                  onChange={(e) => setValues((prev) => ({ ...prev, [v.id]: e.target.value }))}
                />
              </Stack>
            );
          }

          // Fallback: single select
          return (
            <Stack gap="xs" key={v.id}>
              <Label>{v.label}{v.required && <span className="text-destructive"> *</span>}</Label>
              {v.helpText && <Text size="xs" variant="muted">{v.helpText}</Text>}
              <Select
                value={typeof currentVal === 'string' ? currentVal : ''}
                onValueChange={(val) => setValues((prev) => ({ ...prev, [v.id]: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={v.placeholder || 'Select...'} />
                </SelectTrigger>
                <SelectContent>
                  {opts.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Stack>
          );
        })}
        {!hideSubmit && (
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={isSaving} loading={isSaving}>
              Save Settings
            </Button>
          </div>
        )}
      </Stack>
  );
}

// --- Available row ---

// --- Multi-select with search ---

function MultiSelectVariable({
  variable,
  options,
  isLoading,
  selectedValues,
  onChange,
}: {
  variable: VariableDef;
  options: Array<{ value: string; label: string }>;
  isLoading: boolean;
  selectedValues: string[];
  onChange: (values: string[]) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((o) => selectedValues.includes(o.value));

  const toggleAll = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filtered.map((o) => o.value));
      onChange(selectedValues.filter((v) => !filteredSet.has(v)));
    } else {
      const existing = new Set(selectedValues);
      const next = [...selectedValues];
      for (const o of filtered) {
        if (!existing.has(o.value)) next.push(o.value);
      }
      onChange(next);
    }
  };

  const toggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  // Strip "(private)" from label and detect private repos
  const parseLabel = (label: string) => {
    const isPrivate = label.endsWith('(private)');
    const cleanLabel = isPrivate ? label.replace(/\s*\(private\)$/, '') : label;
    return { cleanLabel, isPrivate };
  };

  return (
    <Stack gap="xs">
      <HStack justify="between" align="center">
        <Label>{variable.label}{variable.required && <span className="text-destructive"> *</span>}</Label>
        {!isLoading && options.length > 0 && (
          <Text size="xs" variant="muted">{selectedValues.length} of {options.length} selected</Text>
        )}
      </HStack>
      {variable.helpText && <Text size="xs" variant="muted">{variable.helpText}</Text>}
      {isLoading ? (
        <Stack gap="xs">
          {/* Search bar skeleton — matches real search: rounded-md border px-2 py-1 with Search icon (14px) + text-sm input */}
          <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1">
            <div className="h-[14px] w-[14px] shrink-0 animate-pulse rounded bg-muted" />
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          </div>
          {/* Select all skeleton */}
          <div className="px-1"><div className="h-3 w-16 animate-pulse rounded bg-muted" /></div>
          {/* Repo list skeleton — matches real list: max-h-48 border with rows of checkbox + label */}
          <div className="max-h-48 rounded-md border border-border divide-y divide-border">
            {[65, 45, 72, 55, 40, 60].map((w, i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-1.5">
                <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-muted" />
                <div className="h-3.5 animate-pulse rounded bg-muted" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        </Stack>
      ) : options.length === 0 ? (
        <Text size="xs" variant="muted">No options available</Text>
      ) : (
        <Stack gap="xs">
          <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center justify-between px-1">
            <button type="button" onClick={toggleAll} className="text-xs text-primary hover:underline">
              {allFilteredSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border">
            {filtered.map((opt) => {
              const isSelected = selectedValues.includes(opt.value);
              const { cleanLabel, isPrivate } = parseLabel(opt.label);
              return (
                <div
                  key={opt.value}
                  className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggle(opt.value)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggle(opt.value)}
                  />
                  <span className="flex-1 text-sm truncate">{cleanLabel}</span>
                  {isPrivate && <Locked size={12} className="text-muted-foreground shrink-0" />}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-2.5 py-2 text-center">
                <Text size="xs" variant="muted">No matches</Text>
              </div>
            )}
          </div>
        </Stack>
      )}
    </Stack>
  );
}

// --- Available row ---

function AvailableRow({
  integration,
  canUpdate,
  isConnecting,
  onConnect,
}: {
  integration: {
    providerSlug: string;
    providerName: string;
    category: string;
    checks: Array<{ checkId: string; checkName: string; description: string }>;
  };
  canUpdate: boolean;
  isConnecting: boolean;
  onConnect: () => void;
}) {
  return (
    <HStack justify="between" align="center">
      <Stack gap="none">
        <Text size="sm" weight="medium">{integration.providerName}</Text>
        <Text size="xs" variant="muted">
          {integration.category} &middot; {integration.checks.length} check
          {integration.checks.length !== 1 ? 's' : ''} available
        </Text>
      </Stack>
      {canUpdate && (
        <Button
          variant="outline"
          size="sm"
          onClick={onConnect}
          disabled={isConnecting}
          loading={isConnecting}
          iconLeft={<Add />}
        >
          Connect
        </Button>
      )}
    </HStack>
  );
}

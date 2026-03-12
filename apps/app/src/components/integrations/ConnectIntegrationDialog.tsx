'use client';

import {
  CredentialField,
  useIntegrationConnections,
  useIntegrationMutations,
  useIntegrationProviders,
} from '@/hooks/use-integration-platform';
import { usePermissions } from '@/hooks/use-permissions';
import { ComboboxDropdown } from '@comp/ui/combobox-dropdown';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import MultipleSelector from '@comp/ui/multiple-selector';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@trycompai/design-system';
import { ArrowLeft, Eye, EyeOff, Loader2, Plus, Settings, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface ConnectIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrationId: string;
  integrationName: string;
  integrationLogoUrl: string;
  onConnected?: () => void;
}

interface ExistingConnection {
  id: string;
  displayName: string;
  accountId?: string;
  regions?: string[];
  tenantId?: string;
  subscriptionId?: string;
  status: string;
  lastSyncAt?: string | null;
  isLegacy?: boolean;
}

function CredentialInput({
  field,
  value,
  onChange,
}: {
  field: CredentialField;
  value: string | string[];
  onChange: (value: string | string[]) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange(e.target.value);
  const stringValue = typeof value === 'string' ? value : '';

  if (field.type === 'password') {
    return (
      <div className="relative">
        <div className="[&_input]:pr-10">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={stringValue}
            onChange={handleChange}
            placeholder={field.placeholder}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <Textarea
        value={stringValue}
        onChange={handleChange}
        placeholder={field.placeholder}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <Select value={stringValue} onValueChange={(v) => { if (v) onChange(v); }}>
        <SelectTrigger>
          <SelectValue placeholder={field.placeholder || 'Select...'} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === 'combobox') {
    const items =
      field.options?.map((opt) => ({
        id: opt.value,
        label: opt.label,
      })) || [];

    const selectedItem = stringValue
      ? (items.find((item) => item.id === stringValue) ?? { id: stringValue, label: stringValue })
      : undefined;

    return (
      <ComboboxDropdown
        items={items}
        selectedItem={selectedItem}
        onSelect={(item) => onChange(item.id)}
        onCreate={(customValue) => onChange(customValue)}
        placeholder={field.placeholder || 'Select or type...'}
        searchPlaceholder="Search or type custom value..."
        renderOnCreate={(customValue) => (
          <div className="flex items-center gap-2">
            <span className="text-sm">Use custom value:</span>
            <span className="font-medium">{customValue}</span>
          </div>
        )}
      />
    );
  }

  if (field.type === 'multi-select') {
    const selectedValues = Array.isArray(value) ? value : [];
    const options = field.options ?? [];

    return (
      <MultipleSelector
        value={selectedValues.map((val) => ({
          value: val,
          label: options.find((opt) => opt.value === val)?.label || val,
        }))}
        onChange={(selected) => onChange(selected.map((item) => item.value))}
        defaultOptions={options.map((opt) => ({ value: opt.value, label: opt.label }))}
        options={options.map((opt) => ({ value: opt.value, label: opt.label }))}
        placeholder={field.placeholder || 'Select...'}
        creatable={options.length === 0}
        emptyIndicator={<p className="text-center text-sm text-muted-foreground">No options</p>}
      />
    );
  }

  const inputType = field.type === 'url' ? 'url' : field.type === 'number' ? 'number' : 'text';
  const placeholder = field.type === 'url' ? field.placeholder || 'https://...' : field.placeholder;

  return (
    <Input type={inputType} value={stringValue} onChange={handleChange} placeholder={placeholder} />
  );
}

export function ConnectIntegrationDialog({
  open,
  onOpenChange,
  integrationId,
  integrationName,
  integrationLogoUrl,
  onConnected,
}: ConnectIntegrationDialogProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('integration', 'create');
  const canUpdate = hasPermission('integration', 'update');
  const canDelete = hasPermission('integration', 'delete');
  const {
    startOAuth,
    createConnection,
    deleteConnection,
    updateConnectionCredentials,
    updateConnectionMetadata,
  } = useIntegrationMutations();
  const { providers, isLoading: isProvidersLoading } = useIntegrationProviders(true);
  const {
    connections: allConnections,
    refresh: refreshConnections,
    isLoading: isConnectionsLoading,
  } = useIntegrationConnections();

  const [connecting, setConnecting] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [view, setView] = useState<'list' | 'form' | 'configure'>('list');
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);
  const [configureConnectionId, setConfigureConnectionId] = useState<string | null>(null);
  const [savingCredentials, setSavingCredentials] = useState(false);

  const provider = providers?.find((p) => p.id === integrationId);
  const authType = provider?.authType;
  const credentialFields = provider?.credentialFields ?? [];
  const supportsMultipleConnections = provider?.supportsMultipleConnections ?? false;

  // Track if data is still loading - use isLoading flags instead of checking for undefined
  // since hooks return [] as fallback, not undefined
  const isDataLoading = isProvidersLoading || isConnectionsLoading;

  // Filter connections for this specific integration
  const existingConnections: ExistingConnection[] = useMemo(() => {
    if (!allConnections) return [];
    return allConnections
      .filter((conn) => conn.providerSlug === integrationId)
      .map((conn) => {
        const metadata = (conn.metadata || {}) as Record<string, unknown>;
        return {
          id: conn.id,
          displayName:
            typeof metadata.connectionName === 'string'
              ? metadata.connectionName
              : conn.providerName || integrationName,
          accountId: typeof metadata.accountId === 'string' ? metadata.accountId : undefined,
          regions: Array.isArray(metadata.regions) ? (metadata.regions as string[]) : undefined,
          tenantId: typeof metadata.tenantId === 'string' ? metadata.tenantId : undefined,
          subscriptionId:
            typeof metadata.subscriptionId === 'string' ? metadata.subscriptionId : undefined,
          status: conn.status,
          lastSyncAt: conn.lastSyncAt,
          isLegacy: false,
        };
      });
  }, [allConnections, integrationId, integrationName]);

  const didInitializeOnOpen = useRef(false);

  // Determine initial view based on existing connections (only when opening)
  useEffect(() => {
    if (open && !didInitializeOnOpen.current) {
      // Wait until data has finished loading before determining view
      if (isDataLoading) {
        return;
      }
      if (supportsMultipleConnections && existingConnections.length > 0) {
        setView('list');
      } else if (existingConnections.length === 0) {
        setView('form');
      } else {
        // Non-multi connection provider with existing connection - show list (configure only)
        setView('list');
      }
      setCredentials({});
      setErrors({});
      setConfigureConnectionId(null);
      didInitializeOnOpen.current = true;
    }

    if (!open) {
      didInitializeOnOpen.current = false;
    }
  }, [open, isDataLoading, existingConnections.length, supportsMultipleConnections]);

  const allFields = useMemo(() => {
    if (authType === 'basic') {
      return [
        {
          id: 'username',
          label: 'Username',
          type: 'text' as const,
          required: true,
          placeholder: 'Enter username',
        },
        {
          id: 'password',
          label: 'Password',
          type: 'password' as const,
          required: true,
          placeholder: 'Enter password',
        },
      ];
    }
    if (authType === 'api_key' && credentialFields.length === 0) {
      return [
        {
          id: 'api_key',
          label: 'API Key',
          type: 'password' as const,
          required: true,
          placeholder: 'Enter your API key',
        },
      ];
    }
    if (authType === 'custom' && credentialFields.length > 0) {
      return credentialFields;
    }
    return credentialFields;
  }, [authType, credentialFields]);

  const handleOAuthConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const redirectUrl = window.location.href;
      const result = await startOAuth(integrationId, redirectUrl);
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
      } else {
        toast.error(result.error || 'Failed to start connection');
        setConnecting(false);
      }
    } catch {
      toast.error('Failed to start connection');
      setConnecting(false);
    }
  }, [integrationId, startOAuth]);

  const handleCredentialConnect = useCallback(async () => {
    const newErrors: Record<string, string> = {};
    for (const field of allFields) {
      const value = credentials[field.id];
      const isMissing =
        field.type === 'multi-select'
          ? !Array.isArray(value) || value.length === 0
          : !String(value ?? '').trim();

      if (field.required && isMissing) {
        newErrors[field.id] = `${field.label} is required`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setConnecting(true);
    setErrors({});

    try {
      const result = await createConnection(integrationId, credentials);

      if (!result.success) {
        toast.error(result.error || 'Failed to create connection');
        setConnecting(false);
        return;
      }

      // AWS credentials are validated on the server before creation
      const isVerified = integrationId === 'aws';
      toast.success(`${integrationName} connected${isVerified ? ' and verified' : ''}!`);

      await refreshConnections();
      setCredentials({});

      // After connecting, go back to list if multi-connection
      if (supportsMultipleConnections) {
        setView('list');
      }
      onConnected?.();
      if (!supportsMultipleConnections) {
        onOpenChange(false);
      }
    } catch {
      toast.error('Failed to create connection');
    } finally {
      setConnecting(false);
    }
  }, [
    allFields,
    credentials,
    createConnection,
    integrationId,
    integrationName,
    onConnected,
    onOpenChange,
    refreshConnections,
    supportsMultipleConnections,
  ]);

  const handleDisconnect = useCallback(
    async (connectionId: string) => {
      if (
        !confirm(
          'Are you sure you want to disconnect this connection? All associated data will be removed.',
        )
      ) {
        return;
      }

      setIsDisconnecting(connectionId);
      // Capture current count before deletion to avoid stale closure issues
      const currentConnectionCount = existingConnections.length;
      try {
        const result = await deleteConnection(connectionId);
        if (result.success) {
          toast.success('Connection disconnected');
          await refreshConnections();
          // If this was the last connection, switch to form view
          if (currentConnectionCount <= 1) {
            setView('form');
          }
        } else {
          toast.error(result.error || 'Failed to disconnect');
        }
      } catch {
        toast.error('Failed to disconnect');
      } finally {
        setIsDisconnecting(null);
      }
    },
    [deleteConnection, existingConnections, refreshConnections],
  );

  const handleConfigure = useCallback(
    (connectionId: string) => {
      // Find the connection to get existing values
      const connection = allConnections?.find((c) => c.id === connectionId);
      const metadata = (connection?.metadata || {}) as Record<string, unknown>;

      // Pre-fill credentials from metadata
      const prefillCredentials: Record<string, string | string[]> = {};

      if (typeof metadata.connectionName === 'string') {
        prefillCredentials.connectionName = metadata.connectionName;
      }
      if (typeof metadata.roleArn === 'string') {
        prefillCredentials.roleArn = metadata.roleArn;
      }
      if (typeof metadata.externalId === 'string') {
        prefillCredentials.externalId = metadata.externalId;
      }
      if (Array.isArray(metadata.regions)) {
        prefillCredentials.regions = metadata.regions as string[];
      }
      // Azure-specific metadata pre-fill
      if (typeof metadata.tenantId === 'string') {
        prefillCredentials.tenantId = metadata.tenantId;
      }
      if (typeof metadata.subscriptionId === 'string') {
        prefillCredentials.subscriptionId = metadata.subscriptionId;
      }

      setConfigureConnectionId(connectionId);
      setCredentials(prefillCredentials);
      setErrors({});
      setView('configure');
    },
    [allConnections],
  );

  const handleSaveCredentials = useCallback(async () => {
    if (!configureConnectionId || !orgId) return;

    const hasValues = Object.values(credentials).some((value) =>
      Array.isArray(value) ? value.length > 0 : String(value ?? '').trim() !== '',
    );
    if (!hasValues) {
      toast.error('Please enter at least one value to update');
      return;
    }

    setSavingCredentials(true);
    try {
      // Update credentials (API validates before saving for AWS)
      const credResult = await updateConnectionCredentials(configureConnectionId, credentials);

      if (!credResult.success) {
        toast.error(credResult.error || 'Failed to update credentials');
        setSavingCredentials(false);
        return;
      }

      // Also update metadata for display purposes
      const metadataUpdates: Record<string, unknown> = {};
      if (typeof credentials.connectionName === 'string' && credentials.connectionName.trim()) {
        metadataUpdates.connectionName = credentials.connectionName.trim();
      }
      if (Array.isArray(credentials.regions) && credentials.regions.length > 0) {
        metadataUpdates.regions = credentials.regions;
      }
      if (typeof credentials.roleArn === 'string' && credentials.roleArn.trim()) {
        metadataUpdates.roleArn = credentials.roleArn.trim();
        const arnMatch = credentials.roleArn.match(/^arn:aws:iam::(\d{12}):role\/.+$/);
        if (arnMatch) {
          metadataUpdates.accountId = arnMatch[1];
        }
      }
      if (typeof credentials.externalId === 'string' && credentials.externalId.trim()) {
        metadataUpdates.externalId = credentials.externalId.trim();
      }
      // Azure-specific metadata updates
      if (typeof credentials.tenantId === 'string' && credentials.tenantId.trim()) {
        metadataUpdates.tenantId = credentials.tenantId.trim();
      }
      if (typeof credentials.subscriptionId === 'string' && credentials.subscriptionId.trim()) {
        metadataUpdates.subscriptionId = credentials.subscriptionId.trim();
      }

      if (Object.keys(metadataUpdates).length > 0) {
        const metaResult = await updateConnectionMetadata(configureConnectionId, metadataUpdates);
        if (!metaResult.success) {
          toast.error(metaResult.error || 'Failed to update connection details');
          setSavingCredentials(false);
          return;
        }
      }

      toast.success('Connection updated and verified!');
      await refreshConnections();
      setCredentials({});
      setView('list');
    } catch {
      toast.error('Failed to update connection');
    } finally {
      setSavingCredentials(false);
    }
  }, [configureConnectionId, credentials, orgId, refreshConnections, updateConnectionCredentials, updateConnectionMetadata]);

  const updateCredential = (fieldId: string, value: string | string[]) => {
    setCredentials((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const renderConnectionList = () => {
    return (
      <div className="space-y-4">
        {existingConnections.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No connections yet. Add your first connection below.
          </p>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {existingConnections.map((conn) => (
              <div
                key={conn.id}
                className="rounded-lg border p-3 flex items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{conn.displayName}</p>
                    {conn.isLegacy && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground shrink-0">
                        Legacy
                      </span>
                    )}
                  </div>
                  {(conn.accountId || conn.regions?.length || conn.tenantId || conn.subscriptionId) && (
                    <div className="text-xs text-muted-foreground">
                      {[
                        conn.accountId && `Account: ${conn.accountId}`,
                        conn.regions?.length && `${conn.regions.length} regions`,
                        conn.tenantId && `Tenant: ${conn.tenantId}`,
                        conn.subscriptionId && `Subscription: ${conn.subscriptionId}`,
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!conn.isLegacy && canUpdate && (
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handleConfigure(conn.id)}
                      iconLeft={<Settings className="h-4 w-4" />}
                    />
                  )}
                  {canDelete && (
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => handleDisconnect(conn.id)}
                      disabled={isDisconnecting === conn.id}
                      loading={isDisconnecting === conn.id}
                      iconLeft={isDisconnecting !== conn.id ? <Trash2 className="h-4 w-4" /> : undefined}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {canCreate && (supportsMultipleConnections || existingConnections.length === 0) && (
          <Button onClick={() => setView('form')} width="full" iconLeft={<Plus className="h-4 w-4" />}>
            {existingConnections.length > 0 ? 'Add Account' : 'Add Connection'}
          </Button>
        )}
      </div>
    );
  };

  const renderAuthForm = () => {
    const showBackButton = supportsMultipleConnections && existingConnections.length > 0;

    switch (authType) {
      case 'oauth2':
        return (
          <div className="space-y-3">
            {showBackButton && (
              <div className="mb-2">
                <Button variant="ghost" size="sm" onClick={() => setView('list')} iconLeft={<ArrowLeft className="h-4 w-4" />}>
                  Back to connections
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              This integration uses OAuth to securely connect to your {integrationName} account.
            </p>
            <Button onClick={handleOAuthConnect} disabled={connecting || !canCreate} width="full" loading={connecting}>
              {connecting ? 'Connecting...' : `Continue with ${integrationName}`}
            </Button>
          </div>
        );

      case 'api_key':
      case 'basic':
      case 'custom':
        if (allFields.length === 0) {
          return (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This integration requires custom configuration.
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {showBackButton && (
              <Button variant="ghost" size="sm" onClick={() => setView('list')} iconLeft={<ArrowLeft className="h-4 w-4" />}>
                Back to connections
              </Button>
            )}
            {provider?.setupInstructions && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md max-h-32 overflow-y-auto overflow-x-hidden">
                <p className="whitespace-pre-wrap text-xs break-words">{provider.setupInstructions}</p>
              </div>
            )}
            {provider?.category === 'Cloud' && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                This integration will only be used for Cloud Security Tests. Your credentials are encrypted and used exclusively to run read-only security scans.
              </div>
            )}
            {allFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <CredentialInput
                  field={field}
                  value={credentials[field.id] || (field.type === 'multi-select' ? [] : '')}
                  onChange={(value) => updateCredential(field.id, value)}
                />
                {field.helpText && (
                  <p className="text-xs text-muted-foreground break-words">{field.helpText}</p>
                )}
                {errors[field.id] && <p className="text-xs text-destructive">{errors[field.id]}</p>}
              </div>
            ))}
            <Button onClick={handleCredentialConnect} disabled={connecting || !canCreate} width="full" loading={connecting}>
              {connecting ? 'Connecting...' : 'Connect'}
            </Button>
          </div>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">
            Unable to determine authentication method.
          </p>
        );
    }
  };

  const renderConfigureForm = () => {
    const connection = existingConnections.find((c) => c.id === configureConnectionId);

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView('list')} iconLeft={<ArrowLeft className="h-4 w-4" />}>
          Back to connections
        </Button>

        <div className="rounded-md bg-muted/50 border p-3">
          <p className="text-xs text-muted-foreground">
            Configuring: <strong>{connection?.displayName}</strong>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Current values are pre-filled. Edit any field you want to update.
          </p>
        </div>

        {allFields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.label}</Label>
            <CredentialInput
              field={field}
              value={credentials[field.id] || (field.type === 'multi-select' ? [] : '')}
              onChange={(value) => updateCredential(field.id, value)}
            />
            {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
          </div>
        ))}

        <Button onClick={handleSaveCredentials} disabled={savingCredentials || !canUpdate} width="full" loading={savingCredentials}>
          {savingCredentials ? 'Saving...' : 'Update Connection'}
        </Button>
      </div>
    );
  };

  const getDialogTitle = () => {
    if (view === 'configure') {
      return `Configure ${integrationName}`;
    }
    if (view === 'list' && existingConnections.length > 0) {
      return `${integrationName} Connections`;
    }
    return `Connect ${integrationName}`;
  };

  const getDialogDescription = () => {
    if (view === 'configure') {
      return 'Update your connection credentials.';
    }
    if (view === 'list' && existingConnections.length > 0) {
      return `Manage your ${integrationName} accounts or add a new one.`;
    }
    return `Configure your ${integrationName} connection.`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden">
              <Image
                src={integrationLogoUrl}
                alt={integrationName}
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        <div className="pt-2 max-h-[60vh] overflow-y-auto">
          {isDataLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {view === 'list' && renderConnectionList()}
              {view === 'form' && renderAuthForm()}
              {view === 'configure' && renderConfigureForm()}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import {
  useIntegrationConnections,
  useIntegrationMutations,
} from '@/hooks/use-integration-platform';
import { api } from '@/lib/api-client';
import { Button } from '@comp/ui/button';
import { ComboboxDropdown } from '@comp/ui/combobox-dropdown';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import { Key, Loader2, Settings, Trash2, Unplug, X } from 'lucide-react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface CheckVariable {
  id: string;
  label: string;
  description?: string;
  helpText?: string;
  placeholder?: string;
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

interface CredentialField {
  id: string;
  label: string;
  type:
    | 'text'
    | 'password'
    | 'textarea'
    | 'select'
    | 'combobox'
    | 'multi-select'
    | 'number'
    | 'url';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
}

interface ConnectionDetailsResponse {
  id: string;
  providerId: string;
  providerSlug: string;
  providerName: string;
  authStrategy: string;
  credentialFields?: CredentialField[];
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
  /** Context about the specific check being configured */
  checkContext?: {
    checkName: string;
    checkDescription?: string;
  };
  onDeleted?: () => void;
  onSaved?: () => void;
}

const validateTargetRepos = (
  values: Record<string, string | number | boolean | string[]>,
): boolean => {
  const targetReposValue = values.target_repos;
  if (!Array.isArray(targetReposValue) || targetReposValue.length === 0) {
    return true;
  }
  for (const value of targetReposValue) {
    const colonIndex = String(value).lastIndexOf(':');
    if (colonIndex <= 0) {
      return false;
    }
    const branch = String(value).substring(colonIndex + 1).trim();
    if (!branch) {
      return false;
    }
  }
  return true;
};

export function ManageIntegrationDialog({
  open,
  onOpenChange,
  connectionId,
  integrationId,
  integrationName,
  integrationLogoUrl,
  configureOnly = false,
  checkContext,
  onDeleted,
  onSaved,
}: ManageIntegrationDialogProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const { deleteConnection } = useIntegrationMutations();
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

  // Credentials state (for custom auth integrations)
  const [credentialFields, setCredentialFields] = useState<CredentialField[]>([]);
  const [credentialValues, setCredentialValues] = useState<
    Record<string, string | string[]>
  >({});
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [authStrategy, setAuthStrategy] = useState<string>('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'variables' | 'credentials'>('variables');

  // Action states
  const [deleting, setDeleting] = useState(false);

  // Fetch connection details (for credential fields)
  const loadConnectionDetails = useCallback(async () => {
    if (!connectionId || !orgId) return;

    try {
      const response = await api.get<ConnectionDetailsResponse>(
        `/v1/integrations/connections/${connectionId}?organizationId=${orgId}`,
      );
      if (response.data) {
        setAuthStrategy(response.data.authStrategy || '');
        setCredentialFields(response.data.credentialFields || []);
        // Initialize empty credential values (we don't show existing values for security)
        const initialValues: Record<string, string | string[]> = {};
        for (const field of response.data.credentialFields || []) {
          initialValues[field.id] = field.type === 'multi-select' ? [] : '';
        }
        setCredentialValues(initialValues);
      }
    } catch {
      // Silently fail - credential editing may not be available
    }
  }, [connectionId, orgId]);

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
      loadConnectionDetails();
      // Set initial tab based on what's available
      setActiveTab('variables');
    }
  }, [open, connectionId, loadVariables, loadConnectionDetails]);

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

  const handleSaveCredentials = async () => {
    if (!connectionId || !orgId) return;

    // Check if any credentials were actually entered
    const hasValues = Object.values(credentialValues).some((value) =>
      Array.isArray(value) ? value.length > 0 : value.trim() !== '',
    );
    if (!hasValues) {
      toast.error('Please enter at least one credential value to update');
      return;
    }

    // Only send non-empty values
    const credentialsToSave: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(credentialValues)) {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          credentialsToSave[key] = value;
        }
      } else if (value.trim()) {
        credentialsToSave[key] = value.trim();
      }
    }

    setSavingCredentials(true);
    try {
      await api.put(
        `/v1/integrations/connections/${connectionId}/credentials?organizationId=${orgId}`,
        { credentials: credentialsToSave },
      );
      toast.success('Credentials updated');
      refreshConnections();
      // Clear the form
      setCredentialValues((prev) => {
        const cleared: Record<string, string | string[]> = {};
        for (const key of Object.keys(prev)) {
          cleared[key] = Array.isArray(prev[key]) ? [] : '';
        }
        return cleared;
      });
      onSaved?.();
    } catch {
      toast.error('Failed to update credentials');
    } finally {
      setSavingCredentials(false);
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

  const hasVariables = variables.length > 0;
  const hasCredentials = authStrategy === 'custom' && credentialFields.length > 0;
  const showTabs = hasVariables && hasCredentials;
  const isTargetReposValid = validateTargetRepos(variableValues);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
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
            {checkContext
              ? `Configure ${checkContext.checkName}`
              : configureOnly
                ? `Configure ${integrationName}`
                : `Manage ${integrationName}`}
          </DialogTitle>
          <DialogDescription>
            {checkContext?.checkDescription ||
              (configureOnly
                ? 'Set up your integration to start automated checks.'
                : 'Configure your integration settings or disconnect.')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {loadingVariables ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ConfigurationContent
              variables={variables}
              variableValues={variableValues}
              setVariableValues={setVariableValues}
              dynamicOptions={dynamicOptions}
              loadingDynamicOptions={loadingDynamicOptions}
              fetchDynamicOptions={fetchDynamicOptions}
              credentialFields={credentialFields}
              credentialValues={credentialValues}
              setCredentialValues={setCredentialValues}
              hasVariables={hasVariables}
              hasCredentials={hasCredentials}
              showTabs={showTabs}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          )}
        </div>

        {!loadingVariables && (
          <ConfigurationFooterActions
            hasVariables={hasVariables}
            hasCredentials={hasCredentials}
            showTabs={showTabs}
            activeTab={activeTab}
            savingVariables={savingVariables}
            handleSaveVariables={handleSaveVariables}
            isTargetReposValid={isTargetReposValid}
            savingCredentials={savingCredentials}
            handleSaveCredentials={handleSaveCredentials}
            showActionsFooter={!configureOnly}
          />
        )}

        {!configureOnly && (
          <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-4">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Disconnect
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Configuration content with tabs for variables and credentials
function ConfigurationContent({
  variables,
  variableValues,
  setVariableValues,
  dynamicOptions,
  loadingDynamicOptions,
  fetchDynamicOptions,
  credentialFields,
  credentialValues,
  setCredentialValues,
  hasVariables,
  hasCredentials,
  showTabs,
  activeTab,
  setActiveTab,
}: {
  variables: CheckVariable[];
  variableValues: Record<string, string | number | boolean | string[]>;
  setVariableValues: React.Dispatch<
    React.SetStateAction<Record<string, string | number | boolean | string[]>>
  >;
  dynamicOptions: Record<string, { value: string; label: string }[]>;
  loadingDynamicOptions: Record<string, boolean>;
  fetchDynamicOptions: (variableId: string) => void;
  credentialFields: CredentialField[];
  credentialValues: Record<string, string | string[]>;
  setCredentialValues: React.Dispatch<React.SetStateAction<Record<string, string | string[]>>>;
  hasVariables: boolean;
  hasCredentials: boolean;
  showTabs: boolean;
  activeTab: 'variables' | 'credentials';
  setActiveTab: (tab: 'variables' | 'credentials') => void;
}) {
  // If neither available, show empty state
  if (!hasVariables && !hasCredentials) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        This integration is fully configured and ready to use.
      </p>
    );
  }

  const variablesContent = hasVariables && (
    <div className="space-y-4">
      {!showTabs && <h4 className="text-sm font-medium">Configuration</h4>}
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
            {variable.helpText && (
              <p className="text-xs text-muted-foreground">{variable.helpText}</p>
            )}
            {variable.placeholder && !variable.description && !variable.helpText && (
              <p className="text-xs text-muted-foreground">Example: {variable.placeholder}</p>
            )}

            {variable.type === 'multi-select' ? (
              <MultiSelectWithBranches
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
                      Loading options...
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
                      variable.type === 'number' ? Number(e.target.value) : e.target.value,
                  }))
                }
                placeholder={`Enter ${variable.label.toLowerCase()}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const credentialsContent = hasCredentials && (
    <div className="space-y-4">
      {!showTabs && <h4 className="text-sm font-medium">Update Credentials</h4>}
      <div className="rounded-md bg-muted/50 border border-border p-3 space-y-1">
        <p className="text-xs text-muted-foreground">
          Leave fields empty to keep existing values. Only fill in fields you want to update.
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-3 w-3 text-green-600 dark:text-green-500"
          >
            <path
              fillRule="evenodd"
              d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z"
              clipRule="evenodd"
            />
          </svg>
          <span>Your credentials are encrypted at rest using AES-256-GCM encryption.</span>
        </p>
      </div>
      {credentialFields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={`cred-${field.id}`}>
            {field.label}
            {field.required && <span className="text-muted-foreground ml-1">(required)</span>}
          </Label>
          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
          {field.type === 'multi-select' ? (
            (() => {
              const selectedValues: string[] = Array.isArray(credentialValues[field.id])
                ? (credentialValues[field.id] as string[])
                : [];
              return (
                <MultipleSelector
                  value={selectedValues.map((val: string) => ({
                    value: val,
                    label: field.options?.find((opt) => opt.value === val)?.label || val,
                  }))}
                  onChange={(selected) =>
                    setCredentialValues((prev) => ({
                      ...prev,
                      [field.id]: selected.map((item) => item.value),
                    }))
                  }
                  defaultOptions={(field.options || []).map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  }))}
                  options={(field.options || []).map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  }))}
                  placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
                  creatable={!field.options || field.options.length === 0}
                  emptyIndicator={
                    <p className="text-center text-sm text-muted-foreground">No options</p>
                  }
                />
              );
            })()
          ) : field.type === 'textarea' ? (
            <textarea
              id={`cred-${field.id}`}
              placeholder={field.placeholder || `Enter new ${field.label.toLowerCase()}`}
              value={
                typeof credentialValues[field.id] === 'string' ? credentialValues[field.id] : ''
              }
              onChange={(e) =>
                setCredentialValues((prev) => ({ ...prev, [field.id]: e.target.value }))
              }
              className="bg-background border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            />
          ) : field.type === 'combobox' && field.options ? (
            (() => {
              const items = field.options.map((opt) => ({
                id: opt.value,
                label: opt.label,
              }));
              const currentValue: string =
                typeof credentialValues[field.id] === 'string'
                  ? (credentialValues[field.id] as string)
                  : '';
              // Find existing item or create synthetic one for custom values
              const selectedItem = currentValue
                ? (items.find((item) => item.id === currentValue) ?? {
                    id: currentValue,
                    label: currentValue,
                  })
                : undefined;
              return (
                <ComboboxDropdown
                  items={items}
                  selectedItem={selectedItem}
                  onSelect={(item) =>
                    setCredentialValues((prev) => ({ ...prev, [field.id]: item.id }))
                  }
                  onCreate={(customValue) =>
                    setCredentialValues((prev) => ({ ...prev, [field.id]: customValue }))
                  }
                  placeholder={field.placeholder || `Select ${field.label.toLowerCase()}...`}
                  searchPlaceholder="Search or type custom value..."
                  renderOnCreate={(customValue) => (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Use custom value:</span>
                      <span className="font-medium">{customValue}</span>
                    </div>
                  )}
                />
              );
            })()
          ) : field.type === 'select' && field.options ? (
            (() => {
              const stringValue: string =
                typeof credentialValues[field.id] === 'string'
                  ? (credentialValues[field.id] as string)
                  : '';
              return (
                <Select
                  value={stringValue}
                  onValueChange={(val) =>
                    setCredentialValues((prev) => ({ ...prev, [field.id]: val }))
                  }
                >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
                </Select>
              );
            })()
          ) : (
            <Input
              id={`cred-${field.id}`}
              type={field.type === 'password' ? 'password' : 'text'}
              placeholder={field.placeholder || `Enter new ${field.label.toLowerCase()}`}
              value={
                typeof credentialValues[field.id] === 'string' ? credentialValues[field.id] : ''
              }
              onChange={(e) =>
                setCredentialValues((prev) => ({ ...prev, [field.id]: e.target.value }))
              }
            />
          )}
        </div>
      ))}
    </div>
  );

  // Show tabs if both are available
  if (showTabs) {
    return (
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'variables' | 'credentials')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="variables" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="credentials" className="gap-2">
            <Key className="h-4 w-4" />
            Credentials
          </TabsTrigger>
        </TabsList>
        <TabsContent value="variables" className="mt-4">
          {variablesContent}
        </TabsContent>
        <TabsContent value="credentials" className="mt-4">
          {credentialsContent}
        </TabsContent>
      </Tabs>
    );
  }

  // Show only what's available
  return <div className="space-y-4">{variablesContent || credentialsContent}</div>;
}

function ConfigurationFooterActions({
  hasVariables,
  hasCredentials,
  showTabs,
  activeTab,
  savingVariables,
  handleSaveVariables,
  isTargetReposValid,
  savingCredentials,
  handleSaveCredentials,
  showActionsFooter,
}: {
  hasVariables: boolean;
  hasCredentials: boolean;
  showTabs: boolean;
  activeTab: 'variables' | 'credentials';
  savingVariables: boolean;
  handleSaveVariables: () => void;
  isTargetReposValid: boolean;
  savingCredentials: boolean;
  handleSaveCredentials: () => void;
  showActionsFooter: boolean;
}) {
  if (!hasVariables && !hasCredentials) {
    return null;
  }

  const showVariablesButton = hasVariables && (!showTabs || activeTab === 'variables');
  const showCredentialsButton = hasCredentials && (!showTabs || activeTab === 'credentials');
  const footerClassName = showActionsFooter ? 'pt-4' : 'border-t pt-4';

  return (
    <div className={footerClassName}>
      {showVariablesButton && (
        <Button
          onClick={handleSaveVariables}
          disabled={savingVariables || !isTargetReposValid}
          className="w-full"
        >
          {savingVariables ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Configuration'
          )}
        </Button>
      )}
      {showCredentialsButton && (
        <Button onClick={handleSaveCredentials} disabled={savingCredentials} className="w-full">
          {savingCredentials ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Credentials'
          )}
        </Button>
      )}
    </div>
  );
}

/**
 * Parse a stored value like "owner/repo:branch" into parts.
 * Handles trailing colons, empty branches, and non-string values.
 */
const parseRepoBranch = (value: unknown): { repo: string; branch: string } => {
  // Safely convert to string to handle corrupted/migrated data
  const stringValue = String(value ?? '');
  // Remove trailing colon if present
  const cleanValue = stringValue.endsWith(':') ? stringValue.slice(0, -1) : stringValue;
  const colonIndex = cleanValue.lastIndexOf(':');

  if (colonIndex > 0 && colonIndex < cleanValue.length - 1) {
    return {
      repo: cleanValue.substring(0, colonIndex),
      branch: cleanValue.substring(colonIndex + 1),
    };
  }
  // No branch specified - return empty string so user can type
  return { repo: cleanValue, branch: '' };
};

/**
 * Format repo and branch into stored format.
 * If branch is empty, just store the repo (will default to main on parse).
 */
const formatRepoBranch = (repo: string, branch: string): string => {
  const trimmedBranch = branch.trim();
  if (!trimmedBranch) {
    return repo; // No colon when branch is empty
  }
  return `${repo}:${trimmedBranch}`;
};

/**
 * Multi-select with optional branch inputs for GitHub repos.
 * When variable.id is 'target_repos', shows branch input for each selected repo.
 */
function MultiSelectWithBranches({
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

  // For target_repos, parse values to extract repos and branches
  const isGitHubRepos = variable.id === 'target_repos';
  const parsedConfigs = isGitHubRepos ? selectedValues.map(parseRepoBranch) : [];

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
  }, [variable.hasDynamicOptions, options.length, isLoadingOptions, onLoadOptions]);

  // Handle repo selection change
  const handleRepoSelectionChange = (selectedRepos: string[]) => {
    if (!isGitHubRepos) {
      onChange(selectedRepos);
      return;
    }

    // For GitHub repos, preserve existing branches when repos are reselected
    const newValues = selectedRepos.map((repo) => {
      // Check if this repo already exists in current values
      const existing = parsedConfigs.find((c) => c.repo === repo);
      // Use existing branch, or empty string for new repos (user will type it)
      return formatRepoBranch(repo, existing?.branch || '');
    });
    onChange(newValues);
  };

  // Handle branch change for a specific repo
  const handleBranchChange = (repo: string, branch: string) => {
    const newValues = selectedValues.map((v) => {
      const parsed = parseRepoBranch(v);
      if (parsed.repo === repo) {
        // Allow empty string during editing - will default to main on save if empty
        return formatRepoBranch(repo, branch);
      }
      return v;
    });
    onChange(newValues);
  };

  // Handle removing a repo
  const handleRemoveRepo = (repo: string) => {
    const newValues = selectedValues.filter((v) => parseRepoBranch(v).repo !== repo);
    onChange(newValues);
  };

  // Get repos from values for display in multi-select
  const reposForSelector = isGitHubRepos ? parsedConfigs.map((c) => c.repo) : selectedValues;

  return (
    <div className="space-y-3">
      <MultipleSelector
        value={reposForSelector.map((v) => ({
          value: v,
          label: options.find((o) => o.value === v)?.label || v,
        }))}
        onChange={(selected) => handleRepoSelectionChange(selected.map((s) => s.value))}
        defaultOptions={options.map((o) => ({ value: o.value, label: o.label }))}
        options={options.map((o) => ({ value: o.value, label: o.label }))}
        placeholder={`Select ${variable.label.toLowerCase()}...`}
        emptyIndicator={
          isLoadingOptions ? (
            <div className="flex items-center gap-2 py-2 px-3 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading options...
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">No options available</p>
          )
        }
      />

      {/* Branch inputs for GitHub repos */}
      {isGitHubRepos && parsedConfigs.length > 0 && (
        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Specify branches for each repository (comma-separated for multiple):
          </p>
          {parsedConfigs.map((config) => {
            const isEmpty = !config.branch.trim();
            return (
              <div key={config.repo} className="flex items-center gap-2">
                <span className="shrink-0 rounded bg-secondary px-2 py-1 font-mono text-xs">
                  {config.repo}
                </span>
                <span className="text-muted-foreground">:</span>
                <Input
                  value={config.branch}
                  onChange={(e) => handleBranchChange(config.repo, e.target.value)}
                  placeholder="main, develop"
                  className={`h-8 flex-1 font-mono text-sm ${
                    isEmpty ? 'border-destructive bg-destructive/5 focus-visible:ring-destructive' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveRepo(config.repo)}
                  className="shrink-0 rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          {parsedConfigs.some((c) => !c.branch.trim()) && (
            <p className="text-xs text-destructive">
              Each repository must have at least one branch specified.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

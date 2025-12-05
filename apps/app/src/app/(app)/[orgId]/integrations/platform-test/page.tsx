'use client';

import {
  useIntegrationConnections,
  useIntegrationMutations,
  useIntegrationProviders,
  type OAuthAvailability,
} from '@/hooks/use-integration-platform';
import { api } from '@/lib/api-client';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Key,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface CheckLog {
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

interface CheckFinding {
  resourceType: string;
  resourceId: string;
  title: string;
  description?: string;
  severity: string;
  remediation?: string;
}

interface CheckPassingResult {
  resourceType: string;
  resourceId: string;
  title: string;
  description?: string;
  evidence?: Record<string, unknown>;
  collectedAt?: string;
}

interface CheckResultSummary {
  totalChecked: number;
  passed: number;
  failed: number;
}

interface CheckRunResponse {
  connectionId: string;
  providerSlug: string;
  results: Array<{
    checkId: string;
    checkName: string;
    status: 'success' | 'failed' | 'error';
    result: {
      findings: CheckFinding[];
      passingResults: CheckPassingResult[];
      logs: CheckLog[];
      summary?: CheckResultSummary;
    };
    error?: string;
    durationMs: number;
  }>;
  totalFindings: number;
  totalPassing: number;
  durationMs: number;
}

interface VariableDefinition {
  id: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multi-select';
  required: boolean;
  default?: string | number | boolean | string[];
  helpText?: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  hasDynamicOptions: boolean;
  currentValue?: string | number | boolean | string[];
}

interface ConnectionVariablesResponse {
  connectionId: string;
  providerSlug: string;
  variables: VariableDefinition[];
}

interface CheckDefinition {
  id: string;
  name: string;
  description: string;
  defaultSeverity: string;
  taskMapping?: string;
  variableIds: string[];
}

interface ConnectionChecksResponse {
  connectionId: string;
  providerSlug: string;
  checks: CheckDefinition[];
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { color: string; icon: React.ReactNode }> = {
    active: {
      color: 'bg-green-500/10 text-green-500',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    pending: {
      color: 'bg-yellow-500/10 text-yellow-500',
      icon: <AlertCircle className="h-3 w-3" />,
    },
    error: {
      color: 'bg-red-500/10 text-red-500',
      icon: <XCircle className="h-3 w-3" />,
    },
    paused: {
      color: 'bg-gray-500/10 text-gray-500',
      icon: <Pause className="h-3 w-3" />,
    },
    disconnected: {
      color: 'bg-gray-500/10 text-gray-500',
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  const variant = variants[status] || variants.pending;

  return (
    <Badge className={`${variant.color} gap-1`}>
      {variant.icon}
      {status}
    </Badge>
  );
}

function DebugSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function JsonDisplay({ data }: { data: unknown }) {
  return (
    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-64 font-mono">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function OAuthAvailabilityCard({
  providerSlug,
  providerName,
  onLog,
}: {
  providerSlug: string;
  providerName: string;
  onLog: (message: string) => void;
}) {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;

  const [availability, setAvailability] = useState<OAuthAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const checkAvailability = useCallback(async () => {
    if (!orgId) return;

    setIsLoading(true);
    setError(null);
    onLog(`Checking OAuth availability for ${providerSlug}...`);

    const response = await api.get<OAuthAvailability>(
      `/v1/integrations/oauth/availability?providerSlug=${providerSlug}&organizationId=${orgId}`,
    );

    if (response.error) {
      setError(response.error);
      onLog(`❌ ${response.error}`);
    } else {
      setAvailability(response.data || null);
      const data = response.data;
      if (data?.available) {
        onLog(
          `✅ OAuth available (org: ${data.hasOrgCredentials}, platform: ${data.hasPlatformCredentials})`,
        );
      } else {
        onLog(`⚠️ OAuth not available - credentials need to be configured`);
      }
    }

    setIsLoading(false);
  }, [orgId, providerSlug, onLog]);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  const handleSaveCredentials = async () => {
    if (!orgId || !clientId || !clientSecret) return;

    setIsSaving(true);
    onLog(`Saving OAuth credentials for ${providerSlug}...`);

    const response = await api.post('/v1/integrations/oauth-apps', {
      providerSlug,
      organizationId: orgId,
      clientId,
      clientSecret,
    });

    if (response.error) {
      onLog(`❌ ${response.error}`);
    } else {
      onLog(`✅ OAuth credentials saved`);
      setClientId('');
      setClientSecret('');
      setShowConfig(false);
      checkAvailability();
    }

    setIsSaving(false);
  };

  const handleDeleteCredentials = async () => {
    if (!orgId) return;
    if (!confirm('Delete custom OAuth credentials?')) return;

    onLog(`Deleting OAuth credentials for ${providerSlug}...`);

    const response = await api.delete(
      `/v1/integrations/oauth-apps/${providerSlug}?organizationId=${orgId}`,
      orgId,
    );

    if (response.error) {
      onLog(`❌ ${response.error}`);
    } else {
      onLog(`✅ OAuth credentials deleted`);
      checkAvailability();
    }
  };

  return (
    <div className="p-3 bg-muted/30 rounded-md border">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-sm">{providerName}</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={checkAvailability} disabled={isLoading}>
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowConfig(!showConfig)}>
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {error && <div className="text-xs text-red-500 mb-2 p-2 bg-red-500/10 rounded">{error}</div>}

      {availability && (
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              {availability.available ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <XCircle className="h-3 w-3 text-red-500" />
              )}
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              {availability.hasOrgCredentials ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <XCircle className="h-3 w-3 text-gray-400" />
              )}
              <span>Org Creds</span>
            </div>
            <div className="flex items-center gap-1">
              {availability.hasPlatformCredentials ? (
                <CheckCircle2 className="h-3 w-3 text-green-500" />
              ) : (
                <XCircle className="h-3 w-3 text-gray-400" />
              )}
              <span>Platform Creds</span>
            </div>
          </div>

          {!availability.available && availability.setupInstructions && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Setup Instructions</summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs whitespace-pre-wrap">
                {availability.setupInstructions}
              </pre>
            </details>
          )}

          {availability.createAppUrl && (
            <a
              href={availability.createAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Create OAuth App
            </a>
          )}
        </div>
      )}

      {showConfig && (
        <div className="mt-3 pt-3 border-t space-y-3">
          <div className="text-xs font-medium flex items-center gap-1">
            <Key className="h-3 w-3" />
            Configure Custom OAuth App
          </div>

          <div className="space-y-2">
            <div>
              <Label className="text-xs">Client ID</Label>
              <Input
                size={1}
                className="h-8 text-xs font-mono"
                placeholder="Your OAuth App Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Client Secret</Label>
              <Input
                size={1}
                type="password"
                className="h-8 text-xs font-mono"
                placeholder="Your OAuth App Client Secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSaveCredentials}
              disabled={!clientId || !clientSecret || isSaving}
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Save Credentials
            </Button>

            {availability?.hasOrgCredentials && (
              <Button size="sm" variant="destructive" onClick={handleDeleteCredentials}>
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Connection Variables Configuration
// ============================================================================

function ConnectionVariablesConfig({
  connectionId,
  providerSlug,
  onLog,
  onSaved,
}: {
  connectionId: string;
  providerSlug: string;
  onLog: (message: string) => void;
  onSaved: () => void;
}) {
  const [variables, setVariables] = useState<VariableDefinition[]>([]);
  const [values, setValues] = useState<Record<string, string | number | boolean | string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingOptions, setFetchingOptions] = useState<string | null>(null);

  // Load variables on mount
  useEffect(() => {
    const fetchVariables = async () => {
      setLoading(true);
      try {
        onLog(`Fetching variables for connection ${connectionId}...`);
        const response = await api.get<ConnectionVariablesResponse>(
          `/v1/integrations/variables/connections/${connectionId}`,
        );

        if (response.data?.variables) {
          setVariables(response.data.variables);

          // Initialize values with current or default values
          const initialValues: Record<string, string | number | boolean | string[]> = {};
          for (const v of response.data.variables) {
            if (v.currentValue !== undefined) {
              initialValues[v.id] = v.currentValue;
            } else if (v.default !== undefined) {
              initialValues[v.id] = v.default;
            }
          }
          setValues(initialValues);
          onLog(`Loaded ${response.data.variables.length} variables`);
        }
      } catch (error) {
        onLog(`Error fetching variables: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    fetchVariables();
  }, [connectionId, onLog]);

  const handleFetchOptions = async (variableId: string) => {
    setFetchingOptions(variableId);
    try {
      onLog(`Fetching options for ${variableId}...`);
      const response = await api.get<{ options: Array<{ value: string; label: string }> }>(
        `/v1/integrations/variables/connections/${connectionId}/options/${variableId}`,
      );

      const options = response.data?.options;
      if (options) {
        setVariables((prev) => prev.map((v) => (v.id === variableId ? { ...v, options } : v)));
        onLog(`Loaded ${options.length} options for ${variableId}`);
      }
    } catch (error) {
      onLog(`Error fetching options: ${error}`);
    } finally {
      setFetchingOptions(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      onLog(`Saving variables for connection ${connectionId}...`);
      await api.post(`/v1/integrations/variables/connections/${connectionId}`, {
        variables: values,
      });
      onLog('Variables saved successfully');
      onSaved();
    } catch (error) {
      onLog(`Error saving variables: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const updateValue = (variableId: string, value: string | number | boolean | string[]) => {
    setValues((prev) => ({ ...prev, [variableId]: value }));
  };

  if (loading) {
    return (
      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
        <div className="flex items-center gap-2 text-sm text-blue-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading variables...
        </div>
      </div>
    );
  }

  if (variables.length === 0) {
    return null;
  }

  return (
    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
        <Settings className="h-4 w-4" />
        Configure Check Variables
      </div>

      <div className="space-y-3">
        {variables.map((variable) => (
          <div key={variable.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                {variable.label}
                {variable.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {variable.hasDynamicOptions && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={() => handleFetchOptions(variable.id)}
                  disabled={fetchingOptions === variable.id}
                >
                  {fetchingOptions === variable.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Load Options
                    </>
                  )}
                </Button>
              )}
            </div>

            {variable.type === 'text' && (
              <Input
                size={1}
                className="h-8 text-xs"
                placeholder={variable.placeholder}
                value={(values[variable.id] as string) || ''}
                onChange={(e) => updateValue(variable.id, e.target.value)}
              />
            )}

            {variable.type === 'number' && (
              <Input
                size={1}
                type="number"
                className="h-8 text-xs"
                placeholder={variable.placeholder}
                value={(values[variable.id] as number) || ''}
                onChange={(e) => updateValue(variable.id, Number(e.target.value))}
              />
            )}

            {variable.type === 'boolean' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(values[variable.id] as boolean) || false}
                  onChange={(e) => updateValue(variable.id, e.target.checked)}
                />
                <span className="text-xs text-muted-foreground">{variable.helpText}</span>
              </div>
            )}

            {variable.type === 'select' && (
              <select
                className="w-full h-8 text-xs px-2 border rounded-md bg-background"
                value={(values[variable.id] as string) || ''}
                onChange={(e) => updateValue(variable.id, e.target.value)}
              >
                <option value="">Select...</option>
                {variable.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

            {variable.type === 'multi-select' && (
              <div className="space-y-1">
                {variable.options && variable.options.length > 0 ? (
                  <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                    {variable.options.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={((values[variable.id] as string[]) || []).includes(opt.value)}
                          onChange={(e) => {
                            const current = (values[variable.id] as string[]) || [];
                            if (e.target.checked) {
                              updateValue(variable.id, [...current, opt.value]);
                            } else {
                              updateValue(
                                variable.id,
                                current.filter((v) => v !== opt.value),
                              );
                            }
                          }}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground p-2 border rounded-md">
                    Click "Load Options" to fetch available choices
                  </div>
                )}
              </div>
            )}

            {variable.helpText && variable.type !== 'boolean' && (
              <p className="text-xs text-muted-foreground">{variable.helpText}</p>
            )}
          </div>
        ))}
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
        Save Variables
      </Button>
    </div>
  );
}

// ============================================================================
// Individual Check Testing Component
// ============================================================================

function ConnectionChecksTester({
  connectionId,
  providerSlug,
  onLog,
}: {
  connectionId: string;
  providerSlug: string;
  onLog: (message: string) => void;
}) {
  const [checks, setChecks] = useState<CheckDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState<string | null>(null);
  const [checkResults, setCheckResults] = useState<Record<string, CheckRunResponse['results'][0]>>(
    {},
  );

  // Load checks on mount
  useEffect(() => {
    const fetchChecks = async () => {
      setLoading(true);
      try {
        onLog(`Fetching available checks for ${providerSlug}...`);
        const response = await api.get<ConnectionChecksResponse>(
          `/v1/integrations/checks/connections/${connectionId}`,
        );

        if (response.data?.checks) {
          setChecks(response.data.checks);
          onLog(`Found ${response.data.checks.length} checks`);
        }
      } catch (error) {
        onLog(`Error fetching checks: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    fetchChecks();
  }, [connectionId, providerSlug, onLog]);

  const handleRunCheck = async (checkId: string) => {
    setRunningCheck(checkId);
    onLog(`Running check: ${checkId}...`);

    try {
      const response = await api.post<CheckRunResponse>(
        `/v1/integrations/checks/connections/${connectionId}/run`,
        { checkId },
      );

      if (response.data?.results?.[0]) {
        const result = response.data.results[0];
        setCheckResults((prev) => ({ ...prev, [checkId]: result }));
        onLog(
          `Check ${checkId} completed: ${result.result.findings.length} findings, ${result.result.passingResults.length} passing (${result.durationMs}ms)`,
        );
      }
    } catch (error) {
      onLog(`Error running check ${checkId}: ${error}`);
    } finally {
      setRunningCheck(null);
    }
  };

  const handleRunAll = async () => {
    setRunningCheck('all');
    onLog(`Running all checks...`);

    try {
      const response = await api.post<CheckRunResponse>(
        `/v1/integrations/checks/connections/${connectionId}/run`,
        {},
      );

      if (response.data?.results) {
        const newResults: Record<string, CheckRunResponse['results'][0]> = {};
        for (const result of response.data.results) {
          newResults[result.checkId] = result;
        }
        setCheckResults(newResults);
        onLog(
          `All checks completed: ${response.data.totalFindings} total findings, ${response.data.totalPassing} passing (${response.data.durationMs}ms)`,
        );
      }
    } catch (error) {
      onLog(`Error running checks: ${error}`);
    } finally {
      setRunningCheck(null);
    }
  };

  if (loading) {
    return (
      <div className="p-3 bg-muted/50 rounded-md">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading checks...
        </div>
      </div>
    );
  }

  if (checks.length === 0) {
    return (
      <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
        No checks defined for this integration
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Available Checks ({checks.length})
        </div>
        <Button size="sm" variant="default" onClick={handleRunAll} disabled={runningCheck !== null}>
          {runningCheck === 'all' ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Play className="h-3 w-3 mr-1" />
          )}
          Run All
        </Button>
      </div>

      <div className="space-y-2">
        {checks.map((check) => {
          const result = checkResults[check.id];

          return (
            <div key={check.id} className="p-3 bg-muted/30 rounded-md border">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="font-medium text-sm">{check.name}</div>
                  <div className="text-xs text-muted-foreground">{check.description}</div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">
                    ID: {check.id} • Severity: {check.defaultSeverity}
                    {check.taskMapping && ` • Task: ${check.taskMapping}`}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRunCheck(check.id)}
                  disabled={runningCheck !== null}
                >
                  {runningCheck === check.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
              </div>

              {result && (
                <div className="mt-2 pt-2 border-t space-y-2">
                  <div className="flex items-center gap-3 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        result.status === 'success'
                          ? 'bg-green-500/20 text-green-600'
                          : result.status === 'error'
                            ? 'bg-red-500/20 text-red-600'
                            : 'bg-yellow-500/20 text-yellow-600'
                      }`}
                    >
                      {result.status}
                    </span>
                    <span className="text-muted-foreground">{result.durationMs}ms</span>
                    {result.result.summary && (
                      <span className="text-muted-foreground">
                        {result.result.summary.totalChecked} checked
                      </span>
                    )}
                    <span className="text-green-600">
                      ✓ {result.result.passingResults.length} passing
                    </span>
                    <span className="text-red-600">✗ {result.result.findings.length} findings</span>
                  </div>

                  {result.error && (
                    <div className="text-xs text-red-500 p-2 bg-red-500/10 rounded">
                      {result.error}
                    </div>
                  )}

                  {result.result.findings.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-red-600 font-medium">
                        ✗ Findings ({result.result.findings.length})
                      </summary>
                      <div className="mt-1 space-y-1 max-h-60 overflow-y-auto">
                        {result.result.findings.map((finding, i) => (
                          <div
                            key={i}
                            className="p-2 bg-red-500/10 rounded border border-red-500/20"
                          >
                            <div className="font-medium">{finding.title}</div>
                            {finding.description && (
                              <div className="text-muted-foreground mt-1">
                                {finding.description}
                              </div>
                            )}
                            <div className="text-muted-foreground mt-1">
                              <span className="font-mono">
                                {finding.resourceType}: {finding.resourceId}
                              </span>{' '}
                              •{' '}
                              <span
                                className={
                                  finding.severity === 'critical' || finding.severity === 'high'
                                    ? 'text-red-500'
                                    : finding.severity === 'medium'
                                      ? 'text-yellow-500'
                                      : 'text-muted-foreground'
                                }
                              >
                                {finding.severity}
                              </span>
                            </div>
                            {finding.remediation && (
                              <div className="mt-2 p-2 bg-blue-500/10 rounded text-blue-600">
                                <span className="font-medium">Remediation:</span>{' '}
                                {finding.remediation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {result.result.passingResults.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-green-600 font-medium">
                        ✓ Passing ({result.result.passingResults.length})
                      </summary>
                      <div className="mt-1 space-y-1 max-h-60 overflow-y-auto">
                        {result.result.passingResults.map((pass, i) => (
                          <div
                            key={i}
                            className="p-2 bg-green-500/10 rounded border border-green-500/20"
                          >
                            <div className="font-medium">{pass.title}</div>
                            {pass.description && (
                              <div className="text-muted-foreground mt-1">{pass.description}</div>
                            )}
                            <div className="text-muted-foreground mt-1 font-mono">
                              {pass.resourceType}: {pass.resourceId}
                            </div>
                            {pass.evidence && Object.keys(pass.evidence).length > 0 && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-blue-600 font-medium">
                                  Evidence (click to expand)
                                </summary>
                                <pre className="mt-1 p-2 bg-black/50 text-green-400 rounded overflow-x-auto text-[10px]">
                                  {JSON.stringify(pass.evidence, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Execution Logs */}
                  {result.result.logs && result.result.logs.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground font-medium">
                        📋 Execution Log ({result.result.logs.length} entries)
                      </summary>
                      <div className="mt-1 p-2 bg-black rounded max-h-60 overflow-y-auto font-mono text-[10px]">
                        {result.result.logs.map((log, i) => (
                          <div
                            key={i}
                            className={`py-0.5 ${
                              log.level === 'error'
                                ? 'text-red-400'
                                : log.level === 'warn'
                                  ? 'text-yellow-400'
                                  : 'text-green-400'
                            }`}
                          >
                            <span className="text-gray-500">
                              [{new Date(log.timestamp).toLocaleTimeString()}]
                            </span>{' '}
                            <span
                              className={`uppercase ${
                                log.level === 'error'
                                  ? 'text-red-500'
                                  : log.level === 'warn'
                                    ? 'text-yellow-500'
                                    : 'text-blue-500'
                              }`}
                            >
                              [{log.level}]
                            </span>{' '}
                            {log.message}
                            {log.data && (
                              <span className="text-gray-400"> {JSON.stringify(log.data)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function IntegrationPlatformTestPage() {
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const {
    providers,
    isLoading: providersLoading,
    error: providersError,
    refresh: refreshProviders,
  } = useIntegrationProviders();

  const {
    connections,
    isLoading: connectionsLoading,
    error: connectionsError,
    refresh: refreshConnections,
  } = useIntegrationConnections();

  const {
    startOAuth,
    testConnection,
    pauseConnection,
    resumeConnection,
    disconnectConnection,
    deleteConnection,
  } = useIntegrationMutations();

  const log = useCallback((message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setActionLog((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  }, []);

  const handleStartOAuth = async (providerSlug: string) => {
    setIsLoading(`oauth-${providerSlug}`);
    log(`Starting OAuth for ${providerSlug}...`);

    const result = await startOAuth(providerSlug);

    if (result.success && result.authorizationUrl) {
      log(`✅ Got authorization URL, redirecting...`);
      window.location.href = result.authorizationUrl;
    } else {
      log(`❌ OAuth failed: ${result.error}`);
    }

    setIsLoading(null);
  };

  const handleTestConnection = async (connectionId: string, providerSlug: string) => {
    setIsLoading(`test-${connectionId}`);
    log(`Testing connection ${connectionId} (${providerSlug})...`);

    const result = await testConnection(connectionId);
    log(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);

    setIsLoading(null);
    refreshConnections();
  };

  const handlePause = async (connectionId: string) => {
    setIsLoading(`pause-${connectionId}`);
    log(`Pausing connection ${connectionId}...`);

    const result = await pauseConnection(connectionId);
    log(result.success ? '✅ Connection paused' : `❌ ${result.error}`);

    setIsLoading(null);
    refreshConnections();
  };

  const handleResume = async (connectionId: string) => {
    setIsLoading(`resume-${connectionId}`);
    log(`Resuming connection ${connectionId}...`);

    const result = await resumeConnection(connectionId);
    log(result.success ? '✅ Connection resumed' : `❌ ${result.error}`);

    setIsLoading(null);
    refreshConnections();
  };

  const handleDisconnect = async (connectionId: string) => {
    setIsLoading(`disconnect-${connectionId}`);
    log(`Disconnecting ${connectionId}...`);

    const result = await disconnectConnection(connectionId);
    log(result.success ? '✅ Disconnected' : `❌ ${result.error}`);

    setIsLoading(null);
    refreshConnections();
  };

  const handleDelete = async (connectionId: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;

    setIsLoading(`delete-${connectionId}`);
    log(`Deleting connection ${connectionId}...`);

    const result = await deleteConnection(connectionId);
    log(result.success ? '✅ Deleted' : `❌ ${result.error}`);

    setIsLoading(null);
    refreshConnections();
  };

  const handleRunChecks = async (connectionId: string, providerSlug: string, checkId?: string) => {
    const loadingKey = checkId ? `check-${connectionId}-${checkId}` : `checks-${connectionId}`;
    setIsLoading(loadingKey);
    log(`Running ${checkId || 'all'} checks for ${providerSlug}...`);

    try {
      const response = await api.post<CheckRunResponse>(
        `/v1/integrations/checks/connections/${connectionId}/run`,
        checkId ? { checkId } : {},
      );

      if (response.error) {
        log(`❌ Check run failed: ${response.error}`);
      } else if (response.data) {
        const { totalFindings, totalPassing, durationMs, results } = response.data;
        log(`✅ Checks completed in ${durationMs}ms`);
        log(`   📊 ${totalFindings} findings, ${totalPassing} passing`);

        for (const result of results || []) {
          const icon = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⚠️';
          log(`   ${icon} ${result.checkName}: ${result.result.findings.length} findings`);
        }
      }
    } catch (error) {
      log(`❌ Error running checks: ${error}`);
    }

    setIsLoading(null);
  };

  const oauthProviders = providers.filter((p) => p.authType === 'oauth2');

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Integration Platform Test Page</h1>
        <p className="text-muted-foreground text-sm">
          Debug page for testing the integration platform API and OAuth flows.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Providers */}
        <div>
          <DebugSection title="Available Providers">
            <div className="flex items-center gap-2 mb-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => refreshProviders()}
                disabled={providersLoading}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${providersLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {providersLoading && (
                <span className="text-xs text-muted-foreground">Loading...</span>
              )}
              {providersError && <span className="text-xs text-red-500">{providersError}</span>}
            </div>

            {providers.length === 0 && !providersLoading ? (
              <p className="text-sm text-muted-foreground">No providers found</p>
            ) : (
              <div className="space-y-2">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                  >
                    <div>
                      <div className="font-medium text-sm">{provider.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {provider.id} • {provider.authType} • {provider.category}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={provider.isActive ? 'default' : 'secondary'}>
                        {provider.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {provider.authType === 'oauth2' && (
                        <Button
                          size="sm"
                          onClick={() => handleStartOAuth(provider.id)}
                          disabled={isLoading === `oauth-${provider.id}`}
                        >
                          {isLoading === `oauth-${provider.id}` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Connect
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <details className="mt-3">
              <summary className="text-xs text-muted-foreground cursor-pointer">
                Raw Response
              </summary>
              <JsonDisplay data={providers} />
            </details>
          </DebugSection>

          {/* OAuth Availability */}
          {oauthProviders.length > 0 && (
            <DebugSection title="OAuth Credentials Status">
              <div className="space-y-3">
                {oauthProviders.map((provider) => (
                  <OAuthAvailabilityCard
                    key={provider.id}
                    providerSlug={provider.id}
                    providerName={provider.name}
                    onLog={log}
                  />
                ))}
              </div>
            </DebugSection>
          )}
        </div>

        {/* Middle Column - Connections */}
        <div>
          <DebugSection title="Connections">
            <div className="flex items-center gap-2 mb-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => refreshConnections()}
                disabled={connectionsLoading}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${connectionsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {connectionsLoading && (
                <span className="text-xs text-muted-foreground">Loading...</span>
              )}
              {connectionsError && <span className="text-xs text-red-500">{connectionsError}</span>}
            </div>

            {connections.length === 0 && !connectionsLoading ? (
              <p className="text-sm text-muted-foreground">No connections found</p>
            ) : (
              <div className="space-y-2">
                {connections.map((conn) => (
                  <div key={conn.id} className="p-3 bg-muted/50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium text-sm">
                          {conn.providerName || conn.providerSlug}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{conn.id}</div>
                      </div>
                      <StatusBadge status={conn.status} />
                    </div>

                    <div className="text-xs text-muted-foreground mb-2">
                      Auth: {conn.authStrategy} • Last sync:{' '}
                      {conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString() : 'Never'}
                    </div>

                    {conn.variables && Object.keys(conn.variables).length > 0 && (
                      <div className="text-xs mb-2 p-2 bg-green-500/10 border border-green-500/20 rounded">
                        <div className="font-medium text-green-600 mb-1">Configured Variables:</div>
                        <div className="space-y-0.5 font-mono">
                          {Object.entries(conn.variables).map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="text-foreground">
                                {Array.isArray(value)
                                  ? value.length > 0
                                    ? value.join(', ')
                                    : '(empty)'
                                  : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {conn.errorMessage && (
                      <div className="text-xs text-red-500 mb-2 p-2 bg-red-500/10 rounded">
                        {conn.errorMessage}
                      </div>
                    )}

                    <div className="flex gap-1 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestConnection(conn.id, conn.providerSlug)}
                        disabled={isLoading === `test-${conn.id}`}
                      >
                        {isLoading === `test-${conn.id}` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Test
                          </>
                        )}
                      </Button>

                      {conn.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePause(conn.id)}
                          disabled={isLoading === `pause-${conn.id}`}
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          Pause
                        </Button>
                      )}

                      {conn.status === 'paused' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResume(conn.id)}
                          disabled={isLoading === `resume-${conn.id}`}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Resume
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDisconnect(conn.id)}
                        disabled={isLoading === `disconnect-${conn.id}`}
                      >
                        Disconnect
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(conn.id)}
                        disabled={isLoading === `delete-${conn.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Variables Configuration */}
                    {conn.status === 'active' && (
                      <div className="mt-3">
                        <ConnectionVariablesConfig
                          connectionId={conn.id}
                          providerSlug={conn.providerSlug}
                          onLog={log}
                          onSaved={() => {
                            log(`Variables saved for ${conn.providerSlug}`);
                            refreshConnections();
                          }}
                        />
                      </div>
                    )}

                    {/* Individual Check Testing */}
                    {conn.status === 'active' && (
                      <div className="mt-3 pt-3 border-t">
                        <ConnectionChecksTester
                          connectionId={conn.id}
                          providerSlug={conn.providerSlug}
                          onLog={log}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <details className="mt-3">
              <summary className="text-xs text-muted-foreground cursor-pointer">
                Raw Response
              </summary>
              <JsonDisplay data={connections} />
            </details>
          </DebugSection>
        </div>

        {/* Right Column - Logs & Status */}
        <div>
          <DebugSection title="Action Log">
            <div className="bg-black text-green-400 p-3 rounded-md font-mono text-xs h-80 overflow-auto">
              {actionLog.length === 0 ? (
                <span className="text-gray-500">No actions yet...</span>
              ) : (
                actionLog.map((entry, i) => (
                  <div key={i} className="mb-1">
                    {entry}
                  </div>
                ))
              )}
            </div>
          </DebugSection>

          <DebugSection title="API Status">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Providers API</span>
                {providersLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                ) : providersError ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>Connections API</span>
                {connectionsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                ) : connectionsError ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>Providers Count</span>
                <Badge variant="outline">{providers.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Connections Count</span>
                <Badge variant="outline">{connections.length}</Badge>
              </div>
            </div>
          </DebugSection>

          <DebugSection title="Environment">
            <div className="text-xs font-mono space-y-1">
              <div>
                <span className="text-muted-foreground">API_URL: </span>
                {process.env.NEXT_PUBLIC_API_URL || 'not set'}
              </div>
              <div>
                <span className="text-muted-foreground">Current URL: </span>
                {typeof window !== 'undefined' ? window.location.href : 'SSR'}
              </div>
            </div>
          </DebugSection>

          <DebugSection title="Quick Actions">
            <div className="space-y-2">
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  refreshProviders();
                  refreshConnections();
                  log('Refreshed all data');
                }}
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Refresh All
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={() => setActionLog([])}
              >
                <Trash2 className="h-3 w-3 mr-2" />
                Clear Log
              </Button>
            </div>
          </DebugSection>
        </div>
      </div>
    </div>
  );
}

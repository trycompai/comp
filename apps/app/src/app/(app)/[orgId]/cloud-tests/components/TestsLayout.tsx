'use client';

import { Button } from '@comp/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import { Integration } from '@db';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { Plus, Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Fetcher } from 'swr';
import useSWR from 'swr';
import { runTests } from '../actions/run-tests';
import {
  isActiveRunStatus,
  isFailureRunStatus,
  isSuccessfulRunStatus,
  isTaskRunStatus,
  isTerminalRunStatus,
} from '../status';
import type { IntegrationRunOutput } from '../types';
import { ChatPlaceholder } from './ChatPlaceholder';
import { CloudSettingsModal } from './CloudSettingsModal';
import { EmptyState } from './EmptyState';
import { ResultsView } from './ResultsView';

interface Finding {
  id: string;
  title: string | null;
  description: string | null;
  remediation: string | null;
  status: string | null;
  severity: string | null;
  completedAt: Date | null;
  integration: {
    integrationId: string;
  };
}

interface TestsLayoutProps {
  initialFindings: Finding[];
  initialProviders: Integration[];
}

type SupportedProviderId = 'aws' | 'gcp' | 'azure';
type SupportedIntegration = Integration & { integrationId: SupportedProviderId };
type TriggerInfo = {
  taskId?: string;
  publicAccessToken?: string;
};

const SUPPORTED_PROVIDER_IDS: readonly SupportedProviderId[] = ['aws', 'gcp', 'azure'];
const SUPPORTED_PROVIDER_ID_SET: ReadonlySet<SupportedProviderId> = new Set(SUPPORTED_PROVIDER_IDS);

const isSupportedProviderId = (integrationId: string): integrationId is SupportedProviderId =>
  SUPPORTED_PROVIDER_ID_SET.has(integrationId as SupportedProviderId);

const isIntegrationRunOutput = (value: unknown): value is IntegrationRunOutput => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as {
    success?: unknown;
    errors?: unknown;
    failedIntegrations?: unknown;
  };

  if (typeof candidate.success !== 'boolean') {
    return false;
  }

  if (
    candidate.errors !== undefined &&
    (!Array.isArray(candidate.errors) || candidate.errors.some((item) => typeof item !== 'string'))
  ) {
    return false;
  }

  if (candidate.failedIntegrations !== undefined) {
    if (!Array.isArray(candidate.failedIntegrations)) {
      return false;
    }

    for (const item of candidate.failedIntegrations) {
      if (
        typeof item !== 'object' ||
        item === null ||
        typeof (item as { id?: unknown }).id !== 'string' ||
        typeof (item as { integrationId?: unknown }).integrationId !== 'string' ||
        typeof (item as { name?: unknown }).name !== 'string' ||
        typeof (item as { error?: unknown }).error !== 'string'
      ) {
        return false;
      }
    }
  }

  return true;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch');
  }

  return (await response.json()) as T;
}

export function TestsLayout({ initialFindings, initialProviders }: TestsLayoutProps) {
  const [scanTaskId, setScanTaskId] = useState<string | null>(null);
  const [scanAccessToken, setScanAccessToken] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [viewingResults, setViewingResults] = useState(true);
  const [isAwaitingRunStart, setIsAwaitingRunStart] = useState(false);
  const [lastRunOutput, setLastRunOutput] = useState<IntegrationRunOutput | null>(null);
  const lastHandledRunIdRef = useRef<string | null>(null);
  const lastHandledStatusRef = useRef<string | null>(null);

  // Use SWR for real-time updates
  const findingsFetcher: Fetcher<Finding[], string> = (url) => fetchJson<Finding[]>(url);
  const providersFetcher: Fetcher<Integration[], string> = (url) => fetchJson<Integration[]>(url);

  const { data: findings = initialFindings, mutate: mutateFindings } = useSWR<Finding[]>(
    '/api/cloud-tests/findings',
    findingsFetcher,
    {
      fallbackData: initialFindings,
      refreshInterval: 5000, // Refresh every 5 seconds when scanning
      revalidateOnFocus: true,
    },
  );

  const { data: providers = initialProviders, mutate: mutateProviders } = useSWR<Integration[]>(
    '/api/cloud-tests/providers',
    providersFetcher,
    {
      fallbackData: initialProviders,
      revalidateOnFocus: true,
    },
  );

  const connectedProviders = providers.filter((provider): provider is SupportedIntegration =>
    isSupportedProviderId(provider.integrationId),
  );

  // Track scan run status with access token
  const { run: scanRun } = useRealtimeRun(scanTaskId || '', {
    enabled: !!scanTaskId && !!scanAccessToken,
    accessToken: scanAccessToken || undefined,
  });

  const isScanActive =
    Boolean(scanTaskId) && (isAwaitingRunStart || isActiveRunStatus(scanRun?.status));

  // Sync job completion state with realtime run events
  useEffect(() => {
    if (!scanRun) {
      return;
    }

    setIsAwaitingRunStart(false);

    const status = scanRun.status;

    if (!isTaskRunStatus(status)) {
      return;
    }

    if (scanRun.id !== lastHandledRunIdRef.current) {
      lastHandledRunIdRef.current = scanRun.id;
      lastHandledStatusRef.current = null;
    }

    if (!isTerminalRunStatus(status)) {
      lastHandledStatusRef.current = status;
      return;
    }

    if (lastHandledStatusRef.current === status) {
      return;
    }

    lastHandledStatusRef.current = status;

    const runOutput = isIntegrationRunOutput(scanRun.output) ? scanRun.output : null;
    setLastRunOutput(runOutput);
    void mutateFindings();

    if (runOutput && runOutput.success === false) {
      const errorMessage =
        runOutput.errors?.[0] ??
        runOutput.failedIntegrations?.[0]?.error ??
        'Scan completed with errors';
      toast.error(errorMessage);
      return;
    }

    if (isFailureRunStatus(status) || scanRun.error) {
      const errorMessage =
        (typeof scanRun.error === 'string' && scanRun.error) ||
        (scanRun.error &&
        typeof scanRun.error === 'object' &&
        'message' in scanRun.error &&
        scanRun.error.message
          ? String((scanRun.error as { message?: unknown }).message)
          : undefined) ||
        'Scan failed. Please try again.';
      toast.error(errorMessage);
      return;
    }

    if (isSuccessfulRunStatus(status)) {
      toast.success('Scan completed! Results updated.');
    } else {
      toast.message('Scan completed.');
    }
  }, [scanRun, mutateFindings]);

  useEffect(() => {
    if (!scanTaskId) {
      setIsAwaitingRunStart(false);
      lastHandledRunIdRef.current = null;
      lastHandledStatusRef.current = null;
    }
  }, [scanTaskId]);

  const handleRunScan = async (): Promise<string | null> => {
    try {
      setLastRunOutput(null);
      const result = await runTests();
      if (result.success && result.taskId && result.publicAccessToken) {
        setScanTaskId(result.taskId);
        setScanAccessToken(result.publicAccessToken);
        setIsAwaitingRunStart(true);
        lastHandledRunIdRef.current = null;
        lastHandledStatusRef.current = null;
        toast.message('Scan started. Checking your cloud infrastructure...');
        return result.taskId;
      } else {
        toast.error(result.errors?.[0] || 'Failed to start scan');
        return null;
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to start scan. Please try again.');
      return null;
    }
  };

  const handleProvidersUpdate = () => {
    mutateProviders();
    mutateFindings();
    setViewingResults(true);
  };

  const handleCloudConnected = (trigger?: TriggerInfo) => {
    mutateProviders();
    mutateFindings();
    setLastRunOutput(null);

    if (trigger?.taskId && trigger?.publicAccessToken) {
      setScanTaskId(trigger.taskId);
      setScanAccessToken(trigger.publicAccessToken);
      setIsAwaitingRunStart(true);
      lastHandledRunIdRef.current = null;
      lastHandledStatusRef.current = null;
    }

    setViewingResults(true);
  };

  // First-time user: No clouds connected OR user wants to add a cloud
  if (connectedProviders.length === 0 || !viewingResults) {
    return (
      <EmptyState
        onBack={connectedProviders.length > 0 ? () => setViewingResults(true) : undefined}
        connectedProviders={connectedProviders.map((p) => p.integrationId)}
        onConnected={handleCloudConnected}
      />
    );
  }

  // Group findings by cloud provider
  const findingsByProvider = findings.reduce<Record<string, Finding[]>>((acc, finding) => {
    const providerId = finding.integration.integrationId;
    const bucket = acc[providerId] ?? [];
    bucket.push(finding);
    acc[providerId] = bucket;
    return acc;
  }, {});

  // Single cloud user (primary use case)
  if (connectedProviders.length === 1) {
    const provider = connectedProviders[0];
    const providerFindings = findingsByProvider[provider.integrationId] ?? [];

    return (
      <div className="container mx-auto flex w-full flex-col gap-6 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Cloud Security Tests</h1>
            <p className="text-muted-foreground text-sm">
              {provider.name} • {providerFindings.length} findings
            </p>
            {provider.lastRunAt && (
              <p className="text-muted-foreground text-xs">
                Last scan: {new Date(provider.lastRunAt).toLocaleString()} • Next scan: Daily at
                5:00 AM UTC
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {connectedProviders.length < SUPPORTED_PROVIDER_IDS.length && (
              <Button variant="outline" size="sm" onClick={() => setViewingResults(false)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Cloud
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Split-screen layout: Results (70%) + Chat placeholder (30%) */}
        <div className="gap-6">
          <div>
            <ResultsView
              findings={providerFindings}
              scanTaskId={scanTaskId}
              scanAccessToken={scanAccessToken}
              onRunScan={handleRunScan}
              isScanning={isScanActive}
              runOutput={lastRunOutput}
            />
          </div>
          {/* <div className="hidden lg:block">
            <ChatPlaceholder />
          </div> */}
        </div>

        {/* Settings Modal */}
        <CloudSettingsModal
          open={showSettings}
          onOpenChange={setShowSettings}
          connectedProviders={connectedProviders.map((p) => ({
            id: p.integrationId,
            name: p.name,
            fields: getProviderFields(p.integrationId),
          }))}
          onUpdate={handleProvidersUpdate}
        />
      </div>
    );
  }

  // Multi-cloud user (<5%)
  const defaultTab = connectedProviders[0]?.integrationId ?? SUPPORTED_PROVIDER_IDS[0];

  return (
    <div className="container mx-auto flex w-full flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Cloud Security Tests</h1>
          <p className="text-muted-foreground text-sm">
            {connectedProviders.length} cloud providers connected
          </p>
          {connectedProviders.some((p) => p.lastRunAt) && (
            <p className="text-muted-foreground text-xs">
              Automated scans run daily at 5:00 AM UTC
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {connectedProviders.length < SUPPORTED_PROVIDER_IDS.length && (
            <Button variant="outline" size="sm" onClick={() => setViewingResults(false)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Cloud
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs for multiple clouds */}
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {connectedProviders.map((provider) => (
            <TabsTrigger key={provider.integrationId} value={provider.integrationId}>
              {provider.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {connectedProviders.map((provider) => {
          const providerFindings = findingsByProvider[provider.integrationId] || [];

          return (
            <TabsContent
              key={provider.integrationId}
              value={provider.integrationId}
              className="mt-6"
            >
              {/* Split-screen layout */}
              <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
                <div>
                  <ResultsView
                    findings={providerFindings}
                    scanTaskId={scanTaskId}
                    scanAccessToken={scanAccessToken}
                    onRunScan={handleRunScan}
                    isScanning={isScanActive}
                    runOutput={lastRunOutput}
                  />
                </div>
                <div className="hidden lg:block">
                  <ChatPlaceholder />
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Settings Modal */}
      <CloudSettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
        connectedProviders={connectedProviders.map((p) => ({
          id: p.integrationId,
          name: p.name,
          fields: getProviderFields(p.integrationId),
        }))}
        onUpdate={handleProvidersUpdate}
      />
    </div>
  );
}

// Helper function to get provider fields for settings modal
type ProviderField = { id: string; label: string };

function getProviderFields(providerId: SupportedProviderId): ProviderField[] {
  switch (providerId) {
    case 'aws':
      return [
        { id: 'region', label: 'AWS Region' },
        { id: 'access_key_id', label: 'Access Key ID' },
        { id: 'secret_access_key', label: 'Secret Access Key' },
      ];
    case 'gcp':
      return [
        { id: 'organization_id', label: 'Organization ID' },
        { id: 'service_account_key', label: 'Service Account Key' },
      ];
    case 'azure':
      return [
        { id: 'AZURE_CLIENT_ID', label: 'Client ID' },
        { id: 'AZURE_TENANT_ID', label: 'Tenant ID' },
        { id: 'AZURE_CLIENT_SECRET', label: 'Client Secret' },
        { id: 'AZURE_SUBSCRIPTION_ID', label: 'Subscription ID' },
      ];
  }
}

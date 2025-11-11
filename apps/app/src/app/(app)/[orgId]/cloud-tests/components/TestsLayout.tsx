'use client';

import type { runIntegrationTests } from '@/jobs/tasks/integration/run-integration-tests';
import { Button } from '@comp/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import { Integration } from '@db';
import { useRealtimeTaskTrigger } from '@trigger.dev/react-hooks';
import { Plus, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import type { IntegrationRunOutput } from '../types';
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
  triggerToken: string;
  orgId: string;
}

type SupportedProviderId = 'aws' | 'gcp' | 'azure';
type SupportedIntegration = Integration & { integrationId: SupportedProviderId };

const SUPPORTED_PROVIDER_IDS: readonly SupportedProviderId[] = ['aws', 'gcp', 'azure'];

const isSupportedProviderId = (id: string): id is SupportedProviderId =>
  SUPPORTED_PROVIDER_IDS.includes(id as SupportedProviderId);

const isIntegrationRunOutput = (value: unknown): value is IntegrationRunOutput => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return typeof (value as { success?: unknown }).success === 'boolean';
};

export function TestsLayout({
  initialFindings,
  initialProviders,
  triggerToken,
  orgId,
}: TestsLayoutProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [viewingResults, setViewingResults] = useState(true);

  const { data: findings = initialFindings, mutate: mutateFindings } = useSWR<Finding[]>(
    '/api/cloud-tests/findings',
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    {
      fallbackData: initialFindings,
      refreshInterval: 5000,
      revalidateOnFocus: true,
    },
  );

  const { data: providers = initialProviders, mutate: mutateProviders } = useSWR<Integration[]>(
    '/api/cloud-tests/providers',
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    {
      fallbackData: initialProviders,
      revalidateOnFocus: true,
    },
  );

  const connectedProviders = providers.filter((p): p is SupportedIntegration =>
    isSupportedProviderId(p.integrationId),
  );

  const { submit, run, error, isLoading } = useRealtimeTaskTrigger<typeof runIntegrationTests>(
    'run-integration-tests',
    {
      accessToken: triggerToken,
    },
  );

  const isCompleted = run?.status === 'COMPLETED';
  const isFailed =
    run?.status === 'FAILED' ||
    run?.status === 'CRASHED' ||
    run?.status === 'SYSTEM_FAILURE' ||
    run?.status === 'TIMED_OUT' ||
    run?.status === 'CANCELED' ||
    run?.status === 'EXPIRED';

  const isTerminal = isCompleted || isFailed;
  const isScanning = Boolean(run && !isTerminal) || isLoading;

  const runOutput = isCompleted && isIntegrationRunOutput(run?.output) ? run.output : null;

  useEffect(() => {
    if (!run || !isTerminal) {
      return;
    }

    void mutateFindings();

    if (runOutput && !runOutput.success) {
      const errorMessage =
        runOutput.errors?.[0] ??
        runOutput.failedIntegrations?.[0]?.error ??
        'Scan completed with errors';
      toast.error(errorMessage);
      return;
    }

    if (isFailed || run.error) {
      const errorMessage =
        typeof run.error === 'object' && run.error && 'message' in run.error
          ? String(run.error.message)
          : typeof run.error === 'string'
            ? run.error
            : 'Scan failed. Please try again.';
      toast.error(errorMessage);
      return;
    }

    if (isCompleted) {
      toast.success('Scan completed! Results updated.');
    }
  }, [run, isTerminal, isFailed, isCompleted, runOutput, mutateFindings]);

  const handleRunScan = async (): Promise<string | null> => {
    if (!orgId) {
      toast.error('No active organization');
      return null;
    }

    try {
      await submit({ organizationId: orgId });
      toast.message('Scan started. Checking your cloud infrastructure...');
      return run?.id || null;
    } catch (error) {
      console.error('🚀 Submit error:', error);
      toast.error('Failed to start scan. Please try again.');
      return null;
    }
  };

  const handleProvidersUpdate = () => {
    mutateProviders();
    mutateFindings();
    setViewingResults(true);
  };

  const handleCloudConnected = async () => {
    mutateProviders();
    mutateFindings();

    if (orgId) {
      await submit({ organizationId: orgId });
      toast.message('Scan started. Checking your cloud infrastructure...');
    }

    setViewingResults(true);
  };

  if (connectedProviders.length === 0 || !viewingResults) {
    return (
      <EmptyState
        onBack={connectedProviders.length > 0 ? () => setViewingResults(true) : undefined}
        connectedProviders={connectedProviders.map((p) => p.integrationId)}
        onConnected={handleCloudConnected}
      />
    );
  }

  const findingsByProvider = findings.reduce<Record<string, Finding[]>>((acc, finding) => {
    const bucket = acc[finding.integration.integrationId] ?? [];
    bucket.push(finding);
    acc[finding.integration.integrationId] = bucket;
    return acc;
  }, {});

  if (connectedProviders.length === 1) {
    const provider = connectedProviders[0];
    const providerFindings = findingsByProvider[provider.integrationId] ?? [];

    return (
      <div className="container mx-auto flex w-full flex-col gap-6 p-4 md:p-6 lg:p-8">
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

        <ResultsView
          findings={providerFindings}
          onRunScan={handleRunScan}
          isScanning={isScanning}
          run={run}
        />

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

  const defaultTab = connectedProviders[0]?.integrationId ?? 'aws';

  return (
    <div className="container mx-auto flex w-full flex-col gap-6 p-4 md:p-6 lg:p-8">
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

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {connectedProviders.map((provider) => (
            <TabsTrigger key={provider.integrationId} value={provider.integrationId}>
              {provider.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {connectedProviders.map((provider) => {
          const providerFindings = findingsByProvider[provider.integrationId] ?? [];

          return (
            <TabsContent
              key={provider.integrationId}
              value={provider.integrationId}
              className="mt-6"
            >
              <ResultsView
                findings={providerFindings}
                onRunScan={handleRunScan}
                isScanning={isScanning}
                run={run}
              />
            </TabsContent>
          );
        })}
      </Tabs>

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

function getProviderFields(providerId: SupportedProviderId) {
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

'use client';

import { Button } from '@comp/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import { Integration } from '@db';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { Plus, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { runTests } from '../actions/run-tests';
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

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export function TestsLayout({ initialFindings, initialProviders }: TestsLayoutProps) {
  const [scanTaskId, setScanTaskId] = useState<string | null>(null);
  const [scanAccessToken, setScanAccessToken] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [viewingResults, setViewingResults] = useState(true);

  // Use SWR for real-time updates
  const { data: findings = initialFindings, mutate: mutateFindings } = useSWR<Finding[]>(
    '/api/cloud-tests/findings',
    fetcher,
    {
      fallbackData: initialFindings,
      refreshInterval: 5000, // Refresh every 5 seconds when scanning
      revalidateOnFocus: true,
    },
  );

  const { data: providers = initialProviders, mutate: mutateProviders } = useSWR<Integration[]>(
    '/api/cloud-tests/providers',
    fetcher,
    {
      fallbackData: initialProviders,
      revalidateOnFocus: true,
    },
  );

  const connectedProviders = (providers || []).filter((p) =>
    ['aws', 'gcp', 'azure'].includes(p.integrationId),
  );

  // Track scan run status with access token
  const { run: scanRun } = useRealtimeRun(scanTaskId || '', {
    enabled: !!scanTaskId && !!scanAccessToken,
    accessToken: scanAccessToken || undefined,
  });

  // Auto-refresh findings when scan completes
  useEffect(() => {
    if (scanRun?.status === 'COMPLETED') {
      mutateFindings();
      toast.success('Scan completed! Results updated.');
    } else if (scanRun?.status === 'FAILED' || scanRun?.status === 'CRASHED') {
      toast.error('Scan failed. Please try again.');
    }
  }, [scanRun?.status, mutateFindings]);

  const handleRunScan = async (): Promise<string | null> => {
    try {
      const result = await runTests();
      if (result.success && result.taskId && result.publicAccessToken) {
        setScanTaskId(result.taskId);
        setScanAccessToken(result.publicAccessToken);
        toast.success('Scan started! Checking your cloud infrastructure...');
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

  // First-time user: No clouds connected OR user wants to add a cloud
  if (connectedProviders.length === 0 || !viewingResults) {
    return (
      <EmptyState
        onBack={connectedProviders.length > 0 ? () => setViewingResults(true) : undefined}
        connectedProviders={connectedProviders.map((p) => p.integrationId)}
      />
    );
  }

  // Group findings by cloud provider
  const findingsByProvider = (findings || []).reduce(
    (acc, finding) => {
      const provider = finding.integration.integrationId;
      if (!acc[provider]) {
        acc[provider] = [];
      }
      acc[provider].push(finding);
      return acc;
    },
    {} as Record<string, Finding[]>,
  );

  // Single cloud user (primary use case)
  if (connectedProviders.length === 1) {
    const provider = connectedProviders[0];
    const providerFindings = findingsByProvider[provider.integrationId] || [];

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
            {connectedProviders.length < 3 && (
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
              isScanning={
                !!(
                  scanRun &&
                  ['QUEUED', 'EXECUTING', 'WAITING_FOR_DEPLOY', 'REATTEMPTING'].includes(
                    scanRun.status,
                  )
                )
              }
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
            id: p.integrationId as 'aws' | 'gcp' | 'azure',
            name: p.name,
            fields: getProviderFields(p.integrationId),
          }))}
          onUpdate={handleProvidersUpdate}
        />
      </div>
    );
  }

  // Multi-cloud user (<5%)
  const defaultTab = connectedProviders[0]?.integrationId || 'aws';

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
          {connectedProviders.length < 3 && (
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
                    isScanning={
                      !!(
                        scanRun &&
                        ['QUEUED', 'EXECUTING', 'WAITING_FOR_DEPLOY', 'REATTEMPTING'].includes(
                          scanRun.status,
                        )
                      )
                    }
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
          id: p.integrationId as 'aws' | 'gcp' | 'azure',
          name: p.name,
          fields: getProviderFields(p.integrationId),
        }))}
        onUpdate={handleProvidersUpdate}
      />
    </div>
  );
}

// Helper function to get provider fields for settings modal
function getProviderFields(providerId: string) {
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
    default:
      return [];
  }
}

'use client';

import { ManageIntegrationDialog } from '@/components/integrations/ManageIntegrationDialog';
import { useIntegrationMutations } from '@/hooks/use-integration-platform';
import { api } from '@/lib/api-client';
import { Button } from '@comp/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comp/ui/tabs';
import { Plus, Settings } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
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

interface Provider {
  id: string;
  integrationId: string;
  name: string;
  organizationId: string;
  lastRunAt: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  isLegacy?: boolean;
  variables?: Record<string, unknown> | null;
  requiredVariables?: string[];
}

interface TestsLayoutProps {
  initialFindings: Finding[];
  initialProviders: Provider[];
  orgId: string;
}

type SupportedProviderId = 'aws' | 'gcp' | 'azure';

const SUPPORTED_PROVIDER_IDS: readonly SupportedProviderId[] = ['aws', 'gcp', 'azure'];

// Check if a provider needs configuration (has required variables that aren't set)
const needsVariableConfiguration = (provider: Provider): boolean => {
  // Legacy providers use old system - no variable config needed here
  if (provider.isLegacy) return false;

  const requiredVars = provider.requiredVariables || [];
  if (requiredVars.length === 0) return false;

  const currentVars = provider.variables || {};
  return requiredVars.some((varId) => !currentVars[varId]);
};

const isSupportedProviderId = (id: string): id is SupportedProviderId =>
  SUPPORTED_PROVIDER_IDS.includes(id as SupportedProviderId);

export function TestsLayout({ initialFindings, initialProviders, orgId }: TestsLayoutProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [viewingResults, setViewingResults] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [configureDialogOpen, setConfigureDialogOpen] = useState(false);
  const [configureProvider, setConfigureProvider] = useState<Provider | null>(null);
  const { disconnectConnection } = useIntegrationMutations();

  const { data: findings = initialFindings, mutate: mutateFindings } = useSWR<Finding[]>(
    `/api/cloud-tests/findings?orgId=${orgId}`,
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

  const { data: providers = initialProviders, mutate: mutateProviders } = useSWR<Provider[]>(
    `/api/cloud-tests/providers?orgId=${orgId}`,
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

  const connectedProviders = providers.filter((p) => isSupportedProviderId(p.integrationId));

  // Get the current active provider (use activeTab state or default to first provider)
  const currentProviderId = activeTab || connectedProviders[0]?.integrationId;

  const handleRunScan = async (providerId?: string): Promise<string | null> => {
    if (!orgId) {
      toast.error('No active organization');
      return null;
    }

    // Use the passed providerId, or fall back to the current active tab
    const targetProviderId = providerId || currentProviderId;
    const targetProvider = connectedProviders.find((p) => p.integrationId === targetProviderId);

    if (!targetProvider) {
      toast.error('No provider selected');
      return null;
    }

    setIsScanning(true);
    toast.message(`Starting ${targetProvider.name} security scan...`);

    try {
      if (targetProvider.isLegacy) {
        // Run legacy check for this specific provider
        const { runTests } = await import('../actions/run-tests');
        const result = await runTests();
        if (!result.success) {
          console.error('Legacy scan error:', result.errors);
        }
      } else {
        // Use dedicated cloud security endpoint
        const response = await api.post(`/v1/cloud-security/scan/${targetProvider.id}`, {}, orgId);
        if (response.error) {
          console.error(`Error scanning ${targetProvider.name}:`, response.error);
          toast.error(`Failed to scan ${targetProvider.name}`);
          return null;
        }
      }

      toast.success('Scan completed! Results updated.');
      await mutateProviders(); // Refresh to get updated lastRunAt
      await mutateFindings();
      return 'completed';
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to complete scan. Please try again.');
      return null;
    } finally {
      setIsScanning(false);
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
      <div className="mx-auto max-w-7xl flex w-full flex-col gap-6 py-4 md:py-6 lg:py-8">
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
          onRunScan={() => handleRunScan(provider.integrationId)}
          isScanning={isScanning}
          needsConfiguration={needsVariableConfiguration(provider)}
          onConfigure={() => {
            setConfigureProvider(provider);
            setConfigureDialogOpen(true);
          }}
        />

        <CloudSettingsModal
          open={showSettings}
          onOpenChange={setShowSettings}
          connectedProviders={connectedProviders.map((p) => ({
            id: p.integrationId,
            connectionId: p.id,
            name: p.name,
          }))}
          onUpdate={handleProvidersUpdate}
        />

        {/* Configure dialog for setting variables */}
        {configureProvider && (
          <ManageIntegrationDialog
            open={configureDialogOpen}
            onOpenChange={setConfigureDialogOpen}
            connectionId={configureProvider.id}
            integrationId={configureProvider.integrationId}
            integrationName={configureProvider.name}
            integrationLogoUrl={`https://img.logo.dev/${
              configureProvider.integrationId === 'aws'
                ? 'aws.amazon.com'
                : configureProvider.integrationId === 'gcp'
                  ? 'cloud.google.com'
                  : 'azure.com'
            }?token=pk_AZatYxV5QDSfWpRDaBxzRQ`}
            configureOnly={true}
            onSaved={async () => {
              const savedProvider = configureProvider;
              setConfigureDialogOpen(false);
              setConfigureProvider(null);
              await mutateProviders();
              // Run scan after saving variables
              if (savedProvider) {
                toast.message('Configuration saved! Running security scan...');
                await handleRunScan(savedProvider.integrationId);
              }
            }}
          />
        )}
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

      <Tabs defaultValue={defaultTab} onValueChange={setActiveTab}>
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
                onRunScan={() => handleRunScan(provider.integrationId)}
                isScanning={isScanning}
                needsConfiguration={needsVariableConfiguration(provider)}
                onConfigure={() => {
                  setConfigureProvider(provider);
                  setConfigureDialogOpen(true);
                }}
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
          connectionId: p.id,
          name: p.name,
        }))}
        onUpdate={handleProvidersUpdate}
      />

      {/* Configure dialog for setting variables */}
      {configureProvider && (
        <ManageIntegrationDialog
          open={configureDialogOpen}
          onOpenChange={setConfigureDialogOpen}
          connectionId={configureProvider.id}
          integrationId={configureProvider.integrationId}
          integrationName={configureProvider.name}
          integrationLogoUrl={`https://img.logo.dev/${
            configureProvider.integrationId === 'aws'
              ? 'aws.amazon.com'
              : configureProvider.integrationId === 'gcp'
                ? 'cloud.google.com'
                : 'azure.com'
          }?token=pk_AZatYxV5QDSfWpRDaBxzRQ`}
          configureOnly={true}
          onSaved={async () => {
            const savedProvider = configureProvider;
            setConfigureDialogOpen(false);
            setConfigureProvider(null);
            await mutateProviders();
            // Run scan after saving variables
            if (savedProvider) {
              toast.message('Configuration saved! Running security scan...');
              await handleRunScan(savedProvider.integrationId);
            }
          }}
        />
      )}
    </div>
  );
}

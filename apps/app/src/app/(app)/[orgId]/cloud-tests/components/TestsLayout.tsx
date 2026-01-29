'use client';

import { ConnectIntegrationDialog } from '@/components/integrations/ConnectIntegrationDialog';
import { ManageIntegrationDialog } from '@/components/integrations/ManageIntegrationDialog';
import { api } from '@/lib/api-client';
import { Button, PageHeader, PageHeaderDescription, PageLayout } from '@trycompai/design-system';
import { Add, Settings } from '@trycompai/design-system/icons';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { isCloudProviderSlug } from '../constants';
import type { Finding, Provider } from '../types';
import { CloudSettingsModal } from './CloudSettingsModal';
import { EmptyState } from './EmptyState';
import { ProviderTabs } from './ProviderTabs';

const PROVIDER_LOGO: Record<string, string> = {
  aws: 'https://img.logo.dev/aws.amazon.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  gcp: 'https://img.logo.dev/cloud.google.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  azure: 'https://img.logo.dev/azure.microsoft.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
};

const PROVIDER_NAME: Record<string, string> = {
  aws: 'Amazon Web Services',
  gcp: 'Google Cloud Platform',
  azure: 'Microsoft Azure',
};

interface TestsLayoutProps {
  initialFindings: Finding[];
  initialProviders: Provider[];
  orgId: string;
}

// Check if a provider needs configuration (has required variables that aren't set)
const needsVariableConfiguration = (provider: Provider): boolean => {
  // Legacy providers use old system - no variable config needed here
  if (provider.isLegacy) return false;

  const requiredVars = provider.requiredVariables || [];
  if (requiredVars.length === 0) return false;

  const currentVars = provider.variables || {};
  return requiredVars.some((varId) => !currentVars[varId]);
};

export function TestsLayout({ initialFindings, initialProviders, orgId }: TestsLayoutProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [viewingResults, setViewingResults] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [activeProviderTab, setActiveProviderTab] = useState<string | null>(null);
  const [activeConnectionTabs, setActiveConnectionTabs] = useState<Record<string, string>>({});
  const [addConnectionProvider, setAddConnectionProvider] = useState<string | null>(null);
  const [configureDialogOpen, setConfigureDialogOpen] = useState(false);
  const [configureProvider, setConfigureProvider] = useState<Provider | null>(null);
  const [manageProviderType, setManageProviderType] = useState<string | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);

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

  const {
    data: providers = initialProviders,
    mutate: mutateProviders,
    isValidating: isProvidersValidating,
  } = useSWR<Provider[]>(
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

  const connectedProviders = providers;

  // Group connections by provider type (aws, gcp, azure)
  const providerGroups = useMemo(() => {
    const groups: Record<string, Provider[]> = {};
    for (const provider of connectedProviders) {
      const slug = provider.integrationId;
      if (!groups[slug]) {
        groups[slug] = [];
      }
      groups[slug].push(provider);
    }
    return groups;
  }, [connectedProviders]);

  // Get unique provider types that have connections
  const activeProviderTypes = useMemo(
    () => Object.keys(providerGroups).sort((a, b) => a.localeCompare(b)),
    [providerGroups],
  );

  // Current active provider type tab
  const currentProviderType = activeProviderTab || activeProviderTypes[0] || 'aws';

  // Get connections for the current provider type
  const currentProviderConnections = providerGroups[currentProviderType] || [];

  // Get current connection tab for the active provider type
  const currentConnectionId =
    activeConnectionTabs[currentProviderType] || currentProviderConnections[0]?.id;

  const handleRunScan = async (connectionId?: string): Promise<string | null> => {
    if (!orgId) {
      toast.error('No active organization');
      return null;
    }

    // Use the passed connectionId, or fall back to the current active connection
    const targetConnectionId = connectionId || currentConnectionId;
    const targetProvider = connectedProviders.find((p) => p.id === targetConnectionId);

    if (!targetProvider) {
      toast.error('No provider selected');
      return null;
    }

    setIsScanning(true);
    toast.message(`Starting ${targetProvider.name} security scan...`);

    try {
      if (targetProvider.isLegacy) {
        // Run legacy check for this specific connection
        const { runTests } = await import('../actions/run-tests');
        // Pass the unique connection ID to only scan this specific connection
        const result = await runTests(targetProvider.id);
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
        onBack={
          connectedProviders.length > 0
            ? () => {
                setViewingResults(true);
                setAddConnectionProvider(null);
              }
            : undefined
        }
        connectedProviders={connectedProviders.map((p) => p.integrationId)}
        onConnected={handleCloudConnected}
        initialProvider={
          addConnectionProvider && isCloudProviderSlug(addConnectionProvider)
            ? addConnectionProvider
            : undefined
        }
      />
    );
  }

  const findingsByProvider = findings.reduce<Record<string, Finding[]>>((acc, finding) => {
    const bucket = acc[finding.connectionId] ?? [];
    bucket.push(finding);
    acc[finding.connectionId] = bucket;
    return acc;
  }, {});

  // Count total connections across all providers
  const totalConnections = connectedProviders.length;
  const totalProviderTypes = activeProviderTypes.length;

  const multiProviderDescription = connectedProviders.some((p) => p.lastRunAt)
    ? `${totalConnections} connection${totalConnections !== 1 ? 's' : ''} across ${totalProviderTypes} cloud provider${totalProviderTypes !== 1 ? 's' : ''} • Automated scans run daily at 5:00 AM UTC`
    : `${totalConnections} connection${totalConnections !== 1 ? 's' : ''} across ${totalProviderTypes} cloud provider${totalProviderTypes !== 1 ? 's' : ''}`;

  return (
    <PageLayout>
      <PageHeader
        title="Cloud Security Tests"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAddConnectionProvider(null);
                setViewingResults(false);
              }}
            >
              <Add />
              Add Cloud
            </Button>
            <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
              <Settings />
            </Button>
          </>
        }
      >
        <PageHeaderDescription>{multiProviderDescription}</PageHeaderDescription>
      </PageHeader>

      <ProviderTabs
        providerGroups={providerGroups}
        providerTypes={activeProviderTypes}
        activeProviderType={currentProviderType}
        activeConnectionTabs={activeConnectionTabs}
        findingsByProvider={findingsByProvider}
        isScanning={isScanning}
        onProviderTypeChange={setActiveProviderTab}
        onConnectionTabChange={(providerType, connectionId) =>
          setActiveConnectionTabs((prev) => ({ ...prev, [providerType]: connectionId }))
        }
        onRunScan={handleRunScan}
        onAddConnection={(providerType) => {
          if (isProvidersValidating) {
            toast.message('Loading connections, please try again in a moment.');
            return;
          }
          const existingConnections = providerGroups[providerType] || [];
          const supportsMulti = existingConnections.some((connection) =>
            Boolean(connection.supportsMultipleConnections),
          );
          if (supportsMulti && existingConnections.length > 0) {
            setManageProviderType(providerType);
            setManageDialogOpen(true);
            return;
          }
          setAddConnectionProvider(providerType);
          setViewingResults(false);
        }}
        onConfigure={(provider) => {
          setConfigureProvider(provider);
          setConfigureDialogOpen(true);
        }}
        needsConfiguration={needsVariableConfiguration}
      />

      {/* CloudSettingsModal only for providers that do NOT support multiple connections */}
      {/* AWS is managed via ConnectIntegrationDialog since it supports multiple connections */}
      <CloudSettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
        connectedProviders={connectedProviders
          .filter((p) => !p.supportsMultipleConnections)
          .map((p) => ({
            id: p.integrationId,
            connectionId: p.id,
            name: p.displayName || p.name,
            status: p.status,
            accountId: p.accountId,
            regions: p.regions,
            isLegacy: p.isLegacy,
          }))}
        onUpdate={handleProvidersUpdate}
      />

      {manageProviderType && (
        <ConnectIntegrationDialog
          open={manageDialogOpen}
          onOpenChange={(open) => {
            setManageDialogOpen(open);
            // Refresh data when dialog closes to pick up any changes
            if (!open) {
              handleProvidersUpdate();
            }
          }}
          integrationId={manageProviderType}
          integrationName={PROVIDER_NAME[manageProviderType] || manageProviderType.toUpperCase()}
          integrationLogoUrl={PROVIDER_LOGO[manageProviderType] || PROVIDER_LOGO.aws}
          onConnected={handleProvidersUpdate}
        />
      )}

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
            // Run scan after saving variables for this specific connection
            if (savedProvider) {
              toast.message('Configuration saved! Running security scan...');
              await handleRunScan(savedProvider.id);
            }
          }}
        />
      )}
    </PageLayout>
  );
}

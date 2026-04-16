import { useApi } from '@/hooks/use-api';
import { useConnectionServices } from '@/hooks/use-integration-platform';
import { CLOUD_RECONNECT_CUTOFF_LABEL } from '@/lib/cloud-reconnect-policy';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger } from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Finding, Provider } from '../types';
import { ActivitySection } from '@/app/(app)/[orgId]/integrations/[slug]/components/ActivitySection';
import { RemediationHistorySection } from '@/app/(app)/[orgId]/integrations/[slug]/components/RemediationHistorySection';
import { CloudTestsSection } from './CloudTestsSection';
import { ResultsView } from './ResultsView';
import { ServicesGrid } from './ServicesGrid';

interface ProviderTabsProps {
  providerGroups: Record<string, Provider[]>;
  providerTypes: string[];
  activeProviderType: string;
  activeConnectionTabs: Record<string, string>;
  findingsByProvider: Record<string, Finding[]>;
  isScanning: boolean;
  onProviderTypeChange: (value: string) => void;
  onConnectionTabChange: (providerType: string, connectionId: string) => void;
  onRunScan: (connectionId?: string) => Promise<string | null>;
  onAddConnection: (providerType: string) => void;
  onReconnect: (providerType: string) => void;
  onConfigure: (provider: Provider) => void;
  needsConfiguration: (provider: Provider) => boolean;
  requiresReconnect: (provider: Provider) => boolean;
  canRunScan?: boolean;
  canAddConnection?: boolean;
  isReconnecting?: boolean;
  orgId: string;
}

const formatProviderLabel = (providerType: string): string => {
  const normalized = providerType.trim();
  if (!normalized) return 'UNKNOWN';

  if (['aws', 'gcp', 'iam'].includes(normalized.toLowerCase())) {
    return normalized.toUpperCase();
  }

  return normalized
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};


function ConnectionDetails({ connection }: { connection: Provider }) {
  const details: string[] = [];

  if (connection.accountId) {
    details.push(`Account: ${connection.accountId}`);
  }

  if (connection.regions?.length) {
    details.push(
      `${connection.regions.length} region${connection.regions.length !== 1 ? 's' : ''}`,
    );
  }

  if (connection.lastRunAt) {
    details.push(`Last scan: ${new Date(connection.lastRunAt).toLocaleString()}`);
  }

  if (details.length === 0) return null;

  return (
    <div className="mb-4 ml-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
      {details.map((detail, index) => (
        <span key={detail} className="flex items-center gap-1">
          {index > 0 && <span className="mr-2">•</span>}
          {detail}
        </span>
      ))}
    </div>
  );
}

/** Cloud provider connection with full tabbed UI (AWS + GCP) */
function CloudConnectionContent({
  connection,
  orgId,
  onScanComplete,
}: {
  connection: Provider;
  orgId: string;
  onScanComplete: () => void;
}) {
  const api = useApi();
  const {
    services,
    meta: servicesMeta,
    refresh: refreshServices,
    updateServices,
  } = useConnectionServices(connection.id);
  const [togglingService, setTogglingService] = useState<string | null>(null);
  const detectedRef = useRef(false);

  // Auto-detect services on first load (AWS via Cost Explorer, GCP via Service Usage API)
  useEffect(() => {
    if (detectedRef.current || !connection.id) return;
    if (connection.integrationId !== 'aws' && connection.integrationId !== 'gcp') return;
    detectedRef.current = true;

    api.post(`/v1/cloud-security/detect-services/${connection.id}`, {}).then((resp) => {
      if (!resp.error) {
        const data = resp.data as { services?: string[] };
        if (data?.services?.length) {
          toast.success(`${data.services.length} services detected`);
          refreshServices();
        }
      }
    });
  }, [connection.id, connection.integrationId, api, refreshServices]);

  const handleToggleService = useCallback(
    async (serviceId: string, enabled: boolean): Promise<boolean> => {
      setTogglingService(serviceId);
      try {
        await updateServices(serviceId, enabled);
        return true;
      } catch {
        return false;
      } finally {
        setTogglingService(null);
      }
    },
    [updateServices],
  );

  // Derive manifest-like services from connection services
  const manifestServices = services.map((s) => ({
    id: s.id,
    name: s.name ?? s.id,
    description: s.description ?? '',
    implemented: s.implemented ?? true,
  }));

  const enabledCount = services.filter((s) => s.enabled).length;
  const waitingForDetection = connection.integrationId === 'gcp' && servicesMeta.detectionReady === false;
  const showEnabledCount = !waitingForDetection;

  return (
    <Tabs defaultValue="findings">
      <TabsList variant="underline">
        <TabsTrigger value="findings">Findings</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="remediations">Remediations</TabsTrigger>
        <TabsTrigger value="services">
          Services{showEnabledCount && enabledCount > 0 ? ` (${enabledCount})` : ''}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="findings">
        <div className="pt-4">
          <CloudTestsSection
            providerSlug={connection.integrationId as 'aws' | 'gcp' | 'azure'}
            connectionId={connection.id}
            orgId={orgId}
            lastRunAt={connection.lastRunAt}
            variables={connection.variables ?? undefined}
            onScanComplete={onScanComplete}
          />
        </div>
      </TabsContent>

      <TabsContent value="activity">
        <div className="pt-5">
          <ActivitySection connectionId={connection.id} />
        </div>
      </TabsContent>

      <TabsContent value="remediations">
        <div className="pt-5">
          <RemediationHistorySection connectionId={connection.id} />
        </div>
      </TabsContent>

      <TabsContent value="services">
        <div className="pt-4 space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Scan Configuration</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toggle which services to include in scans.{connection.integrationId === 'aws' ? ' New services are auto-detected from your AWS usage.' : ''}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
              <div>
                <p className="text-sm font-medium">Daily automated scan</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Runs every day at 5:00 AM UTC{enabledCount > 0 ? ` across ${enabledCount} service${enabledCount !== 1 ? 's' : ''} + security baseline` : ' on security baseline checks'}
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                Active
              </span>
            </div>
          </div>
          {waitingForDetection ? (
            <div className="rounded-lg border bg-muted/20 px-4 py-3">
              <p className="text-sm font-medium">Detecting active GCP services...</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                We&apos;ll show real service toggles as soon as detection completes.
              </p>
            </div>
          ) : manifestServices.length > 0 ? (
            <ServicesGrid
              services={manifestServices}
              connectionServices={services}
              connectionId={connection.id}
              onToggle={handleToggleService}
              togglingService={togglingService}
            />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No services detected yet.{connection.integrationId === 'aws' ? ' Services are auto-detected from your AWS billing data.' : ' Run a scan to detect services.'}
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

export function ProviderTabs({
  providerGroups,
  providerTypes,
  activeProviderType,
  activeConnectionTabs,
  findingsByProvider,
  isScanning,
  onProviderTypeChange,
  onConnectionTabChange,
  onRunScan,
  onAddConnection,
  onReconnect,
  onConfigure,
  needsConfiguration,
  requiresReconnect,
  canRunScan,
  canAddConnection,
  isReconnecting,
  orgId,
}: ProviderTabsProps) {
  return (
    <Tabs value={activeProviderType} onValueChange={onProviderTypeChange}>
      <div className="mb-4">
        <TabsList>
          {providerTypes.map((providerType) => {
            const connectionCount = providerGroups[providerType]?.length || 0;
            const label = formatProviderLabel(providerType);
            return (
              <TabsTrigger key={providerType} value={providerType}>
                {label}
                {connectionCount > 1 && (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {connectionCount}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {providerTypes.map((providerType) => {
        const connections = providerGroups[providerType] || [];
        const activeConnId = activeConnectionTabs[providerType] || connections[0]?.id;

        if (connections.length === 0) {
          return <TabsContent key={providerType} value={providerType} />;
        }

        return (
          <TabsContent key={providerType} value={providerType}>
            <div className="mb-4">
              <Tabs
                value={activeConnId}
                onValueChange={(value) => onConnectionTabChange(providerType, value)}
              >
                <div className="mb-3 flex items-center justify-between">
                  <Select
                    value={activeConnId}
                    onValueChange={(value) => {
                      if (value) onConnectionTabChange(providerType, value);
                    }}
                  >
                    <div className="w-[240px]">
                      <SelectTrigger size="sm">
                        {connections.find((c) => c.id === activeConnId)?.displayName
                          || connections.find((c) => c.id === activeConnId)?.name
                          || 'Select connection'}
                      </SelectTrigger>
                    </div>
                    <SelectContent>
                      {connections.map((connection) => (
                        <SelectItem key={connection.id} value={connection.id}>
                          {connection.displayName || connection.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Only show "Add connection" button for providers that support multiple connections */}
                  {canAddConnection !== false && connections.some((c) => c.supportsMultipleConnections) && (
                    <Button
                      size="lg"
                      iconLeft={<Add size={16} />}
                      onClick={() => onAddConnection(providerType)}
                    >
                      Add connection
                    </Button>
                  )}
                </div>

                {connections.map((connection) => {
                  const reconnectRequired = requiresReconnect(connection);

                  return (
                    <TabsContent key={connection.id} value={connection.id}>
                      <div className="mt-4">
                        {reconnectRequired && (
                          <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">Reconnect this account</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  This connection was created before {CLOUD_RECONNECT_CUTOFF_LABEL}. Reconnect it to keep scans and remediation fully reliable.
                                </p>
                              </div>
                              {canAddConnection !== false && (
                                <Button
                                  size="sm"
                                  onClick={() => onReconnect(providerType)}
                                  disabled={isReconnecting}
                                  loading={isReconnecting}
                                >
                                  Reconnect
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        <ConnectionDetails connection={connection} />

                        {/* New platform connections get full tabbed UI */}
                        {!connection.isLegacy ? (
                          <CloudConnectionContent
                            connection={connection}
                            orgId={orgId}
                            onScanComplete={() => onRunScan(connection.id)}
                          />
                        ) : (
                          <>
                            {/* Upgrade banner for legacy AWS connections */}
                            {connection.isLegacy && connection.integrationId === 'aws' && (
                              <a
                                href={`/${orgId}/integrations/aws`}
                                className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/[0.03] px-4 py-3 mb-4 hover:bg-primary/[0.06] transition-colors group"
                              >
                                <div className="space-y-0.5">
                                  <p className="text-sm font-medium">Auto-fix is available</p>
                                  <p className="text-xs text-muted-foreground">
                                    Upgrade to the new connection to enable one-click fixes, batch remediation, and rollback for all findings.
                                  </p>
                                </div>
                                <span className="text-xs font-medium text-primary shrink-0 ml-4 group-hover:underline">
                                  Upgrade →
                                </span>
                              </a>
                            )}
                          <ResultsView
                            findings={findingsByProvider[connection.id] ?? []}
                            onRunScan={() => onRunScan(connection.id)}
                            isScanning={isScanning}
                            needsConfiguration={needsConfiguration(connection)}
                            onConfigure={() => onConfigure(connection)}
                            canRunScan={canRunScan}
                          />
                          </>
                        )}
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

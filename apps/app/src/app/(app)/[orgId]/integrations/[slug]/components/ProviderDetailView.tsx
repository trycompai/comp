'use client';

import {
  useConnectionServices,
  useIntegrationConnections,
  useIntegrationMutations,
  type ConnectionListItem,
  type IntegrationProvider,
} from '@/hooks/use-integration-platform';
import {
  CLOUD_RECONNECT_CUTOFF_LABEL,
  requiresCloudReconnect,
} from '@/lib/cloud-reconnect-policy';
import { api } from '@/lib/api-client';
import {
  Breadcrumb,
  Button,
  Stack,
} from '@trycompai/design-system';
import { Add, Security } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AccountSettingsSheet } from './AccountSettingsSheet';
import { getConnectionDisplayLabel } from './connection-display';
import { IntegrationProviderHero } from './IntegrationProviderHero';
import { EmptyStateOnboarding } from './EmptyStateOnboarding';
import { ServicesGrid } from './services-grid';

interface ProviderDetailViewProps {
  provider: IntegrationProvider;
  initialConnections: ConnectionListItem[];
}

export function ProviderDetailView({ provider, initialConnections }: ProviderDetailViewProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const { connections: allConnections } = useIntegrationConnections();
  const { startOAuth } = useIntegrationMutations();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const connections = useMemo(() => {
    const live = allConnections.filter((c) => c.providerSlug === provider.id);
    return live.length > 0 ? live : initialConnections;
  }, [allConnections, initialConnections, provider.id]);

  const activeConnections = connections.filter(
    (c) => c.status === 'active' || c.status === 'pending',
  );
  const isConnected = activeConnections.length > 0;
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  const selectedConnection = useMemo(() => {
    if (selectedConnectionId) {
      return (
        activeConnections.find((c) => c.id === selectedConnectionId) ?? activeConnections[0] ?? null
      );
    }
    return activeConnections[0] ?? null;
  }, [selectedConnectionId, activeConnections]);

  const services =
    (
      provider as IntegrationProvider & {
        services?: Array<{ id: string; name: string; description: string; implemented?: boolean }>;
      }
    ).services ?? [];
  const isCloudProvider = provider.category === 'Cloud';
  const selectedConnectionRequiresReconnect = useMemo(() => {
    if (!isCloudProvider || !selectedConnection) return false;
    return requiresCloudReconnect({
      providerId: provider.id,
      createdAt: selectedConnection.createdAt,
      status: selectedConnection.status,
    });
  }, [isCloudProvider, provider.id, selectedConnection]);

  // Services hook for the selected connection
  const {
    services: connectionServices,
    refresh: refreshServices,
    updateServices,
  } = useConnectionServices(selectedConnection?.id ?? null);
  const [togglingService, setTogglingService] = useState<string | null>(null);

  const handleToggleService = useCallback(
    async (serviceId: string, enabled: boolean) => {
      setTogglingService(serviceId);
      try {
        await updateServices(serviceId, enabled);
        toast.success(
          `${services.find((s) => s.id === serviceId)?.name ?? serviceId} ${enabled ? 'enabled' : 'disabled'}`,
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update');
      } finally {
        setTogglingService(null);
      }
    },
    [updateServices, services],
  );

  // Auto-detect GCP organization after OAuth connect
  const gcpDetectedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (
      provider.id !== 'gcp' ||
      !isConnected ||
      !selectedConnection?.id ||
      gcpDetectedRef.current.has(selectedConnection.id)
    ) {
      return;
    }
    gcpDetectedRef.current.add(selectedConnection.id);
    api
      .post<{ organizations: Array<{ id: string; displayName: string }>; projects: Array<{ id: string; name: string }> }>(
        `/v1/cloud-security/detect-gcp-org/${selectedConnection.id}`,
      )
      .then((res) => {
        const orgs = res.data?.organizations ?? [];
        if (orgs.length === 1) {
          toast.success(`Connected to GCP organization: ${orgs[0].displayName}`);
        } else if (orgs.length > 1) {
          toast.info(`${orgs.length} GCP organizations found. Select one in Settings.`);
        }
      })
      .catch(() => {});
  }, [provider.id, isConnected, selectedConnection?.id]);

  // Auto-detect services via Cost Explorer when switching accounts
  const detectedConnections = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (
      !isCloudProvider ||
      !isConnected ||
      !selectedConnection?.id ||
      detectedConnections.current.has(selectedConnection.id)
    ) {
      return;
    }

    const connectionForRun = selectedConnection;
    detectedConnections.current.add(connectionForRun.id);
    api
      .post<{ services: string[] }>(
        `/v1/cloud-security/detect-services/${connectionForRun.id}`,
      )
      .then((res) => {
        const count = res.data?.services?.length;
        if (count) {
          const name = getConnectionDisplayLabel(connectionForRun);
          toast.success(`${count} services detected${name ? ` in ${name}` : ''}`);
        }
        return refreshServices();
      })
      .catch(() => {});
  }, [isCloudProvider, isConnected, selectedConnection?.id, refreshServices]);

  const handleConnect = useCallback(async () => {
    if (provider.authType === 'oauth2' && provider.oauthConfigured) {
      const redirectUrl = `${window.location.origin}/${orgId}/integrations/${provider.id}?success=true`;
      const result = await startOAuth(provider.id, redirectUrl);
      if (result?.authorizationUrl) {
        window.location.href = result.authorizationUrl;
      }
    } else {
      // For non-OAuth, show the inline add-account form
      setShowAddAccount(true);
    }
  }, [provider, orgId, startOAuth]);

  return (
    <>
      <Stack gap="lg">
        <Breadcrumb
          items={[
            {
              label: 'Integrations',
              href: `/${orgId}/integrations`,
              props: { render: <Link href={`/${orgId}/integrations`} /> },
            },
            { label: provider.name, isCurrent: true },
          ]}
        />

        <IntegrationProviderHero
          provider={provider}
          isConnected={isConnected}
          activeConnections={activeConnections}
          selectedConnection={selectedConnection}
          onSelectConnection={(id) => setSelectedConnectionId(id)}
          onOpenSettings={() => setSettingsOpen(true)}
          onAddAccount={() => void handleConnect()}
        />

        {selectedConnectionRequiresReconnect && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Reconnect this account</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This connection was created before {CLOUD_RECONNECT_CUTOFF_LABEL}. Reconnect it to keep scans and remediation fully reliable.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => void handleConnect()}>
              Reconnect
            </Button>
          </div>
        )}

        {/* Content: zero state OR findings */}
        {!isConnected && (
          <EmptyStateOnboarding
            provider={provider}
            orgId={orgId}
            onConnected={() => {
              if (isCloudProvider) {
                // Redirect to Cloud Tests after connecting a cloud provider
                window.location.href = `/${orgId}/cloud-tests`;
              }
            }}
            onOAuthConnect={handleConnect}
          />
        )}

        {isConnected && isCloudProvider && (
          <div className="space-y-5">
            {/* Link to Cloud Tests — findings + fix now live there */}
            <a
              href={`/${orgId}/cloud-tests`}
              className="flex items-center justify-between rounded-xl border bg-background shadow-sm px-5 py-4 hover:bg-muted/30 transition-colors group"
            >
              <div>
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">View Findings & Auto-Fix</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Security findings, auto-remediation, and batch fixes are now in Cloud Tests.
                </p>
              </div>
              <span className="text-xs font-medium text-primary">Open Cloud Tests →</span>
            </a>

            {/* Services config stays here */}
            {services.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Services</h3>
                <ServicesGrid
                  services={services}
                  connectionServices={connectionServices}
                  connectionId={selectedConnection?.id ?? null}
                  onToggle={handleToggleService}
                  togglingService={togglingService}
                />
              </div>
            )}
          </div>
        )}
      </Stack>

      {/* Account settings sheet */}
      {selectedConnection && (
        <AccountSettingsSheet
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          connectionId={selectedConnection.id}
          provider={provider}
          orgId={orgId}
        />
      )}

      {/* Inline add-account form (shown when clicking "+ Add" while already connected) */}
      {showAddAccount && isConnected && (
        <EmptyStateOnboarding
          provider={provider}
          orgId={orgId}
          onConnected={() => setShowAddAccount(false)}
          onOAuthConnect={handleConnect}
        />
      )}
    </>
  );
}

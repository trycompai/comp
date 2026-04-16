'use client';

import { ConnectIntegrationDialog } from '@/components/integrations/ConnectIntegrationDialog';
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
import { GcpProjectPicker } from './GcpProjectPicker';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  /** Server passes true when URL was ?success=true&provider=gcp (OAuth return) */
  gcpOAuthJustConnected?: boolean;
}

export function ProviderDetailView({
  provider,
  initialConnections,
  gcpOAuthJustConnected = false,
}: ProviderDetailViewProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const { connections: allConnections, refresh: refreshConnections } = useIntegrationConnections();
  const { startOAuth } = useIntegrationMutations();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reconnectDialogOpen, setReconnectDialogOpen] = useState(false);

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
    const metadata = (selectedConnection.metadata || {}) as Record<string, unknown>;
    return requiresCloudReconnect({
      providerId: provider.id,
      createdAt: selectedConnection.createdAt,
      reconnectedAt:
        typeof metadata.reconnectedAt === 'string' ? metadata.reconnectedAt : null,
      status: selectedConnection.status,
    });
  }, [isCloudProvider, provider.id, selectedConnection]);

  // Services hook for the selected connection
  const {
    services: connectionServices,
    meta: servicesMeta,
    refresh: refreshServices,
    updateServices,
  } = useConnectionServices(selectedConnection?.id ?? null);
  const [togglingService, setTogglingService] = useState<string | null>(null);
  const [gcpOrgs, setGcpOrgs] = useState<
    Array<{
      id: string;
      displayName: string;
      projects: Array<{ id: string; name: string }>;
    }>
  >([]);
  const [gcpSelectedProjectIds, setGcpSelectedProjectIds] = useState<string[]>([]);
  const oauthBootstrapHandledRef = useRef(false);

  const handleToggleService = useCallback(
    async (serviceId: string, enabled: boolean): Promise<boolean> => {
      setTogglingService(serviceId);
      try {
        await updateServices(serviceId, enabled);
        toast.success(
          `${services.find((s) => s.id === serviceId)?.name ?? serviceId} ${enabled ? 'enabled' : 'disabled'}`,
        );
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update');
        return false;
      } finally {
        setTogglingService(null);
      }
    },
    [updateServices, services],
  );

  // OAuth return (?success=true): strip query, detect org/projects (NOT services yet — user must select projects first)
  useEffect(() => {
    if (
      !gcpOAuthJustConnected ||
      provider.id !== 'gcp' ||
      !selectedConnection?.id ||
      oauthBootstrapHandledRef.current
    ) {
      return;
    }
    oauthBootstrapHandledRef.current = true;
    router.replace(`/${orgId}/integrations/gcp`, { scroll: false });

    // For GCP: only detect orgs/projects — service detection waits for project selection
    // (The detect-gcp-org effect already fires on connection)
  }, [
    gcpOAuthJustConnected,
    provider.id,
    selectedConnection?.id,
    orgId,
    router,
  ]);

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
      .post<{
        organizations: Array<{
          id: string;
          displayName: string;
          projects: Array<{ id: string; name: string }>;
        }>;
        selectedProjectIds?: string[];
      }>(
        `/v1/cloud-security/detect-gcp-org/${selectedConnection.id}`,
      )
      .then((res) => {
        const orgs = res.data?.organizations ?? [];
        if (orgs.length > 0) setGcpOrgs(orgs);
        if (res.data?.selectedProjectIds?.length) {
          setGcpSelectedProjectIds(res.data.selectedProjectIds);
        }
        if (orgs.length === 1) {
          toast.success(`Connected to GCP organization: ${orgs[0].displayName}`);
        } else if (orgs.length > 1) {
          toast.info(`${orgs.length} GCP organizations found — select projects below.`);
        }
      })
      .catch(() => {});
  }, [provider.id, isConnected, selectedConnection?.id]);

  // Auto-detect services when switching accounts (skip GCP — needs project selection first)
  const detectedConnections = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (
      !isCloudProvider ||
      !isConnected ||
      !selectedConnection?.id ||
      detectedConnections.current.has(selectedConnection.id) ||
      provider.id === 'gcp'
    ) {
      return;
    }

    const connectionForRun = selectedConnection;
    api
      .post<{ services: string[] }>(
        `/v1/cloud-security/detect-services/${connectionForRun.id}`,
      )
      .then((res) => {
        if (res.error) return;
        detectedConnections.current.add(connectionForRun.id);
        const count = res.data?.services?.length;
        if (count) {
          const name = getConnectionDisplayLabel(connectionForRun);
          toast.success(`${count} services detected${name ? ` in ${name}` : ''}`);
        }
        return refreshServices();
      })
      .catch(() => {});
  }, [isCloudProvider, isConnected, selectedConnection?.id, refreshServices, provider.id]);

  const handleConnect = useCallback(async () => {
    if (provider.authType === 'oauth2') {
      const redirectUrl = `${window.location.origin}/${orgId}/integrations/${provider.id}?success=true`;
      const result = await startOAuth(provider.id, redirectUrl);
      if (result?.authorizationUrl) {
        window.location.href = result.authorizationUrl;
      } else {
        toast.error(result.error || 'Failed to start connection');
      }
      return;
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
            <Button size="sm" variant="outline" onClick={() => setReconnectDialogOpen(true)}>
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
                window.location.href = `/${orgId}/cloud-tests?provider=${provider.id}`;
              }
            }}
            onOAuthConnect={handleConnect}
          />
        )}

        {isConnected && isCloudProvider && (
          <div className="space-y-5">
            {/* Link to Cloud Tests — findings + fix now live there */}
            <a
              href={`/${orgId}/cloud-tests?provider=${provider.id}`}
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

            {/* GCP org → project selector */}
            {provider.id === 'gcp' && gcpOrgs.length > 0 && selectedConnection && (
              <GcpProjectPicker
                organizations={gcpOrgs}
                selectedProjectIds={gcpSelectedProjectIds}
                onToggleProject={(gcpOrgId, projectId) => {
                  const prev = gcpSelectedProjectIds;
                  const next = prev.includes(projectId)
                    ? prev.filter((id) => id !== projectId)
                    : [...prev, projectId];
                  setGcpSelectedProjectIds(next);
                  // Build name map keyed by both project ID and project number
                  const allProjects = gcpOrgs.flatMap((o) => o.projects);
                  const projectNames: Record<string, string> = {};
                  for (const pid of next) {
                    const p = allProjects.find((proj) => proj.id === pid) as
                      | { id: string; name: string; number?: string }
                      | undefined;
                    if (p) {
                      projectNames[pid] = p.name;
                      if (p.number) projectNames[p.number] = p.name;
                    }
                  }
                  void api
                    .post(
                      `/v1/cloud-security/select-gcp-projects/${selectedConnection.id}`,
                      { projectIds: next, projectNames, gcpOrganizationId: gcpOrgId },
                    )
                    .then(async (res) => {
                      if (res.error) {
                        setGcpSelectedProjectIds(prev);
                        toast.error('Failed to update projects');
                        return;
                      }
                      toast.success(
                        next.length === 0
                          ? 'All projects deselected'
                          : `${next.length} project(s) selected`,
                      );
                      // Re-run service detection for the new project selection
                      if (next.length > 0) {
                        await api.post(
                          `/v1/cloud-security/detect-services/${selectedConnection.id}`,
                        );
                        refreshServices();
                      }
                    });
                }}
              />
            )}

            {/* Services config */}
            {services.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Services</h3>
                {provider.id === 'gcp' && gcpSelectedProjectIds.length === 0 ? (
                  <div className="flex items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Select projects first</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Choose GCP projects above to detect which services are active. Service toggles will appear here once projects are selected.
                      </p>
                    </div>
                  </div>
                ) : provider.id === 'gcp' &&
                  servicesMeta.detectionReady === false ? (
                  <div className="rounded-lg border bg-muted/20 px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      Detecting active GCP services…
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Checking which APIs are enabled in your selected projects.
                    </p>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-2/5 animate-pulse rounded-full bg-primary/50 motion-reduce:animate-none" />
                    </div>
                  </div>
                ) : (
                  <ServicesGrid
                    services={services}
                    connectionServices={connectionServices}
                    connectionId={selectedConnection?.id ?? null}
                    onToggle={handleToggleService}
                    togglingService={togglingService}
                  />
                )}
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

      {selectedConnectionRequiresReconnect && (
        <ConnectIntegrationDialog
          open={reconnectDialogOpen}
          onOpenChange={setReconnectDialogOpen}
          integrationId={provider.id}
          integrationName={provider.name}
          integrationLogoUrl={provider.logoUrl}
          initialView="list"
          onConnected={() => {
            setReconnectDialogOpen(false);
            setShowAddAccount(false);
            refreshConnections();
          }}
        />
      )}
    </>
  );
}


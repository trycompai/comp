'use client';

import { ConnectIntegrationDialog } from '@/components/integrations/ConnectIntegrationDialog';
import { ManageIntegrationDialog } from '@/components/integrations/ManageIntegrationDialog';
import {
  ConnectionListItem,
  IntegrationProvider,
  useIntegrationConnections,
  useIntegrationMutations,
  useIntegrationProviders,
} from '@/hooks/use-integration-platform';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Skeleton } from '@comp/ui/skeleton';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plug,
  Settings2,
  Sparkles,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getRelevantTasksForIntegration } from '../actions/get-relevant-tasks';
import {
  CATEGORIES,
  INTEGRATIONS,
  type Integration,
  type IntegrationCategory,
} from '../data/integrations';
import { SearchInput } from './SearchInput';
import { TaskCard, TaskCardSkeleton } from './TaskCard';

const LOGO_TOKEN = 'pk_AZatYxV5QDSfWpRDaBxzRQ';

// Check if a provider needs variable configuration based on manifest's required variables
const providerNeedsConfiguration = (
  requiredVariables: string[] | undefined,
  variables: Record<string, unknown> | null | undefined,
): boolean => {
  if (!requiredVariables || requiredVariables.length === 0) return false;

  const currentVars = variables || {};
  return requiredVariables.some((varId) => !currentVars[varId]);
};

interface RelevantTask {
  taskTemplateId: string;
  taskName: string;
  reason: string;
  prompt: string;
}

type UnifiedIntegration =
  | { type: 'platform'; provider: IntegrationProvider; connection?: ConnectionListItem }
  | { type: 'custom'; integration: Integration };

interface PlatformIntegrationsProps {
  className?: string;
  taskTemplates: Array<{ id: string; name: string; description: string }>;
}

export function PlatformIntegrations({ className, taskTemplates }: PlatformIntegrationsProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const searchParams = useSearchParams();
  const { providers, isLoading: loadingProviders } = useIntegrationProviders(true);
  const {
    connections,
    isLoading: loadingConnections,
    refresh: refreshConnections,
  } = useIntegrationConnections();
  const { startOAuth } = useIntegrationMutations();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'All'>('All');
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const hasHandledOAuthRef = useRef(false);

  // Management dialog state
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<ConnectionListItem | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null);

  // Connect dialog state (for non-OAuth)
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [connectingProviderInfo, setConnectingProviderInfo] = useState<IntegrationProvider | null>(
    null,
  );

  // Custom integration dialog state
  const [selectedCustomIntegration, setSelectedCustomIntegration] = useState<Integration | null>(
    null,
  );
  const [relevantTasks, setRelevantTasks] = useState<RelevantTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const handleConnect = async (provider: IntegrationProvider) => {
    // For OAuth, redirect to authorization URL
    if (provider.authType === 'oauth2') {
      setConnectingProvider(provider.id);
      try {
        const redirectUrl = window.location.href;
        const result = await startOAuth(provider.id, redirectUrl);
        if (result.authorizationUrl) {
          window.location.href = result.authorizationUrl;
        } else {
          toast.error(result.error || 'Failed to start connection');
          setConnectingProvider(null);
        }
      } catch {
        toast.error('Failed to start connection');
        setConnectingProvider(null);
      }
      return;
    }

    // For non-OAuth (api_key, basic, custom), open the connect dialog
    setConnectingProviderInfo(provider);
    setConnectDialogOpen(true);
  };

  const handleConnectDialogSuccess = () => {
    refreshConnections();
    setConnectDialogOpen(false);
    setConnectingProviderInfo(null);
  };

  const handleOpenManageDialog = (
    connection: ConnectionListItem,
    provider: IntegrationProvider,
  ) => {
    setSelectedConnection(connection);
    setSelectedProvider(provider);
    setManageDialogOpen(true);
  };

  const handleCloseManageDialog = () => {
    setManageDialogOpen(false);
    setSelectedConnection(null);
    setSelectedProvider(null);
  };

  // Map connections by provider slug
  const connectionsByProvider = useMemo(
    () => new Map(connections?.map((c) => [c.providerSlug, c]) || []),
    [connections],
  );

  // Merge and sort: platform first (warnings, then connected, then disconnected), then custom
  const unifiedIntegrations = useMemo<UnifiedIntegration[]>(() => {
    const platformIntegrations: UnifiedIntegration[] = (providers?.filter((p) => p.isActive) || [])
      .map((provider) => ({
        type: 'platform' as const,
        provider,
        connection: connectionsByProvider.get(provider.id),
      }))
      .sort((a, b) => {
        const aConnected = a.connection?.status === 'active';
        const bConnected = b.connection?.status === 'active';
        const aNeedsConfig = aConnected && a.connection?.variables === null;
        const bNeedsConfig = bConnected && b.connection?.variables === null;

        // Warnings first
        if (aNeedsConfig && !bNeedsConfig) return -1;
        if (!aNeedsConfig && bNeedsConfig) return 1;

        // Then connected
        if (aConnected && !bConnected) return -1;
        if (!aConnected && bConnected) return 1;

        // Then alphabetical
        return a.provider.name.localeCompare(b.provider.name);
      });

    const customIntegrations: UnifiedIntegration[] = INTEGRATIONS.map((integration) => ({
      type: 'custom' as const,
      integration,
    }));

    return [...platformIntegrations, ...customIntegrations];
  }, [providers, connectionsByProvider]);

  // Get all unique categories
  const allCategories = useMemo(() => {
    const platformCategories = new Set(providers?.map((p) => p.category) || []);
    const customCategories = new Set(CATEGORIES);
    return Array.from(new Set([...platformCategories, ...customCategories])).sort();
  }, [providers]);

  // Filter integrations
  const filteredIntegrations = useMemo(() => {
    let filtered = unifiedIntegrations;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((item) => {
        if (item.type === 'platform') {
          return item.provider.category === selectedCategory;
        }
        return item.integration.category === selectedCategory;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const terms = query.split(' ').filter(Boolean);

      filtered = filtered.filter((item) => {
        if (item.type === 'platform') {
          const searchText =
            `${item.provider.name} ${item.provider.description} ${item.provider.category}`.toLowerCase();
          return terms.some((term) => searchText.includes(term));
        }
        const searchText =
          `${item.integration.name} ${item.integration.description} ${item.integration.category} ${item.integration.examplePrompts.join(' ')}`.toLowerCase();
        return terms.some((term) => searchText.includes(term));
      });
    }

    return filtered;
  }, [unifiedIntegrations, searchQuery, selectedCategory]);

  // Handle OAuth callback - auto-open config dialog for newly connected provider
  useEffect(() => {
    // Only handle once
    if (hasHandledOAuthRef.current) return;

    const success = searchParams.get('success');
    const providerSlug = searchParams.get('provider');

    // Check if this is an OAuth callback
    if (success !== 'true' || !providerSlug) return;

    // Wait for data to load
    if (!connections || !providers || loadingConnections || loadingProviders) {
      console.log('[OAuth] Waiting for data to load...');
      return;
    }

    // Mark as handled
    hasHandledOAuthRef.current = true;
    console.log('[OAuth] Handling callback for', providerSlug);

    const connection = connections.find((c) => c.providerSlug === providerSlug);
    const provider = providers.find((p) => p.id === providerSlug);

    if (connection && provider) {
      console.log('[OAuth] Found connection and provider, opening dialog');
      toast.success(`${provider.name} connected successfully!`);

      // Set state first
      setSelectedConnection(connection);
      setSelectedProvider(provider);

      // Open dialog after a tick to ensure state is updated
      setTimeout(() => {
        console.log('[OAuth] Opening manage dialog');
        setManageDialogOpen(true);
      }, 150);
    } else {
      console.warn('[OAuth] Connection or provider not found:', {
        hasConnection: !!connection,
        hasProvider: !!provider,
        connectionsCount: connections.length,
        providersCount: providers.length,
      });
    }

    // Clean up URL parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('success');
    url.searchParams.delete('provider');
    window.history.replaceState({}, '', url.toString());
  }, [searchParams, connections, providers, loadingConnections, loadingProviders]);

  // Custom integration task loading
  useEffect(() => {
    if (selectedCustomIntegration && orgId && taskTemplates.length > 0) {
      setIsLoadingTasks(true);
      getRelevantTasksForIntegration(
        selectedCustomIntegration.name,
        selectedCustomIntegration.description,
        taskTemplates,
      )
        .then((tasks) => setRelevantTasks(tasks))
        .catch((error) => {
          console.error('Error fetching relevant tasks:', error);
          setRelevantTasks([]);
        })
        .finally(() => setIsLoadingTasks(false));
    } else {
      setRelevantTasks([]);
    }
  }, [selectedCustomIntegration, orgId, taskTemplates]);

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success('Prompt copied to clipboard!');
  };

  if (loadingProviders || loadingConnections) {
    return (
      <div className={className}>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-20" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <Skeleton className="h-5 w-32 mt-2" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col gap-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search integrations..."
            className="w-full max-w-md"
          />

          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 sm:overflow-x-visible sm:flex-wrap sm:pb-0 sm:mx-0 sm:px-0 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <Button
              size="sm"
              variant={selectedCategory === 'All' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('All')}
              className="flex-shrink-0 whitespace-nowrap min-w-fit px-4"
            >
              All
            </Button>
            {allCategories.map((category) => (
              <Button
                key={category}
                size="sm"
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category as IntegrationCategory)}
                className="flex-shrink-0 whitespace-nowrap min-w-fit px-4"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Results info */}
        {(searchQuery || selectedCategory !== 'All') && filteredIntegrations.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredIntegrations.length}{' '}
            {filteredIntegrations.length === 1 ? 'integration' : 'integrations'}
          </div>
        )}

        {/* Integration Cards Grid */}
        {filteredIntegrations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIntegrations.map((item) => {
              if (item.type === 'platform') {
                const { provider, connection } = item;
                const isConnected = connection?.status === 'active';
                const isConnecting = connectingProvider === provider.id;
                const hasError = connection?.status === 'error';

                // Check if connected but missing required configuration
                const needsConfiguration =
                  isConnected &&
                  providerNeedsConfiguration(
                    provider.requiredVariables,
                    connection?.variables as Record<string, unknown> | null,
                  );

                return (
                  <Card
                    key={`platform-${provider.id}`}
                    className={`relative overflow-hidden transition-all flex flex-col ${
                      needsConfiguration
                        ? 'border-warning/30 bg-warning/5'
                        : isConnected
                          ? 'border-primary/30 bg-primary/5'
                          : 'hover:border-primary/20 hover:shadow-sm'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center overflow-hidden">
                            <Image
                              src={provider.logoUrl}
                              alt={`${provider.name} logo`}
                              width={32}
                              height={32}
                              className="object-contain"
                            />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                              {provider.name}
                              {isConnected && !needsConfiguration && (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              )}
                              {needsConfiguration && (
                                <AlertTriangle className="h-4 w-4 text-warning" />
                              )}
                              {hasError && <AlertCircle className="h-4 w-4 text-destructive" />}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-muted-foreground">{provider.category}</p>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Platform
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {isConnected && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleOpenManageDialog(connection, provider)}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col h-full">
                      <div className="flex-1 space-y-4">
                        <CardDescription className="text-sm leading-relaxed line-clamp-2">
                          {provider.description}
                        </CardDescription>

                        {/* Mapped tasks */}
                        {provider.mappedTasks && provider.mappedTasks.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {provider.mappedTasks.slice(0, 3).map((task) => (
                              <Badge
                                key={task.id}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0.5 font-normal"
                              >
                                {task.name}
                              </Badge>
                            ))}
                            {provider.mappedTasks.length > 3 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0.5 font-normal"
                              >
                                +{provider.mappedTasks.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-auto pt-4">
                        {needsConfiguration ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleOpenManageDialog(connection, provider)}
                          >
                            Configure Variables
                          </Button>
                        ) : isConnected ? null : hasError ? (
                          <div className="space-y-2 pt-2 border-t border-border/50">
                            <p className="text-xs text-destructive line-clamp-1">
                              {connection?.errorMessage || 'Connection error'}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => handleConnect(provider)}
                              disabled={isConnecting}
                            >
                              {isConnecting ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                  Reconnecting...
                                </>
                              ) : (
                                'Reconnect'
                              )}
                            </Button>
                          </div>
                        ) : provider.authType === 'oauth2' && provider.oauthConfigured === false ? (
                          <Button size="sm" variant="outline" className="w-full" disabled>
                            Coming Soon
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleConnect(provider)}
                            disabled={isConnecting}
                          >
                            {isConnecting ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              'Connect'
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // Custom integration card
              const { integration } = item;
              return (
                <Card
                  key={`custom-${integration.id}`}
                  className="group relative overflow-hidden hover:shadow-md transition-all hover:border-primary/30 cursor-pointer"
                  onClick={() => setSelectedCustomIntegration(integration)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center overflow-hidden">
                          <Image
                            src={`https://img.logo.dev/${integration.domain}?token=${LOGO_TOKEN}`}
                            alt={`${integration.name} logo`}
                            width={32}
                            height={32}
                            unoptimized
                            className="object-contain rounded-md"
                          />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            {integration.name}
                            {integration.popular && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                Popular
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground">{integration.category}</p>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-dashed"
                            >
                              AI Agent
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed line-clamp-2">
                      {integration.description}
                    </CardDescription>
                  </CardContent>
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </Card>
              );
            })}
          </div>
        ) : (
          // Empty state
          <div className="text-center py-16">
            <div className="max-w-xl mx-auto space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">Just ask the agent</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                    {searchQuery ? (
                      <>
                        "{searchQuery}" isn't in our directory, but the agent can connect to it
                        anyway. Describe what you need in natural language.
                      </>
                    ) : (
                      <>
                        The agent can integrate with any system—you're not limited to this
                        directory.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-background border border-border text-left space-y-3">
                <p className="text-sm font-medium text-foreground">Example for your search:</p>
                <div className="space-y-2">
                  <button
                    onClick={() =>
                      handleCopyPrompt(
                        `Connect to ${searchQuery || 'our system'} and check security settings`,
                      )
                    }
                    className="w-full p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/30 transition-colors text-left group"
                  >
                    <p className="text-sm text-foreground/80 group-hover:text-foreground">
                      "Connect to {searchQuery || 'our system'} and check security settings"
                    </p>
                  </button>
                  <button
                    onClick={() =>
                      handleCopyPrompt(
                        `Pull compliance data from ${searchQuery || 'our internal tool'}`,
                      )
                    }
                    className="w-full p-3 rounded-lg bg-muted/50 border border-border hover:border-primary/30 transition-colors text-left group"
                  >
                    <p className="text-sm text-foreground/80 group-hover:text-foreground">
                      "Pull compliance data from {searchQuery || 'our internal tool'}"
                    </p>
                  </button>
                </div>
                <Link
                  href={`/${orgId}/tasks`}
                  className="flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 font-medium pt-2"
                >
                  Go to Tasks to get started
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground font-medium"
                >
                  ← Browse all integrations
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Manage Connection Dialog */}
      {selectedConnection && selectedProvider && (
        <ManageIntegrationDialog
          open={manageDialogOpen}
          onOpenChange={(open) => {
            if (!open) handleCloseManageDialog();
            else setManageDialogOpen(open);
          }}
          connectionId={selectedConnection.id}
          integrationId={selectedProvider.id}
          integrationName={selectedProvider.name}
          integrationLogoUrl={selectedProvider.logoUrl}
          onDisconnected={refreshConnections}
          onDeleted={refreshConnections}
          onSaved={refreshConnections}
        />
      )}

      {/* Connect Dialog (for non-OAuth integrations) */}
      {connectingProviderInfo && (
        <ConnectIntegrationDialog
          open={connectDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setConnectDialogOpen(false);
              setConnectingProviderInfo(null);
            }
          }}
          integrationId={connectingProviderInfo.id}
          integrationName={connectingProviderInfo.name}
          integrationLogoUrl={connectingProviderInfo.logoUrl}
          onConnected={handleConnectDialogSuccess}
        />
      )}

      {/* Custom Integration Detail Modal */}
      {selectedCustomIntegration && (
        <Dialog
          open={!!selectedCustomIntegration}
          onOpenChange={() => setSelectedCustomIntegration(null)}
        >
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
            <div className="relative overflow-hidden">
              <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-background border-b border-border/50 p-6">
                <DialogHeader className="pb-0">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-background border-2 border-border shadow-sm flex items-center justify-center overflow-hidden ring-2 ring-primary/10">
                      <Image
                        src={`https://img.logo.dev/${selectedCustomIntegration.domain}?token=${LOGO_TOKEN}`}
                        alt={`${selectedCustomIntegration.name} logo`}
                        width={36}
                        height={36}
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <DialogTitle className="text-2xl font-bold">
                          {selectedCustomIntegration.name}
                        </DialogTitle>
                        {selectedCustomIntegration.popular && (
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                            Popular
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-dashed">
                          AI Agent
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-primary">
                          {selectedCustomIntegration.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <DialogDescription className="text-sm leading-relaxed text-foreground/80 mt-2">
                    {selectedCustomIntegration.description}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-6 space-y-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Plug className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="text-base font-semibold text-foreground">How to Connect</h4>
                  </div>
                  <div className="p-5 rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 shadow-sm space-y-3">
                    <p className="text-sm text-foreground leading-relaxed">
                      Click on any relevant task below to create an automation with{' '}
                      {selectedCustomIntegration.name}. The automation will be pre-configured with a
                      prompt tailored to that task. The agent will ask you for the necessary
                      permissions and API keys if required.
                    </p>
                    {selectedCustomIntegration.setupHint && (
                      <div className="flex items-start gap-2 pt-2 border-t border-border/50">
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Typically requires:</span>{' '}
                          {selectedCustomIntegration.setupHint}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="text-base font-semibold text-foreground">Relevant Tasks</h4>
                  </div>
                  {isLoadingTasks ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[...Array(4)].map((_, index) => (
                        <TaskCardSkeleton key={index} />
                      ))}
                    </div>
                  ) : relevantTasks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {relevantTasks.map((task) => (
                        <TaskCard key={task.taskTemplateId} task={task} orgId={orgId} />
                      ))}
                    </div>
                  ) : (
                    <div className="p-5 rounded-xl bg-muted/50 border border-border/50">
                      <p className="text-sm text-muted-foreground text-center">
                        No relevant tasks found for this integration.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

'use client';

import { ConnectIntegrationDialog } from '@/components/integrations/ConnectIntegrationDialog';
import { ManageIntegrationDialog } from '@/components/integrations/ManageIntegrationDialog';
import { usePermissions } from '@/hooks/use-permissions';
import { useVendors } from '@/hooks/use-vendors';
import {
  ConnectionListItem,
  IntegrationProvider,
  useIntegrationConnections,
  useIntegrationMutations,
  useIntegrationProviders,
} from '@/hooks/use-integration-platform';
import { Badge } from '@trycompai/ui/badge';
import { Button } from '@trycompai/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@trycompai/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import { Skeleton } from '@trycompai/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@trycompai/ui/tooltip';
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
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  CATEGORIES,
  INTEGRATIONS,
  type Integration,
  type IntegrationCategory,
} from '../data/integrations';
import { SearchInput } from './SearchInput';
import { TaskCard, TaskCardSkeleton } from './TaskCard';

const LOGO_TOKEN = 'pk_AZatYxV5QDSfWpRDaBxzRQ';

// Providers that support employee sync via People > All
const EMPLOYEE_SYNC_PROVIDERS = new Set([
  'google-workspace',
  'rippling',
  'jumpcloud',
]);

// Check if a provider needs variable configuration based on manifest's required variables
const providerNeedsConfiguration = (
  requiredVariables: string[] | undefined,
  variables: Record<string, unknown> | null | undefined,
): boolean => {
  if (!requiredVariables || requiredVariables.length === 0) return false;

  const currentVars = variables || {};
  return requiredVariables.some((varId) => !currentVars[varId]);
};

const normalizeIntegrationName = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

interface RelevantTask {
  taskId: string; // Actual task ID for navigation
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
  taskTemplates: Array<{ id: string; taskId: string; name: string; description: string }>;
}

const CONNECTION_STATUS_PRIORITY: Record<string, number> = {
  active: 5,
  pending: 4,
  error: 3,
  paused: 2,
  disconnected: 1,
};

const getConnectionPriority = (connection: ConnectionListItem): number => {
  return CONNECTION_STATUS_PRIORITY[connection.status] ?? 0;
};

const getConnectionCreatedAtMs = (connection: ConnectionListItem): number => {
  const date = new Date(connection.createdAt);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const shouldReplaceProviderConnection = (
  current: ConnectionListItem | undefined,
  candidate: ConnectionListItem,
): boolean => {
  if (!current) return true;

  const currentPriority = getConnectionPriority(current);
  const candidatePriority = getConnectionPriority(candidate);
  if (candidatePriority !== currentPriority) {
    return candidatePriority > currentPriority;
  }

  return getConnectionCreatedAtMs(candidate) > getConnectionCreatedAtMs(current);
};

export function PlatformIntegrations({ className, taskTemplates }: PlatformIntegrationsProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { providers, isLoading: loadingProviders } = useIntegrationProviders(true);
  const {
    connections,
    isLoading: loadingConnections,
    refresh: refreshConnections,
  } = useIntegrationConnections();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('integration', 'create');
  const { startOAuth } = useIntegrationMutations();
  const { data: vendorsResponse } = useVendors();

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
        const redirectUrl = `${window.location.origin}/${orgId}/integrations/${provider.id}?success=true`;
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

    // For non-OAuth (api_key, basic, custom), navigate to detail page
    router.push(`/${orgId}/integrations/${provider.id}`);
  };

  const handleConnectDialogSuccess = () => {
    // Prompt user to import employees for providers that support sync
    if (connectingProviderInfo && EMPLOYEE_SYNC_PROVIDERS.has(connectingProviderInfo.id)) {
      toast.info(`Import your ${connectingProviderInfo.name} users`, {
        description:
          'Go to People to import and sync your team members.',
        duration: 15000,
        action: {
          label: 'Go to People',
          onClick: () => router.push(`/${orgId}/people/all`),
        },
      });
    }
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
  const connectionsByProvider = useMemo(() => {
    const map = new Map<string, ConnectionListItem>();
    for (const connection of connections ?? []) {
      const current = map.get(connection.providerSlug);
      if (shouldReplaceProviderConnection(current, connection)) {
        map.set(connection.providerSlug, connection);
      }
    }
    return map;
  }, [connections]);

  const vendorNames = useMemo(() => {
    const vendors = vendorsResponse?.data?.data;
    if (!Array.isArray(vendors)) {
      return new Set<string>();
    }

    return new Set(
      vendors
        .map((vendor) => normalizeIntegrationName(vendor.name))
        .filter((name) => name.length > 0),
    );
  }, [vendorsResponse]);

  // Merge/sort integrations, then prioritize entries matching vendors in the org's vendor list.
  const unifiedIntegrations = useMemo<UnifiedIntegration[]>(() => {
    const platformSortTier = (
      item: UnifiedIntegration & { type: 'platform' },
    ): 0 | 1 | 2 => {
      const { provider, connection } = item;
      const isComingSoon =
        provider.authType === 'oauth2' && provider.oauthConfigured === false;
      if (isComingSoon) return 2;

      const hasEstablishedConnection =
        connection &&
        connection.status !== 'disconnected' &&
        ['active', 'pending', 'error', 'paused'].includes(connection.status);
      if (hasEstablishedConnection) return 0;

      return 1;
    };

    const platformIntegrations: UnifiedIntegration[] = (providers?.filter((p) => p.isActive) || [])
      .map((provider) => ({
        type: 'platform' as const,
        provider,
        connection: connectionsByProvider.get(provider.id),
      }))
      .sort((a, b) => {
        const tierA = platformSortTier(a);
        const tierB = platformSortTier(b);
        if (tierA !== tierB) return tierA - tierB;
        return a.provider.name.localeCompare(b.provider.name);
      });

    // AI Agent integrations are hidden — they are not real integrations
    const allIntegrations = [...platformIntegrations];
    if (vendorNames.size === 0) {
      return allIntegrations;
    }

    const vendorListedIntegrations: UnifiedIntegration[] = [];
    const otherIntegrations: UnifiedIntegration[] = [];

    allIntegrations.forEach((integration) => {
      const candidateNames =
        integration.type === 'platform'
          ? [integration.provider.name, integration.provider.id]
          : [integration.integration.name, integration.integration.id];

      const isVendorListed = candidateNames
        .map((candidateName) => normalizeIntegrationName(candidateName))
        .some((normalizedCandidateName) => vendorNames.has(normalizedCandidateName));

      if (isVendorListed) {
        vendorListedIntegrations.push(integration);
      } else {
        otherIntegrations.push(integration);
      }
    });

    // Connected integrations always appear first, then vendor-listed, then others
    const ESTABLISHED_STATUSES = new Set(['active', 'pending', 'error', 'paused']);
    const sortByConnection = (list: UnifiedIntegration[]) =>
      list.sort((a, b) => {
        const aConnected =
          a.type === 'platform' &&
          a.connection?.status &&
          ESTABLISHED_STATUSES.has(a.connection.status)
            ? 0
            : 1;
        const bConnected =
          b.type === 'platform' &&
          b.connection?.status &&
          ESTABLISHED_STATUSES.has(b.connection.status)
            ? 0
            : 1;
        return aConnected - bConnected;
      });
    return sortByConnection([...vendorListedIntegrations, ...otherIntegrations]);
  }, [providers, connectionsByProvider, vendorNames]);

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
          return terms.every((term) => searchText.includes(term));
        }
        const searchText =
          `${item.integration.name} ${item.integration.description} ${item.integration.category} ${item.integration.examplePrompts.join(' ')}`.toLowerCase();
        return terms.every((term) => searchText.includes(term));
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
      return;
    }

    // Mark as handled
    hasHandledOAuthRef.current = true;

    const connection = connections.find((c) => c.providerSlug === providerSlug);
    const provider = providers.find((p) => p.id === providerSlug);

    if (connection && provider) {
      toast.success(`${provider.name} connected successfully!`);

      // Prompt user to import employees for providers that support sync
      if (EMPLOYEE_SYNC_PROVIDERS.has(providerSlug)) {
        toast.info(`Import your ${provider.name} users`, {
          description:
            'Go to People to import and sync your team members.',
          duration: 15000,
          action: {
            label: 'Go to People',
            onClick: () => router.push(`/${orgId}/people/all`),
          },
        });
      }

      // Set state first
      setSelectedConnection(connection);
      setSelectedProvider(provider);

      // Open dialog after a tick to ensure state is updated
      setTimeout(() => {
        setManageDialogOpen(true);
      }, 150);
    }

    // Clean up URL parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('success');
    url.searchParams.delete('provider');
    window.history.replaceState({}, '', url.toString());
  }, [searchParams, connections, providers, loadingConnections, loadingProviders]);

  // Create a map from templateId to taskId for quick lookup
  const templateToTaskMap = useMemo(
    () => new Map(taskTemplates.map((t) => [t.id, t.taskId])),
    [taskTemplates],
  );

  // Custom integration task loading
  useEffect(() => {
    if (selectedCustomIntegration && orgId && taskTemplates && taskTemplates.length > 0) {
      setIsLoadingTasks(true);
      fetch('/api/integrations/relevant-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          integrationName: selectedCustomIntegration.name,
          integrationDescription: selectedCustomIntegration.description,
          taskTemplates: taskTemplates.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
          })),
          examplePrompts: selectedCustomIntegration.examplePrompts,
        }),
      })
        .then((res) => res.json())
        .then((data: { tasks: Array<{ taskTemplateId: string; taskName: string; reason: string; prompt: string }> }) => {
          const aiTasks = Array.isArray(data.tasks) ? data.tasks : [];
          const tasksWithIds = aiTasks
            .map((task) => ({
              ...task,
              taskId: templateToTaskMap.get(task.taskTemplateId) || '',
            }))
            .filter((task) => task.taskId);
          setRelevantTasks(tasksWithIds);
        })
        .catch((error) => {
          console.error('Error fetching relevant tasks:', error);
          setRelevantTasks([]);
        })
        .finally(() => setIsLoadingTasks(false));
    } else {
      setRelevantTasks([]);
    }
  }, [selectedCustomIntegration, orgId, taskTemplates, templateToTaskMap]);

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

                const isComingSoon = provider.authType === 'oauth2' && provider.oauthConfigured === false;

                /** Primary CTA is Connect / Set up — card still opens details on click; hide redundant “View details” row */
                const showConnectOrSetup =
                  canCreate &&
                  !needsConfiguration &&
                  !isConnected &&
                  !hasError &&
                  !isComingSoon;

                return (
                  <div
                    key={`platform-${provider.id}`}
                    className={
                      isComingSoon
                        ? undefined
                        : 'group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                    }
                    role={isComingSoon ? undefined : 'button'}
                    tabIndex={isComingSoon ? undefined : 0}
                    aria-label={
                      isComingSoon
                        ? undefined
                        : `Open ${provider.name} — connection details, services, and settings`
                    }
                    onClick={isComingSoon ? undefined : () => router.push(`/${orgId}/integrations/${provider.id}`)}
                    onKeyDown={
                      isComingSoon
                        ? undefined
                        : (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              router.push(`/${orgId}/integrations/${provider.id}`);
                            }
                          }
                    }
                  >
                  <Card
                    className={`relative overflow-hidden transition-all flex flex-col h-full ${isComingSoon ? 'opacity-75' : 'cursor-pointer'} ${
                      needsConfiguration
                        ? 'border-warning/30 bg-warning/5'
                        : isConnected
                          ? 'border-primary/30 bg-primary/5'
                          : 'hover:border-primary/20 hover:shadow-sm'
                    } ${!isComingSoon ? 'group-hover:border-primary/30 group-hover:shadow-md' : ''}`}
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
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenManageDialog(connection, provider); }}
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

                        {provider.category === 'Cloud' && (
                          <p className="text-xs text-muted-foreground italic">
                            This integration is used exclusively for Cloud Security Tests.
                          </p>
                        )}

                        {/* Mapped tasks */}
                        {provider.mappedTasks && provider.mappedTasks.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {provider.mappedTasks.slice(0, 3).map((task) => {
                              const taskId = templateToTaskMap.get(task.id);
                              return taskId ? (
                                <Link
                                  key={task.id}
                                  href={`/${orgId}/tasks/${taskId}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0.5 font-normal cursor-pointer hover:bg-secondary/80 transition-colors"
                                  >
                                    {task.name}
                                  </Badge>
                                </Link>
                              ) : (
                                <Badge
                                  key={task.id}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0.5 font-normal"
                                >
                                  {task.name}
                                </Badge>
                              );
                            })}
                            {provider.mappedTasks.length > 3 && (
                              <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0.5 font-normal cursor-default"
                                  >
                                    +{provider.mappedTasks.length - 3} more
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-xs">
                                  <div className="flex flex-wrap gap-1">
                                    {provider.mappedTasks.slice(3).map((t) => {
                                      const tid = templateToTaskMap.get(t.id);
                                      return tid ? (
                                        <Link
                                          key={t.id}
                                          href={`/${orgId}/tasks/${tid}`}
                                          className="text-xs text-primary hover:underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {t.name}
                                        </Link>
                                      ) : (
                                        <span key={t.id} className="text-xs">{t.name}</span>
                                      );
                                    })}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        )}
                      </div>

                      {!isComingSoon && !showConnectOrSetup && (
                        <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-border/50 pt-3 text-xs font-medium text-primary">
                          <span>View details</span>
                          <ArrowRight
                            className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </div>
                      )}

                      <div className="mt-auto pt-4">
                        {needsConfiguration ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenManageDialog(connection, provider); }}
                          >
                            Configure Variables
                          </Button>
                        ) : isConnected ? null : hasError ? (
                          <div className="space-y-2 pt-2 border-t border-border/50">
                            <p className="text-xs text-destructive line-clamp-1">
                              {connection?.errorMessage || 'Connection error'}
                            </p>
                            {canCreate && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleConnect(provider); }}
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
                            )}
                          </div>
                        ) : provider.authType === 'oauth2' && provider.oauthConfigured === false ? (
                          <Button size="sm" variant="outline" className="w-full" disabled>
                            Coming Soon
                          </Button>
                        ) : canCreate ? (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleConnect(provider); }}
                            disabled={isConnecting}
                          >
                            {isConnecting ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              provider.authType === 'oauth2' ? 'Connect' : 'Set up'
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                    {!isComingSoon && (
                      <div
                        className="pointer-events-none absolute inset-0 rounded-xl bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100"
                        aria-hidden
                      />
                    )}
                  </Card>
                  </div>
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

      {/* Manage Connection Dialog - Use ConnectIntegrationDialog for multi-connection providers */}
      {selectedConnection &&
        selectedProvider &&
        (selectedProvider.supportsMultipleConnections ? (
          <ConnectIntegrationDialog
            open={manageDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                handleCloseManageDialog();
                refreshConnections();
              } else {
                setManageDialogOpen(open);
              }
            }}
            integrationId={selectedProvider.id}
            integrationName={selectedProvider.name}
            integrationLogoUrl={selectedProvider.logoUrl}
            onConnected={refreshConnections}
          />
        ) : (
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
            onDeleted={refreshConnections}
            onSaved={refreshConnections}
          />
        ))}

      {/* Connect dialog removed — non-OAuth providers navigate to detail page */}

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

                {selectedCustomIntegration.examplePrompts.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <h4 className="text-base font-semibold text-foreground">Example Prompts</h4>
                    </div>
                    <div className="space-y-2">
                      {selectedCustomIntegration.examplePrompts.map((prompt, index) => (
                        <button
                          key={`${selectedCustomIntegration.id}-prompt-${index}`}
                          onClick={() => handleCopyPrompt(prompt)}
                          className="w-full p-3 rounded-lg bg-muted/40 border border-border/60 hover:border-primary/30 transition-colors text-left group"
                        >
                          <p className="text-sm text-foreground/80 group-hover:text-foreground">
                            "{prompt}"
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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

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
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Skeleton } from '@comp/ui/skeleton';
import { AlertCircle, CheckCircle2, Loader2, PlugZap, Settings2 } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { SearchInput } from './SearchInput';

interface PlatformIntegrationsProps {
  className?: string;
}

export function PlatformIntegrations({ className }: PlatformIntegrationsProps) {
  const searchParams = useSearchParams();
  const { providers, isLoading: loadingProviders } = useIntegrationProviders(true);
  const {
    connections,
    isLoading: loadingConnections,
    refresh: refreshConnections,
  } = useIntegrationConnections();
  const { startOAuth } = useIntegrationMutations();

  const [searchQuery, setSearchQuery] = useState('');
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

  // Filter providers by search
  const filteredProviders = useMemo(() => {
    const activeProviders = providers?.filter((p) => p.isActive) || [];
    if (!searchQuery.trim()) return activeProviders;

    const query = searchQuery.toLowerCase();
    return activeProviders.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query),
    );
  }, [providers, searchQuery]);

  // Map connections by provider slug
  const connectionsByProvider = useMemo(
    () => new Map(connections?.map((c) => [c.providerSlug, c]) || []),
    [connections],
  );

  // Handle OAuth callback - auto-open config dialog for newly connected provider
  useEffect(() => {
    if (hasHandledOAuthRef.current) return;

    const success = searchParams.get('success');
    const providerSlug = searchParams.get('provider');

    if (success === 'true' && providerSlug && connections && providers) {
      hasHandledOAuthRef.current = true;

      // Find the connection and provider
      const connection = connections.find((c) => c.providerSlug === providerSlug);
      const provider = providers.find((p) => p.id === providerSlug);

      if (connection && provider) {
        // Show success toast
        toast.success(`${provider.name} connected successfully!`);

        // Open the config dialog so user can configure variables
        setSelectedConnection(connection);
        setSelectedProvider(provider);
        setManageDialogOpen(true);
      }

      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      url.searchParams.delete('provider');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, connections, providers]);

  if (loadingProviders || loadingConnections) {
    return (
      <div className={className}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <PlugZap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Platform Integrations</h2>
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
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

  const activeProviders = providers?.filter((p) => p.isActive) || [];

  if (activeProviders.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlugZap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Platform Integrations</h2>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Pre-built integrations that automatically verify compliance controls and collect evidence.
        </p>

        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search integrations..."
          className="max-w-md"
        />

        {filteredProviders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No integrations found matching "{searchQuery}"
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProviders.map((provider) => {
              const connection = connectionsByProvider.get(provider.id);
              const isConnected = connection?.status === 'active';
              const isConnecting = connectingProvider === provider.id;
              const hasError = connection?.status === 'error';

              return (
                <Card
                  key={provider.id}
                  className={`relative overflow-hidden transition-all ${
                    isConnected
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
                            {isConnected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                            {hasError && <AlertCircle className="h-4 w-4 text-destructive" />}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {provider.category}
                          </p>
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
                  <CardContent className="space-y-4">
                    <CardDescription className="text-sm leading-relaxed line-clamp-2">
                      {provider.description}
                    </CardDescription>

                    {/* Connection Status / Action */}
                    {isConnected ? null : hasError ? (
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
                  </CardContent>
                </Card>
              );
            })}
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
    </div>
  );
}

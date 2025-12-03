'use client';

import { api } from '@/lib/api-client';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Key,
  Loader2,
  RefreshCw,
  Settings,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  authType: string;
  capabilities: string[];
  isActive: boolean;
  docsUrl?: string;
  hasCredentials: boolean;
  credentialConfiguredAt?: string;
  credentialUpdatedAt?: string;
  setupInstructions?: string;
  createAppUrl?: string;
  requiredScopes?: string[];
  authorizeUrl?: string;
}

function IntegrationCard({
  integration,
  onRefresh,
}: {
  integration: Integration;
  onRefresh: () => void;
}) {
  const [showConfig, setShowConfig] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [appName, setAppName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if this integration needs an app name (has {APP_NAME} placeholder in authorize URL)
  const needsAppName = integration.authorizeUrl?.includes('{APP_NAME}');

  const handleSave = async () => {
    if (!clientId || !clientSecret) return;
    if (needsAppName && !appName) return;

    setIsSaving(true);
    setError(null);

    const response = await api.post('/v1/admin/integrations/credentials', {
      providerSlug: integration.id,
      clientId,
      clientSecret,
      customSettings: needsAppName ? { appName } : undefined,
    });

    if (response.error) {
      setError(response.error);
    } else {
      setClientId('');
      setClientSecret('');
      setShowConfig(false);
      onRefresh();
    }

    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete credentials for ${integration.name}?`)) return;

    setIsDeleting(true);
    setError(null);

    const response = await api.delete(`/v1/admin/integrations/credentials/${integration.id}`);

    if (response.error) {
      setError(response.error);
    } else {
      onRefresh();
    }

    setIsDeleting(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{integration.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{integration.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {integration.hasCredentials ? (
              <Badge className="bg-green-500/10 text-green-600 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Configured
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Not configured
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              <strong>Category:</strong> {integration.category}
            </span>
            <span>
              <strong>Auth:</strong> {integration.authType}
            </span>
            {integration.hasCredentials && integration.credentialUpdatedAt && (
              <span>
                <strong>Updated:</strong>{' '}
                {new Date(integration.credentialUpdatedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {integration.authType === 'oauth2' && (
            <>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowConfig(!showConfig)}>
                  <Settings className="h-3 w-3 mr-1" />
                  {showConfig ? 'Hide' : 'Configure'}
                </Button>

                {integration.hasCredentials && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3 mr-1" />
                    )}
                    Delete
                  </Button>
                )}

                {integration.createAppUrl && (
                  <a href={integration.createAppUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Create OAuth App
                    </Button>
                  </a>
                )}
              </div>

              {showConfig && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  {error && (
                    <div className="text-sm text-red-500 p-2 bg-red-500/10 rounded">{error}</div>
                  )}

                  {integration.setupInstructions && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground font-medium">
                        Setup Instructions
                      </summary>
                      <pre className="mt-2 p-3 bg-muted rounded text-xs whitespace-pre-wrap">
                        {integration.setupInstructions}
                      </pre>
                    </details>
                  )}

                  {integration.requiredScopes && integration.requiredScopes.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Required Scopes: </span>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {integration.requiredScopes.join(', ')}
                      </code>
                    </div>
                  )}

                  <div className="grid gap-3">
                    <div>
                      <Label className="text-sm">Client ID</Label>
                      <Input
                        className="font-mono text-sm"
                        placeholder="Enter OAuth Client ID"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Client Secret</Label>
                      <Input
                        type="password"
                        className="font-mono text-sm"
                        placeholder="Enter OAuth Client Secret"
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                      />
                    </div>
                    {needsAppName && (
                      <div>
                        <Label className="text-sm">App Name</Label>
                        <Input
                          className="font-mono text-sm"
                          placeholder="e.g., compai533c"
                          value={appName}
                          onChange={(e) => setAppName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          The app name from your Rippling developer portal (used in the authorize
                          URL)
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={!clientId || !clientSecret || (needsAppName && !appName) || isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Key className="h-4 w-4 mr-2" />
                    )}
                    Save Credentials
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminIntegrationsPage() {
  const {
    data: integrations,
    error,
    isLoading,
    mutate,
  } = useSWR<Integration[]>('admin-integrations', async () => {
    const response = await api.get<Integration[]>('/v1/admin/integrations');
    if (response.error) throw new Error(response.error);
    return response.data || [];
  });

  const oauthIntegrations = integrations?.filter((i) => i.authType === 'oauth2') || [];
  const otherIntegrations = integrations?.filter((i) => i.authType !== 'oauth2') || [];

  const configuredCount = integrations?.filter((i) => i.hasCredentials).length || 0;
  const totalOAuth = oauthIntegrations.length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Integration Credentials</h2>
        <p className="text-muted-foreground mt-1">
          Configure platform-wide OAuth credentials for integrations. These credentials will be used
          as the default for all organizations.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{integrations?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Total Integrations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{configuredCount}</div>
            <div className="text-sm text-muted-foreground">Configured</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{totalOAuth - configuredCount}</div>
            <div className="text-sm text-muted-foreground">OAuth Pending Setup</div>
          </CardContent>
        </Card>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => mutate()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-500 rounded-lg">
          Failed to load integrations: {error.message}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && integrations && (
        <div className="space-y-8">
          {/* OAuth Integrations */}
          {oauthIntegrations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                OAuth Integrations ({oauthIntegrations.length})
              </h3>
              <div className="grid gap-4">
                {oauthIntegrations.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    onRefresh={() => mutate()}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Integrations */}
          {otherIntegrations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Other Integrations ({otherIntegrations.length})
              </h3>
              <div className="grid gap-4">
                {otherIntegrations.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    onRefresh={() => mutate()}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

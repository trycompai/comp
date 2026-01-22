'use client';

import { api } from '@/lib/api-client';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Card, CardContent } from '@comp/ui/card';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import {
  CheckCircle2,
  ExternalLink,
  Key,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import useSWR from 'swr';

interface AdditionalOAuthSetting {
  id: string;
  label: string;
  type: 'text' | 'password' | 'textarea' | 'select' | 'combobox';
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: { value: string; label: string }[];
  token?: string;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  logoUrl: string;
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
  additionalOAuthSettings?: AdditionalOAuthSetting[];
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
  const [customSettingsValues, setCustomSettingsValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const additionalSettings = integration.additionalOAuthSettings || [];

  const handleSave = async () => {
    if (!clientId || !clientSecret) return;

    // Validate required additional settings
    const hasAllRequiredSettings = additionalSettings.every(
      (setting) => !setting.required || customSettingsValues[setting.id],
    );
    if (!hasAllRequiredSettings) return;

    setIsSaving(true);
    setError(null);

    const response = await api.post('/v1/admin/integrations/credentials', {
      providerSlug: integration.id,
      clientId,
      clientSecret,
      customSettings:
        Object.keys(customSettingsValues).length > 0 ? customSettingsValues : undefined,
    });

    if (response.error) {
      setError(response.error);
    } else {
      setClientId('');
      setClientSecret('');
      setCustomSettingsValues({});
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
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header with logo */}
          <div className="flex items-start gap-3">
            <div className="relative h-10 w-10 shrink-0 rounded-lg border bg-muted/50 p-1.5">
              <Image
                src={integration.logoUrl}
                alt={integration.name}
                fill
                className="object-contain p-1"
                unoptimized
              />
              {integration.hasCredentials && (
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                  <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{integration.name}</h3>
                {!integration.hasCredentials && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Not configured
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {integration.description}
              </p>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
              {integration.category}
            </Badge>
            <span className="uppercase tracking-wide">{integration.authType}</span>
            {integration.hasCredentials && integration.credentialUpdatedAt && (
              <span>Updated {new Date(integration.credentialUpdatedAt).toLocaleDateString()}</span>
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

                    {/* Additional OAuth Settings - provider-specific OAuth configuration */}
                    {additionalSettings.length > 0 && (
                      <>
                        <div className="border-t pt-3 mt-1">
                          <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                            Additional OAuth Settings
                          </h4>
                        </div>
                        {additionalSettings.map((setting) => (
                          <div key={setting.id}>
                            <Label className="text-sm">
                              {setting.label}
                              {setting.required && <span className="text-destructive ml-1">*</span>}
                            </Label>
                            <Input
                              className="font-mono text-sm"
                              placeholder={setting.placeholder}
                              value={customSettingsValues[setting.id] || ''}
                              onChange={(e) =>
                                setCustomSettingsValues({
                                  ...customSettingsValues,
                                  [setting.id]: e.target.value,
                                })
                              }
                            />
                            {setting.helpText && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {setting.helpText}
                              </p>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={
                      !clientId ||
                      !clientSecret ||
                      additionalSettings.some((s) => s.required && !customSettingsValues[s.id]) ||
                      isSaving
                    }
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredIntegrations = integrations?.filter((i) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      i.name.toLowerCase().includes(query) ||
      i.description.toLowerCase().includes(query) ||
      i.category.toLowerCase().includes(query)
    );
  });

  const oauthIntegrations = filteredIntegrations?.filter((i) => i.authType === 'oauth2') || [];
  const otherIntegrations = filteredIntegrations?.filter((i) => i.authType !== 'oauth2') || [];

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

      {/* Search and Refresh */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

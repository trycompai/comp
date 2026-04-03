'use client';

import { api } from '@/lib/api-client';
import { Badge, Button, Card, CardContent, Input, Label, Text } from '@trycompai/design-system';
import {
  CheckmarkFilled,
  Key,
  Launch,
  Settings,
  TrashCan,
} from '@trycompai/design-system/icons';
import Image from 'next/image';
import { useState } from 'react';
import { View, ViewOff } from '@trycompai/design-system/icons';

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

export interface Integration {
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
  clientIdHint?: string;
  clientSecretHint?: string;
  decryptedClientId?: string;
  decryptedClientSecret?: string;
  existingCustomSettings?: Record<string, unknown>;
  setupInstructions?: string;
  createAppUrl?: string;
  requiredScopes?: string[];
  authorizeUrl?: string;
  additionalOAuthSettings?: AdditionalOAuthSetting[];
}

export function IntegrationCard({
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
    <Card>
      <CardContent>
        <div className="space-y-4">
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
              <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-green-500 text-white">
                <CheckmarkFilled className="h-2.5 w-2.5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{integration.name}</h3>
              {!integration.hasCredentials && (
                <Badge variant="outline">Not configured</Badge>
              )}
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {integration.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <Badge variant="outline">{integration.category}</Badge>
          <span className="uppercase tracking-wide">{integration.authType}</span>
          {integration.hasCredentials && integration.credentialUpdatedAt && (
            <span>Updated {new Date(integration.credentialUpdatedAt).toLocaleDateString()}</span>
          )}
        </div>

        {integration.hasCredentials && integration.decryptedClientId && (
          <CardCredentialsSummary
            clientId={integration.decryptedClientId}
            clientSecret={integration.decryptedClientSecret}
          />
        )}

        {integration.authType === 'oauth2' && (
          <OAuthConfig
            integration={integration}
            showConfig={showConfig}
            setShowConfig={setShowConfig}
            clientId={clientId}
            setClientId={setClientId}
            clientSecret={clientSecret}
            setClientSecret={setClientSecret}
            customSettingsValues={customSettingsValues}
            setCustomSettingsValues={setCustomSettingsValues}
            isSaving={isSaving}
            isDeleting={isDeleting}
            error={error}
            additionalSettings={additionalSettings}
            handleSave={handleSave}
            handleDelete={handleDelete}
          />
        )}
        </div>
      </CardContent>
    </Card>
  );
}

function OAuthConfig({
  integration,
  showConfig,
  setShowConfig,
  clientId,
  setClientId,
  clientSecret,
  setClientSecret,
  customSettingsValues,
  setCustomSettingsValues,
  isSaving,
  isDeleting,
  error,
  additionalSettings,
  handleSave,
  handleDelete,
}: {
  integration: Integration;
  showConfig: boolean;
  setShowConfig: (v: boolean) => void;
  clientId: string;
  setClientId: (v: string) => void;
  clientSecret: string;
  setClientSecret: (v: string) => void;
  customSettingsValues: Record<string, string>;
  setCustomSettingsValues: (v: Record<string, string>) => void;
  isSaving: boolean;
  isDeleting: boolean;
  error: string | null;
  additionalSettings: AdditionalOAuthSetting[];
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
}) {
  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          iconLeft={<Settings size={16} />}
          onClick={() => setShowConfig(!showConfig)}
        >
          {showConfig ? 'Hide' : 'Configure'}
        </Button>

        {integration.hasCredentials && (
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            loading={isDeleting}
            iconLeft={<TrashCan size={16} />}
          >
            Delete
          </Button>
        )}

        {integration.createAppUrl && (
          <a href={integration.createAppUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost" iconLeft={<Launch size={16} />}>
              Create OAuth App
            </Button>
          </a>
        )}
      </div>

      {showConfig && (
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          {error && (
            <div className="rounded bg-red-500/10 p-2 text-sm text-red-500">{error}</div>
          )}

          {integration.hasCredentials && (
            <CredentialsDisplay
              clientIdHint={integration.clientIdHint}
              clientSecretHint={integration.clientSecretHint}
              existingCustomSettings={integration.existingCustomSettings}
            />
          )}

          {integration.setupInstructions && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-muted-foreground">
                Setup Instructions
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-3 text-xs">
                {integration.setupInstructions}
              </pre>
            </details>
          )}

          <div className="text-sm">
            <span className="font-medium">Callback URL: </span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {process.env.NEXT_PUBLIC_API_URL || ''}/v1/integrations/oauth/callback
            </code>
          </div>

          {integration.requiredScopes && integration.requiredScopes.length > 0 && (
            <div className="text-sm">
              <span className="font-medium">Required Scopes: </span>
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                {integration.requiredScopes.join(', ')}
              </code>
            </div>
          )}

          <div className="grid gap-3">
            <div>
              <Label>{integration.hasCredentials ? 'New Client ID' : 'Client ID'}</Label>
              <Input
                placeholder="Enter OAuth Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>
            <div>
              <Label>{integration.hasCredentials ? 'New Client Secret' : 'Client Secret'}</Label>
              <Input
                type="password"
                placeholder="Enter OAuth Client Secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
            </div>

            {additionalSettings.length > 0 && (
              <>
                <div className="mt-1 border-t pt-3">
                  <Text size="xs" variant="muted" weight="medium">
                    ADDITIONAL OAUTH SETTINGS
                  </Text>
                </div>
                {additionalSettings.map((setting) => (
                  <div key={setting.id}>
                    <Label>
                      {setting.label}
                      {setting.required && <span className="ml-1 text-destructive">*</span>}
                    </Label>
                    <Input
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
                      <p className="mt-1 text-xs text-muted-foreground">{setting.helpText}</p>
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
            loading={isSaving}
            iconLeft={<Key size={16} />}
          >
            {integration.hasCredentials ? 'Update Credentials' : 'Save Credentials'}
          </Button>
        </div>
      )}
    </>
  );
}

function CardCredentialsSummary({
  clientId,
  clientSecret,
}: {
  clientId: string;
  clientSecret?: string;
}) {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="space-y-1.5 rounded-lg bg-muted p-3">
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-xs text-muted-foreground">Client ID</span>
        <code className="min-w-0 truncate rounded border bg-background px-2 py-0.5 text-xs select-all">
          {clientId}
        </code>
      </div>
      {clientSecret && (
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-xs text-muted-foreground">Secret</span>
          <code className="min-w-0 truncate rounded border bg-background px-2 py-0.5 text-xs select-all">
            {showSecret ? clientSecret : `${'•'.repeat(Math.min(clientSecret.length, 20))}${clientSecret.slice(-4)}`}
          </code>
          <button
            type="button"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => setShowSecret(!showSecret)}
          >
            {showSecret ? <ViewOff size={14} /> : <View size={14} />}
          </button>
        </div>
      )}
    </div>
  );
}

function CredentialsDisplay({
  clientIdHint,
  clientSecretHint,
  existingCustomSettings,
}: {
  clientIdHint?: string;
  clientSecretHint?: string;
  existingCustomSettings?: Record<string, unknown>;
}) {
  if (!clientIdHint) {
    return (
      <div className="rounded-lg bg-muted p-3">
        <Text size="xs" variant="muted">Credentials configured</Text>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg bg-muted p-3">
      <Text size="xs" variant="muted" weight="medium">CURRENT CREDENTIALS</Text>
      <div className="grid gap-1.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-20 shrink-0 text-xs text-muted-foreground">Client ID:</span>
          <code className="truncate rounded border bg-background px-2 py-1 text-xs">
            {clientIdHint}
          </code>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-20 shrink-0 text-xs text-muted-foreground">Secret:</span>
          <code className="rounded border bg-background px-2 py-1 text-xs">
            {clientSecretHint}
          </code>
        </div>
        {existingCustomSettings &&
          Object.entries(existingCustomSettings).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">{key}:</span>
              <code className="truncate rounded border bg-background px-2 py-1 text-xs">
                {String(value)}
              </code>
            </div>
          ))}
      </div>
    </div>
  );
}

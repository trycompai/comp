'use client';

import { CloudShellSetup } from '@/components/integrations/CloudShellSetup';
import { CredentialInput } from '@/components/integrations/CredentialInput';
import type { IntegrationProvider } from '@/hooks/use-integration-platform';
import { useIntegrationMutations } from '@/hooks/use-integration-platform';
import { Button, Label } from '@trycompai/design-system';
import { awsRemediationScript } from '@trycompai/integration-platform';
import { ArrowRight, Shield } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

// ─── Primitives ─────────────────────────────────────────────────────────

function StepHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
        {step}
      </span>
      <h4 className="text-sm font-semibold">{title}</h4>
    </div>
  );
}

function FieldRow({
  field,
  value,
  error,
  onChange,
}: {
  field: { id: string; label: string; required?: boolean; helpText?: string; type?: string };
  value: string | string[];
  error?: string;
  onChange: (value: string | string[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.id}>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <CredentialInput
        field={field as Parameters<typeof CredentialInput>[0]['field']}
        value={value}
        onChange={onChange}
      />
      {field.helpText && (
        <p className="text-[11px] text-muted-foreground/70">{field.helpText}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Compact setup guide — shows only headings as collapsible sections, max 3-4 key steps each. */
function SetupGuide({ text, fallback, docsUrl }: { text?: string | null; fallback: string; docsUrl?: string | null }) {
  const raw = text || fallback;
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  // Parse into sections (split on ### headings)
  const sections = useMemo(() => {
    const lines = raw.split('\n');
    const result: Array<{ title: string; steps: string[] }> = [];
    let current: { title: string; steps: string[] } | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('##')) {
        if (current) result.push(current);
        current = { title: trimmed.replace(/^#{1,4}\s*/, ''), steps: [] };
      } else if (current && (/^\d+[\.\)]\s/.test(trimmed) || trimmed.startsWith('- '))) {
        current.steps.push(trimmed.replace(/^\d+[\.\)]\s*/, '').replace(/^-\s*/, ''));
      } else if (current && trimmed.startsWith('>')) {
        current.steps.push(trimmed.replace(/^>\s*/, ''));
      } else if (current) {
        current.steps.push(trimmed);
      }
    }
    if (current) result.push(current);
    return result;
  }, [raw]);

  // No structured content — simple fallback
  if (sections.length === 0) {
    return (
      <p className="text-xs text-muted-foreground leading-relaxed">{formatInline(raw)}</p>
    );
  }

  return (
    <div className="space-y-1">
      {sections.map((section, i) => {
        const isOpen = expandedSection === i;
        const previewSteps = section.steps.slice(0, 3);

        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setExpandedSection(isOpen ? null : i)}
              className="flex items-center gap-2 w-full text-left py-2 group"
            >
              <svg
                className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-xs font-medium group-hover:text-foreground transition-colors">
                {section.title}
              </span>
              <span className="text-[9px] text-muted-foreground/50 ml-auto">
                {section.steps.length} step{section.steps.length !== 1 ? 's' : ''}
              </span>
            </button>
            {isOpen && (
              <div className="ml-5 pb-2 space-y-1.5">
                {(previewSteps).map((step, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-muted text-[8px] font-semibold text-muted-foreground mt-0.5">
                      {j + 1}
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {formatInline(step)}
                    </p>
                  </div>
                ))}
                {section.steps.length > 3 && (
                  <p className="text-[10px] text-muted-foreground/50 pl-6">
                    +{section.steps.length - 3} more step{section.steps.length - 3 !== 1 ? 's' : ''} in docs
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
      {docsUrl && (
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors pt-1"
        >
          View full documentation
          <ArrowRight className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

/** Format inline markdown: **bold**, `code`, [links](url) */
function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <span key={i} className="font-medium text-foreground">{part.slice(2, -2)}</span>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="rounded bg-muted px-1 py-0.5 text-[10px] font-mono text-foreground/80">{part.slice(1, -1)}</code>;
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{linkMatch[1]}</a>;
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Main ───────────────────────────────────────────────────────────────

interface EmptyStateOnboardingProps {
  provider: IntegrationProvider;
  orgId: string;
  onConnected: () => void;
  /** For OAuth providers — opens the OAuth flow */
  onOAuthConnect?: () => void;
}

export function EmptyStateOnboarding({
  provider,
  orgId,
  onConnected,
  onOAuthConnect,
}: EmptyStateOnboardingProps) {
  const isOAuth = provider.authType === 'oauth2';
  const isCloudProvider = provider.category === 'Cloud';
  const isComingSoon = isOAuth && provider.oauthConfigured === false;

  // Coming soon — show info + notify
  if (isComingSoon) {
    return <ComingSoonState provider={provider} />;
  }

  // OAuth providers get a simple connect card
  if (isOAuth) {
    return <OAuthSetup provider={provider} onConnect={onOAuthConnect} />;
  }

  // Cloud providers with setup scripts get the full guided flow
  if (isCloudProvider && provider.setupScript) {
    return (
      <CloudSetup
        provider={provider}
        orgId={orgId}
        onConnected={onConnected}
      />
    );
  }

  // Everything else: API key / basic / custom credentials
  return (
    <CredentialSetup
      provider={provider}
      orgId={orgId}
      onConnected={onConnected}
    />
  );
}

// ─── OAuth (GitHub, Google Workspace, etc.) ─────────────────────────────

function ComingSoonState({ provider }: { provider: IntegrationProvider }) {
  return (
    <div className="py-6">
      <div className="rounded-xl border bg-background shadow-sm max-w-2xl">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            {provider.logoUrl && (
              <img src={provider.logoUrl} alt="" className="h-9 w-9 rounded-lg" />
            )}
            <div>
              <h3 className="text-sm font-semibold">{provider.name}</h3>
              <p className="text-xs text-muted-foreground">{provider.description}</p>
            </div>
          </div>
          <div className="rounded-lg bg-muted/40 border border-dashed px-4 py-5 text-center space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Coming Soon</p>
            <p className="text-xs text-muted-foreground/70 max-w-sm mx-auto">
              This integration is under development. We&apos;ll notify you when it&apos;s ready.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OAuthSetup({
  provider,
  onConnect,
}: {
  provider: IntegrationProvider;
  onConnect?: () => void;
}) {
  return (
    <div className="py-6">
      <div className="flex items-center justify-between rounded-xl border bg-background shadow-sm px-6 py-5">
        <div className="flex items-center gap-4">
          {provider.logoUrl && (
            <img src={provider.logoUrl} alt="" className="h-9 w-9 rounded-lg" />
          )}
          <div>
            <h3 className="text-sm font-semibold">Connect {provider.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              You&apos;ll be redirected to authorize access. Takes about 30 seconds.
            </p>
          </div>
        </div>
        <Button onClick={onConnect}>
          Connect
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── API Key / Basic / Custom Credentials ──────────────────────────────

function CredentialSetup({
  provider,
  orgId,
  onConnected,
}: {
  provider: IntegrationProvider;
  orgId: string;
  onConnected: () => void;
}) {
  const { createConnection } = useIntegrationMutations();
  const [connecting, setConnecting] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fields = useMemo(() => {
    const configuredFields = provider.credentialFields ?? [];

    if (provider.authType === 'basic' && configuredFields.length === 0) {
      return [
        {
          id: 'username',
          label: 'Username',
          type: 'text' as const,
          required: true,
          placeholder: 'Enter username',
        },
        {
          id: 'password',
          label: 'Password',
          type: 'password' as const,
          required: true,
          placeholder: 'Enter password',
        },
      ];
    }

    if (provider.authType === 'api_key' && configuredFields.length === 0) {
      return [
        {
          id: 'api_key',
          label: 'API Key',
          type: 'password' as const,
          required: true,
          placeholder: 'Enter your API key',
        },
      ];
    }

    return configuredFields;
  }, [provider.authType, provider.credentialFields]);
  const hasConfigurableFields = fields.length > 0;

  const updateCredential = (fieldId: string, value: string | string[]) => {
    setCredentials((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleConnect = useCallback(async () => {
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      const value = credentials[field.id];
      const isMissing =
        field.type === 'multi-select'
          ? !Array.isArray(value) || value.length === 0
          : !String(value ?? '').trim();
      if (field.required && isMissing) {
        newErrors[field.id] = `${field.label} is required`;
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setConnecting(true);
    try {
      const result = await createConnection(provider.id, credentials);
      if (!result.success) {
        toast.error(result.error || 'Failed to connect');
        return;
      }
      toast.success(`${provider.name} connected!`);
      onConnected();
    } catch {
      toast.error('Failed to connect');
    } finally {
      setConnecting(false);
    }
  }, [fields, credentials, createConnection, provider, onConnected]);

  return (
    <div className="py-6 space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold tracking-tight">Connect {provider.name}</h3>
        <p className="text-sm text-muted-foreground">
          {provider.description || 'Enter your credentials to get started.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Main form */}
        <div className="rounded-xl border bg-background shadow-sm">
          <div className="p-6 space-y-4">
            {hasConfigurableFields ? (
              fields.map((field) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  value={credentials[field.id] || (field.type === 'multi-select' ? [] : '')}
                  error={errors[field.id]}
                  onChange={(v) => updateCredential(field.id, v)}
                />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
                No additional setup fields are required for this integration.
                {provider.docsUrl ? (
                  <>
                    {' '}
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      Open docs
                    </a>
                    .
                  </>
                ) : null}
              </div>
            )}
          </div>
          <div className="border-t bg-muted/30 px-6 py-5 rounded-b-xl">
            <Button onClick={handleConnect} disabled={connecting} loading={connecting}>
              {connecting ? 'Connecting...' : (
                <>
                  Connect account
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Sidebar — setup guide */}
        <div className="rounded-xl border bg-background shadow-sm lg:sticky lg:top-20 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
            {provider.logoUrl && (
              <img src={provider.logoUrl} alt="" className="h-7 w-7 rounded-lg" />
            )}
            <h4 className="text-sm font-semibold">Setup guide</h4>
          </div>
          <div className="px-5 pb-5">
            <SetupGuide
              text={provider.setupInstructions}
              fallback={`You'll need your ${provider.name} credentials. Check your ${provider.name} admin console for the required values.`}
              docsUrl={provider.docsUrl}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cloud Providers (AWS, GCP, Azure) ─────────────────────────────────

function CloudSetup({
  provider,
  orgId,
  onConnected,
}: {
  provider: IntegrationProvider;
  orgId: string;
  onConnected: () => void;
}) {
  const { createConnection } = useIntegrationMutations();
  const [connecting, setConnecting] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const allFields = provider.credentialFields ?? [];
  const visibleFields = allFields.filter(
    (field) => field.id !== 'externalId' && field.id !== 'connectionName',
  );

  const updateCredential = (fieldId: string, value: string | string[]) => {
    setCredentials((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleConnect = useCallback(async () => {
    const finalCredentials = { ...credentials };
    if (!finalCredentials.externalId) finalCredentials.externalId = orgId;
    if (!finalCredentials.connectionName) {
      const arnMatch = String(finalCredentials.roleArn ?? '').match(/:(\d{12}):/);
      finalCredentials.connectionName = arnMatch ? `AWS ${arnMatch[1]}` : 'AWS Account';
    }

    const newErrors: Record<string, string> = {};
    for (const field of allFields) {
      if (field.id === 'externalId' || field.id === 'connectionName') continue;
      const value = finalCredentials[field.id];
      const isMissing =
        field.type === 'multi-select'
          ? !Array.isArray(value) || value.length === 0
          : !String(value ?? '').trim();
      if (field.required && isMissing) {
        newErrors[field.id] = `${field.label} is required`;
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setConnecting(true);
    try {
      const result = await createConnection(provider.id, finalCredentials);
      if (!result.success) {
        toast.error(result.error || 'Failed to connect');
        return;
      }
      toast.success(`${provider.name} connected and verified!`);
      setCredentials({});
      onConnected();
    } catch {
      toast.error('Failed to connect');
    } finally {
      setConnecting(false);
    }
  }, [allFields, credentials, createConnection, provider, orgId, onConnected]);

  const connectionFields = visibleFields.filter((f) => f.id !== 'remediationRoleArn' && f.id !== 'regions');
  const regionFields = visibleFields.filter((f) => f.id === 'regions');
  const remediationFields = visibleFields.filter((f) => f.id === 'remediationRoleArn');
  const hasRemediation = provider.id === 'aws' && remediationFields.length > 0;

  return (
    <div className="py-6 space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold tracking-tight">Get started</h3>
        <p className="text-sm text-muted-foreground">
          Connect a read-only IAM role to start scanning your cloud security posture.
        </p>
      </div>

      <div className={`grid grid-cols-1 ${hasRemediation ? 'lg:grid-cols-[1fr_320px]' : ''} gap-6 items-start`}>
        {/* ─── Left: Unified setup flow ─── */}
        <div className="rounded-xl border bg-background shadow-sm">
          {/* Step 1 */}
          {provider.setupScript && (
            <div className="p-6 space-y-4">
              <StepHeader step={1} title="Create IAM Role" />
              <CloudShellSetup script={provider.setupScript} externalId={orgId} />
              <p className="text-[11px] text-muted-foreground/60">
                Connecting multiple accounts? Run the script in each account and add them one by one.
              </p>
            </div>
          )}

          <div className="border-t" />

          {/* Step 2 */}
          <div className="p-6 space-y-4">
            <StepHeader step={2} title="Connection Details" />
            {connectionFields.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                value={credentials[field.id] || (field.type === 'multi-select' ? [] : '')}
                error={errors[field.id]}
                onChange={(v) => updateCredential(field.id, v)}
              />
            ))}
          </div>

          {/* Step 3 */}
          {regionFields.length > 0 && (
            <>
              <div className="border-t" />
              <div className="p-6 space-y-4">
                <StepHeader step={3} title="Scan Configuration" />
                {regionFields.map((field) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    value={credentials[field.id] || []}
                    error={errors[field.id]}
                    onChange={(v) => updateCredential(field.id, v)}
                  />
                ))}
              </div>
            </>
          )}

          {/* CTA */}
          <div className="border-t bg-muted/30 px-6 py-5 rounded-b-xl">
            <Button onClick={handleConnect} disabled={connecting} loading={connecting}>
              {connecting ? 'Connecting...' : (
                <>
                  Connect Account
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ─── Right: Optional sidebar ─── */}
        {hasRemediation && (
          <div className="lg:sticky lg:top-20 space-y-1.5">
            <div className="rounded-xl border bg-background shadow-sm">
              <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <h4 className="text-sm font-semibold flex-1">Auto-Remediation</h4>
                <span className="text-[10px] text-muted-foreground border rounded-full px-2 py-0.5">
                  Optional
                </span>
              </div>
              <div className="px-5 pb-5 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enable one-click fixes for security findings. This creates a separate write-access role — your audit role stays read-only.
                </p>
                <CloudShellSetup
                  script={awsRemediationScript}
                  externalId={orgId}
                  title="Remediation Role"
                  subtitle="Write-access role for auto-fix"
                  footnote=""
                />
                {remediationFields.map((field) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    value={credentials[field.id] || ''}
                    error={errors[field.id]}
                    onChange={(v) => updateCredential(field.id, v)}
                  />
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/50 px-1">
              You can always enable this later from Settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

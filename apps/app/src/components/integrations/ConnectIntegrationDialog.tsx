'use client';

import {
  CredentialField,
  useIntegrationMutations,
  useIntegrationProviders,
} from '@/hooks/use-integration-platform';
import { Button } from '@comp/ui/button';
import { ComboboxDropdown } from '@comp/ui/combobox-dropdown';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Textarea } from '@comp/ui/textarea';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface ConnectIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrationId: string;
  integrationName: string;
  integrationLogoUrl: string;
  onConnected?: () => void;
}

function CredentialInput({
  field,
  value,
  onChange,
}: {
  field: CredentialField;
  value: string;
  onChange: (value: string) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange(e.target.value);

  if (field.type === 'password') {
    return (
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          placeholder={field.placeholder}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <Textarea value={value} onChange={handleChange} placeholder={field.placeholder} rows={4} />
    );
  }

  if (field.type === 'select') {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={field.placeholder || 'Select...'} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === 'combobox') {
    const items =
      field.options?.map((opt) => ({
        id: opt.value,
        label: opt.label,
      })) || [];

    const selectedItem = items.find((item) => item.id === value);

    return (
      <ComboboxDropdown
        items={items}
        selectedItem={selectedItem}
        onSelect={(item) => onChange(item.id)}
        onCreate={(customValue) => onChange(customValue)}
        placeholder={field.placeholder || 'Select or type...'}
        searchPlaceholder="Search or type custom value..."
        renderOnCreate={(customValue) => (
          <div className="flex items-center gap-2">
            <span className="text-sm">Use custom value:</span>
            <span className="font-medium">{customValue}</span>
          </div>
        )}
      />
    );
  }

  const inputType = field.type === 'url' ? 'url' : field.type === 'number' ? 'number' : 'text';
  const placeholder = field.type === 'url' ? field.placeholder || 'https://...' : field.placeholder;

  return <Input type={inputType} value={value} onChange={handleChange} placeholder={placeholder} />;
}

export function ConnectIntegrationDialog({
  open,
  onOpenChange,
  integrationId,
  integrationName,
  integrationLogoUrl,
  onConnected,
}: ConnectIntegrationDialogProps) {
  const { startOAuth, createConnection, testConnection } = useIntegrationMutations();
  const { providers } = useIntegrationProviders(true);
  const [connecting, setConnecting] = useState(false);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const provider = providers?.find((p) => p.id === integrationId);
  const authType = provider?.authType;
  const credentialFields = provider?.credentialFields ?? [];

  const allFields = (() => {
    if (authType === 'basic') {
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
    if (authType === 'api_key' && credentialFields.length === 0) {
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
    // For custom auth, use the credential fields from the manifest
    if (authType === 'custom' && credentialFields.length > 0) {
      return credentialFields;
    }
    return credentialFields;
  })();

  const handleOAuthConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const redirectUrl = window.location.href;
      const result = await startOAuth(integrationId, redirectUrl);
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
      } else {
        toast.error(result.error || 'Failed to start connection');
        setConnecting(false);
      }
    } catch {
      toast.error('Failed to start connection');
      setConnecting(false);
    }
  }, [integrationId, startOAuth]);

  const handleCredentialConnect = useCallback(async () => {
    // Validate required fields
    const newErrors: Record<string, string> = {};
    for (const field of allFields) {
      if (field.required && !credentials[field.id]?.trim()) {
        newErrors[field.id] = `${field.label} is required`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setConnecting(true);
    setErrors({});

    try {
      const result = await createConnection(integrationId, credentials);

      if (!result.success) {
        toast.error(result.error || 'Failed to create connection');
        setConnecting(false);
        return;
      }

      // Test the connection (optional - some integrations don't support testing)
      if (result.connectionId) {
        try {
          const testResult = await testConnection(result.connectionId);
          if (!testResult.success) {
            // Check if it's just "not supported" vs actual failure
            if (testResult.message?.includes('does not support')) {
              toast.success(`${integrationName} connected! Credentials saved.`);
            } else {
              toast.warning(`${integrationName} connected but test failed: ${testResult.message}`);
            }
          } else {
            toast.success(`${integrationName} connected and verified!`);
          }
        } catch {
          // Test failed but connection was created
          toast.success(`${integrationName} connected! Credentials saved.`);
        }
      } else {
        toast.success(`${integrationName} connected!`);
      }

      onConnected?.();
      onOpenChange(false);
      setCredentials({});
    } catch {
      toast.error('Failed to create connection');
    } finally {
      setConnecting(false);
    }
  }, [
    allFields,
    credentials,
    createConnection,
    integrationId,
    integrationName,
    onConnected,
    onOpenChange,
    testConnection,
  ]);

  const updateCredential = (fieldId: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [fieldId]: value }));
    // Clear error when user types
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const renderAuthForm = () => {
    switch (authType) {
      case 'oauth2':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This integration uses OAuth to securely connect to your {integrationName} account.
              You'll be asked to authorize access to the required permissions.
            </p>
            <Button onClick={handleOAuthConnect} disabled={connecting} className="w-full">
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>Continue with {integrationName}</>
              )}
            </Button>
          </div>
        );

      case 'api_key':
      case 'basic':
        return (
          <div className="space-y-4">
            {allFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <CredentialInput
                  field={field}
                  value={credentials[field.id] || ''}
                  onChange={(value) => updateCredential(field.id, value)}
                />
                {field.helpText && (
                  <p className="text-xs text-muted-foreground">{field.helpText}</p>
                )}
                {errors[field.id] && <p className="text-xs text-destructive">{errors[field.id]}</p>}
              </div>
            ))}
            <Button onClick={handleCredentialConnect} disabled={connecting} className="w-full">
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </div>
        );

      case 'jwt':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This integration requires a service account with JWT authentication. Please contact
              your administrator to configure this integration.
            </p>
          </div>
        );

      case 'custom':
        // If custom auth has credential fields, show a form
        if (allFields.length > 0) {
          return (
            <div className="space-y-4">
              {provider?.setupInstructions && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md max-h-48 overflow-y-auto prose prose-sm dark:prose-invert">
                  <p className="whitespace-pre-wrap text-xs">{provider.setupInstructions}</p>
                </div>
              )}
              {allFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id}>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <CredentialInput
                    field={field}
                    value={credentials[field.id] || ''}
                    onChange={(value) => updateCredential(field.id, value)}
                  />
                  {field.helpText && (
                    <p className="text-xs text-muted-foreground">{field.helpText}</p>
                  )}
                  {errors[field.id] && (
                    <p className="text-xs text-destructive">{errors[field.id]}</p>
                  )}
                </div>
              ))}
              <Button onClick={handleCredentialConnect} disabled={connecting} className="w-full">
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            </div>
          );
        }
        // Fallback if no credential fields
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This integration requires custom configuration. Please refer to the documentation for
              setup instructions.
            </p>
            {provider?.docsUrl && (
              <Button variant="outline" className="w-full" asChild>
                <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer">
                  View Documentation
                </a>
              </Button>
            )}
          </div>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">
            Unable to determine authentication method for this integration.
          </p>
        );
    }
  };

  const descriptions: Record<string, string> = {
    oauth2: `You'll be redirected to ${integrationName} to authorize the connection.`,
    api_key: `Enter your ${integrationName} API key to connect.`,
    basic: `Enter your ${integrationName} credentials to connect.`,
    jwt: 'This integration requires service account authentication.',
    custom:
      allFields.length > 0
        ? `Configure your ${integrationName} connection.`
        : 'This integration requires custom configuration.',
  };
  const description = (authType && descriptions[authType]) || 'Configure your connection settings.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center overflow-hidden">
              <Image
                src={integrationLogoUrl}
                alt={integrationName}
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            Connect {integrationName}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="pt-2">{renderAuthForm()}</div>
      </DialogContent>
    </Dialog>
  );
}

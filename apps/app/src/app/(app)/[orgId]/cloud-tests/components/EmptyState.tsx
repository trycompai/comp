'use client';

import { ConnectIntegrationDialog } from '@/components/integrations/ConnectIntegrationDialog';
import { useApi } from '@/hooks/use-api';
import { usePermissions } from '@/hooks/use-permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@trycompai/ui/card';
import MultipleSelector from '@trycompai/ui/multiple-selector';
import {
  Button,
  Input,
  Label,
  PageHeader,
  PageLayout,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@trycompai/design-system';
import { ArrowLeft, CheckmarkFilled, Launch } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type CloudProvider = 'aws' | 'gcp' | 'azure' | null;
type Step = 'choose' | 'connect' | 'validate-aws' | 'success';

const CLOUD_PROVIDERS = [
  {
    id: 'aws' as const,
    name: 'Amazon Web Services',
    shortName: 'AWS',
    description: 'Scan AWS Security Hub for vulnerabilities and compliance issues',
    color: 'from-orange-500 to-yellow-600',
    logoUrl: 'https://img.logo.dev/aws.amazon.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
    guideUrl: 'https://trycomp.ai/docs/cloud-tests/aws',
  },
  {
    id: 'gcp' as const,
    name: 'Google Cloud Platform',
    shortName: 'GCP',
    description: 'Monitor GCP Security Command Center for security findings',
    color: 'from-blue-500 to-cyan-600',
    logoUrl: 'https://img.logo.dev/cloud.google.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
    guideUrl: 'https://trycomp.ai/docs/cloud-tests/gcp',
  },
  {
    id: 'azure' as const,
    name: 'Microsoft Azure',
    shortName: 'Azure',
    description: 'Check Azure Security Center for compliance data',
    color: 'from-blue-600 to-indigo-700',
    logoUrl: 'https://img.logo.dev/azure.microsoft.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
    guideUrl: 'https://trycomp.ai/docs/cloud-tests/azure',
  },
];

interface ProviderFieldBase {
  id: string;
  label: string;
  helpText: string;
  placeholder?: string;
}

interface ProviderFieldWithOptions extends ProviderFieldBase {
  type?: 'password' | 'textarea' | 'select' | 'multi-select';
  options?: { value: string; label: string }[];
}

const PROVIDER_FIELDS: Partial<Record<'aws' | 'gcp' | 'azure', ProviderFieldWithOptions[]>> = {
  aws: [
    {
      id: 'connectionName',
      label: 'Connection Name',
      placeholder: 'Production Account',
      helpText: 'A friendly name to identify this AWS account',
    },
    {
      id: 'access_key_id',
      label: 'Access Key ID',
      placeholder: 'AKIAIOSFODNN7EXAMPLE',
      helpText: 'IAM → Users → Security credentials',
    },
    {
      id: 'secret_access_key',
      label: 'Secret Access Key',
      placeholder: 'Enter your secret access key',
      helpText: 'Provided when creating the access key',
      type: 'password',
    },
  ],
};

type TriggerInfo = {
  taskId?: string;
  publicAccessToken?: string;
};

interface EmptyStateProps {
  onBack?: () => void;
  connectedProviders?: string[];
  onConnected?: (trigger?: TriggerInfo) => void;
  initialProvider?: CloudProvider;
}

export function EmptyState({
  onBack,
  connectedProviders = [],
  onConnected,
  initialProvider = null,
}: EmptyStateProps) {
  const api = useApi();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('integration', 'create');
  const initialUsesDialog = initialProvider === 'aws' || initialProvider === 'gcp' || initialProvider === 'azure';
  const [step, setStep] = useState<Step>(
    initialProvider && !initialUsesDialog ? 'connect' : 'choose',
  );
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>(
    initialProvider && !initialUsesDialog ? initialProvider : null,
  );
  const [showConnectDialog, setShowConnectDialog] = useState(initialUsesDialog);
  const [connectDialogProvider, setConnectDialogProvider] = useState<'aws' | 'gcp' | 'azure'>(
    initialProvider === 'azure' ? 'azure' : initialProvider === 'gcp' ? 'gcp' : 'aws',
  );
  const [credentials, setCredentials] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [awsRegions, setAwsRegions] = useState<{ value: string; label: string }[]>([]);
  const [awsAccountId, setAwsAccountId] = useState<string>('');

  useEffect(() => {
    if (initialProvider === 'aws' || initialProvider === 'gcp' || initialProvider === 'azure') {
      setConnectDialogProvider(initialProvider);
      setShowConnectDialog(true);
    }
  }, [initialProvider]);

  const handleProviderSelect = (providerId: CloudProvider) => {
    if (providerId === 'aws' || providerId === 'gcp' || providerId === 'azure') {
      setConnectDialogProvider(providerId);
      setShowConnectDialog(true);
      return;
    }
    setSelectedProvider(providerId);
    setStep('connect');
    setCredentials({});
    setErrors({});
  };

  const handleBack = () => {
    if (step === 'connect' || step === 'validate-aws') {
      setStep('choose');
      setSelectedProvider(null);
      setCredentials({});
      setErrors({});
    } else if (step === 'choose' && onBack) {
      onBack();
    }
  };

  const handleFieldChange = (fieldId: string, value: string | string[]) => {
    setCredentials((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateFields = (): boolean => {
    if (!selectedProvider) return false;
    const fields = PROVIDER_FIELDS[selectedProvider];
    if (!fields) return true; // OAuth providers (GCP/Azure) don't have credential fields
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const value = credentials[field.id];
      const isMissing =
        field.type === 'multi-select'
          ? !Array.isArray(value) || value.length === 0
          : !String(value ?? '').trim();
      if (isMissing) {
        newErrors[field.id] = 'This field is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleValidateAws = async () => {
    if (
      typeof credentials.access_key_id !== 'string' ||
      typeof credentials.secret_access_key !== 'string' ||
      !credentials.access_key_id ||
      !credentials.secret_access_key
    ) {
      setErrors({
        access_key_id: !credentials.access_key_id ? 'Required' : '',
        secret_access_key: !credentials.secret_access_key ? 'Required' : '',
      });
      toast.error('Please enter your AWS credentials');
      return;
    }

    try {
      setIsConnecting(true);
      const response = await api.post<{
        success: boolean;
        accountId?: string;
        regions?: { value: string; label: string }[];
        message?: string;
      }>('/v1/cloud-security/legacy/validate-aws', {
        accessKeyId: credentials.access_key_id,
        secretAccessKey: credentials.secret_access_key,
      });

      if (response.error) {
        toast.error(response.error || 'Failed to validate credentials');
        return;
      }

      const data = response.data;
      if (data?.success && data.regions) {
        setAwsRegions(data.regions);
        setAwsAccountId(data.accountId || '');
        setCredentials((prev) => ({
          ...prev,
          accountId: data.accountId || '',
        }));
        setStep('validate-aws');
        toast.success('Credentials validated! Now select your regions.');
      } else {
        toast.error('Failed to validate credentials');
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    if (!validateFields() || !selectedProvider) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (
      selectedProvider === 'aws' &&
      (!Array.isArray(credentials.regions) || credentials.regions.length === 0)
    ) {
      toast.error('Please select at least one AWS region');
      return;
    }

    try {
      setIsConnecting(true);
      const response = await api.post<{
        success: boolean;
        integrationId?: string;
        error?: string;
        message?: string;
      }>('/v1/cloud-security/legacy/connect', {
        provider: selectedProvider,
        credentials,
      });

      if (response.error) {
        toast.error(response.error || 'Failed to connect cloud provider');
        return;
      }

      if (response.data?.success) {
        setStep('success');
        onConnected?.();
        if (onBack) {
          setTimeout(() => {
            onBack();
          }, 2000);
        }
      } else {
        toast.error(response.data?.error || 'Failed to connect cloud provider');
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsConnecting(false);
    }
  };

  const provider = selectedProvider ? CLOUD_PROVIDERS.find((p) => p.id === selectedProvider) : null;

  // AWS Step 2.5: Region Selection (after credential validation)
  if (step === 'validate-aws' && provider && selectedProvider === 'aws') {
    return (
      <PageLayout padding="default">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep('connect')}
          iconLeft={<ArrowLeft size={16} />}
        >
          Back
        </Button>

        <div className="mx-auto w-full max-w-xl">
          <Card className="rounded-xl border-2 shadow-lg">
            <CardHeader className="space-y-4 pb-6">
              <div className="flex items-center gap-3">
                <div
                  className={`bg-gradient-to-br ${provider.color} flex items-center justify-center rounded-xl p-2.5 shadow-sm`}
                >
                  <img
                    src={provider.logoUrl}
                    alt={`${provider.shortName} logo`}
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">Select AWS Region</CardTitle>
                  <CardDescription className="mt-0.5 text-sm">
                    Credentials verified {awsAccountId && `• Account: ${awsAccountId}`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="region">
                  Regions
                </Label>
                <MultipleSelector
                  value={
                    Array.isArray(credentials.regions)
                      ? credentials.regions.map((region) => ({
                          value: region,
                          label: awsRegions.find((opt) => opt.value === region)?.label || region,
                        }))
                      : []
                  }
                  onChange={(selected) =>
                    handleFieldChange(
                      'regions',
                      selected.map((item) => item.value),
                    )
                  }
                  defaultOptions={awsRegions.map((region) => ({
                    value: region.value,
                    label: region.label,
                  }))}
                  options={awsRegions.map((region) => ({
                    value: region.value,
                    label: region.label,
                  }))}
                  placeholder="Select one or more regions"
                  emptyIndicator={
                    <p className="text-center text-sm text-muted-foreground">
                      No regions available
                    </p>
                  }
                />
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Choose one or more regions where your resources are located
                </p>
              </div>

              <div className="mt-6">
                <Button
                  onClick={handleConnect}
                  disabled={!canCreate || !Array.isArray(credentials.regions) || credentials.regions.length === 0}
                  loading={isConnecting}
                  width="full"
                  size="lg"
                >
                  {isConnecting ? 'Connecting...' : 'Complete Setup'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  // Step 1: Choose Provider
  if (step === 'choose') {
    return (
      <PageLayout
        header={
          <>
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} iconLeft={<ArrowLeft size={16} />}>
                Back to Results
              </Button>
            )}
            <PageHeader title={onBack ? 'Add Another Cloud' : 'Cloud Tests'} />
          </>
        }
      >
        {showConnectDialog && (
          <ConnectIntegrationDialog
            open={showConnectDialog}
            onOpenChange={(open) => setShowConnectDialog(open)}
            integrationId={connectDialogProvider}
            integrationName={
              connectDialogProvider === 'gcp'
                ? 'Google Cloud Platform'
                : connectDialogProvider === 'azure'
                  ? 'Microsoft Azure'
                  : 'Amazon Web Services'
            }
            integrationLogoUrl={
              connectDialogProvider === 'gcp'
                ? 'https://img.logo.dev/cloud.google.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ'
                : connectDialogProvider === 'azure'
                  ? 'https://img.logo.dev/azure.microsoft.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ'
                  : 'https://img.logo.dev/aws.amazon.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ'
            }
            onConnected={() => {
              setShowConnectDialog(false);
              onConnected?.();
            }}
          />
        )}

        <div className="grid w-full gap-4 md:grid-cols-3">
          {CLOUD_PROVIDERS.filter(
            (cp) =>
              cp.id === 'aws' || cp.id === 'azure' || !connectedProviders.includes(cp.id),
          ).map((cloudProvider) => (
            <Card
              key={cloudProvider.id}
              className={`group relative overflow-hidden rounded-xl border-2 transition-all ${canCreate ? 'cursor-pointer hover:scale-[1.02] hover:border-primary hover:shadow-xl' : 'opacity-50 cursor-not-allowed'}`}
              onClick={() => canCreate && handleProviderSelect(cloudProvider.id)}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${cloudProvider.color} opacity-0 transition-opacity group-hover:opacity-5`}
              />
              <CardHeader className="relative space-y-4 pb-4">
                <div
                  className={`bg-gradient-to-br ${cloudProvider.color} w-fit rounded-lg p-2.5 shadow-sm`}
                >
                  <img
                    src={cloudProvider.logoUrl}
                    alt={`${cloudProvider.shortName} logo`}
                    className="h-10 w-10 object-contain"
                  />
                </div>
                <CardTitle className="text-lg font-semibold">{cloudProvider.shortName}</CardTitle>
              </CardHeader>
              <CardContent className="relative pb-6">
                <CardDescription className="text-sm leading-relaxed">
                  {cloudProvider.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageLayout>
    );
  }

  // Step 2: Connect (Form)
  if (step === 'connect' && provider) {
    const fields = PROVIDER_FIELDS[provider.id as keyof typeof PROVIDER_FIELDS];

    return (
      <PageLayout padding="default">
        <Button variant="ghost" size="sm" onClick={handleBack} iconLeft={<ArrowLeft size={16} />}>
          Back
        </Button>

        <div className="mx-auto w-full max-w-xl">
          <Card className="rounded-xl border-2 shadow-lg">
            <CardHeader className="space-y-6 pb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`bg-gradient-to-br ${provider.color} flex items-center justify-center rounded-xl p-2.5 shadow-sm`}
                  >
                    <img
                      src={provider.logoUrl}
                      alt={`${provider.shortName} logo`}
                      className="h-8 w-8 object-contain"
                    />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold">
                      Connect {provider.shortName}
                    </CardTitle>
                    <CardDescription className="mt-0.5 text-sm">
                      Enter your credentials to start scanning
                    </CardDescription>
                  </div>
                </div>
              </div>
              <a
                href={provider.guideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 flex w-fit items-center gap-1.5 text-sm font-medium transition-colors"
              >
                <Launch size={14} />
                Setup guide
              </a>
            </CardHeader>

            <CardContent className="space-y-5">
              {fields?.map((field) => {
                const stringValue: string =
                  typeof credentials[field.id] === 'string'
                    ? (credentials[field.id] as string)
                    : '';
                const options = field.type === 'select' ? (field.options ?? []) : [];

                return (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>
                      {field.label}
                    </Label>
                    {field.type === 'select' && options.length > 0 ? (
                      <Select
                        value={stringValue}
                        onValueChange={(value) => { if (value) handleFieldChange(field.id, value); }}
                        disabled={isConnecting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a region" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        id={field.id}
                        placeholder={field.placeholder}
                        value={stringValue}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        disabled={isConnecting}
                        className={`bg-background border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-primary flex min-h-[100px] w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                          errors[field.id]
                            ? 'border-destructive focus-visible:ring-destructive'
                            : ''
                        }`}
                      />
                    ) : (
                      <Input
                        id={field.id}
                        type={field.type || 'text'}
                        placeholder={field.placeholder}
                        value={stringValue}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        disabled={isConnecting}
                        aria-invalid={!!errors[field.id]}
                      />
                    )}
                    {errors[field.id] && (
                      <p className="text-destructive flex items-center gap-1 text-xs font-medium">
                        {errors[field.id]}
                      </p>
                    )}
                    {!errors[field.id] && field.helpText && (
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {field.helpText}
                      </p>
                    )}
                  </div>
                );
              })}

              <div className="mt-6">
                <Button
                  onClick={selectedProvider === 'aws' ? handleValidateAws : handleConnect}
                  loading={isConnecting}
                  disabled={!canCreate}
                  width="full"
                  size="lg"
                >
                  {isConnecting
                    ? selectedProvider === 'aws'
                      ? 'Validating credentials...'
                      : 'Connecting...'
                    : selectedProvider === 'aws'
                      ? 'Continue'
                      : `Connect ${provider.shortName}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  // Step 3: Success
  if (step === 'success' && provider) {
    return (
      <PageLayout variant="center" fillHeight padding="default" maxWidth="xl">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="rounded-full bg-primary/10 p-6">
            <CheckmarkFilled size={64} className="text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Successfully Connected!</h1>
            <p className="text-muted-foreground max-w-lg text-lg">
              {provider.name} is now connected. Your first security scan is running...
            </p>
          </div>
          <div className="bg-muted/50 mt-4 rounded-lg border p-6">
            <div className="flex items-center gap-3">
              <Spinner size={20} />
              <p className="text-muted-foreground text-sm">
                This usually takes 1-2 minutes. We'll show results as soon as they're ready.
              </p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return null;
}

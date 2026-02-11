'use client';

import { ConnectIntegrationDialog } from '@/components/integrations/ConnectIntegrationDialog';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import MultipleSelector from '@comp/ui/multiple-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { Button, PageHeader, PageLayout, Spinner } from '@trycompai/design-system';
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

const PROVIDER_FIELDS: Record<'aws' | 'gcp' | 'azure', ProviderFieldWithOptions[]> = {
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
  gcp: [
    {
      id: 'organization_id',
      label: 'Organization ID',
      placeholder: '123456789012',
      helpText: 'Console → IAM & Admin → Settings',
    },
    {
      id: 'service_account_key',
      label: 'Service Account Key',
      placeholder: 'Paste your JSON key here',
      helpText: 'IAM & Admin → Service Accounts → Keys → Add Key',
      type: 'textarea',
    },
  ],
  azure: [
    {
      id: 'AZURE_SUBSCRIPTION_ID',
      label: 'Subscription ID',
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'Azure Portal → Subscriptions',
    },
    {
      id: 'AZURE_TENANT_ID',
      label: 'Tenant ID',
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'Azure Active Directory → Overview',
    },
    {
      id: 'AZURE_CLIENT_ID',
      label: 'Client ID',
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'App registrations → Overview',
    },
    {
      id: 'AZURE_CLIENT_SECRET',
      label: 'Client Secret',
      placeholder: 'Enter your client secret',
      helpText: 'App registrations → Certificates & secrets',
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
  const initialIsAws = initialProvider === 'aws';
  const [step, setStep] = useState<Step>(initialProvider && !initialIsAws ? 'connect' : 'choose');
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>(
    initialProvider && !initialIsAws ? initialProvider : null,
  );
  const [showConnectDialog, setShowConnectDialog] = useState(initialIsAws);
  const [credentials, setCredentials] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [awsRegions, setAwsRegions] = useState<{ value: string; label: string }[]>([]);
  const [awsAccountId, setAwsAccountId] = useState<string>('');

  useEffect(() => {
    if (initialProvider === 'aws') {
      setShowConnectDialog(true);
    }
  }, [initialProvider]);

  const handleProviderSelect = (providerId: CloudProvider) => {
    if (providerId === 'aws') {
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
      const result = await api.post<{
        success: boolean;
        accountId?: string;
        regions?: { value: string; label: string }[];
      }>('/v1/cloud-security/legacy/validate-aws', {
        accessKeyId: credentials.access_key_id,
        secretAccessKey: credentials.secret_access_key,
      });

      const data = result?.data;
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
        toast.error(result?.error || 'Failed to validate credentials');
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
      const result = await api.post<{
        success: boolean;
        integrationId?: string;
        error?: string;
      }>('/v1/cloud-security/legacy/connect', {
        provider: selectedProvider,
        credentials,
      });

      if (result?.data?.success) {
        setStep('success');
        onConnected?.();
        if (onBack) {
          setTimeout(() => {
            onBack();
          }, 2000);
        }
      } else {
        toast.error(result?.error || 'Failed to connect cloud provider');
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
                <Label htmlFor="region" className="text-sm font-medium">
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
                  disabled={!Array.isArray(credentials.regions) || credentials.regions.length === 0}
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
            integrationId="aws"
            integrationName="Amazon Web Services"
            integrationLogoUrl="https://img.logo.dev/aws.amazon.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ"
            onConnected={() => {
              setShowConnectDialog(false);
              onConnected?.();
            }}
          />
        )}

        <div className="grid w-full gap-4 md:grid-cols-3">
          {CLOUD_PROVIDERS.filter(
            (cp) => cp.id === 'aws' || !connectedProviders.includes(cp.id),
          ).map((cloudProvider) => (
            <Card
              key={cloudProvider.id}
              className="group relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all hover:scale-[1.02] hover:border-primary hover:shadow-xl"
              onClick={() => handleProviderSelect(cloudProvider.id)}
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
    const fields = PROVIDER_FIELDS[provider.id];

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
              {fields.map((field) => {
                const stringValue: string =
                  typeof credentials[field.id] === 'string'
                    ? (credentials[field.id] as string)
                    : '';
                const options = field.type === 'select' ? (field.options ?? []) : [];

                return (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id} className="text-sm font-medium">
                      {field.label}
                    </Label>
                    {field.type === 'select' && options.length > 0 ? (
                      <Select
                        value={stringValue}
                        onValueChange={(value) => handleFieldChange(field.id, value)}
                        disabled={isConnecting}
                      >
                        <SelectTrigger
                          className={`h-11 rounded-lg transition-colors ${errors[field.id] ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'}`}
                        >
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
                        className={`h-11 rounded-lg transition-colors ${errors[field.id] ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'}`}
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

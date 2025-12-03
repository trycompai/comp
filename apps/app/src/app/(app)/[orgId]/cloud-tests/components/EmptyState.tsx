'use client';

import { Button } from '@comp/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comp/ui/card';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comp/ui/select';
import { ArrowLeft, CheckCircle2, Cloud, ExternalLink, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { connectCloudAction } from '../actions/connect-cloud';
import { validateAwsCredentialsAction } from '../actions/validate-aws-credentials';

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
  type?: 'password' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
}

const PROVIDER_FIELDS: Record<'aws' | 'gcp' | 'azure', ProviderFieldWithOptions[]> = {
  aws: [
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
}

export function EmptyState({ onBack, connectedProviders = [], onConnected }: EmptyStateProps) {
  const [step, setStep] = useState<Step>('choose');
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [awsRegions, setAwsRegions] = useState<{ value: string; label: string }[]>([]);
  const [awsAccountId, setAwsAccountId] = useState<string>('');

  const handleProviderSelect = (providerId: CloudProvider) => {
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

  const handleFieldChange = (fieldId: string, value: string) => {
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
      if (!credentials[field.id]?.trim()) {
        newErrors[field.id] = 'This field is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleValidateAws = async () => {
    if (!credentials.access_key_id || !credentials.secret_access_key) {
      setErrors({
        access_key_id: !credentials.access_key_id ? 'Required' : '',
        secret_access_key: !credentials.secret_access_key ? 'Required' : '',
      });
      toast.error('Please enter your AWS credentials');
      return;
    }

    try {
      setIsConnecting(true);
      const result = await validateAwsCredentialsAction({
        accessKeyId: credentials.access_key_id,
        secretAccessKey: credentials.secret_access_key,
      });

      if (result?.data?.success && result.data.regions) {
        setAwsRegions(result.data.regions);
        setAwsAccountId(result.data.accountId || '');
        setStep('validate-aws');
        toast.success('Credentials validated! Now select your region.');
      } else {
        toast.error(result?.data?.error || 'Failed to validate credentials');
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

    try {
      setIsConnecting(true);
      const result = await connectCloudAction({
        cloudProvider: selectedProvider,
        credentials,
      });

      if (result?.data?.success) {
        setStep('success');
        if (result.data?.trigger) {
          onConnected?.(result.data.trigger);
        }
        if (result.data?.runErrors && result.data.runErrors.length > 0) {
          toast.error(result.data.runErrors[0] || 'Initial scan reported an issue');
        }
        if (onBack) {
          setTimeout(() => {
            onBack();
          }, 2000);
        }
      } else {
        toast.error(result?.data?.error || 'Failed to connect cloud provider');
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
      <div className="mx-auto max-w-7xl flex min-h-[600px] w-full flex-col gap-6 py-4 md:py-6 lg:py-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setStep('connect')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

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
                  Region
                </Label>
                <Select
                  value={credentials.region || ''}
                  onValueChange={(value) => handleFieldChange('region', value)}
                  disabled={isConnecting}
                >
                  <SelectTrigger className="h-11 rounded-lg transition-colors focus-visible:ring-primary">
                    <SelectValue placeholder="Select your AWS region" />
                  </SelectTrigger>
                  <SelectContent>
                    {awsRegions.map((region) => (
                      <SelectItem key={region.value} value={region.value}>
                        {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Choose the region where your resources are located
                </p>
              </div>

              <Button
                onClick={handleConnect}
                disabled={isConnecting || !credentials.region}
                className="mt-6 h-11 w-full rounded-lg text-base font-medium"
                size="lg"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>Complete Setup</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 1: Choose Provider
  if (step === 'choose') {
    return (
      <div className="container mx-auto flex min-h-[600px] w-full flex-col items-center justify-center gap-8 p-4 md:p-6 lg:p-8">
        {onBack && (
          <div className="w-full max-w-4xl">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Results
            </Button>
          </div>
        )}
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full" />
            <div className="relative rounded-2xl p-4">
              <Cloud className="text-primary h-16 w-16" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              {onBack ? 'Add Another Cloud' : 'Continuous Cloud Scanning'}
            </h1>
            <div className="space-y-3">
              <p className="text-muted-foreground mx-auto max-w-lg text-lg leading-relaxed">
                Automatically monitor your cloud infrastructure for security vulnerabilities and
                compliance issues.
              </p>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                <span className="text-primary text-xs font-medium">Always-on monitoring</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid w-full max-w-4xl gap-4 md:grid-cols-3">
          {CLOUD_PROVIDERS.filter((cp) => !connectedProviders.includes(cp.id)).map(
            (cloudProvider) => (
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
            ),
          )}
        </div>
      </div>
    );
  }

  // Step 2: Connect (Form)
  if (step === 'connect' && provider) {
    const fields = PROVIDER_FIELDS[provider.id];

    return (
      <div className="mx-auto flex min-h-[600px] w-full max-w-7xl flex-col gap-6 py-4 md:py-6 lg:py-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

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
                <ExternalLink className="h-3.5 w-3.5" />
                Setup guide
              </a>
            </CardHeader>

            <CardContent className="space-y-5">
              {fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id} className="text-sm font-medium">
                    {field.label}
                  </Label>
                  {field.type === 'select' && 'options' in field && field.options ? (
                    <Select
                      value={credentials[field.id] || ''}
                      onValueChange={(value) => handleFieldChange(field.id, value)}
                      disabled={isConnecting}
                    >
                      <SelectTrigger
                        className={`h-11 rounded-lg transition-colors ${errors[field.id] ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'}`}
                      >
                        <SelectValue placeholder="Select a region" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
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
                      value={credentials[field.id] || ''}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      disabled={isConnecting}
                      className={`bg-background border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-primary flex min-h-[100px] w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${
                        errors[field.id] ? 'border-destructive focus-visible:ring-destructive' : ''
                      }`}
                    />
                  ) : (
                    <Input
                      id={field.id}
                      type={field.type || 'text'}
                      placeholder={field.placeholder}
                      value={credentials[field.id] || ''}
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
              ))}

              <Button
                onClick={selectedProvider === 'aws' ? handleValidateAws : handleConnect}
                disabled={isConnecting}
                className="mt-6 h-11 w-full rounded-lg text-base font-medium"
                size="lg"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {selectedProvider === 'aws' ? 'Validating credentials...' : 'Connecting...'}
                  </>
                ) : (
                  <>{selectedProvider === 'aws' ? 'Continue' : `Connect ${provider.shortName}`}</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 3: Success
  if (step === 'success' && provider) {
    return (
      <div className="container mx-auto flex min-h-[600px] w-full flex-col items-center justify-center gap-8 p-4 md:p-6 lg:p-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="rounded-full bg-primary/10 p-6">
            <CheckCircle2 className="text-primary h-16 w-16" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Successfully Connected!</h1>
            <p className="text-muted-foreground max-w-lg text-lg">
              {provider.name} is now connected. Your first security scan is running...
            </p>
          </div>
          <div className="bg-muted/50 mt-4 rounded-lg border p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="text-primary h-5 w-5 animate-spin" />
              <p className="text-muted-foreground text-sm">
                This usually takes 1-2 minutes. We'll show results as soon as they're ready.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

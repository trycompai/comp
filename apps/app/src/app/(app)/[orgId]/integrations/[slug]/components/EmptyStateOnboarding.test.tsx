import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { IntegrationProviderResponse } from '@trycompai/integration-platform';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmptyStateOnboarding } from './EmptyStateOnboarding';

const mockCreateConnection = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/hooks/use-integration-platform', () => ({
  useIntegrationMutations: () => ({
    createConnection: mockCreateConnection,
  }),
}));

vi.mock('@/components/integrations/CloudShellSetup', () => ({
  CloudShellSetup: () => <div data-testid="cloud-shell-setup" />,
}));

vi.mock('@/components/integrations/CredentialInput', () => ({
  CredentialInput: ({ field, value, onChange }: any) => (
    <input
      aria-label={field.label}
      value={Array.isArray(value) ? value.join(',') : (value ?? '')}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock('@trycompai/design-system', () => ({
  Button: ({ children, disabled, loading, onClick }: any) => (
    <button disabled={disabled || loading} onClick={onClick} type="button">
      {children}
    </button>
  ),
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('lucide-react', () => ({
  ArrowRight: () => <span data-testid="arrow-right-icon" />,
  Shield: () => <span data-testid="shield-icon" />,
}));

vi.mock('@trycompai/integration-platform', () => ({
  awsRemediationScript: '',
  getAwsCloudShellUrl: () => 'https://console.aws.amazon.com/cloudshell',
  getAwsCloudShellScript: () => '',
  getAwsRemediationScript: () => '',
  normalizeAwsEnvironment: (value: unknown) =>
    value === 'aws-us-gov' ? 'aws-us-gov' : 'aws',
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('EmptyStateOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows connecting dynamic custom integrations with no credential fields', async () => {
    mockCreateConnection.mockResolvedValue({ success: true });
    const onConnected = vi.fn();

    render(
      <EmptyStateOnboarding
        provider={{
          id: 'dynamic-security',
          slug: 'dynamic-security',
          name: 'Dynamic Security',
          description: 'Dynamic integration',
          category: 'Security',
          logoUrl: '',
          authType: 'custom',
          capabilities: ['checks'],
          isActive: true,
          docsUrl: 'https://example.com/docs',
        } as any}
        orgId="org_1"
        onConnected={onConnected}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /connect account/i }));

    await waitFor(() => {
      expect(mockCreateConnection).toHaveBeenCalledWith('dynamic-security', {});
    });
    expect(onConnected).toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith('Dynamic Security connected!');
  });

  it('uses API key fallback field when credential fields are missing', async () => {
    mockCreateConnection.mockResolvedValue({ success: true });

    render(
      <EmptyStateOnboarding
        provider={{
          id: 'dynamic-api',
          slug: 'dynamic-api',
          name: 'Dynamic API',
          description: 'Dynamic API integration',
          category: 'Security',
          logoUrl: '',
          authType: 'api_key',
          capabilities: ['checks'],
          isActive: true,
        } as any}
        orgId="org_1"
        onConnected={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /connect account/i }));
    expect(screen.getByText('API Key is required')).toBeInTheDocument();
    expect(mockCreateConnection).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('API Key'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /connect account/i }));

    await waitFor(() => {
      expect(mockCreateConnection).toHaveBeenCalledWith('dynamic-api', { api_key: 'secret' });
    });
  });

  const conditionalProvider = {
    id: 'cybedefend',
    slug: 'cybedefend',
    name: 'CybeDefend',
    description: 'Security scanning',
    category: 'Security',
    logoUrl: '',
    authType: 'custom',
    capabilities: ['checks'],
    isActive: true,
    credentialFields: [
      {
        id: 'region',
        label: 'Region',
        type: 'select',
        required: true,
        options: [
          { value: 'eu', label: 'Europe' },
          { value: 'dedicated', label: 'Dedicated tenant' },
        ],
      },
      {
        id: 'tenant',
        label: 'Tenant name',
        type: 'text',
        required: true,
        showIf: { field: 'region', equals: 'dedicated' },
      },
    ],
  } satisfies IntegrationProviderResponse;

  it('does not submit a hidden field whose value was typed then hidden again', async () => {
    // The value survives in component state, so without filtering it would be
    // encrypted and stored even though the operator took it back off screen.
    render(
      <EmptyStateOnboarding provider={conditionalProvider} orgId="org_1" onConnected={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText('Region'), { target: { value: 'dedicated' } });
    fireEvent.change(screen.getByLabelText('Tenant name'), { target: { value: 'acme' } });
    fireEvent.change(screen.getByLabelText('Region'), { target: { value: 'eu' } });

    fireEvent.click(screen.getByRole('button', { name: /connect account/i }));

    await waitFor(() => {
      expect(mockCreateConnection).toHaveBeenCalledWith('cybedefend', { region: 'eu' });
    });
  });

  it('hides a conditional field until its controlling value is chosen', () => {
    render(
      <EmptyStateOnboarding provider={conditionalProvider} orgId="org_1" onConnected={vi.fn()} />,
    );

    expect(screen.queryByLabelText('Tenant name')).not.toBeInTheDocument();
  });

  it('does not block submission on a hidden required field', async () => {
    // A required field the operator cannot see must never gate the form.
    mockCreateConnection.mockResolvedValue({ success: true });

    render(
      <EmptyStateOnboarding provider={conditionalProvider} orgId="org_1" onConnected={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /connect account/i }));

    expect(screen.queryByText('Tenant name is required')).not.toBeInTheDocument();
  });
});

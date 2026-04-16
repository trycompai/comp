import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
});


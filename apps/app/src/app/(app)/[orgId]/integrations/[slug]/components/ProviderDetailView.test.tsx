import type { ConnectionListItem, IntegrationProvider } from '@/hooks/use-integration-platform';
import {
  ADMIN_PERMISSIONS,
  mockHasPermission,
  setMockPermissions,
} from '@/test-utils/mocks/permissions';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderDetailView } from './ProviderDetailView';

vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_1' }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ permissions: {}, hasPermission: mockHasPermission }),
}));

vi.mock('@/hooks/use-integration-platform', () => ({
  useIntegrationConnections: () => ({ connections: [], refresh: vi.fn() }),
  useIntegrationMutations: () => ({ startOAuth: vi.fn() }),
  useConnectionServices: () => ({ services: [], meta: {}, refresh: vi.fn() }),
}));

vi.mock('@/lib/api-client', () => ({
  api: { post: vi.fn().mockResolvedValue({ data: { services: [] } }) },
}));

vi.mock('@/components/integrations/ConnectIntegrationDialog', () => ({
  ConnectIntegrationDialog: () => null,
}));

vi.mock('./AccountSettingsSheet', () => ({
  AccountSettingsSheet: () => null,
}));

vi.mock('./EmptyStateOnboarding', () => ({
  EmptyStateOnboarding: () => <div data-testid="add-account-form">Get started</div>,
}));

vi.mock('./services-grid', () => ({
  ServicesGrid: () => <div data-testid="services-grid" />,
}));

const AWS_PROVIDER = {
  id: 'aws',
  slug: 'aws',
  name: 'Amazon Web Services',
  description: 'Monitor security configurations across your AWS infrastructure',
  category: 'Cloud',
  logoUrl: '',
  authType: 'custom',
  supportsMultipleConnections: true,
  setupScript: 'echo setup',
  credentialFields: [],
  services: [{ id: 's3', name: 'S3', description: 'Object storage' }],
} as unknown as IntegrationProvider;

const ACTIVE_CONNECTION = {
  id: 'conn_1',
  providerSlug: 'aws',
  providerName: 'Amazon Web Services',
  status: 'active',
  // After the cloud reconnect cutoff — keeps the reconnect banner out of the way.
  createdAt: '2026-06-01T00:00:00.000Z',
  metadata: { connectionName: 'AWS 111122223333' },
} as unknown as ConnectionListItem;

describe('ProviderDetailView — "+ Add" on a connected provider', () => {
  beforeEach(() => {
    setMockPermissions(ADMIN_PERMISSIONS);
  });

  it('renders the add-account form above the services grid, not below the whole page', () => {
    render(
      <ProviderDetailView
        provider={AWS_PROVIDER}
        initialConnections={[ACTIVE_CONNECTION]}
        taskTemplates={[]}
      />,
    );

    expect(screen.queryByTestId('add-account-form')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add another account' }));

    const form = screen.getByTestId('add-account-form');
    const grid = screen.getByTestId('services-grid');
    // Rendered after the grid the form sits below the entire services list, so
    // nothing changes in the viewport and "+ Add" looks dead.
    expect(form.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));
vi.mock('@/hooks/use-integration-platform', () => ({
  useConnectionServices: () => ({
    services: [],
    updateServices: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

import type {
  ConnectionListItemResponse,
  IntegrationProviderResponse,
} from '@trycompai/integration-platform';
import { ServiceDetailView } from './ServiceDetailView';

const FIREWALL = 'Production Firewall & No-Public-Access Controls';

const baseProps = {
  provider: {
    id: 'aws',
    name: 'Amazon Web Services',
  } as unknown as IntegrationProviderResponse,
  service: {
    id: 's3',
    name: 'S3 Bucket Security',
    description: 'Public access blocks, default encryption, and versioning checks',
    mappedTasks: [
      { id: 'tmpl-encryption', name: 'Encryption at Rest' },
      { id: 'tmpl-firewall', name: FIREWALL },
    ],
  },
  connections: [] as ConnectionListItemResponse[],
  connectionId: null,
  connectionsErrored: false,
  taskTemplates: [
    {
      id: 'tmpl-encryption',
      taskId: 'task-1',
      name: 'Encryption at Rest',
      description: 'd',
    },
  ],
  tasksErrored: false,
  orgId: 'org-1',
  slug: 'aws',
};

describe('ServiceDetailView — Evidence provided hides tasks not added to the org', () => {
  it('shows only the org task and never renders "Not added"', () => {
    render(<ServiceDetailView {...baseProps} />);
    expect(screen.getByText('Encryption at Rest')).toBeInTheDocument();
    expect(screen.queryByText(FIREWALL)).not.toBeInTheDocument();
    expect(screen.queryByText('Not added')).not.toBeInTheDocument();
  });

  it('shows all mapped tasks (with a load-error notice) when the tasks fetch errored', () => {
    render(<ServiceDetailView {...baseProps} taskTemplates={[]} tasksErrored />);
    // On a fetch error we can't distinguish added from not-added, so show all
    // and surface "Couldn't load" rather than a misleading "Not added".
    expect(screen.getByText('Encryption at Rest')).toBeInTheDocument();
    expect(screen.getByText(FIREWALL)).toBeInTheDocument();
    expect(screen.queryByText('Not added')).not.toBeInTheDocument();
    expect(screen.getAllByText('Couldn’t load tasks').length).toBeGreaterThan(0);
  });
});

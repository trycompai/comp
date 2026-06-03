import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-integration-platform', () => ({
  useConnectionServices: () => ({ services: [], isLoading: false, error: null }),
}));

import { ServicesGrid } from './services-grid';

const services = [
  {
    id: 's3',
    name: 'S3 Bucket Security',
    description: 'Public access blocks, default encryption, and versioning checks',
    mappedTasks: [
      { id: 'tmpl-a', name: 'Encryption at Rest' },
      { id: 'tmpl-b', name: 'Production Firewall' },
    ],
  },
];

describe('ServicesGrid — evidence task counts', () => {
  it('falls back to total mapped tasks when taskTemplates is not provided', () => {
    render(
      <ServicesGrid services={services} connectionId="c1" orgId="o" slug="aws" />,
    );
    // taskTemplates omitted → addedTemplateIds undefined → card counts all mapped.
    expect(screen.getByText('2 evidence tasks')).toBeInTheDocument();
  });

  it('counts only added tasks when taskTemplates is provided', () => {
    render(
      <ServicesGrid
        services={services}
        connectionId="c1"
        orgId="o"
        slug="aws"
        taskTemplates={[{ id: 'tmpl-a' }]}
      />,
    );
    expect(screen.getByText('1 evidence task')).toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-integration-platform', () => ({
  useConnectionServices: () => ({ services: [], isLoading: false, error: null }),
}));

import { ServiceCard } from './ServiceCard';

const service = {
  id: 's3',
  name: 'S3 Bucket Security',
  description: 'Public access blocks, default encryption, and versioning checks',
  mappedTasks: [
    { id: 'tmpl-encryption', name: 'Encryption at Rest' },
    { id: 'tmpl-firewall', name: 'Production Firewall' },
  ],
};

describe('ServiceCard — evidence task count', () => {
  it('counts only tasks added to the org when addedTemplateIds is provided', () => {
    render(
      <ServiceCard
        service={service}
        connectionId="c1"
        orgId="org-1"
        slug="aws"
        addedTemplateIds={new Set<string>(['tmpl-encryption'])}
      />,
    );
    expect(screen.getByText('1 evidence task')).toBeInTheDocument();
    expect(screen.queryByText('2 evidence tasks')).not.toBeInTheDocument();
  });

  it('falls back to all mapped tasks when addedTemplateIds is absent', () => {
    render(
      <ServiceCard service={service} connectionId="c1" orgId="org-1" slug="aws" />,
    );
    expect(screen.getByText('2 evidence tasks')).toBeInTheDocument();
  });

  it('hides the count entirely when none of the mapped tasks are added', () => {
    render(
      <ServiceCard
        service={service}
        connectionId="c1"
        orgId="org-1"
        slug="aws"
        addedTemplateIds={new Set<string>()}
      />,
    );
    expect(screen.queryByText(/evidence task/)).not.toBeInTheDocument();
  });
});

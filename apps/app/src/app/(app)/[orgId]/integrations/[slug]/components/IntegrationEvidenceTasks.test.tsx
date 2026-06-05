import type { IntegrationProvider } from '@/hooks/use-integration-platform';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IntegrationEvidenceTasks } from './IntegrationEvidenceTasks';

function makeProvider(
  mappedTasks: Array<{ id: string; name: string }>,
): IntegrationProvider {
  // Only `mappedTasks` is read by the component; cast the minimal shape.
  return { mappedTasks } as unknown as IntegrationProvider;
}

const MAPPED = [
  { id: 'tmpl-encryption', name: 'Encryption at Rest' },
  { id: 'tmpl-firewall', name: 'Production Firewall & No-Public-Access Controls' },
];

describe('IntegrationEvidenceTasks — hides evidence tasks not added to the org', () => {
  it('shows only tasks that exist in the org, with a matching count and no "Not added"', () => {
    render(
      <IntegrationEvidenceTasks
        provider={makeProvider(MAPPED)}
        taskTemplates={[
          {
            id: 'tmpl-encryption',
            taskId: 'task-1',
            name: 'Encryption at Rest',
            description: 'd',
          },
        ]}
        orgId="org-1"
      />,
    );

    expect(screen.getByText('Encryption at Rest')).toBeInTheDocument();
    expect(
      screen.queryByText('Production Firewall & No-Public-Access Controls'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Not added')).not.toBeInTheDocument();
    // Count badge reflects added-only.
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders nothing when none of the mapped tasks exist in the org', () => {
    const { container } = render(
      <IntegrationEvidenceTasks
        provider={makeProvider(MAPPED)}
        taskTemplates={[]}
        orgId="org-1"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

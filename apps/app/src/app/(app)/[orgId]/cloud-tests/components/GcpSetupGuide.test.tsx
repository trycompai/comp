import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPost = vi.fn();

vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({
    post: mockPost,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}));

import { GcpSetupGuide } from './GcpSetupGuide';

describe('GcpSetupGuide', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders actionable failed setup steps from API response', async () => {
    mockPost.mockResolvedValue({
      data: {
        email: 'user@example.com',
        organizationId: '123456789',
        steps: [
          {
            id: 'enable_security_command_center_api',
            name: 'Enable Security Command Center API',
            success: false,
            error: 'Permission denied',
            requiredForScan: true,
            resolveAction: {
              label: 'Resolve this',
              method: 'POST',
              endpoint: '/v1/cloud-security/setup-gcp/conn_1/resolve-step',
              body: { stepId: 'enable_security_command_center_api' },
            },
            adminActions: [
              {
                kind: 'link',
                label: 'Open API',
                url: 'https://console.cloud.google.com/apis/library/securitycenter.googleapis.com',
              },
            ],
          },
          {
            id: 'grant_findings_viewer_role',
            name: 'Grant Findings Viewer role',
            success: false,
            error: 'Need org admin role',
            requiredForScan: true,
            resolveAction: {
              label: 'Resolve this',
              method: 'POST',
              endpoint: '/v1/cloud-security/setup-gcp/conn_1/resolve-step',
              body: { stepId: 'grant_findings_viewer_role' },
            },
            adminActions: [
              {
                kind: 'link',
                label: 'Open IAM',
                url: 'https://console.cloud.google.com/iam-admin/iam',
              },
            ],
          },
        ],
      },
    });

    render(
      <GcpSetupGuide
        connectionId="conn_1"
        hasOrgId={false}
        hasSelectedProjects={true}
        onRunScan={vi.fn()}
        isScanning={false}
        orgId="org_1"
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByText('Some required setup steps need manual action:'),
      ).toBeInTheDocument(),
    );

    expect(
      screen.getAllByText('Enable Security Command Center API').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('Grant Findings Viewer role').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Open API/i })).toHaveAttribute(
      'href',
      'https://console.cloud.google.com/apis/library/securitycenter.googleapis.com',
    );
    expect(screen.getByRole('link', { name: /Open IAM/i })).toHaveAttribute(
      'href',
      'https://console.cloud.google.com/iam-admin/iam',
    );
    expect(screen.getByRole('button', { name: 'Resolve all' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Resolve this' })).toHaveLength(2);
  });
});

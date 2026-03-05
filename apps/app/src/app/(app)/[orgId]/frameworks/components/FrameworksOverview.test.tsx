import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

vi.mock('./AddFrameworkModal', () => ({
  AddFrameworkModal: () => <div data-testid="add-framework-modal" />,
}));

vi.mock('@comp/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@comp/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt as string} src={props.src as string} />
  ),
}));

import { FrameworksOverview } from './FrameworksOverview';

const baseProps = {
  frameworksWithControls: [],
  allFrameworks: [],
  frameworksWithCompliance: [],
  organizationId: 'org_123',
};

describe('FrameworksOverview permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Add Framework" button when user has framework:create permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<FrameworksOverview {...baseProps} />);
    expect(screen.getByRole('button', { name: /add framework/i })).toBeInTheDocument();
  });

  it('hides "Add Framework" button when user lacks framework:create permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<FrameworksOverview {...baseProps} />);
    expect(screen.queryByRole('button', { name: /add framework/i })).not.toBeInTheDocument();
  });

  it('hides "Add Framework" button when user has no permissions', () => {
    setMockPermissions({});
    render(<FrameworksOverview {...baseProps} />);
    expect(screen.queryByRole('button', { name: /add framework/i })).not.toBeInTheDocument();
  });
});

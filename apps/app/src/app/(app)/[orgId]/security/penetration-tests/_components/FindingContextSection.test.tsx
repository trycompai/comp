import type {
  PentestFindingContext,
  PentestIssue,
} from '@/lib/security/penetration-tests-client';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FindingContextSection } from './FindingContextSection';

const permissionsMock = vi.hoisted(() => ({
  canUpdatePentest: false,
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    hasPermission: (resource: string, action: string) =>
      resource === 'pentest' &&
      (action === 'read' ||
        (action === 'update' && permissionsMock.canUpdatePentest)),
  }),
}));

const contextsMock = vi.hoisted(() => ({
  contextByIssueId: new Map<string, PentestFindingContext>(),
  saveContext: vi.fn(),
  removeContext: vi.fn(),
}));

vi.mock('../hooks/use-pentest-finding-contexts', () => ({
  usePentestFindingContexts: () => ({
    contexts: [...contextsMock.contextByIssueId.values()],
    contextByIssueId: contextsMock.contextByIssueId,
    isLoading: false,
    error: undefined,
    isSaving: false,
    saveContext: contextsMock.saveContext,
    removeContext: contextsMock.removeContext,
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const issue: PentestIssue = {
  id: 'issue_1',
  runId: 'run_1',
  title: 'appConfiguration read access',
  severity: 'medium',
  status: 'open',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const savedNote: PentestFindingContext = {
  id: 'ptfc_1',
  organizationId: 'org_1',
  providerIssueId: 'issue_1',
  providerRunId: 'run_1',
  targetUrl: 'https://app.example.com',
  issueTitle: 'appConfiguration read access',
  context: 'Accepted by design — non-secret bootstrap config.',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

function renderSection() {
  return render(
    <FindingContextSection
      orgId="org_1"
      issue={issue}
      runId="run_1"
      targetUrl="https://app.example.com"
    />,
  );
}

describe('FindingContextSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionsMock.canUpdatePentest = false;
    contextsMock.contextByIssueId = new Map();
  });

  it('renders nothing for read-only users when there is no saved note', () => {
    renderSection();

    expect(screen.queryByText(/retest context/i)).not.toBeInTheDocument();
  });

  it('shows the saved note read-only to users without pentest:update', () => {
    contextsMock.contextByIssueId = new Map([['issue_1', savedNote]]);

    renderSection();

    expect(screen.getByText(/retest context/i)).toBeInTheDocument();
    expect(
      screen.getByText('Accepted by design — non-secret bootstrap config.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /save context/i }),
    ).not.toBeInTheDocument();
  });

  it('lets pentest:update users save context on a finding', async () => {
    permissionsMock.canUpdatePentest = true;
    contextsMock.saveContext.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderSection();

    await user.type(
      screen.getByRole('textbox'),
      'Accepted by design — reads are non-sensitive.',
    );
    await user.click(screen.getByRole('button', { name: /save context/i }));

    await waitFor(() => {
      expect(contextsMock.saveContext).toHaveBeenCalledWith({
        issueId: 'issue_1',
        runId: 'run_1',
        context: 'Accepted by design — reads are non-sensitive.',
      });
    });
  });

  it('lets pentest:update users remove a saved note', async () => {
    permissionsMock.canUpdatePentest = true;
    contextsMock.contextByIssueId = new Map([['issue_1', savedNote]]);
    contextsMock.removeContext.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderSection();

    expect(
      screen.getByRole('button', { name: /update context/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => {
      expect(contextsMock.removeContext).toHaveBeenCalledWith('issue_1');
    });
  });
});

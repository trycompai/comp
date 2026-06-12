import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Shared, hoisted handles so the mock factory and the assertions see the same
// references. publishProps records each render's `open` value.
const { handleCommit, handleCancel, publishProps } = vi.hoisted(() => ({
  handleCommit: vi.fn(async () => true),
  handleCancel: vi.fn(),
  publishProps: [] as Array<{ open: boolean }>,
}));

vi.mock('../../../components/table', () => ({
  ComboboxCell: () => null,
  DateCell: () => null,
  RelationalCell: () => null,
  EditableCell: () => null,
}));
vi.mock('./components/EditFrameworkDialog', () => ({ EditFrameworkDialog: () => null }));
vi.mock('./components/DeleteFrameworkDialog', () => ({ DeleteFrameworkDialog: () => null }));
vi.mock('./versions/components/PublishVersionDialog', () => ({
  PublishVersionDialog: (props: { open: boolean }) => {
    publishProps.push({ open: props.open });
    return null;
  },
}));
vi.mock('./versions/hooks/useFrameworkVersions', () => ({
  useFrameworkVersions: () => ({ data: [{ version: '1.0.0' }], refetch: vi.fn() }),
}));
vi.mock('@/app/lib/api-client', () => ({ apiClient: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@trycompai/ui', () => ({
  Button: ({ children, variant: _v, size: _s, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('./hooks/useRequirementChangeTracking', () => ({
  simpleUUID: () => 'temp-id',
  useRequirementChangeTracking: () => ({
    data: [],
    updateCell: vi.fn(),
    updateRelational: vi.fn(),
    addRow: vi.fn(),
    deleteRow: vi.fn(),
    getRowClassName: () => '',
    handleCommit,
    handleCancel,
    isDirty: true,
    createdIds: new Set<string>(),
    changesSummary: '(2 changes)',
  }),
}));

import { FrameworkRequirementsClientPage } from './FrameworkRequirementsClientPage';

function renderPage() {
  render(
    <FrameworkRequirementsClientPage
      frameworkDetails={{ id: 'frk_1', name: 'NIST', version: '1', description: '', visible: true }}
      initialRequirements={[]}
    />,
  );
}

describe('FrameworkRequirementsClientPage — Save as Draft / Save and Commit (FRAME-4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleCommit.mockImplementation(async () => true);
    publishProps.length = 0;
  });

  it('shows all three buttons when there are uncommitted changes', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save as Draft' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save and Commit' })).toBeTruthy();
  });

  it('Save as Draft commits without opening the publish dialog', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Save as Draft' }));
    expect(handleCommit).toHaveBeenCalledTimes(1);
    expect(publishProps.every((p) => p.open === false)).toBe(true);
  });

  it('Save and Commit saves then opens the publish dialog', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Save and Commit' }));
    expect(handleCommit).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(publishProps.some((p) => p.open === true)).toBe(true));
  });

  it('does not open the publish dialog when the save fails', async () => {
    handleCommit.mockImplementation(async () => false);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Save and Commit' }));
    await waitFor(() => expect(handleCommit).toHaveBeenCalled());
    expect(publishProps.every((p) => p.open === false)).toBe(true);
  });
});

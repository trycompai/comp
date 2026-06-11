import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Capture every EditableCell invocation so we can assert which columns are
// expandable (the multi-line editor Joe asked for on Requirement descriptions).
const editableCellProps: Array<{ columnId: string; expandable?: boolean; expandTitle?: string }> =
  vi.hoisted(() => []);

vi.mock('../../../components/table', () => ({
  ComboboxCell: () => null,
  DateCell: () => null,
  RelationalCell: () => null,
  EditableCell: (props: { columnId: string; expandable?: boolean; expandTitle?: string }) => {
    editableCellProps.push({
      columnId: props.columnId,
      expandable: props.expandable,
      expandTitle: props.expandTitle,
    });
    return null;
  },
}));

vi.mock('./components/EditFrameworkDialog', () => ({ EditFrameworkDialog: () => null }));
vi.mock('./components/DeleteFrameworkDialog', () => ({ DeleteFrameworkDialog: () => null }));
vi.mock('@/app/lib/api-client', () => ({ apiClient: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@trycompai/ui', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('./hooks/useRequirementChangeTracking', () => ({
  simpleUUID: () => 'temp-id',
  useRequirementChangeTracking: () => ({
    data: [
      {
        id: 'req_1',
        name: 'Account Management',
        identifier: 'AC-2',
        description: 'The organization manages information system accounts...',
        requirementFamily: 'AC',
        controlTemplates: [],
        controlTemplatesLength: 0,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
    ],
    updateCell: vi.fn(),
    updateRelational: vi.fn(),
    addRow: vi.fn(),
    deleteRow: vi.fn(),
    getRowClassName: () => '',
    handleCommit: vi.fn(),
    handleCancel: vi.fn(),
    isDirty: false,
    createdIds: new Set<string>(),
    changesSummary: '',
  }),
}));

import { FrameworkRequirementsClientPage } from './FrameworkRequirementsClientPage';

describe('FrameworkRequirementsClientPage — Description column', () => {
  it('makes the Description column expandable (multi-line editor) but not Identifier/Name', () => {
    render(
      <FrameworkRequirementsClientPage
        frameworkDetails={{ id: 'frk_1', name: 'NIST', version: '1', description: '', visible: true }}
        initialRequirements={[]}
      />,
    );

    const description = editableCellProps.find((p) => p.columnId === 'description');
    expect(description?.expandable).toBe(true);
    expect(description?.expandTitle).toBe('Edit Requirement Description');

    // The short single-line columns stay as plain inline edits.
    for (const columnId of ['identifier', 'name']) {
      expect(editableCellProps.find((p) => p.columnId === columnId)?.expandable).toBeFalsy();
    }
  });
});

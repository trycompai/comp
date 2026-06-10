import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Stub heavy deps; render each cell's value as text so we can read row order.
vi.mock('@/app/lib/api-client', () => ({ apiClient: vi.fn() }));
vi.mock('../../components/AddExistingItemDialog', () => ({ AddExistingItemDialog: () => null }));
vi.mock('./ManageFamiliesDialog', () => ({ ManageFamiliesDialog: () => null }));
vi.mock('@trycompai/ui', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));
vi.mock('../../components/table', () => ({
  ComboboxCell: () => null,
  DateCell: () => null,
  MultiSelectCell: () => null,
  RelationalCell: () => null,
  EditableCell: ({ value, columnId }: { value: string | null; columnId: string }) => (
    <span data-testid={`cell-${columnId}`}>{value}</span>
  ),
}));

function gridRow(id: string, name: string) {
  return {
    id,
    name,
    description: '',
    controlFamily: null,
    policyTemplates: [],
    requirements: [],
    taskTemplates: [],
    documentTypes: [],
    policyTemplatesLength: 0,
    requirementsLength: 0,
    taskTemplatesLength: 0,
    documentTypesLength: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
}

// Rows are returned in deliberately non-alphabetical (creation-ish) order.
vi.mock('./hooks/useChangeTracking', () => ({
  simpleUUID: () => 'temp-id',
  useChangeTracking: () => ({
    data: [gridRow('c1', 'Zebra control'), gridRow('c2', 'Apple control'), gridRow('c3', 'Mango control')],
    updateCell: vi.fn(),
    batchUpdateCells: vi.fn(),
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

vi.mock('./hooks/useFamiliesManagement', () => ({
  useFamiliesManagement: () => ({
    families: [],
    uniqueFamilies: [],
    manageFamiliesOpen: false,
    setManageFamiliesOpen: vi.fn(),
    handleRenameFamily: vi.fn(),
    handleDeleteFamily: vi.fn(),
  }),
}));

import { ControlsClientPage } from './ControlsClientPage';

describe('ControlsClientPage default sort (CS-511)', () => {
  it('opens with controls sorted by Name A–Z regardless of input order', () => {
    render(<ControlsClientPage initialControls={[]} frameworkId="frk_1" />);

    const names = screen.getAllByTestId('cell-name').map((el) => el.textContent);
    expect(names).toEqual(['Apple control', 'Mango control', 'Zebra control']);
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  REQUIREMENTS_TABLE_COLUMN_COUNT,
  REQUIREMENTS_TABLE_STYLE,
  RequirementsTableColumnGroup,
  RequirementsTableHeader,
} from './requirements-table-layout';

describe('requirements table layout', () => {
  it('defines a compact column for every visible requirement field', () => {
    const { container } = render(
      <table>
        <RequirementsTableColumnGroup />
        <RequirementsTableHeader />
      </table>,
    );

    expect(container.querySelectorAll('col')).toHaveLength(REQUIREMENTS_TABLE_COLUMN_COUNT);
    expect(screen.getByRole('columnheader', { name: 'Identifier' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Controls' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Compliance' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Docs' })).toHaveAttribute(
      'title',
      'Documents',
    );
    expect(REQUIREMENTS_TABLE_STYLE).toMatchObject({ tableLayout: 'fixed' });
  });
});

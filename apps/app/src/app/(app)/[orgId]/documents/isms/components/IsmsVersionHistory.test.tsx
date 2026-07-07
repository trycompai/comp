import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IsmsPublishedVersion } from '../isms-types';
import { ismsDesignSystemMock, ismsIconsMock, ismsSharedMock } from './__test-helpers__/dsMocks';

vi.mock('@trycompai/design-system', () => ismsDesignSystemMock());
vi.mock('@trycompai/design-system/icons', () => ismsIconsMock());
vi.mock('./shared', () => ismsSharedMock());

import { IsmsVersionHistory } from './IsmsVersionHistory';

const VERSIONS: IsmsPublishedVersion[] = [
  {
    id: 'v2',
    version: 2,
    publishedAt: '2026-07-06T10:00:00.000Z',
    changelog: 'Updated scope',
    publishedByName: 'Alice Admin',
    hasPdf: true,
    hasDocx: true,
    isCurrent: true,
  },
  {
    id: 'v1',
    version: 1,
    publishedAt: '2026-06-01T10:00:00.000Z',
    changelog: null,
    publishedByName: 'Bob Owner',
    hasPdf: true,
    hasDocx: false,
    isCurrent: false,
  },
];

const baseProps = {
  versions: VERSIONS,
  isLoading: false,
  error: null,
  downloadingVersionId: null,
  onDownload: vi.fn(),
};

describe('IsmsVersionHistory', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists every published version with its approver, date and changelog', () => {
    render(<IsmsVersionHistory {...baseProps} />);

    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    // Approver + date + changelog surface on the row subtitle.
    expect(screen.getByText(/Alice Admin/)).toBeInTheDocument();
    expect(screen.getByText(/Updated scope/)).toBeInTheDocument();
    expect(screen.getByText(/Bob Owner/)).toBeInTheDocument();
    // Only the current version is marked.
    expect(screen.getByText('Current')).toBeInTheDocument();
  });

  it('downloads a specific version as PDF or DOCX', () => {
    render(<IsmsVersionHistory {...baseProps} />);

    const pdfButtons = screen.getAllByRole('button', { name: /PDF/i });
    const docxButtons = screen.getAllByRole('button', { name: /DOCX/i });
    // First row is v2 (newest first).
    fireEvent.click(pdfButtons[0]);
    expect(baseProps.onDownload).toHaveBeenCalledWith('v2', 'pdf');

    fireEvent.click(docxButtons[0]);
    expect(baseProps.onDownload).toHaveBeenCalledWith('v2', 'docx');
  });

  it('renders an empty state when there are no published versions', () => {
    render(<IsmsVersionHistory {...baseProps} versions={[]} />);
    expect(screen.getByText('No published versions yet')).toBeInTheDocument();
  });

  it('shows a loading state before the first load resolves', () => {
    render(<IsmsVersionHistory {...baseProps} versions={[]} isLoading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

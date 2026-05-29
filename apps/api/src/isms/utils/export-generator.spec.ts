import { generateIsmsExportFile, type IsmsExportMetadata } from './export-generator';
import { renderIsmsDocx } from './docx-renderer';

// docx is ESM-only; the renderer is exercised separately and mocked here so the
// dispatch logic stays unit-testable without transforming node_modules.
jest.mock('./docx-renderer', () => ({
  renderIsmsDocx: jest.fn(),
}));

const mockRenderDocx = jest.mocked(renderIsmsDocx);

const metadata: IsmsExportMetadata = {
  title: 'Context of the Organization',
  frameworkName: 'ISO 27001',
  version: 2,
  preparedBy: 'Comp AI',
  status: 'approved',
  approverName: 'Jane Doe',
  approvedAt: new Date('2026-05-01T00:00:00.000Z'),
  declinedAt: null,
  organizationName: 'Acme Inc',
  primaryColor: '#123456',
};

const issues = [
  { kind: 'external' as const, description: 'Pursuing ISO 27001', effect: 'Shapes scope' },
  { kind: 'internal' as const, description: '12 workforce members', effect: 'Drives access mgmt' },
];

describe('generateIsmsExportFile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a real PDF buffer for format=pdf', async () => {
    const result = await generateIsmsExportFile({
      issues,
      metadata,
      format: 'pdf',
    });

    expect(result.mimeType).toBe('application/pdf');
    expect(result.filename).toBe('context-of-the-organization-v2.pdf');
    expect(result.fileBuffer).toBeInstanceOf(Buffer);
    expect(result.fileBuffer.length).toBeGreaterThan(0);
    // PDF magic header.
    expect(result.fileBuffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(mockRenderDocx).not.toHaveBeenCalled();
  });

  it('delegates to the docx renderer for format=docx', async () => {
    mockRenderDocx.mockResolvedValue(Buffer.from('docx-bytes'));

    const result = await generateIsmsExportFile({
      issues,
      metadata,
      format: 'docx',
    });

    expect(mockRenderDocx).toHaveBeenCalledWith({ issues, metadata });
    expect(result.mimeType).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(result.filename).toBe('context-of-the-organization-v2.docx');
    expect(result.fileBuffer).toBeInstanceOf(Buffer);
  });

  it('handles an empty issue set without throwing', async () => {
    const result = await generateIsmsExportFile({
      issues: [],
      metadata,
      format: 'pdf',
    });
    expect(result.fileBuffer.length).toBeGreaterThan(0);
  });
});

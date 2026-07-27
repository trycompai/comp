import {
  generateIsmsExportFile,
  type IsmsExportMetadata,
  type IsmsExportSection,
} from './export-generator';
import { renderIsmsDocx } from './docx-renderer';

// docx is ESM-only; the renderer is exercised separately and mocked here so the
// dispatch logic stays unit-testable without transforming node_modules.
jest.mock('./docx-renderer', () => ({
  renderIsmsDocx: jest.fn(),
}));

const mockRenderDocx = jest.mocked(renderIsmsDocx);

const metadata: IsmsExportMetadata = {
  title: 'Context of the Organization',
  clause: '4.1',
  documentCode: 'ACME-ISMS-001',
  standardLabel: 'ISO/IEC 27001:2022',
  frameworkName: 'ISO 27001',
  version: 2,
  preparedBy: 'Comp AI',
  owner: 'Comp AI',
  status: 'approved',
  approverName: 'Jane Doe',
  approvedAt: new Date('2026-05-01T00:00:00.000Z'),
  declinedAt: null,
  classification: 'Internal',
  nextReview: 'Annual, or on material change',
  issueDate: new Date('2026-01-01'),
  organizationName: 'Acme Inc',
  primaryColor: '#123456',
};

const paragraphSections: IsmsExportSection[] = [
  {
    heading: 'External issues',
    paragraphs: [
      { text: '1. Pursuing ISO 27001', bold: true },
      { label: 'Effect: ', text: 'Shapes scope' },
    ],
  },
  {
    heading: 'Internal issues',
    paragraphs: [{ text: '1. 12 workforce members', bold: true }],
  },
];

const tableSections: IsmsExportSection[] = [
  {
    heading: 'Interested Parties',
    emptyText: 'No interested parties recorded.',
    table: {
      headers: ['Interested party', 'Category', 'Needs & expectations'],
      rows: [['Customers', 'Customer', 'Confidentiality of their data']],
    },
  },
];

describe('generateIsmsExportFile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a real PDF buffer for format=pdf', async () => {
    const result = await generateIsmsExportFile({
      sections: paragraphSections,
      metadata,
      format: 'pdf',
    });

    expect(result.mimeType).toBe('application/pdf');
    expect(result.filename).toBe('context-of-the-organization-v2.pdf');
    expect(result.fileBuffer).toBeInstanceOf(Buffer);
    expect(result.fileBuffer.length).toBeGreaterThan(0);
    expect(result.fileBuffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(mockRenderDocx).not.toHaveBeenCalled();
  });

  it('renders a PDF buffer for table-based sections', async () => {
    const result = await generateIsmsExportFile({
      sections: tableSections,
      metadata,
      format: 'pdf',
    });
    expect(result.fileBuffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(result.fileBuffer.length).toBeGreaterThan(0);
  });

  it('delegates to the docx renderer for format=docx', async () => {
    mockRenderDocx.mockResolvedValue(Buffer.from('docx-bytes'));

    const result = await generateIsmsExportFile({
      sections: paragraphSections,
      metadata,
      format: 'docx',
    });

    expect(mockRenderDocx).toHaveBeenCalledWith({
      sections: paragraphSections,
      metadata,
    });
    expect(result.mimeType).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(result.filename).toBe('context-of-the-organization-v2.docx');
    expect(result.fileBuffer).toBeInstanceOf(Buffer);
  });

  it('handles an empty section set without throwing', async () => {
    const result = await generateIsmsExportFile({
      sections: [],
      metadata,
      format: 'pdf',
    });
    expect(result.fileBuffer.length).toBeGreaterThan(0);
  });
});

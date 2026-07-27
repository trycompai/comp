import { renderIsmsDocx } from './docx-renderer';
import type {
  IsmsExportMetadata,
  IsmsExportSection,
} from './export-shared';

// Exercises the REAL renderer (no mock). docx exposes a CommonJS `require`
// entry, so jest resolves it without transforming node_modules.

const metadata: IsmsExportMetadata = {
  title: 'Context of the Organization',
  clause: '4.1',
  documentCode: 'ACME-ISMS-001',
  standardLabel: 'ISO/IEC 27001:2022',
  frameworkName: 'ISO 27001',
  version: 2,
  preparedBy: 'Comp AI',
  owner: 'CISO',
  status: 'approved',
  approverName: 'Jane Approver',
  approvedAt: '2026-01-15',
  declinedAt: null,
  classification: 'Internal',
  nextReview: 'Annual, or on material change',
  issueDate: '2026-01-01',
  organizationName: 'Acme Corp',
  primaryColor: '#004D3D',
};

const sections: IsmsExportSection[] = [
  {
    heading: '1. Purpose',
    intro: 'This document establishes the context of the organization.',
    paragraphs: [
      { label: 'Effect: ', text: 'Bounds the ISMS.' },
      { text: 'A plain paragraph with no label.', bold: true },
    ],
  },
  {
    heading: '2. Organization overview',
    keyValues: [
      { label: 'Legal name', value: 'Acme Corp' },
      { label: 'Sector', value: 'Software' },
    ],
  },
  {
    heading: '3. Interested parties',
    table: {
      headers: ['Party', 'Category', 'Needs & expectations'],
      rows: [
        ['Customers', 'External', 'Confidentiality of data'],
        ['Regulators', 'External', 'Demonstrable compliance'],
      ],
    },
  },
  {
    heading: '4. Intended outcomes',
    bullets: ['Protect confidentiality', 'Maintain availability'],
  },
];

const PK_MAGIC = [0x50, 0x4b];

describe('renderIsmsDocx', () => {
  it('renders a non-empty DOCX (ZIP) buffer covering every content block', async () => {
    const buffer = await renderIsmsDocx({ sections, metadata });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    // A .docx is a ZIP archive: it must start with the PK local-file header.
    expect(buffer[0]).toBe(PK_MAGIC[0]);
    expect(buffer[1]).toBe(PK_MAGIC[1]);
  });

  it('does not throw and still emits a valid ZIP for an empty sections array', async () => {
    const buffer = await renderIsmsDocx({ sections: [], metadata });

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer[0]).toBe(PK_MAGIC[0]);
    expect(buffer[1]).toBe(PK_MAGIC[1]);
  });
});

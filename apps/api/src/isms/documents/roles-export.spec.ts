import { buildExportSections } from './registry';
import { generateIsmsExportFile } from '../utils/export-generator';
import { buildExportMetadata } from '../utils/export-metadata';
import type { DocumentExportInput, RoleExportRow } from './types';

/**
 * End-to-end render check for the Roles document (5.3): the section builder +
 * both real renderers (jsPDF, docx) must produce non-empty files. Guards the
 * whole export pipeline for the new type without needing a live org.
 */
function role(overrides: Partial<RoleExportRow>): RoleExportRow {
  return {
    roleKey: 'spo',
    name: 'Security & Privacy Owner (SPO)',
    description: 'Owns the ISMS.',
    responsibilities: 'Operate the ISMS.',
    authorities: 'Direct the programme.',
    authorityGrantedBy: 'Top Management',
    requiredCompetence: 'ISO 27001 knowledge.',
    holders: ['Alex Petrisor'],
    auditRoute: null,
    auditRouteHolderName: null,
    auditFirmName: null,
    auditEvidenceRef: null,
    auditCourse: null,
    auditDueDate: null,
    ...overrides,
  };
}

const INPUT: DocumentExportInput = {
  contextIssues: [],
  interestedParties: [],
  requirements: [],
  objectives: [],
  narrative: null,
  roles: [
    role({ roleKey: 'top_management', name: 'Top Management', holders: ['Raoul'] }),
    role({}),
    role({
      roleKey: 'internal_auditor',
      name: 'Internal Auditor',
      auditRoute: 'external',
      auditFirmName: 'Acme Audit LLP',
      holders: ['External auditor'],
    }),
  ],
  operationalOwnership: [
    {
      artifact: 'Policies',
      assignedWhere: 'Policy assignee in Comp AI',
      ownerResponsibility: 'Keep it current.',
      owners: ['Alice'],
    },
  ],
  band: 'standard',
};

function metadata() {
  return buildExportMetadata({
    type: 'roles_and_responsibilities',
    title: 'Roles, Responsibilities and Authorities',
    frameworkName: 'ISO 27001',
    version: 1,
    status: 'approved',
    preparedBy: 'Comp AI',
    owner: null,
    approverName: 'Raoul Plickat',
    approvedAt: new Date('2026-05-26T00:00:00.000Z'),
    declinedAt: null,
    organizationName: 'Pressmaster AI Inc.',
    primaryColor: '#004D3D',
  });
}

describe('Roles document export', () => {
  const sections = buildExportSections({
    type: 'roles_and_responsibilities',
    input: INPUT,
  });

  it('renders a non-empty PDF', async () => {
    const result = await generateIsmsExportFile({
      sections,
      metadata: metadata(),
      format: 'pdf',
    });
    expect(result.fileBuffer.length).toBeGreaterThan(0);
    expect(result.mimeType).toBe('application/pdf');
  });

  it('renders a non-empty DOCX', async () => {
    const result = await generateIsmsExportFile({
      sections,
      metadata: metadata(),
      format: 'docx',
    });
    expect(result.fileBuffer.length).toBeGreaterThan(0);
  });
});

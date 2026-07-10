import { db } from '@db';
import { IsmsService } from './isms.service';
import type { IsmsVersionService } from './isms-version.service';

jest.mock('@db', () => ({
  db: {
    frameworkEditorFramework: { findUnique: jest.fn() },
    frameworkEditorIsmsDocumentTemplate: { findMany: jest.fn() },
    ismsDocument: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    control: { findMany: jest.fn() },
    ismsDocumentControlLink: { createMany: jest.fn() },
  },
}));
jest.mock('./documents/data-source', () => ({
  collectPlatformData: jest.fn(),
}));
jest.mock('./documents/generate', () => ({
  runDerivation: jest.fn(),
}));

const mockDb = jest.mocked(db);

// ensureSetup never touches the version service; a bare stub satisfies the ctor.
const versionService = {} as unknown as IsmsVersionService;

/** Convenience accessor for the first createMany call's `data` array. */
const createManyData = () =>
  (mockDb.ismsDocument.createMany as jest.Mock).mock.calls[0][0].data;

describe('IsmsService ensureSetup fallback to ISMS_TYPE_DEFINITIONS (no templates seeded)', () => {
  let service: IsmsService;
  const dto = { organizationId: 'org_1', frameworkId: 'fw_1', canWrite: true };
  const mockTemplates = mockDb.frameworkEditorIsmsDocumentTemplate
    .findMany as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IsmsService(versionService);
    (mockDb.control.findMany as jest.Mock).mockResolvedValue([]);
    (mockDb.ismsDocument.createMany as jest.Mock).mockResolvedValue({
      count: 0,
    });
    (mockDb.ismsDocumentControlLink.createMany as jest.Mock).mockResolvedValue({
      count: 0,
    });
    mockTemplates.mockResolvedValue([]);
  });

  it('creates only missing document types and maps requirements', async () => {
    (
      mockDb.frameworkEditorFramework.findUnique as jest.Mock
    ).mockResolvedValue({
      id: 'fw_1',
      requirements: [{ id: 'req_41', name: '4.1 Context', identifier: '4.1' }],
    });
    // One existing type so only the other five are created.
    (mockDb.ismsDocument.findMany as jest.Mock)
      .mockResolvedValueOnce([{ type: 'context_of_organization' }]) // existing-types probe
      .mockResolvedValueOnce([]) // created lookup
      .mockResolvedValueOnce([
        {
          id: 'doc_1',
          type: 'context_of_organization',
          status: 'draft',
          requirementId: 'req_41',
        },
      ]); // final list

    const result = await service.ensureSetup(dto);

    expect(mockDb.ismsDocument.createMany).toHaveBeenCalledTimes(1);
    expect(createManyData()).toHaveLength(6);
    // Definition-derived docs carry no templateId.
    expect(createManyData()[0].templateId).toBeNull();
    expect(result.success).toBe(true);
    expect(result.documents[0]).toEqual({
      id: 'doc_1',
      type: 'context_of_organization',
      status: 'draft',
      requirementId: 'req_41',
      hasApprovedVersion: false,
    });
  });

  it('leaves requirementId null when no clause matches', async () => {
    (
      mockDb.frameworkEditorFramework.findUnique as jest.Mock
    ).mockResolvedValue({ id: 'fw_1', requirements: [] });
    (mockDb.ismsDocument.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.ensureSetup(dto);

    expect(createManyData()).toHaveLength(7);
    expect(createManyData()[0].requirementId).toBeNull();
  });
});

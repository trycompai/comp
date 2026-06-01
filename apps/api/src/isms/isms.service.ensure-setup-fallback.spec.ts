import { db } from '@db';
import { IsmsService } from './isms.service';

jest.mock('@db', () => ({
  db: {
    frameworkEditorFramework: { findUnique: jest.fn() },
    frameworkEditorIsmsDocumentTemplate: { findMany: jest.fn() },
    ismsDocument: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    control: { findMany: jest.fn() },
    ismsDocumentControlLink: { createMany: jest.fn() },
  },
}));
jest.mock('./documents/data-source', () => ({
  collectPlatformData: jest.fn(),
}));
jest.mock('./utils/version-snapshot', () => ({
  upsertLatestSnapshotVersion: jest.fn(),
}));

const mockDb = jest.mocked(db);

describe('IsmsService ensureSetup fallback to ISMS_TYPE_DEFINITIONS (no templates seeded)', () => {
  let service: IsmsService;
  const dto = { organizationId: 'org_1', frameworkId: 'fw_1' };
  const mockTemplates = mockDb.frameworkEditorIsmsDocumentTemplate
    .findMany as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IsmsService();
    (mockDb.control.findMany as jest.Mock).mockResolvedValue([]);
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
      .mockResolvedValueOnce([{ type: 'context_of_organization' }])
      .mockResolvedValueOnce([
        {
          id: 'doc_1',
          type: 'context_of_organization',
          status: 'draft',
          requirementId: 'req_41',
        },
      ]);
    (mockDb.ismsDocument.create as jest.Mock).mockResolvedValue({});

    const result = await service.ensureSetup(dto);

    expect(mockDb.ismsDocument.create).toHaveBeenCalledTimes(5);
    // Definition-derived docs carry no templateId.
    const createArgs = (mockDb.ismsDocument.create as jest.Mock).mock
      .calls[0][0];
    expect(createArgs.data.templateId).toBeNull();
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
      .mockResolvedValueOnce([]);
    (mockDb.ismsDocument.create as jest.Mock).mockResolvedValue({});

    await service.ensureSetup(dto);

    expect(mockDb.ismsDocument.create).toHaveBeenCalledTimes(6);
    const firstCall = (mockDb.ismsDocument.create as jest.Mock).mock
      .calls[0][0];
    expect(firstCall.data.requirementId).toBeNull();
  });
});

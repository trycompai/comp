jest.mock('@db', () => ({
  db: {
    frameworkEditorControlTemplate: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    frameworkEditorRequirement: {
      findMany: jest.fn(),
    },
    frameworkEditorFramework: {
      findUnique: jest.fn(),
    },
    frameworkEditorControlDocumentTypeLink: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    frameworkEditorControlPolicyTemplateLink: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    frameworkEditorControlTaskTemplateLink: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  },
  Prisma: { PrismaClientKnownRequestError: class {} },
}));

import { db } from '@db';
import { ControlTemplateService } from './control-template.service';

const mockDb = db as jest.Mocked<typeof db>;

describe('ControlTemplateService', () => {
  let service: ControlTemplateService;

  beforeEach(() => {
    service = new ControlTemplateService();
    jest.clearAllMocks();
    (mockDb.frameworkEditorControlTemplate.create as jest.Mock).mockResolvedValue({
      id: 'frk_ct_new',
      name: 'New Control',
    });
    (mockDb.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue({
      id: 'frk_soc2',
    });
    (mockDb.frameworkEditorControlTemplate.findUnique as jest.Mock).mockResolvedValue({
      id: 'frk_ct_new',
      name: 'New Control',
    });
    (mockDb.frameworkEditorControlDocumentTypeLink.createMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
    (mockDb.frameworkEditorControlDocumentTypeLink.deleteMany as jest.Mock).mockResolvedValue({
      count: 0,
    });
  });

  describe('create', () => {
    const baseDto = {
      name: 'New Control',
      description: 'Some description',
    };

    // Regression test for CS-271: creating a control used to auto-link every
    // requirement in the caller-supplied framework. The `frameworkId` parameter
    // has been removed, and this test guards against the behavior coming back
    // even if the requirements table is populated.
    it('never queries or auto-links framework requirements on create (CS-271)', async () => {
      (mockDb.frameworkEditorRequirement.findMany as jest.Mock).mockResolvedValue([
        { id: 'frk_req_1' },
        { id: 'frk_req_2' },
      ]);

      await service.create(baseDto);

      expect(mockDb.frameworkEditorRequirement.findMany).not.toHaveBeenCalled();
      const createArgs = (mockDb.frameworkEditorControlTemplate.create as jest.Mock).mock
        .calls[0][0];
      expect(createArgs.data).not.toHaveProperty('requirements');
    });

    it('persists name and description', async () => {
      await service.create(baseDto);

      const createArgs = (mockDb.frameworkEditorControlTemplate.create as jest.Mock).mock
        .calls[0][0];
      expect(createArgs.data).toMatchObject({
        name: 'New Control',
        description: 'Some description',
      });
    });

    it('persists documentTypes as framework-scoped links when provided', async () => {
      await service.create({
        ...baseDto,
        frameworkId: 'frk_soc2',
        documentTypes: ['penetration-test'],
      });

      expect(mockDb.frameworkEditorControlDocumentTypeLink.createMany).toHaveBeenCalledWith({
        data: [
          {
            frameworkId: 'frk_soc2',
            controlTemplateId: 'frk_ct_new',
            formType: 'penetration-test',
          },
        ],
        skipDuplicates: true,
      });
    });

    it('omits documentTypes when not provided', async () => {
      await service.create(baseDto);

      const createArgs = (mockDb.frameworkEditorControlTemplate.create as jest.Mock).mock
        .calls[0][0];
      expect(createArgs.data).not.toHaveProperty('documentTypes');
    });

    it('requires frameworkId when documentTypes are provided', async () => {
      await expect(
        service.create({ ...baseDto, documentTypes: ['penetration-test'] }),
      ).rejects.toThrow('frameworkId is required');
    });
  });

  describe('scoped links', () => {
    it('links policy templates with framework context', async () => {
      await service.linkPolicyTemplate('frk_ct_new', 'frk_pt_1', 'frk_soc2');

      expect(mockDb.frameworkEditorControlPolicyTemplateLink.createMany).toHaveBeenCalledWith({
        data: [
          {
            frameworkId: 'frk_soc2',
            controlTemplateId: 'frk_ct_new',
            policyTemplateId: 'frk_pt_1',
          },
        ],
        skipDuplicates: true,
      });
    });

    it('links task templates with framework context', async () => {
      await service.linkTaskTemplate('frk_ct_new', 'frk_tt_1', 'frk_soc2');

      expect(mockDb.frameworkEditorControlTaskTemplateLink.createMany).toHaveBeenCalledWith({
        data: [
          {
            frameworkId: 'frk_soc2',
            controlTemplateId: 'frk_ct_new',
            taskTemplateId: 'frk_tt_1',
          },
        ],
        skipDuplicates: true,
      });
    });
  });
});

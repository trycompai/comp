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

    it('persists documentTypes when provided', async () => {
      await service.create({ ...baseDto, documentTypes: ['penetration-test'] });

      const createArgs = (mockDb.frameworkEditorControlTemplate.create as jest.Mock).mock
        .calls[0][0];
      expect(createArgs.data.documentTypes).toEqual(['penetration-test']);
    });

    it('omits documentTypes when not provided', async () => {
      await service.create(baseDto);

      const createArgs = (mockDb.frameworkEditorControlTemplate.create as jest.Mock).mock
        .calls[0][0];
      expect(createArgs.data).not.toHaveProperty('documentTypes');
    });
  });
});

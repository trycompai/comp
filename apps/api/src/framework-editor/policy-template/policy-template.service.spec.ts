jest.mock('@db', () => ({
  db: {
    frameworkEditorPolicyTemplate: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    frameworkEditorControlTemplate: {
      findMany: jest.fn(),
    },
  },
  Prisma: { PrismaClientKnownRequestError: class {} },
}));

import { db } from '@db';
import { PolicyTemplateService } from './policy-template.service';

const mockDb = db as jest.Mocked<typeof db>;

describe('PolicyTemplateService', () => {
  let service: PolicyTemplateService;

  beforeEach(() => {
    service = new PolicyTemplateService();
    jest.clearAllMocks();
    (mockDb.frameworkEditorPolicyTemplate.create as jest.Mock).mockResolvedValue({
      id: 'frk_pt_new',
      name: 'New Policy',
    });
  });

  describe('create', () => {
    const baseDto = {
      name: 'New Policy',
      description: 'desc',
      frequency: 'monthly',
      department: 'none',
    } as never;

    // Regression test: previously, passing `frameworkId` caused the create
    // path to query every control template in the framework and auto-connect
    // the new policy to all of them. CX rarely wants that — the new policy
    // should start unlinked and be attached to specific controls explicitly
    // via the dedicated link endpoints. The `frameworkId` parameter is gone,
    // but a legacy caller passing one anyway must still produce an unlinked
    // row.
    it('never queries or auto-links framework controls on create, even when a stray frameworkId is passed', async () => {
      (mockDb.frameworkEditorControlTemplate.findMany as jest.Mock).mockResolvedValue([
        { id: 'frk_ct_1' },
        { id: 'frk_ct_2' },
      ]);

      // Bypass TypeScript so we can simulate a stray legacy caller still
      // passing frameworkId — the service must ignore it.
      await (service.create as (dto: unknown, frameworkId?: string) => Promise<unknown>)(
        baseDto,
        'frk_soc2',
      );

      expect(mockDb.frameworkEditorControlTemplate.findMany).not.toHaveBeenCalled();
      const createArgs = (mockDb.frameworkEditorPolicyTemplate.create as jest.Mock).mock
        .calls[0][0];
      expect(createArgs.data).not.toHaveProperty('controlTemplates');
    });

    it('persists name, description, frequency, department and an empty content blob', async () => {
      await service.create(baseDto);
      const createArgs = (mockDb.frameworkEditorPolicyTemplate.create as jest.Mock).mock
        .calls[0][0];
      expect(createArgs.data).toMatchObject({
        name: 'New Policy',
        description: 'desc',
        frequency: 'monthly',
        department: 'none',
        content: {},
      });
    });
  });
});

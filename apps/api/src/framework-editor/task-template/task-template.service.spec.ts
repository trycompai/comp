jest.mock('@db', () => ({
  db: {
    frameworkEditorTaskTemplate: {
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
  Frequency: { monthly: 'monthly', yearly: 'yearly', daily: 'daily', weekly: 'weekly' },
  Departments: { none: 'none', admin: 'admin', it: 'it' },
}));

import { db } from '@db';
import { TaskTemplateService } from './task-template.service';

const mockDb = db as jest.Mocked<typeof db>;

describe('TaskTemplateService', () => {
  let service: TaskTemplateService;

  beforeEach(() => {
    service = new TaskTemplateService();
    jest.clearAllMocks();
    (mockDb.frameworkEditorTaskTemplate.create as jest.Mock).mockResolvedValue({
      id: 'frk_tt_new',
      name: 'New Task',
    });
  });

  describe('create', () => {
    const baseDto = {
      name: 'New Task',
      description: 'desc',
    };

    // Regression test: previously, passing `frameworkId` caused the create
    // path to query every control template in the framework and auto-connect
    // the new task to all of them. CX rarely wants that — the new task should
    // start unlinked and be attached to specific controls explicitly via the
    // dedicated link endpoints. The `frameworkId` parameter is gone, but a
    // legacy caller passing one anyway must still produce an unlinked row.
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
      const createArgs = (mockDb.frameworkEditorTaskTemplate.create as jest.Mock).mock
        .calls[0][0];
      expect(createArgs.data).not.toHaveProperty('controlTemplates');
    });

    it('persists name and description', async () => {
      await service.create(baseDto);
      const createArgs = (mockDb.frameworkEditorTaskTemplate.create as jest.Mock).mock
        .calls[0][0];
      expect(createArgs.data).toMatchObject({
        name: 'New Task',
        description: 'desc',
      });
    });

    it('applies default frequency and department when not supplied', async () => {
      await service.create({ name: 'X' } as never);
      const createArgs = (mockDb.frameworkEditorTaskTemplate.create as jest.Mock).mock
        .calls[0][0];
      expect(createArgs.data.frequency).toBe('monthly');
      expect(createArgs.data.department).toBe('none');
    });
  });
});

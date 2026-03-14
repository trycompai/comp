import { Test, TestingModule } from '@nestjs/testing';
import { AdminContextController } from './admin-context.controller';
import { ContextService } from '../context/context.service';

jest.mock('../auth/platform-admin.guard', () => ({
  PlatformAdminGuard: class {
    canActivate() {
      return true;
    }
  },
}));

jest.mock('../auth/auth.server', () => ({
  auth: { api: {} },
}));

jest.mock('@trycompai/db', () => ({ db: {} }));

describe('AdminContextController', () => {
  let controller: AdminContextController;

  const mockService = {
    findAllByOrganization: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminContextController],
      providers: [{ provide: ContextService, useValue: mockService }],
    }).compile();

    controller = module.get<AdminContextController>(AdminContextController);
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should list context entries', async () => {
      const entries = { data: [{ id: 'ctx_1' }], count: 1 };
      mockService.findAllByOrganization.mockResolvedValue(entries);

      const result = await controller.list('org_1');

      expect(mockService.findAllByOrganization).toHaveBeenCalledWith('org_1', {
        search: undefined,
        page: undefined,
        perPage: undefined,
      });
      expect(result).toEqual(entries);
    });

    it('should pass search and pagination', async () => {
      mockService.findAllByOrganization.mockResolvedValue({
        data: [],
        count: 0,
      });

      await controller.list('org_1', 'auth', '2', '10');

      expect(mockService.findAllByOrganization).toHaveBeenCalledWith('org_1', {
        search: 'auth',
        page: 2,
        perPage: 10,
      });
    });
  });

  describe('create', () => {
    it('should create a context entry', async () => {
      const dto = { question: 'How?', answer: 'Like this.' };
      const created = { id: 'ctx_1', ...dto };
      mockService.create.mockResolvedValue(created);

      const result = await controller.create('org_1', dto as never);

      expect(mockService.create).toHaveBeenCalledWith('org_1', dto);
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update a context entry', async () => {
      const dto = { answer: 'Updated answer' };
      const updated = { id: 'ctx_1', answer: 'Updated answer' };
      mockService.updateById.mockResolvedValue(updated);

      const result = await controller.update('org_1', 'ctx_1', dto as never);

      expect(mockService.updateById).toHaveBeenCalledWith(
        'ctx_1',
        'org_1',
        dto,
      );
      expect(result).toEqual(updated);
    });
  });
});

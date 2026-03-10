import { Test, TestingModule } from '@nestjs/testing';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AuthContext } from '../auth/types';
import { ContextController } from './context.controller';
import { ContextService } from './context.service';

// Mock auth.server to avoid importing better-auth ESM in Jest
jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@comp/auth', () => ({
  statement: {},
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

describe('ContextController', () => {
  let controller: ContextController;
  let contextService: jest.Mocked<ContextService>;

  const mockContextService = {
    findAllByOrganization: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const mockAuthContext: AuthContext = {
    organizationId: 'org_123',
    authType: 'session',
    isApiKey: false,
    isPlatformAdmin: false,
    userId: 'usr_123',
    userEmail: 'test@example.com',
    userRoles: ['admin'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContextController],
      providers: [{ provide: ContextService, useValue: mockContextService }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ContextController>(ContextController);
    contextService = module.get(ContextService);

    jest.clearAllMocks();
  });

  describe('getAllContext', () => {
    it('should call contextService.findAllByOrganization with organizationId and options', async () => {
      const serviceResult = {
        data: [{ id: 'ctx_1', question: 'What is SOC2?' }],
        count: 1,
      };
      mockContextService.findAllByOrganization.mockResolvedValue(serviceResult);

      const result = await controller.getAllContext(
        'org_123',
        mockAuthContext,
        'SOC2',
        '1',
        '10',
      );

      expect(contextService.findAllByOrganization).toHaveBeenCalledWith(
        'org_123',
        { search: 'SOC2', page: 1, perPage: 10 },
      );
      expect(result).toEqual({
        ...serviceResult,
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });

    it('should pass undefined for optional query params when not provided', async () => {
      mockContextService.findAllByOrganization.mockResolvedValue({
        data: [],
        count: 0,
      });

      await controller.getAllContext(
        'org_123',
        mockAuthContext,
        undefined,
        undefined,
        undefined,
      );

      expect(contextService.findAllByOrganization).toHaveBeenCalledWith(
        'org_123',
        { search: undefined, page: undefined, perPage: undefined },
      );
    });

    it('should not include authenticatedUser when userId is missing', async () => {
      const noUserContext: AuthContext = {
        ...mockAuthContext,
        userId: undefined,
        userEmail: undefined,
      };
      mockContextService.findAllByOrganization.mockResolvedValue({
        data: [],
        count: 0,
      });

      const result = await controller.getAllContext(
        'org_123',
        noUserContext,
        undefined,
        undefined,
        undefined,
      );

      expect(result).toEqual({
        data: [],
        count: 0,
        authType: 'session',
      });
    });
  });

  describe('getContextById', () => {
    it('should call contextService.findById with id and organizationId', async () => {
      const contextEntry = {
        id: 'ctx_1',
        question: 'What is SOC2?',
        answer: 'A compliance framework',
      };
      mockContextService.findById.mockResolvedValue(contextEntry);

      const result = await controller.getContextById(
        'ctx_1',
        'org_123',
        mockAuthContext,
      );

      expect(contextService.findById).toHaveBeenCalledWith('ctx_1', 'org_123');
      expect(result).toEqual({
        ...contextEntry,
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });
  });

  describe('createContext', () => {
    it('should call contextService.create with organizationId and dto', async () => {
      const dto = { question: 'New question', answer: 'New answer' };
      const created = { id: 'ctx_2', ...dto };
      mockContextService.create.mockResolvedValue(created);

      const result = await controller.createContext(
        dto as never,
        'org_123',
        mockAuthContext,
      );

      expect(contextService.create).toHaveBeenCalledWith('org_123', dto);
      expect(result).toEqual({
        ...created,
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });
  });

  describe('updateContext', () => {
    it('should call contextService.updateById with id, organizationId, and dto', async () => {
      const dto = { answer: 'Updated answer' };
      const updated = { id: 'ctx_1', question: 'What is SOC2?', answer: 'Updated answer' };
      mockContextService.updateById.mockResolvedValue(updated);

      const result = await controller.updateContext(
        'ctx_1',
        dto as never,
        'org_123',
        mockAuthContext,
      );

      expect(contextService.updateById).toHaveBeenCalledWith(
        'ctx_1',
        'org_123',
        dto,
      );
      expect(result).toEqual({
        ...updated,
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });
  });

  describe('deleteContext', () => {
    it('should call contextService.deleteById with id and organizationId', async () => {
      const deleteResult = { success: true, message: 'Context deleted' };
      mockContextService.deleteById.mockResolvedValue(deleteResult);

      const result = await controller.deleteContext(
        'ctx_1',
        'org_123',
        mockAuthContext,
      );

      expect(contextService.deleteById).toHaveBeenCalledWith(
        'ctx_1',
        'org_123',
      );
      expect(result).toEqual({
        ...deleteResult,
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });
  });
});

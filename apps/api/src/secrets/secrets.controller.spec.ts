import { Test, TestingModule } from '@nestjs/testing';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AuthContext } from '../auth/types';
import { SecretsController } from './secrets.controller';
import { SecretsService } from './secrets.service';

// Mock auth.server to avoid importing better-auth ESM in Jest
jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@comp/auth', () => ({
  statement: {},
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

describe('SecretsController', () => {
  let controller: SecretsController;
  let secretsService: jest.Mocked<SecretsService>;

  const mockSecretsService = {
    listSecrets: jest.fn(),
    getSecret: jest.fn(),
    createSecret: jest.fn(),
    updateSecret: jest.fn(),
    deleteSecret: jest.fn(),
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
      controllers: [SecretsController],
      providers: [{ provide: SecretsService, useValue: mockSecretsService }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<SecretsController>(SecretsController);
    secretsService = module.get(SecretsService);

    jest.clearAllMocks();
  });

  describe('listSecrets', () => {
    it('should call secretsService.listSecrets with organizationId', async () => {
      const secrets = [
        { id: 'sec_1', name: 'API_KEY' },
        { id: 'sec_2', name: 'DB_PASS' },
      ];
      mockSecretsService.listSecrets.mockResolvedValue(secrets);

      const result = await controller.listSecrets('org_123', mockAuthContext);

      expect(secretsService.listSecrets).toHaveBeenCalledWith('org_123');
      expect(result).toEqual({
        data: secrets,
        count: 2,
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });

    it('should not include authenticatedUser when userId is missing', async () => {
      const noUserContext: AuthContext = {
        ...mockAuthContext,
        userId: undefined,
        userEmail: undefined,
      };
      mockSecretsService.listSecrets.mockResolvedValue([]);

      const result = await controller.listSecrets('org_123', noUserContext);

      expect(result).toEqual({
        data: [],
        count: 0,
        authType: 'session',
      });
    });
  });

  describe('getSecret', () => {
    it('should call secretsService.getSecret with id and organizationId', async () => {
      const secret = { id: 'sec_1', name: 'API_KEY', value: 'decrypted' };
      mockSecretsService.getSecret.mockResolvedValue(secret);

      const result = await controller.getSecret(
        'sec_1',
        'org_123',
        mockAuthContext,
      );

      expect(secretsService.getSecret).toHaveBeenCalledWith('sec_1', 'org_123');
      expect(result).toEqual({
        secret,
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });
  });

  describe('createSecret', () => {
    it('should call secretsService.createSecret with organizationId and body', async () => {
      const body = {
        name: 'NEW_KEY',
        value: 'secret_value',
        description: 'A test secret',
      };
      const created = { id: 'sec_3', ...body };
      mockSecretsService.createSecret.mockResolvedValue(created);

      const result = await controller.createSecret(
        body,
        'org_123',
        mockAuthContext,
      );

      expect(secretsService.createSecret).toHaveBeenCalledWith(
        'org_123',
        body,
      );
      expect(result).toEqual({
        secret: created,
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });
  });

  describe('updateSecret', () => {
    it('should call secretsService.updateSecret with id, organizationId, and body', async () => {
      const body = { name: 'UPDATED_KEY', value: 'new_value' };
      const updated = { id: 'sec_1', ...body };
      mockSecretsService.updateSecret.mockResolvedValue(updated);

      const result = await controller.updateSecret(
        'sec_1',
        body,
        'org_123',
        mockAuthContext,
      );

      expect(secretsService.updateSecret).toHaveBeenCalledWith(
        'sec_1',
        'org_123',
        body,
      );
      expect(result).toEqual({
        secret: updated,
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });
  });

  describe('deleteSecret', () => {
    it('should call secretsService.deleteSecret with id and organizationId', async () => {
      const deleteResult = { success: true };
      mockSecretsService.deleteSecret.mockResolvedValue(deleteResult);

      const result = await controller.deleteSecret(
        'sec_1',
        'org_123',
        mockAuthContext,
      );

      expect(secretsService.deleteSecret).toHaveBeenCalledWith(
        'sec_1',
        'org_123',
      );
      expect(result).toEqual({
        success: true,
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });
  });
});

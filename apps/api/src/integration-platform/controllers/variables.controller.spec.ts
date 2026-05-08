import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { VariablesController } from './variables.controller';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { ConnectionRepository } from '../repositories/connection.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { CredentialVaultService } from '../services/credential-vault.service';
import { AutoCheckRunnerService } from '../services/auto-check-runner.service';

jest.mock('../../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@trycompai/auth', () => ({
  statement: {
    integration: ['create', 'read', 'update', 'delete'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

jest.mock('@trycompai/integration-platform', () => ({
  getManifest: jest.fn(),
}));

import { getManifest } from '@trycompai/integration-platform';

const mockedGetManifest = getManifest as jest.MockedFunction<
  typeof getManifest
>;

describe('VariablesController', () => {
  let controller: VariablesController;

  const mockConnectionRepository = {
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockProviderRepository = {
    findById: jest.fn(),
  };

  const mockCredentialVaultService = {
    getDecryptedCredentials: jest.fn(),
  };

  const mockAutoCheckRunnerService = {
    tryAutoRunChecks: jest.fn().mockResolvedValue(false),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VariablesController],
      providers: [
        { provide: ConnectionRepository, useValue: mockConnectionRepository },
        { provide: ProviderRepository, useValue: mockProviderRepository },
        {
          provide: CredentialVaultService,
          useValue: mockCredentialVaultService,
        },
        {
          provide: AutoCheckRunnerService,
          useValue: mockAutoCheckRunnerService,
        },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<VariablesController>(VariablesController);

    jest.clearAllMocks();
    mockAutoCheckRunnerService.tryAutoRunChecks.mockResolvedValue(false);
  });

  describe('getProviderVariables', () => {
    it('should return variables from manifest', async () => {
      const manifest = {
        variables: [
          {
            id: 'org_name',
            label: 'Organization',
            type: 'string',
            required: true,
          },
        ],
        checks: [
          {
            variables: [
              {
                id: 'repo_name',
                label: 'Repository',
                type: 'string',
                required: false,
              },
            ],
          },
        ],
      };
      mockedGetManifest.mockReturnValue(manifest as never);

      const result = await controller.getProviderVariables('github');

      expect(mockedGetManifest).toHaveBeenCalledWith('github');
      expect(result.variables).toHaveLength(2);
      expect(result.variables[0].id).toBe('org_name');
      expect(result.variables[1].id).toBe('repo_name');
    });

    it('should throw NOT_FOUND when provider does not exist', async () => {
      mockedGetManifest.mockReturnValue(undefined as never);

      await expect(
        controller.getProviderVariables('nonexistent'),
      ).rejects.toThrow(HttpException);
    });

    it('should deduplicate variables by id', async () => {
      const manifest = {
        variables: [
          {
            id: 'shared_var',
            label: 'Shared',
            type: 'string',
            required: true,
          },
        ],
        checks: [
          {
            variables: [
              {
                id: 'shared_var',
                label: 'Shared Duplicate',
                type: 'string',
                required: false,
              },
            ],
          },
        ],
      };
      mockedGetManifest.mockReturnValue(manifest as never);

      const result = await controller.getProviderVariables('test');

      expect(result.variables).toHaveLength(1);
      expect(result.variables[0].label).toBe('Shared');
    });

    it('should set hasDynamicOptions based on fetchOptions', async () => {
      const manifest = {
        variables: [
          {
            id: 'static_var',
            label: 'Static',
            type: 'select',
            required: false,
            options: [{ value: 'a', label: 'A' }],
          },
          {
            id: 'dynamic_var',
            label: 'Dynamic',
            type: 'select',
            required: false,
            fetchOptions: jest.fn(),
          },
        ],
        checks: [],
      };
      mockedGetManifest.mockReturnValue(manifest as never);

      const result = await controller.getProviderVariables('test');

      expect(result.variables[0].hasDynamicOptions).toBe(false);
      expect(result.variables[1].hasDynamicOptions).toBe(true);
    });
  });

  describe('getConnectionVariables', () => {
    it('should return variables with current values', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        providerId: 'prov_1',
        variables: { org_name: 'my-org' },
      });
      mockProviderRepository.findById.mockResolvedValue({
        id: 'prov_1',
        slug: 'github',
      });
      mockedGetManifest.mockReturnValue({
        variables: [
          {
            id: 'org_name',
            label: 'Organization',
            type: 'string',
            required: true,
          },
        ],
        checks: [],
      } as never);

      const result = await controller.getConnectionVariables('conn_1');

      expect(result.connectionId).toBe('conn_1');
      expect(result.providerSlug).toBe('github');
      expect(result.variables).toHaveLength(1);
      expect(result.variables[0].currentValue).toBe('my-org');
    });

    it('should throw NOT_FOUND when connection does not exist', async () => {
      mockConnectionRepository.findById.mockResolvedValue(null);

      await expect(
        controller.getConnectionVariables('nonexistent'),
      ).rejects.toThrow(HttpException);
    });

    it('should throw NOT_FOUND when provider does not exist', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        providerId: 'prov_1',
        variables: {},
      });
      mockProviderRepository.findById.mockResolvedValue(null);

      await expect(controller.getConnectionVariables('conn_1')).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw NOT_FOUND when manifest does not exist', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        providerId: 'prov_1',
        variables: {},
      });
      mockProviderRepository.findById.mockResolvedValue({
        id: 'prov_1',
        slug: 'missing',
      });
      mockedGetManifest.mockReturnValue(undefined as never);

      await expect(controller.getConnectionVariables('conn_1')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('fetchVariableOptions', () => {
    it('should throw NOT_FOUND when connection does not exist', async () => {
      mockConnectionRepository.findById.mockResolvedValue(null);

      await expect(
        controller.fetchVariableOptions('nonexistent', 'var_1'),
      ).rejects.toThrow(HttpException);
    });

    it('should throw BAD_REQUEST when connection is not active', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        providerId: 'prov_1',
        status: 'paused',
      });

      await expect(
        controller.fetchVariableOptions('conn_1', 'var_1'),
      ).rejects.toThrow(HttpException);
    });

    it('should return static options when no fetchOptions defined', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        providerId: 'prov_1',
        status: 'active',
      });
      mockProviderRepository.findById.mockResolvedValue({
        id: 'prov_1',
        slug: 'github',
      });
      mockedGetManifest.mockReturnValue({
        variables: [
          {
            id: 'var_1',
            label: 'Var',
            type: 'select',
            options: [{ value: 'a', label: 'A' }],
          },
        ],
        checks: [],
      } as never);

      const result = await controller.fetchVariableOptions('conn_1', 'var_1');

      expect(result.options).toEqual([{ value: 'a', label: 'A' }]);
    });

    it('should throw NOT_FOUND when variable does not exist', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        providerId: 'prov_1',
        status: 'active',
      });
      mockProviderRepository.findById.mockResolvedValue({
        id: 'prov_1',
        slug: 'github',
      });
      mockedGetManifest.mockReturnValue({
        variables: [],
        checks: [],
      } as never);

      await expect(
        controller.fetchVariableOptions('conn_1', 'missing_var'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('saveConnectionVariables', () => {
    it('should merge and save variables', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        variables: { existing: 'value' },
      });
      mockConnectionRepository.update.mockResolvedValue(undefined);

      const result = await controller.saveConnectionVariables('conn_1', {
        variables: { newVar: 'newValue' },
      });

      expect(mockConnectionRepository.update).toHaveBeenCalledWith('conn_1', {
        variables: { existing: 'value', newVar: 'newValue' },
      });
      expect(result.success).toBe(true);
      expect(result.variables).toEqual({
        existing: 'value',
        newVar: 'newValue',
      });
    });

    it('should throw NOT_FOUND when connection does not exist', async () => {
      mockConnectionRepository.findById.mockResolvedValue(null);

      await expect(
        controller.saveConnectionVariables('nonexistent', {
          variables: { key: 'val' },
        }),
      ).rejects.toThrow(HttpException);
    });

    it('should handle empty existing variables', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        variables: null,
      });
      mockConnectionRepository.update.mockResolvedValue(undefined);

      const result = await controller.saveConnectionVariables('conn_1', {
        variables: { newVar: 'value' },
      });

      expect(mockConnectionRepository.update).toHaveBeenCalledWith('conn_1', {
        variables: { newVar: 'value' },
      });
      expect(result.success).toBe(true);
    });

    it('should trigger auto-run checks after saving', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        id: 'conn_1',
        variables: {},
      });
      mockConnectionRepository.update.mockResolvedValue(undefined);

      await controller.saveConnectionVariables('conn_1', {
        variables: { key: 'val' },
      });

      expect(mockAutoCheckRunnerService.tryAutoRunChecks).toHaveBeenCalledWith(
        'conn_1',
      );
    });
  });
});

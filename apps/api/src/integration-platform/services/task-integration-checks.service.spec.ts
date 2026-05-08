import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TaskIntegrationChecksService } from './task-integration-checks.service';
import { ConnectionRepository } from '../repositories/connection.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { ConnectionService } from './connection.service';
import { DISABLED_TASK_CHECKS_KEY } from '../utils/disabled-task-checks';

jest.mock('@db', () => ({
  db: {
    task: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@trycompai/integration-platform', () => ({
  getManifest: jest.fn(),
}));

import { db } from '@db';
import { getManifest } from '@trycompai/integration-platform';

const mockedGetManifest = getManifest as jest.MockedFunction<
  typeof getManifest
>;
// Grabbing through the module reference avoids the `unbound-method` lint rule
// that fires when you extract an instance method from an object literal.
const mockedFindTask = (db.task as unknown as { findUnique: jest.Mock })
  .findUnique;

describe('TaskIntegrationChecksService', () => {
  let service: TaskIntegrationChecksService;

  const mockConnectionRepository = {
    findById: jest.fn(),
  };

  const mockConnectionService = {
    updateConnectionMetadata: jest.fn(),
  };

  const mockProviderRepository = {
    findById: jest.fn(),
  };

  const ORG_ID = 'org_1';
  const TASK_ID = 'tsk_1';
  const CONNECTION_ID = 'icn_1';
  const PROVIDER_ID = 'prv_1';
  const CHECK_ID = 'branch_protection';

  const baseConnection = {
    id: CONNECTION_ID,
    organizationId: ORG_ID,
    providerId: PROVIDER_ID,
    metadata: { connectionName: 'My GitHub' },
  };

  const baseManifest = {
    id: 'github',
    checks: [
      { id: CHECK_ID, name: 'Branch Protection' },
      { id: 'dependabot', name: 'Dependabot' },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskIntegrationChecksService,
        { provide: ConnectionRepository, useValue: mockConnectionRepository },
        { provide: ConnectionService, useValue: mockConnectionService },
        { provide: ProviderRepository, useValue: mockProviderRepository },
      ],
    }).compile();

    service = module.get(TaskIntegrationChecksService);

    mockConnectionRepository.findById.mockResolvedValue(baseConnection);
    mockProviderRepository.findById.mockResolvedValue({
      id: PROVIDER_ID,
      slug: 'github',
    });
    mockedGetManifest.mockReturnValue(baseManifest as never);
    mockedFindTask.mockResolvedValue({ id: TASK_ID } as never);
    mockConnectionService.updateConnectionMetadata.mockResolvedValue(
      baseConnection as never,
    );
  });

  describe('disconnectCheckFromTask', () => {
    it('marks the check as disabled and persists merged metadata', async () => {
      await service.disconnectCheckFromTask({
        taskId: TASK_ID,
        connectionId: CONNECTION_ID,
        checkId: CHECK_ID,
        organizationId: ORG_ID,
      });

      expect(
        mockConnectionService.updateConnectionMetadata,
      ).toHaveBeenCalledTimes(1);
      const [persistedId, persistedMetadata] =
        mockConnectionService.updateConnectionMetadata.mock.calls[0];
      expect(persistedId).toBe(CONNECTION_ID);
      expect(persistedMetadata.connectionName).toBe('My GitHub');
      expect(persistedMetadata[DISABLED_TASK_CHECKS_KEY]).toEqual({
        [TASK_ID]: [CHECK_ID],
      });
    });

    it('is idempotent if called twice for the same check', async () => {
      mockConnectionRepository.findById
        .mockResolvedValueOnce(baseConnection)
        .mockResolvedValueOnce({
          ...baseConnection,
          metadata: {
            ...baseConnection.metadata,
            [DISABLED_TASK_CHECKS_KEY]: { [TASK_ID]: [CHECK_ID] },
          },
        });

      await service.disconnectCheckFromTask({
        taskId: TASK_ID,
        connectionId: CONNECTION_ID,
        checkId: CHECK_ID,
        organizationId: ORG_ID,
      });
      await service.disconnectCheckFromTask({
        taskId: TASK_ID,
        connectionId: CONNECTION_ID,
        checkId: CHECK_ID,
        organizationId: ORG_ID,
      });

      const secondCallMetadata =
        mockConnectionService.updateConnectionMetadata.mock.calls[1][1];
      expect(secondCallMetadata[DISABLED_TASK_CHECKS_KEY]).toEqual({
        [TASK_ID]: [CHECK_ID],
      });
    });

    it('throws NotFound when the connection belongs to another org', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        ...baseConnection,
        organizationId: 'another_org',
      });

      await expect(
        service.disconnectCheckFromTask({
          taskId: TASK_ID,
          connectionId: CONNECTION_ID,
          checkId: CHECK_ID,
          organizationId: ORG_ID,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(
        mockConnectionService.updateConnectionMetadata,
      ).not.toHaveBeenCalled();
    });

    it('throws NotFound when the task does not belong to the org', async () => {
      mockedFindTask.mockResolvedValue(null);

      await expect(
        service.disconnectCheckFromTask({
          taskId: TASK_ID,
          connectionId: CONNECTION_ID,
          checkId: CHECK_ID,
          organizationId: ORG_ID,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(
        mockConnectionService.updateConnectionMetadata,
      ).not.toHaveBeenCalled();
    });

    it('throws BadRequest when the check id is unknown for the provider', async () => {
      await expect(
        service.disconnectCheckFromTask({
          taskId: TASK_ID,
          connectionId: CONNECTION_ID,
          checkId: 'does_not_exist',
          organizationId: ORG_ID,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(
        mockConnectionService.updateConnectionMetadata,
      ).not.toHaveBeenCalled();
    });
  });

  describe('reconnectCheckToTask', () => {
    it('removes the check from the disabled list and preserves other metadata', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        ...baseConnection,
        metadata: {
          connectionName: 'My GitHub',
          [DISABLED_TASK_CHECKS_KEY]: {
            [TASK_ID]: [CHECK_ID, 'dependabot'],
          },
        },
      });

      await service.reconnectCheckToTask({
        taskId: TASK_ID,
        connectionId: CONNECTION_ID,
        checkId: CHECK_ID,
        organizationId: ORG_ID,
      });

      const [, persistedMetadata] =
        mockConnectionService.updateConnectionMetadata.mock.calls[0];
      expect(persistedMetadata.connectionName).toBe('My GitHub');
      expect(persistedMetadata[DISABLED_TASK_CHECKS_KEY]).toEqual({
        [TASK_ID]: ['dependabot'],
      });
    });

    it('cleans up the task entry when its list becomes empty', async () => {
      mockConnectionRepository.findById.mockResolvedValue({
        ...baseConnection,
        metadata: {
          [DISABLED_TASK_CHECKS_KEY]: {
            [TASK_ID]: [CHECK_ID],
          },
        },
      });

      await service.reconnectCheckToTask({
        taskId: TASK_ID,
        connectionId: CONNECTION_ID,
        checkId: CHECK_ID,
        organizationId: ORG_ID,
      });

      const [, persistedMetadata] =
        mockConnectionService.updateConnectionMetadata.mock.calls[0];
      expect(persistedMetadata[DISABLED_TASK_CHECKS_KEY]).toEqual({});
    });

    it('is a no-op when the check was not disabled', async () => {
      await service.reconnectCheckToTask({
        taskId: TASK_ID,
        connectionId: CONNECTION_ID,
        checkId: CHECK_ID,
        organizationId: ORG_ID,
      });

      expect(mockConnectionService.updateConnectionMetadata).toHaveBeenCalled();
      const [, persistedMetadata] =
        mockConnectionService.updateConnectionMetadata.mock.calls[0];
      expect(persistedMetadata[DISABLED_TASK_CHECKS_KEY]).toEqual({});
    });
  });
});

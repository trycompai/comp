import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionService } from './connection.service';
import { ConnectionRepository } from '../repositories/connection.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { ConnectionAuthTeardownService } from './connection-auth-teardown.service';

jest.mock(
  '../../tasks/automatic-completion/complete-task-automatically',
  () => ({
    completeTaskAutomatically: jest.fn().mockResolvedValue({ count: 1 }),
  }),
);

jest.mock('@db', () => ({
  db: {
    integrationCheckRun: {
      findMany: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('@trycompai/integration-platform', () => ({
  getManifest: jest.fn(),
}));

import { db } from '@db';
import { completeTaskAutomatically } from '../../tasks/automatic-completion/complete-task-automatically';
const mockCompleteTask = completeTaskAutomatically as jest.Mock;

const findRuns = (db.integrationCheckRun as unknown as { findMany: jest.Mock })
  .findMany;
const findTasks = (db.task as unknown as { findMany: jest.Mock }).findMany;
const updateTask = (db.task as unknown as { updateMany: jest.Mock }).updateMany;
const directUpdate = (db.task as unknown as { update: jest.Mock }).update;

describe('ConnectionService', () => {
  let service: ConnectionService;

  const mockConnectionRepository = {
    update: jest.fn(),
  };
  const mockProviderRepository = {};
  const mockTeardown = {
    teardown: jest.fn(),
  };

  const CONNECTION_ID = 'icn_1';

  beforeEach(async () => {
    jest.clearAllMocks();
    updateTask.mockResolvedValue({ count: 1 });
    mockCompleteTask.mockResolvedValue({ count: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionService,
        { provide: ConnectionRepository, useValue: mockConnectionRepository },
        { provide: ProviderRepository, useValue: mockProviderRepository },
        { provide: ConnectionAuthTeardownService, useValue: mockTeardown },
      ],
    }).compile();

    service = module.get(ConnectionService);

    mockConnectionRepository.update.mockResolvedValue({
      id: CONNECTION_ID,
      status: 'disconnected',
    });
    mockTeardown.teardown.mockResolvedValue(undefined);
  });

  describe('disconnectConnection (CS-166)', () => {
    it('re-evaluates failed tasks to "todo" when the only automation source was the disconnected connection', async () => {
      findRuns.mockResolvedValue([{ taskId: 'tsk_1' }]);
      findTasks.mockResolvedValue([
        {
          organizationId: 'org_1',
          updatedAt: new Date('2026-01-02T03:04:05Z'),
          id: 'tsk_1',
          evidenceAutomations: [],
          integrationCheckRuns: [], // filtered query returns no active runs
        },
      ]);

      await service.disconnectConnection(CONNECTION_ID);

      expect(findRuns).toHaveBeenCalledWith({
        where: { connectionId: CONNECTION_ID, taskId: { not: null } },
        select: { taskId: true },
        distinct: ['taskId'],
      });
      expect(findTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['tsk_1'] },
            status: 'failed',
            automationStatus: 'AUTOMATED',
            archivedAt: null,
          }),
        }),
      );
      expect(updateTask).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: 'tsk_1',
          organizationId: 'org_1',
          status: 'failed',
          automationStatus: 'AUTOMATED',
          archivedAt: null,
          evidenceAutomations: { none: { isEnabled: true } },
        }),
        data: { status: 'todo' },
      });
    });

    it('re-evaluates failed task to "done" when remaining active automations are passing', async () => {
      findRuns.mockResolvedValue([{ taskId: 'tsk_2' }]);
      findTasks.mockResolvedValue([
        {
          organizationId: 'org_1',
          updatedAt: new Date('2026-01-02T03:04:05Z'),
          id: 'tsk_2',
          evidenceAutomations: [],
          integrationCheckRuns: [
            {
              checkId: 'other_check',
              status: 'success',
              createdAt: new Date('2026-04-01'),
            },
          ],
        },
      ]);

      await service.disconnectConnection(CONNECTION_ID);

      expect(mockCompleteTask).toHaveBeenCalledWith({
        taskId: 'tsk_2',
        organizationId: 'org_1',
        source: 'disconnect',
      });
      expect(updateTask).not.toHaveBeenCalled();
      expect(directUpdate).not.toHaveBeenCalled();
    });

    it('does not bypass rejection by the common current-evidence gate', async () => {
      findRuns.mockResolvedValue([{ taskId: 'tsk_gate' }]);
      findTasks.mockResolvedValue([
        {
          id: 'tsk_gate',
          organizationId: 'org_1',
          updatedAt: new Date('2026-01-02'),
          evidenceAutomations: [],
          integrationCheckRuns: [
            {
              checkId: 'synthetic-check',
              status: 'success',
              createdAt: new Date('2026-01-02'),
            },
          ],
        },
      ]);
      mockCompleteTask.mockResolvedValue({ count: 0 });
      await service.disconnectConnection(CONNECTION_ID);
      expect(mockCompleteTask).toHaveBeenCalledWith({
        taskId: 'tsk_gate',
        organizationId: 'org_1',
        source: 'disconnect',
      });
      expect(updateTask).not.toHaveBeenCalled();
      expect(directUpdate).not.toHaveBeenCalled();
    });

    it('leaves the task at "failed" when another active automation is still failing', async () => {
      findRuns.mockResolvedValue([{ taskId: 'tsk_3' }]);
      findTasks.mockResolvedValue([
        {
          organizationId: 'org_1',
          updatedAt: new Date('2026-01-02T03:04:05Z'),
          id: 'tsk_3',
          evidenceAutomations: [],
          integrationCheckRuns: [
            {
              checkId: 'other_check',
              status: 'failed',
              createdAt: new Date('2026-04-01'),
            },
          ],
        },
      ]);

      await service.disconnectConnection(CONNECTION_ID);

      expect(updateTask).not.toHaveBeenCalled();
    });

    it('picks the latest run per checkId when multiple exist', async () => {
      findRuns.mockResolvedValue([{ taskId: 'tsk_4' }]);
      findTasks.mockResolvedValue([
        {
          organizationId: 'org_1',
          updatedAt: new Date('2026-01-02T03:04:05Z'),
          id: 'tsk_4',
          evidenceAutomations: [],
          integrationCheckRuns: [
            {
              checkId: 'check_a',
              status: 'success',
              createdAt: new Date('2026-04-05'),
            },
            {
              checkId: 'check_a',
              status: 'failed',
              createdAt: new Date('2026-04-01'),
            },
            {
              checkId: 'check_b',
              status: 'success',
              createdAt: new Date('2026-04-03'),
            },
          ],
        },
      ]);

      await service.disconnectConnection(CONNECTION_ID);

      expect(mockCompleteTask).toHaveBeenCalledWith({
        taskId: 'tsk_4',
        organizationId: 'org_1',
        source: 'disconnect',
      });
      expect(updateTask).not.toHaveBeenCalled();
      expect(directUpdate).not.toHaveBeenCalled();
    });

    it('picks the latest run per checkId even when the input is reverse-sorted', async () => {
      // Defensive test: if a future change breaks the query's orderBy,
      // the logic must still pick the newest run per checkId.
      findRuns.mockResolvedValue([{ taskId: 'tsk_reorder' }]);
      findTasks.mockResolvedValue([
        {
          organizationId: 'org_1',
          updatedAt: new Date('2026-01-02T03:04:05Z'),
          id: 'tsk_reorder',
          evidenceAutomations: [],
          // Oldest first — the opposite of the query's orderBy desc.
          integrationCheckRuns: [
            {
              checkId: 'check_a',
              status: 'failed',
              createdAt: new Date('2026-04-01'),
            },
            {
              checkId: 'check_a',
              status: 'success',
              createdAt: new Date('2026-04-05'),
            },
          ],
        },
      ]);

      await service.disconnectConnection(CONNECTION_ID);

      // Latest run for check_a (2026-04-05) is success → task should become
      // done. If we naively picked the first-seen run, it would be failed
      // and the task would stay at 'failed'.
      expect(mockCompleteTask).toHaveBeenCalledWith({
        taskId: 'tsk_reorder',
        organizationId: 'org_1',
        source: 'disconnect',
      });
      expect(updateTask).not.toHaveBeenCalled();
      expect(directUpdate).not.toHaveBeenCalled();
    });

    it('swallows errors from the re-evaluation step so disconnect still succeeds', async () => {
      // The primary disconnect has already succeeded by the time re-evaluation
      // runs. A DB hiccup in the cleanup path must not surface to the caller.
      findRuns.mockRejectedValue(new Error('transient DB failure'));

      await expect(
        service.disconnectConnection(CONNECTION_ID),
      ).resolves.toEqual(
        expect.objectContaining({ id: CONNECTION_ID, status: 'disconnected' }),
      );
    });

    it('does not touch a task that is not currently failed', async () => {
      findRuns.mockResolvedValue([{ taskId: 'tsk_5' }]);
      // findTasks filters by status: 'failed', so non-failed tasks are not returned
      findTasks.mockResolvedValue([]);

      await service.disconnectConnection(CONNECTION_ID);

      expect(updateTask).not.toHaveBeenCalled();
    });

    it('skips re-evaluation when no runs exist for the connection', async () => {
      findRuns.mockResolvedValue([]);

      await service.disconnectConnection(CONNECTION_ID);

      expect(findTasks).not.toHaveBeenCalled();
      expect(updateTask).not.toHaveBeenCalled();
    });

    it('handles evidenceAutomations — task with failing custom automation stays failed', async () => {
      findRuns.mockResolvedValue([{ taskId: 'tsk_6' }]);
      findTasks.mockResolvedValue([
        {
          organizationId: 'org_1',
          updatedAt: new Date('2026-01-02T03:04:05Z'),
          id: 'tsk_6',
          evidenceAutomations: [{ runs: [{ evaluationStatus: 'fail' }] }],
          integrationCheckRuns: [],
        },
      ]);

      await service.disconnectConnection(CONNECTION_ID);

      expect(updateTask).not.toHaveBeenCalled();
    });
  });
});

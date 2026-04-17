import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionService } from './connection.service';
import { ConnectionRepository } from '../repositories/connection.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import { ConnectionAuthTeardownService } from './connection-auth-teardown.service';

jest.mock('@db', () => ({
  db: {
    integrationCheckRun: {
      findMany: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@trycompai/integration-platform', () => ({
  getManifest: jest.fn(),
}));

import { db } from '@db';

const findRuns = (db.integrationCheckRun as unknown as { findMany: jest.Mock })
  .findMany;
const findTasks = (db.task as unknown as { findMany: jest.Mock }).findMany;
const updateTask = (db.task as unknown as { update: jest.Mock }).update;

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
          where: { id: { in: ['tsk_1'] }, status: 'failed' },
        }),
      );
      expect(updateTask).toHaveBeenCalledWith({
        where: { id: 'tsk_1' },
        data: { status: 'todo' },
      });
    });

    it('re-evaluates failed task to "done" when remaining active automations are passing', async () => {
      findRuns.mockResolvedValue([{ taskId: 'tsk_2' }]);
      findTasks.mockResolvedValue([
        {
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

      expect(updateTask).toHaveBeenCalledWith({
        where: { id: 'tsk_2' },
        data: { status: 'done' },
      });
    });

    it('leaves the task at "failed" when another active automation is still failing', async () => {
      findRuns.mockResolvedValue([{ taskId: 'tsk_3' }]);
      findTasks.mockResolvedValue([
        {
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

      expect(updateTask).toHaveBeenCalledWith({
        where: { id: 'tsk_4' },
        data: { status: 'done' },
      });
    });

    it('picks the latest run per checkId even when the input is reverse-sorted', async () => {
      // Defensive test: if a future change breaks the query's orderBy,
      // the logic must still pick the newest run per checkId.
      findRuns.mockResolvedValue([{ taskId: 'tsk_reorder' }]);
      findTasks.mockResolvedValue([
        {
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
      expect(updateTask).toHaveBeenCalledWith({
        where: { id: 'tsk_reorder' },
        data: { status: 'done' },
      });
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
          id: 'tsk_6',
          evidenceAutomations: [
            { runs: [{ evaluationStatus: 'fail' }] },
          ],
          integrationCheckRuns: [],
        },
      ]);

      await service.disconnectConnection(CONNECTION_ID);

      expect(updateTask).not.toHaveBeenCalled();
    });
  });
});

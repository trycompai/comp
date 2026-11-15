jest.mock('@db', () => ({
  db: {
    integrationConnection: { findUnique: jest.fn(), update: jest.fn() },
    integrationCheckRun: { create: jest.fn(), update: jest.fn() },
    integrationCheckResult: { createMany: jest.fn() },
    task: { findUnique: jest.fn(), update: jest.fn() },
    findingException: { findMany: jest.fn() },
  },
}));
jest.mock('@trigger.dev/sdk', () => ({
  task: (configuration: unknown) => configuration,
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  tags: { add: jest.fn() },
}));
jest.mock('@trycompai/integration-platform', () => ({
  getManifest: jest.fn(() => ({
    id: 'aws',
    auth: { type: 'custom' },
    checks: [{ id: 'check', name: 'Synthetic check' }],
  })),
}));
jest.mock(
  '../../tasks/automatic-completion/complete-task-automatically',
  () => ({
    completeTaskAutomatically: jest.fn(),
  }),
);
jest.mock('./run-checks-on-server', () => ({ runChecksOnServer: jest.fn() }));

import { db } from '@db';
import { completeTaskAutomatically } from '../../tasks/automatic-completion/complete-task-automatically';
import { runChecksOnServer } from './run-checks-on-server';
import {
  runTaskIntegrationChecks,
  type TaskCheckRunResult,
} from './run-task-integration-checks';

const payload = {
  taskId: 'task',
  taskTitle: 'Synthetic task',
  connectionId: 'connection',
  organizationId: 'organization',
  providerSlug: 'aws',
  checkIds: ['check'],
};
const models = db as unknown as {
  integrationConnection: { findUnique: jest.Mock; update: jest.Mock };
  integrationCheckRun: { create: jest.Mock; update: jest.Mock };
  integrationCheckResult: { createMany: jest.Mock };
  task: { findUnique: jest.Mock; update: jest.Mock };
  findingException: { findMany: jest.Mock };
};
const worker = runTaskIntegrationChecks as unknown as {
  run: (input: typeof payload) => Promise<TaskCheckRunResult>;
};

describe('the actual scheduled worker preserves completion admission and producer provenance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.integrationConnection.findUnique.mockResolvedValue({
      id: 'connection',
      organizationId: 'organization',
      status: 'active',
      metadata: {},
      variables: {},
    });
    models.integrationCheckRun.create.mockResolvedValue({ id: 'stored-run' });
    models.task.findUnique.mockResolvedValue({ status: 'in_progress' });
    models.findingException.findMany.mockResolvedValue([]);
    (completeTaskAutomatically as jest.Mock).mockResolvedValue({ count: 1 });
    (runChecksOnServer as jest.Mock).mockResolvedValue({
      results: [
        {
          checkId: 'check',
          checkName: 'Synthetic check',
          status: 'success',
          durationMs: 1,
          completionEvidenceBinding: 'actual-server-binding',
          result: {
            findings: [],
            passingResults: [
              {
                resourceType: 'synthetic',
                resourceId: 'resource',
                title: 'Synthetic pass',
              },
            ],
            summary: { totalChecked: 1 },
            logs: [],
          },
        },
      ],
    });
  });
  it('delegates the exact task and retains only the actual server-produced binding', async () => {
    expect(await worker.run(payload)).toMatchObject({
      success: true,
      taskStatus: 'done',
    });
    expect(runChecksOnServer).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task',
        organizationId: 'organization',
        connectionId: 'connection',
        checkId: 'check',
      }),
    );
    expect(models.integrationCheckRun.update).toHaveBeenCalledWith({
      where: { id: 'stored-run' },
      data: expect.objectContaining({
        completionEvidenceBinding: 'actual-server-binding',
      }),
    });
    expect(completeTaskAutomatically).toHaveBeenCalledWith({
      taskId: 'task',
      organizationId: 'organization',
      source: 'native',
    });
    expect(models.task.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'done' }),
      }),
    );
  });
  it('does not bypass a rejected current-evidence or review admission after collection succeeds', async () => {
    (completeTaskAutomatically as jest.Mock).mockResolvedValue({ count: 0 });
    expect(await worker.run(payload)).toMatchObject({
      success: true,
      taskStatus: null,
    });
    expect(models.task.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'done' }),
      }),
    );
  });
  it('registers the pending attempt before its real delegated execution can finish', async () => {
    const server = runChecksOnServer as jest.Mock;
    const response = await server();
    let began: () => void = () => undefined;
    let release: (value: unknown) => void = () => undefined;
    const executing = new Promise<void>((resolve) => {
      began = resolve;
    });
    server.mockImplementation(() => {
      began();
      return new Promise((resolve) => {
        release = resolve;
      });
    });
    const completion = worker.run(payload);
    await executing;
    try {
      expect(models.integrationCheckRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          taskId: 'task',
          connectionId: 'connection',
          checkId: 'check',
          status: 'running',
        }),
      });
    } finally {
      release(response);
      await completion;
    }
  });
  it('does not invent missing delegated provenance from its own source identity', async () => {
    const response = await (runChecksOnServer as jest.Mock)();
    delete response.results[0].completionEvidenceBinding;
    (runChecksOnServer as jest.Mock).mockResolvedValue(response);
    (completeTaskAutomatically as jest.Mock).mockResolvedValue({ count: 0 });
    expect(await worker.run(payload)).toMatchObject({
      success: true,
      taskStatus: null,
    });
    expect(models.integrationCheckRun.update).toHaveBeenCalledWith({
      where: { id: 'stored-run' },
      data: expect.objectContaining({ completionEvidenceBinding: null }),
    });
  });
  it('records a transport failure on the already registered attempt', async () => {
    (runChecksOnServer as jest.Mock).mockRejectedValue(
      new Error('Synthetic transport failure'),
    );
    expect(await worker.run(payload)).toMatchObject({
      success: true,
      taskStatus: null,
    });
    expect(models.integrationCheckRun.create).toHaveBeenCalledTimes(1);
    expect(models.integrationCheckRun.update).toHaveBeenCalledWith({
      where: { id: 'stored-run' },
      data: expect.objectContaining({
        status: 'failed',
        errorMessage: 'Synthetic transport failure',
        totalChecked: 0,
      }),
    });
    expect(completeTaskAutomatically).not.toHaveBeenCalled();
  });
  it('keeps a missing result unknown and records the collection error', async () => {
    (runChecksOnServer as jest.Mock).mockResolvedValue({ results: [] });
    expect(await worker.run(payload)).toMatchObject({
      success: true,
      taskStatus: null,
    });
    expect(models.integrationCheckRun.update).toHaveBeenCalledWith({
      where: { id: 'stored-run' },
      data: expect.objectContaining({
        status: 'failed',
        completionEvidenceBinding: null,
        errorMessage: 'Requested check produced no matching result',
      }),
    });
    expect(completeTaskAutomatically).not.toHaveBeenCalled();
  });
  it('does not mark an attempt complete before every result row is stored', async () => {
    await worker.run(payload);
    expect(
      models.integrationCheckResult.createMany.mock.invocationCallOrder[0],
    ).toBeLessThan(
      models.integrationCheckRun.update.mock.invocationCallOrder[0],
    );
  });
  it('preserves a real failure and its stored result without calling a completion gate', async () => {
    const response = await (runChecksOnServer as jest.Mock)();
    const result = response.results[0];
    result.status = 'failed';
    result.result.findings = [
      {
        resourceType: 'synthetic',
        resourceId: 'failed-resource',
        title: 'Synthetic finding',
      },
    ];
    result.result.passingResults = [];
    (runChecksOnServer as jest.Mock).mockResolvedValue(response);
    expect(await worker.run(payload)).toMatchObject({
      success: true,
      taskStatus: 'failed',
      totalFindings: 1,
    });
    expect(models.integrationCheckResult.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          passed: false,
          resourceId: 'failed-resource',
        }),
      ],
    });
    expect(completeTaskAutomatically).not.toHaveBeenCalled();
  });
});

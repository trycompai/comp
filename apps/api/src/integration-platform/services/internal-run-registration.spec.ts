jest.mock('@db', () => ({
  db: {
    integrationConnection: { findUnique: jest.fn() },
    task: { findUnique: jest.fn() },
    dynamicIntegration: { findFirst: jest.fn() },
  },
}));
jest.mock('@trycompai/integration-platform', () => ({
  isCodeManifest: jest.fn(() => true),
}));

import { db } from '@db';
import { InternalIntegrationDebugService } from './internal-integration-debug.service';
import type { ConnectionCheckRunnerService } from './connection-check-runner.service';
import type { CheckRunRepository } from '../repositories/check-run.repository';
import type { DynamicManifestLoaderService } from './dynamic-manifest-loader.service';

const models = db as unknown as {
  integrationConnection: { findUnique: jest.Mock };
  task: { findUnique: jest.Mock };
};
const parameters = {
  taskId: 'task',
  connectionId: 'connection',
  checkId: 'check',
};
const response = {
  results: [
    {
      checkId: 'check',
      checkName: 'Synthetic check',
      status: 'success',
      durationMs: 1,
      completionEvidenceBinding: 'actual-executor-binding',
      result: {
        findings: [],
        passingResults: [
          { resourceId: 'resource', resourceType: 'synthetic', title: 'Pass' },
        ],
        summary: { totalChecked: 1 },
        logs: [],
      },
    },
  ],
};

describe.each(['rerunAndPersistCheck', 'revealAndPersistCheck'] as const)(
  'actual internal %s registration',
  (method) => {
    const runChecks = jest.fn();
    const create = jest.fn();
    const complete = jest.fn();
    const addResults = jest.fn();
    let service: InternalIntegrationDebugService;
    beforeEach(() => {
      jest.clearAllMocks();
      models.integrationConnection.findUnique.mockResolvedValue({
        organizationId: 'organization',
        provider: { slug: 'aws' },
      });
      models.task.findUnique.mockResolvedValue({
        organizationId: 'organization',
      });
      runChecks.mockResolvedValue(response);
      create.mockResolvedValue({ id: 'registered-run' });
      complete.mockResolvedValue({});
      addResults.mockResolvedValue({ count: 1 });
      service = new InternalIntegrationDebugService(
        { runChecks } as unknown as ConnectionCheckRunnerService,
        { create, complete, addResults } as unknown as CheckRunRepository,
        {
          loadDynamicManifests: () => Promise.resolve(),
        } as DynamicManifestLoaderService,
      );
    });
    it('registers its actual pending attempt before delegated execution completes', async () => {
      let began: () => void = () => undefined;
      let release: (value: unknown) => void = () => undefined;
      const executing = new Promise<void>((resolve) => {
        began = resolve;
      });
      runChecks.mockImplementation(() => {
        began();
        return new Promise((resolve) => {
          release = resolve;
        });
      });
      const execution = service[method](parameters);
      await executing;
      try {
        expect(create).toHaveBeenCalledWith(
          expect.objectContaining(parameters),
        );
      } finally {
        release(response);
        await execution;
      }
    });
    it('retains the actual executor binding and raw results on that registered attempt', async () => {
      expect(await service[method](parameters)).toEqual({ status: 'success' });
      expect(complete).toHaveBeenCalledWith(
        'registered-run',
        expect.objectContaining({
          completionEvidenceBinding: 'actual-executor-binding',
          passedCount: 1,
        }),
      );
      expect(addResults).toHaveBeenCalledWith([
        expect.objectContaining({ checkRunId: 'registered-run', passed: true }),
      ]);
    });
    it('records a thrown execution as unresolved evidence and preserves the rejection', async () => {
      runChecks.mockRejectedValue(new Error('Synthetic executor unavailable'));
      await expect(service[method](parameters)).rejects.toThrow(
        'Synthetic executor unavailable',
      );
      expect(complete).toHaveBeenCalledWith(
        'registered-run',
        expect.objectContaining({
          status: 'failed',
          errorMessage: 'Synthetic executor unavailable',
          passedCount: 0,
          totalChecked: 0,
        }),
      );
    });
    it('records a missing result as unresolved rather than leaving old green as the latest attempt', async () => {
      runChecks.mockResolvedValue({ results: [] });
      await expect(service[method](parameters)).rejects.toThrow(
        /produced no (matching )?result/,
      );
      expect(complete).toHaveBeenCalledWith(
        'registered-run',
        expect.objectContaining({ status: 'failed', totalChecked: 0 }),
      );
    });
    it('does not relabel a different executed check as the requested one', async () => {
      runChecks.mockResolvedValue({
        results: [{ ...response.results[0], checkId: 'different-check' }],
      });
      await expect(service[method](parameters)).rejects.toThrow(
        'produced no matching result',
      );
      expect(complete).toHaveBeenCalledWith(
        'registered-run',
        expect.objectContaining({
          status: 'failed',
          completionEvidenceBinding: null,
        }),
      );
    });
    it('retains execution and recording errors when both operations fail', async () => {
      const executionError = new Error('Synthetic execution failure');
      const recordingError = new Error('Synthetic recording failure');
      runChecks.mockRejectedValue(executionError);
      complete.mockRejectedValue(recordingError);
      try {
        await service[method](parameters);
        throw new Error('Expected both failures');
      } catch (error) {
        expect(error).toBeInstanceOf(AggregateError);
        if (!(error instanceof AggregateError)) throw error;
        expect(error.errors).toEqual([executionError, recordingError]);
      }
    });
  },
);

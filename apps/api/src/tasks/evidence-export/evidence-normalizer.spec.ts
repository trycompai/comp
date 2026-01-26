import {
  normalizeAppAutomationRun,
  normalizeCustomAutomationRun,
  groupAppAutomationRuns,
  groupCustomAutomationRuns,
  buildTaskEvidenceSummary,
} from './evidence-normalizer';

describe('Evidence Normalizer', () => {
  describe('normalizeAppAutomationRun', () => {
    it('should normalize a successful app automation run', () => {
      const run = {
        id: 'icr_123',
        checkId: 'mfa-check',
        checkName: 'MFA Enabled Check',
        status: 'success',
        startedAt: new Date('2024-01-15T10:00:00Z'),
        completedAt: new Date('2024-01-15T10:00:05Z'),
        durationMs: 5000,
        totalChecked: 10,
        passedCount: 9,
        failedCount: 1,
        errorMessage: null,
        logs: [{ level: 'info', message: 'Check started' }],
        createdAt: new Date('2024-01-15T10:00:00Z'),
        connection: {
          provider: {
            slug: 'google',
            name: 'Google Workspace',
          },
        },
        results: [
          {
            id: 'icx_1',
            passed: true,
            resourceType: 'user',
            resourceId: 'user@example.com',
            title: 'MFA Enabled',
            description: 'User has MFA enabled',
            severity: null,
            remediation: null,
            evidence: { mfaEnabled: true },
            collectedAt: new Date('2024-01-15T10:00:05Z'),
          },
        ],
      };

      const normalized = normalizeAppAutomationRun(run);

      expect(normalized.id).toBe('icr_123');
      expect(normalized.type).toBe('app_automation');
      expect(normalized.automationName).toBe('MFA Enabled Check');
      expect(normalized.automationId).toBe('mfa-check');
      expect(normalized.status).toBe('success');
      expect(normalized.totalChecked).toBe(10);
      expect(normalized.passedCount).toBe(9);
      expect(normalized.failedCount).toBe(1);
      expect(normalized.results).toHaveLength(1);
      expect(normalized.results[0].passed).toBe(true);
    });

    it('should normalize a failed app automation run', () => {
      const run = {
        id: 'icr_456',
        checkId: 'mfa-check',
        checkName: 'MFA Enabled Check',
        status: 'failed',
        startedAt: new Date('2024-01-15T10:00:00Z'),
        completedAt: new Date('2024-01-15T10:00:02Z'),
        durationMs: 2000,
        totalChecked: 0,
        passedCount: 0,
        failedCount: 0,
        errorMessage: 'API connection failed',
        logs: null,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        connection: {
          provider: undefined,
        },
        results: [],
      };

      const normalized = normalizeAppAutomationRun(run);

      expect(normalized.status).toBe('failed');
      expect(normalized.error).toBe('API connection failed');
      expect(normalized.results).toHaveLength(0);
    });
  });

  describe('normalizeCustomAutomationRun', () => {
    it('should normalize a successful custom automation run', () => {
      const run = {
        id: 'ear_123',
        status: 'completed',
        startedAt: new Date('2024-01-15T10:00:00Z'),
        completedAt: new Date('2024-01-15T10:01:00Z'),
        runDuration: 60000,
        success: true,
        error: null,
        logs: 'Execution logs here',
        output: { data: 'test output' },
        evaluationStatus: 'pass',
        evaluationReason: 'All checks passed',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        evidenceAutomation: {
          id: 'ea_123',
          name: 'Custom Evidence Collection',
        },
      };

      const normalized = normalizeCustomAutomationRun(run);

      expect(normalized.id).toBe('ear_123');
      expect(normalized.type).toBe('custom_automation');
      expect(normalized.automationName).toBe('Custom Evidence Collection');
      expect(normalized.automationId).toBe('ea_123');
      expect(normalized.status).toBe('success');
      expect(normalized.evaluationStatus).toBe('pass');
      expect(normalized.evaluationReason).toBe('All checks passed');
      expect(normalized.passedCount).toBe(1);
      expect(normalized.failedCount).toBe(0);
    });

    it('should normalize a failed custom automation run', () => {
      const run = {
        id: 'ear_456',
        status: 'failed',
        startedAt: new Date('2024-01-15T10:00:00Z'),
        completedAt: null,
        runDuration: null,
        success: false,
        error: 'Script execution failed',
        logs: null,
        output: null,
        evaluationStatus: 'fail',
        evaluationReason: 'Evidence not found',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        evidenceAutomation: {
          id: 'ea_456',
          name: 'Failed Automation',
        },
      };

      const normalized = normalizeCustomAutomationRun(run);

      expect(normalized.status).toBe('failed');
      expect(normalized.evaluationStatus).toBe('fail');
      expect(normalized.error).toBe('Script execution failed');
      expect(normalized.passedCount).toBe(0);
      expect(normalized.failedCount).toBe(1);
    });
  });

  describe('groupAppAutomationRuns', () => {
    it('should group runs by check ID', () => {
      const runs = [
        {
          id: 'icr_1',
          checkId: 'mfa-check',
          checkName: 'MFA Check',
          status: 'success',
          startedAt: new Date('2024-01-15T10:00:00Z'),
          completedAt: new Date('2024-01-15T10:00:05Z'),
          durationMs: 5000,
          totalChecked: 5,
          passedCount: 5,
          failedCount: 0,
          errorMessage: null,
          logs: null,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          connection: { provider: { slug: 'google', name: 'Google' } },
          results: [],
        },
        {
          id: 'icr_2',
          checkId: 'mfa-check',
          checkName: 'MFA Check',
          status: 'success',
          startedAt: new Date('2024-01-16T10:00:00Z'),
          completedAt: new Date('2024-01-16T10:00:05Z'),
          durationMs: 5000,
          totalChecked: 5,
          passedCount: 5,
          failedCount: 0,
          errorMessage: null,
          logs: null,
          createdAt: new Date('2024-01-16T10:00:00Z'),
          connection: { provider: { slug: 'google', name: 'Google' } },
          results: [],
        },
        {
          id: 'icr_3',
          checkId: 'encryption-check',
          checkName: 'Encryption Check',
          status: 'failed',
          startedAt: new Date('2024-01-15T10:00:00Z'),
          completedAt: new Date('2024-01-15T10:00:05Z'),
          durationMs: 5000,
          totalChecked: 3,
          passedCount: 1,
          failedCount: 2,
          errorMessage: null,
          logs: null,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          connection: { provider: { slug: 'aws', name: 'AWS' } },
          results: [],
        },
      ];

      const grouped = groupAppAutomationRuns(runs);

      expect(grouped).toHaveLength(2);

      const mfaAutomation = grouped.find((a) => a.id === 'mfa-check');
      expect(mfaAutomation).toBeDefined();
      expect(mfaAutomation?.runs).toHaveLength(2);
      expect(mfaAutomation?.totalRuns).toBe(2);
      expect(mfaAutomation?.successfulRuns).toBe(2);
      expect(mfaAutomation?.failedRuns).toBe(0);

      const encryptionAutomation = grouped.find(
        (a) => a.id === 'encryption-check',
      );
      expect(encryptionAutomation).toBeDefined();
      expect(encryptionAutomation?.runs).toHaveLength(1);
      expect(encryptionAutomation?.failedRuns).toBe(1);
    });
  });

  describe('groupCustomAutomationRuns', () => {
    it('should group runs by automation ID', () => {
      const runs = [
        {
          id: 'ear_1',
          status: 'completed',
          startedAt: new Date('2024-01-15T10:00:00Z'),
          completedAt: new Date('2024-01-15T10:01:00Z'),
          runDuration: 60000,
          success: true,
          error: null,
          logs: null,
          output: null,
          evaluationStatus: 'pass',
          evaluationReason: null,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          evidenceAutomation: { id: 'ea_1', name: 'Automation 1' },
        },
        {
          id: 'ear_2',
          status: 'completed',
          startedAt: new Date('2024-01-16T10:00:00Z'),
          completedAt: new Date('2024-01-16T10:01:00Z'),
          runDuration: 60000,
          success: true,
          error: null,
          logs: null,
          output: null,
          evaluationStatus: 'pass',
          evaluationReason: null,
          createdAt: new Date('2024-01-16T10:00:00Z'),
          evidenceAutomation: { id: 'ea_1', name: 'Automation 1' },
        },
      ];

      const grouped = groupCustomAutomationRuns(runs);

      expect(grouped).toHaveLength(1);
      expect(grouped[0].id).toBe('ea_1');
      expect(grouped[0].runs).toHaveLength(2);
      expect(grouped[0].totalRuns).toBe(2);
      expect(grouped[0].successfulRuns).toBe(2);
    });
  });

  describe('buildTaskEvidenceSummary', () => {
    it('should build a complete task evidence summary', () => {
      const params = {
        taskId: 'tsk_123',
        taskTitle: 'Implement MFA',
        organizationId: 'org_123',
        organizationName: 'Test Org',
        appAutomationRuns: [
          {
            id: 'icr_1',
            checkId: 'mfa-check',
            checkName: 'MFA Check',
            status: 'success',
            startedAt: new Date('2024-01-15T10:00:00Z'),
            completedAt: new Date('2024-01-15T10:00:05Z'),
            durationMs: 5000,
            totalChecked: 5,
            passedCount: 5,
            failedCount: 0,
            errorMessage: null,
            logs: null,
            createdAt: new Date('2024-01-15T10:00:00Z'),
            connection: { provider: { slug: 'google', name: 'Google' } },
            results: [],
          },
        ],
        customAutomationRuns: [
          {
            id: 'ear_1',
            status: 'completed',
            startedAt: new Date('2024-01-15T10:00:00Z'),
            completedAt: new Date('2024-01-15T10:01:00Z'),
            runDuration: 60000,
            success: true,
            error: null,
            logs: null,
            output: null,
            evaluationStatus: 'pass',
            evaluationReason: null,
            createdAt: new Date('2024-01-15T10:00:00Z'),
            evidenceAutomation: { id: 'ea_1', name: 'Custom Automation' },
          },
        ],
      };

      const summary = buildTaskEvidenceSummary(params);

      expect(summary.taskId).toBe('tsk_123');
      expect(summary.taskTitle).toBe('Implement MFA');
      expect(summary.organizationName).toBe('Test Org');
      expect(summary.automations).toHaveLength(2);
      expect(summary.exportedAt).toBeInstanceOf(Date);

      const appAutomation = summary.automations.find(
        (a) => a.type === 'app_automation',
      );
      expect(appAutomation).toBeDefined();
      expect(appAutomation?.name).toBe('MFA Check');

      const customAutomation = summary.automations.find(
        (a) => a.type === 'custom_automation',
      );
      expect(customAutomation).toBeDefined();
      expect(customAutomation?.name).toBe('Custom Automation');
    });
  });
});

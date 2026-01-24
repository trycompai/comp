import {
  generateAutomationPDF,
  generateTaskSummaryPDF,
  sanitizeFilename,
} from './evidence-pdf-generator';
import type {
  NormalizedAutomation,
  TaskEvidenceSummary,
} from './evidence-export.types';

describe('Evidence PDF Generator', () => {
  describe('sanitizeFilename', () => {
    it('should convert to lowercase and replace special characters', () => {
      expect(sanitizeFilename('Test Name')).toBe('test-name');
      expect(sanitizeFilename('MFA Enabled Check!')).toBe('mfa-enabled-check');
      expect(sanitizeFilename('Test@#$%^&*()Name')).toBe('test-name');
    });

    it('should trim leading and trailing dashes', () => {
      expect(sanitizeFilename('---Test---')).toBe('test');
      expect(sanitizeFilename('  Test  ')).toBe('test');
    });

    it('should truncate to 50 characters', () => {
      const longName =
        'This is a very long automation name that should be truncated to fifty characters';
      expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(50);
    });

    it('should handle empty strings', () => {
      expect(sanitizeFilename('')).toBe('');
    });
  });

  describe('generateAutomationPDF', () => {
    it('should generate a PDF buffer for an app automation', () => {
      const automation: NormalizedAutomation = {
        id: 'mfa-check',
        name: 'MFA Enabled Check',
        type: 'app_automation',
        integrationName: 'Google Workspace',
        checkId: 'mfa-check',
        runs: [
          {
            id: 'icr_123',
            type: 'app_automation',
            automationName: 'MFA Enabled Check',
            automationId: 'mfa-check',
            status: 'success',
            startedAt: new Date('2024-01-15T10:00:00Z'),
            completedAt: new Date('2024-01-15T10:00:05Z'),
            durationMs: 5000,
            totalChecked: 10,
            passedCount: 9,
            failedCount: 1,
            evaluationStatus: null,
            evaluationReason: null,
            logs: null,
            output: null,
            error: null,
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
            createdAt: new Date('2024-01-15T10:00:00Z'),
          },
        ],
        totalRuns: 1,
        successfulRuns: 1,
        failedRuns: 0,
        latestRunAt: new Date('2024-01-15T10:00:00Z'),
      };

      const context = {
        organizationName: 'Test Organization',
        taskTitle: 'Implement MFA',
      };

      const pdfBuffer = generateAutomationPDF(automation, context);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Check that it's a valid PDF by checking the header
      const header = pdfBuffer.slice(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');
    });

    it('should generate a PDF buffer for a custom automation', () => {
      const automation: NormalizedAutomation = {
        id: 'ea_123',
        name: 'Custom Evidence Collection',
        type: 'custom_automation',
        runs: [
          {
            id: 'ear_123',
            type: 'custom_automation',
            automationName: 'Custom Evidence Collection',
            automationId: 'ea_123',
            status: 'success',
            startedAt: new Date('2024-01-15T10:00:00Z'),
            completedAt: new Date('2024-01-15T10:01:00Z'),
            durationMs: 60000,
            totalChecked: 1,
            passedCount: 1,
            failedCount: 0,
            evaluationStatus: 'pass',
            evaluationReason: 'All evidence collected successfully',
            logs: 'Execution completed',
            output: { data: 'test output' },
            error: null,
            results: [],
            createdAt: new Date('2024-01-15T10:00:00Z'),
          },
        ],
        totalRuns: 1,
        successfulRuns: 1,
        failedRuns: 0,
        latestRunAt: new Date('2024-01-15T10:00:00Z'),
      };

      const context = {
        organizationName: 'Test Organization',
        taskTitle: 'Collect Evidence',
      };

      const pdfBuffer = generateAutomationPDF(automation, context);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should handle automations with no runs', () => {
      const automation: NormalizedAutomation = {
        id: 'empty-check',
        name: 'Empty Check',
        type: 'app_automation',
        runs: [],
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        latestRunAt: null,
      };

      const context = {
        organizationName: 'Test Organization',
        taskTitle: 'Test Task',
      };

      const pdfBuffer = generateAutomationPDF(automation, context);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('generateTaskSummaryPDF', () => {
    it('should generate a summary PDF for a task with multiple automations', () => {
      const summary: TaskEvidenceSummary = {
        taskId: 'tsk_123',
        taskTitle: 'Implement Security Controls',
        organizationId: 'org_123',
        organizationName: 'Test Organization',
        automations: [
          {
            id: 'mfa-check',
            name: 'MFA Enabled Check',
            type: 'app_automation',
            integrationName: 'Google Workspace',
            runs: [],
            totalRuns: 5,
            successfulRuns: 4,
            failedRuns: 1,
            latestRunAt: new Date('2024-01-15T10:00:00Z'),
          },
          {
            id: 'ea_123',
            name: 'Custom Evidence Collection',
            type: 'custom_automation',
            runs: [],
            totalRuns: 3,
            successfulRuns: 3,
            failedRuns: 0,
            latestRunAt: new Date('2024-01-16T10:00:00Z'),
          },
        ],
        exportedAt: new Date('2024-01-17T10:00:00Z'),
      };

      const pdfBuffer = generateTaskSummaryPDF(summary);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Check that it's a valid PDF
      const header = pdfBuffer.slice(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');
    });

    it('should handle tasks with no automations', () => {
      const summary: TaskEvidenceSummary = {
        taskId: 'tsk_123',
        taskTitle: 'Empty Task',
        organizationId: 'org_123',
        organizationName: 'Test Organization',
        automations: [],
        exportedAt: new Date('2024-01-17T10:00:00Z'),
      };

      const pdfBuffer = generateTaskSummaryPDF(summary);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });
});

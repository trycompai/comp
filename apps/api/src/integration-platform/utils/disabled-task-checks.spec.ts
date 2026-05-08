import {
  DISABLED_TASK_CHECKS_KEY,
  isCheckDisabledForTask,
  parseDisabledTaskChecks,
  withCheckDisabled,
  withCheckEnabled,
} from './disabled-task-checks';

describe('disabled-task-checks utils', () => {
  describe('parseDisabledTaskChecks', () => {
    it('returns empty map for null/undefined', () => {
      expect(parseDisabledTaskChecks(null)).toEqual({});
      expect(parseDisabledTaskChecks(undefined)).toEqual({});
    });

    it('returns empty map when metadata is not an object', () => {
      expect(parseDisabledTaskChecks('string')).toEqual({});
      expect(parseDisabledTaskChecks(123)).toEqual({});
      expect(parseDisabledTaskChecks([])).toEqual({});
    });

    it('returns empty map when the key is missing', () => {
      expect(parseDisabledTaskChecks({ somethingElse: true })).toEqual({});
    });

    it('parses a valid map', () => {
      const metadata = {
        connectionName: 'My GitHub',
        [DISABLED_TASK_CHECKS_KEY]: {
          tsk_abc: ['branch_protection', 'dependabot'],
          tsk_xyz: ['sanitized_inputs'],
        },
      };
      expect(parseDisabledTaskChecks(metadata)).toEqual({
        tsk_abc: ['branch_protection', 'dependabot'],
        tsk_xyz: ['sanitized_inputs'],
      });
    });

    it('drops non-string/empty check ids', () => {
      const metadata = {
        [DISABLED_TASK_CHECKS_KEY]: {
          tsk_abc: ['branch_protection', 42, null, '', 'dependabot'],
        },
      };
      expect(parseDisabledTaskChecks(metadata)).toEqual({
        tsk_abc: ['branch_protection', 'dependabot'],
      });
    });

    it('drops task entries where all check ids are invalid', () => {
      const metadata = {
        [DISABLED_TASK_CHECKS_KEY]: {
          tsk_abc: [null, 42, ''],
          tsk_xyz: ['valid'],
        },
      };
      expect(parseDisabledTaskChecks(metadata)).toEqual({
        tsk_xyz: ['valid'],
      });
    });

    it('skips non-array check lists', () => {
      const metadata = {
        [DISABLED_TASK_CHECKS_KEY]: {
          tsk_abc: 'not-an-array',
          tsk_xyz: ['valid'],
        },
      };
      expect(parseDisabledTaskChecks(metadata)).toEqual({
        tsk_xyz: ['valid'],
      });
    });
  });

  describe('isCheckDisabledForTask', () => {
    const metadata = {
      [DISABLED_TASK_CHECKS_KEY]: {
        tsk_abc: ['branch_protection'],
      },
    };

    it('returns true when the check is disabled', () => {
      expect(
        isCheckDisabledForTask(metadata, 'tsk_abc', 'branch_protection'),
      ).toBe(true);
    });

    it('returns false when the check is not in the list', () => {
      expect(isCheckDisabledForTask(metadata, 'tsk_abc', 'dependabot')).toBe(
        false,
      );
    });

    it('returns false when the task has no disabled checks', () => {
      expect(
        isCheckDisabledForTask(metadata, 'tsk_xyz', 'branch_protection'),
      ).toBe(false);
    });

    it('returns false for empty metadata', () => {
      expect(isCheckDisabledForTask(null, 'tsk_abc', 'branch_protection')).toBe(
        false,
      );
    });
  });

  describe('withCheckDisabled', () => {
    it('adds a check to an empty metadata object', () => {
      const result = withCheckDisabled(null, 'tsk_abc', 'branch_protection');
      expect(result[DISABLED_TASK_CHECKS_KEY]).toEqual({
        tsk_abc: ['branch_protection'],
      });
    });

    it('preserves existing metadata fields', () => {
      const metadata = {
        connectionName: 'My GitHub',
        accountId: '12345',
      };
      const result = withCheckDisabled(
        metadata,
        'tsk_abc',
        'branch_protection',
      );
      expect(result.connectionName).toBe('My GitHub');
      expect(result.accountId).toBe('12345');
      expect(result[DISABLED_TASK_CHECKS_KEY]).toEqual({
        tsk_abc: ['branch_protection'],
      });
    });

    it('adds to an existing task list', () => {
      const metadata = {
        [DISABLED_TASK_CHECKS_KEY]: {
          tsk_abc: ['branch_protection'],
        },
      };
      const result = withCheckDisabled(metadata, 'tsk_abc', 'dependabot');
      expect(result[DISABLED_TASK_CHECKS_KEY]).toEqual({
        tsk_abc: ['branch_protection', 'dependabot'],
      });
    });

    it('is idempotent when the check is already disabled', () => {
      const metadata = {
        [DISABLED_TASK_CHECKS_KEY]: {
          tsk_abc: ['branch_protection'],
        },
      };
      const result = withCheckDisabled(
        metadata,
        'tsk_abc',
        'branch_protection',
      );
      expect(result[DISABLED_TASK_CHECKS_KEY]).toEqual({
        tsk_abc: ['branch_protection'],
      });
    });

    it('does not mutate the input metadata', () => {
      const metadata = {
        [DISABLED_TASK_CHECKS_KEY]: {
          tsk_abc: ['branch_protection'],
        },
      };
      const snapshot = JSON.stringify(metadata);
      withCheckDisabled(metadata, 'tsk_abc', 'dependabot');
      expect(JSON.stringify(metadata)).toBe(snapshot);
    });

    it('works across multiple tasks independently', () => {
      let metadata: Record<string, unknown> = {};
      metadata = withCheckDisabled(metadata, 'tsk_abc', 'branch_protection');
      metadata = withCheckDisabled(metadata, 'tsk_xyz', 'sanitized_inputs');
      expect(metadata[DISABLED_TASK_CHECKS_KEY]).toEqual({
        tsk_abc: ['branch_protection'],
        tsk_xyz: ['sanitized_inputs'],
      });
    });
  });

  describe('withCheckEnabled', () => {
    it('removes the check from a task list', () => {
      const metadata = {
        [DISABLED_TASK_CHECKS_KEY]: {
          tsk_abc: ['branch_protection', 'dependabot'],
        },
      };
      const result = withCheckEnabled(metadata, 'tsk_abc', 'branch_protection');
      expect(result[DISABLED_TASK_CHECKS_KEY]).toEqual({
        tsk_abc: ['dependabot'],
      });
    });

    it('removes the task entry when its list becomes empty', () => {
      const metadata = {
        [DISABLED_TASK_CHECKS_KEY]: {
          tsk_abc: ['branch_protection'],
          tsk_xyz: ['sanitized_inputs'],
        },
      };
      const result = withCheckEnabled(metadata, 'tsk_abc', 'branch_protection');
      expect(result[DISABLED_TASK_CHECKS_KEY]).toEqual({
        tsk_xyz: ['sanitized_inputs'],
      });
    });

    it('is a no-op when the check was not disabled', () => {
      const metadata = {
        [DISABLED_TASK_CHECKS_KEY]: {
          tsk_abc: ['branch_protection'],
        },
      };
      const result = withCheckEnabled(metadata, 'tsk_abc', 'dependabot');
      expect(result[DISABLED_TASK_CHECKS_KEY]).toEqual({
        tsk_abc: ['branch_protection'],
      });
    });

    it('preserves other metadata fields', () => {
      const metadata = {
        connectionName: 'My GitHub',
        [DISABLED_TASK_CHECKS_KEY]: {
          tsk_abc: ['branch_protection'],
        },
      };
      const result = withCheckEnabled(metadata, 'tsk_abc', 'branch_protection');
      expect(result.connectionName).toBe('My GitHub');
      expect(result[DISABLED_TASK_CHECKS_KEY]).toEqual({});
    });

    it('does not mutate the input metadata', () => {
      const metadata = {
        [DISABLED_TASK_CHECKS_KEY]: {
          tsk_abc: ['branch_protection'],
        },
      };
      const snapshot = JSON.stringify(metadata);
      withCheckEnabled(metadata, 'tsk_abc', 'branch_protection');
      expect(JSON.stringify(metadata)).toBe(snapshot);
    });
  });
});

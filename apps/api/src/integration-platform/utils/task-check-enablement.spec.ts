import {
  DISABLED_TASK_CHECKS_KEY,
  ENABLED_TASK_CHECKS_KEY,
  isTaskCheckEnabled,
  parseEnabledTaskChecks,
  withTaskCheckDisabled,
  withTaskCheckEnabled,
} from './disabled-task-checks';

describe('task check enablement utils', () => {
  describe('parseEnabledTaskChecks', () => {
    it('parses explicit opt-in checks with the same validation rules', () => {
      const metadata = {
        [ENABLED_TASK_CHECKS_KEY]: {
          tsk_abc: ['gcp-environment-separation', 42, ''],
        },
      };

      expect(parseEnabledTaskChecks(metadata)).toEqual({
        tsk_abc: ['gcp-environment-separation'],
      });
    });
  });

  describe('isTaskCheckEnabled', () => {
    it('returns true for default-on checks with no metadata', () => {
      expect(
        isTaskCheckEnabled({
          metadata: null,
          taskId: 'tsk_abc',
          checkId: 'branch_protection',
        }),
      ).toBe(true);
    });

    it('returns false for default-off checks until explicitly enabled', () => {
      expect(
        isTaskCheckEnabled({
          metadata: {},
          taskId: 'tsk_abc',
          checkId: 'gcp-environment-separation',
          enabledByDefault: false,
        }),
      ).toBe(false);
    });

    it('returns true for default-off checks after explicit opt-in', () => {
      const metadata = {
        [ENABLED_TASK_CHECKS_KEY]: {
          tsk_abc: ['gcp-environment-separation'],
        },
      };

      expect(
        isTaskCheckEnabled({
          metadata,
          taskId: 'tsk_abc',
          checkId: 'gcp-environment-separation',
          enabledByDefault: false,
        }),
      ).toBe(true);
    });

    it('lets explicit disconnect override explicit opt-in', () => {
      const metadata = {
        [DISABLED_TASK_CHECKS_KEY]: {
          tsk_abc: ['gcp-environment-separation'],
        },
        [ENABLED_TASK_CHECKS_KEY]: {
          tsk_abc: ['gcp-environment-separation'],
        },
      };

      expect(
        isTaskCheckEnabled({
          metadata,
          taskId: 'tsk_abc',
          checkId: 'gcp-environment-separation',
          enabledByDefault: false,
        }),
      ).toBe(false);
    });
  });

  describe('withTaskCheckDisabled', () => {
    it('removes explicit opt-in when disabling a default-off check', () => {
      const metadata = {
        [ENABLED_TASK_CHECKS_KEY]: {
          tsk_abc: ['gcp-environment-separation'],
        },
      };

      const result = withTaskCheckDisabled({
        metadata,
        taskId: 'tsk_abc',
        checkId: 'gcp-environment-separation',
      });

      expect(result[DISABLED_TASK_CHECKS_KEY]).toEqual({
        tsk_abc: ['gcp-environment-separation'],
      });
      expect(result[ENABLED_TASK_CHECKS_KEY]).toEqual({});
    });
  });

  describe('withTaskCheckEnabled', () => {
    it('records explicit opt-in for default-off checks', () => {
      const result = withTaskCheckEnabled({
        metadata: null,
        taskId: 'tsk_abc',
        checkId: 'gcp-environment-separation',
        enabledByDefault: false,
      });

      expect(result[DISABLED_TASK_CHECKS_KEY]).toEqual({});
      expect(result[ENABLED_TASK_CHECKS_KEY]).toEqual({
        tsk_abc: ['gcp-environment-separation'],
      });
    });

    it('does not record opt-in for default-on checks', () => {
      const result = withTaskCheckEnabled({
        metadata: null,
        taskId: 'tsk_abc',
        checkId: 'branch_protection',
      });

      expect(result[DISABLED_TASK_CHECKS_KEY]).toEqual({});
      expect(result[ENABLED_TASK_CHECKS_KEY]).toEqual({});
    });
  });
});

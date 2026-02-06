import {
  isRestrictedRole,
  buildTaskAssignmentFilter,
  buildRiskAssignmentFilter,
  buildControlAssignmentFilter,
  buildPolicyAssignmentFilter,
  hasTaskAccess,
  hasRiskAccess,
  hasControlAccess,
} from './assignment-filter';

describe('Assignment Filter Utilities', () => {
  describe('isRestrictedRole', () => {
    it('should return true for null roles (fail-safe)', () => {
      expect(isRestrictedRole(null)).toBe(true);
    });

    it('should return true for undefined roles (fail-safe)', () => {
      expect(isRestrictedRole(undefined)).toBe(true);
    });

    it('should return true for empty array (fail-safe)', () => {
      expect(isRestrictedRole([])).toBe(true);
    });

    it('should return true for employee role', () => {
      expect(isRestrictedRole(['employee'])).toBe(true);
    });

    it('should return true for contractor role', () => {
      expect(isRestrictedRole(['contractor'])).toBe(true);
    });

    it('should return true for employee and contractor combined', () => {
      expect(isRestrictedRole(['employee', 'contractor'])).toBe(true);
    });

    it('should return false for owner role', () => {
      expect(isRestrictedRole(['owner'])).toBe(false);
    });

    it('should return false for admin role', () => {
      expect(isRestrictedRole(['admin'])).toBe(false);
    });

    it('should return false for auditor role', () => {
      expect(isRestrictedRole(['auditor'])).toBe(false);
    });

    it('should return false when employee has additional admin role', () => {
      expect(isRestrictedRole(['employee', 'admin'])).toBe(false);
    });

    it('should return false when contractor has additional owner role', () => {
      expect(isRestrictedRole(['contractor', 'owner'])).toBe(false);
    });

    it('should return true for unknown roles', () => {
      expect(isRestrictedRole(['unknown_role'])).toBe(false);
    });
  });

  describe('buildTaskAssignmentFilter', () => {
    const memberId = 'member-123';

    it('should return empty filter for privileged roles', () => {
      expect(buildTaskAssignmentFilter(memberId, ['admin'])).toEqual({});
      expect(buildTaskAssignmentFilter(memberId, ['owner'])).toEqual({});
      expect(buildTaskAssignmentFilter(memberId, ['auditor'])).toEqual({});
    });

    it('should return assigneeId filter for employee role', () => {
      expect(buildTaskAssignmentFilter(memberId, ['employee'])).toEqual({
        assigneeId: memberId,
      });
    });

    it('should return assigneeId filter for contractor role', () => {
      expect(buildTaskAssignmentFilter(memberId, ['contractor'])).toEqual({
        assigneeId: memberId,
      });
    });

    it('should return impossible match filter when restricted user has no memberId', () => {
      expect(buildTaskAssignmentFilter(null, ['employee'])).toEqual({
        id: 'impossible_match_no_member',
      });
      expect(buildTaskAssignmentFilter(undefined, ['employee'])).toEqual({
        id: 'impossible_match_no_member',
      });
    });

    it('should return impossible match filter for null roles with no memberId', () => {
      expect(buildTaskAssignmentFilter(null, null)).toEqual({
        id: 'impossible_match_no_member',
      });
    });
  });

  describe('buildRiskAssignmentFilter', () => {
    const memberId = 'member-456';

    it('should return empty filter for privileged roles', () => {
      expect(buildRiskAssignmentFilter(memberId, ['admin'])).toEqual({});
    });

    it('should return assigneeId filter for restricted roles', () => {
      expect(buildRiskAssignmentFilter(memberId, ['employee'])).toEqual({
        assigneeId: memberId,
      });
    });

    it('should return impossible match filter when restricted user has no memberId', () => {
      expect(buildRiskAssignmentFilter(null, ['contractor'])).toEqual({
        id: 'impossible_match_no_member',
      });
    });
  });

  describe('buildControlAssignmentFilter', () => {
    const memberId = 'member-789';

    it('should return empty filter for privileged roles', () => {
      expect(buildControlAssignmentFilter(memberId, ['admin'])).toEqual({});
    });

    it('should return tasks.some filter for restricted roles', () => {
      expect(buildControlAssignmentFilter(memberId, ['employee'])).toEqual({
        tasks: {
          some: { assigneeId: memberId },
        },
      });
    });

    it('should return impossible match filter when restricted user has no memberId', () => {
      expect(buildControlAssignmentFilter(null, ['employee'])).toEqual({
        id: 'impossible_match_no_member',
      });
    });
  });

  describe('buildPolicyAssignmentFilter', () => {
    const memberId = 'member-abc';

    it('should return empty filter for privileged roles', () => {
      expect(buildPolicyAssignmentFilter(memberId, ['admin'])).toEqual({});
    });

    it('should return assigneeId filter for restricted roles', () => {
      expect(buildPolicyAssignmentFilter(memberId, ['employee'])).toEqual({
        assigneeId: memberId,
      });
    });

    it('should return impossible match filter when restricted user has no memberId', () => {
      expect(buildPolicyAssignmentFilter(null, ['contractor'])).toEqual({
        id: 'impossible_match_no_member',
      });
    });
  });

  describe('hasTaskAccess', () => {
    const memberId = 'member-123';
    const assignedTask = { assigneeId: memberId };
    const unassignedTask = { assigneeId: 'other-member' };
    const noAssigneeTask = { assigneeId: null };

    it('should return true for privileged roles regardless of assignment', () => {
      expect(hasTaskAccess(unassignedTask, memberId, ['admin'])).toBe(true);
      expect(hasTaskAccess(noAssigneeTask, memberId, ['owner'])).toBe(true);
    });

    it('should return true for restricted role when task is assigned to them', () => {
      expect(hasTaskAccess(assignedTask, memberId, ['employee'])).toBe(true);
    });

    it('should return false for restricted role when task is assigned to someone else', () => {
      expect(hasTaskAccess(unassignedTask, memberId, ['employee'])).toBe(false);
    });

    it('should return false for restricted role when task has no assignee', () => {
      expect(hasTaskAccess(noAssigneeTask, memberId, ['employee'])).toBe(false);
    });

    it('should return false for restricted role with no memberId', () => {
      expect(hasTaskAccess(assignedTask, null, ['employee'])).toBe(false);
      expect(hasTaskAccess(assignedTask, undefined, ['employee'])).toBe(false);
    });
  });

  describe('hasRiskAccess', () => {
    const memberId = 'member-123';
    const assignedRisk = { assigneeId: memberId };
    const unassignedRisk = { assigneeId: 'other-member' };

    it('should return true for privileged roles regardless of assignment', () => {
      expect(hasRiskAccess(unassignedRisk, memberId, ['admin'])).toBe(true);
    });

    it('should return true for restricted role when risk is assigned to them', () => {
      expect(hasRiskAccess(assignedRisk, memberId, ['contractor'])).toBe(true);
    });

    it('should return false for restricted role when risk is assigned to someone else', () => {
      expect(hasRiskAccess(unassignedRisk, memberId, ['contractor'])).toBe(
        false,
      );
    });
  });

  describe('hasControlAccess', () => {
    const memberId = 'member-123';
    const controlWithAssignedTask = {
      tasks: [{ assigneeId: memberId }, { assigneeId: 'other' }],
    };
    const controlWithNoAssignedTasks = {
      tasks: [{ assigneeId: 'other1' }, { assigneeId: 'other2' }],
    };
    const controlWithNoTasks = { tasks: [] };

    it('should return true for privileged roles regardless of task assignments', () => {
      expect(
        hasControlAccess(controlWithNoAssignedTasks, memberId, ['admin']),
      ).toBe(true);
      expect(hasControlAccess(controlWithNoTasks, memberId, ['owner'])).toBe(
        true,
      );
    });

    it('should return true for restricted role when any task is assigned to them', () => {
      expect(
        hasControlAccess(controlWithAssignedTask, memberId, ['employee']),
      ).toBe(true);
    });

    it('should return false for restricted role when no tasks are assigned to them', () => {
      expect(
        hasControlAccess(controlWithNoAssignedTasks, memberId, ['employee']),
      ).toBe(false);
    });

    it('should return false for restricted role when control has no tasks', () => {
      expect(
        hasControlAccess(controlWithNoTasks, memberId, ['employee']),
      ).toBe(false);
    });

    it('should return false for restricted role with no memberId', () => {
      expect(
        hasControlAccess(controlWithAssignedTask, null, ['employee']),
      ).toBe(false);
    });
  });
});

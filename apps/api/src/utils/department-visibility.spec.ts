import { Departments, PolicyVisibility } from '@prisma/client';
import {
  isPrivilegedRole,
  buildPolicyVisibilityFilter,
  canViewPolicy,
} from './department-visibility';

describe('Department Visibility Utilities', () => {
  describe('isPrivilegedRole', () => {
    it('should return false for null roles', () => {
      expect(isPrivilegedRole(null)).toBe(false);
    });

    it('should return false for undefined roles', () => {
      expect(isPrivilegedRole(undefined)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(isPrivilegedRole([])).toBe(false);
    });

    it('should return false for employee role', () => {
      expect(isPrivilegedRole(['employee'])).toBe(false);
    });

    it('should return false for contractor role', () => {
      expect(isPrivilegedRole(['contractor'])).toBe(false);
    });

    it('should return true for owner role', () => {
      expect(isPrivilegedRole(['owner'])).toBe(true);
    });

    it('should return true for admin role', () => {
      expect(isPrivilegedRole(['admin'])).toBe(true);
    });

    it('should return true for auditor role', () => {
      expect(isPrivilegedRole(['auditor'])).toBe(true);
    });

    it('should return true when employee also has admin role', () => {
      expect(isPrivilegedRole(['employee', 'admin'])).toBe(true);
    });
  });

  describe('buildPolicyVisibilityFilter', () => {
    describe('privileged roles', () => {
      it('should return empty filter for admin', () => {
        expect(buildPolicyVisibilityFilter(Departments.it, ['admin'])).toEqual(
          {},
        );
      });

      it('should return empty filter for owner', () => {
        expect(buildPolicyVisibilityFilter(Departments.hr, ['owner'])).toEqual(
          {},
        );
      });

      it('should return empty filter for auditor', () => {
        expect(
          buildPolicyVisibilityFilter(Departments.qms, ['auditor']),
        ).toEqual({});
      });
    });

    describe('restricted roles with department', () => {
      it('should return OR filter for employee with department', () => {
        const filter = buildPolicyVisibilityFilter(Departments.it, [
          'employee',
        ]);
        expect(filter).toEqual({
          OR: [
            { visibility: PolicyVisibility.ALL },
            {
              visibility: PolicyVisibility.DEPARTMENT,
              visibleToDepartments: { has: Departments.it },
            },
          ],
        });
      });

      it('should return OR filter for contractor with department', () => {
        const filter = buildPolicyVisibilityFilter(Departments.hr, [
          'contractor',
        ]);
        expect(filter).toEqual({
          OR: [
            { visibility: PolicyVisibility.ALL },
            {
              visibility: PolicyVisibility.DEPARTMENT,
              visibleToDepartments: { has: Departments.hr },
            },
          ],
        });
      });
    });

    describe('restricted roles without department', () => {
      it('should return ALL-only filter for null department', () => {
        expect(buildPolicyVisibilityFilter(null, ['employee'])).toEqual({
          visibility: PolicyVisibility.ALL,
        });
      });

      it('should return ALL-only filter for undefined department', () => {
        expect(buildPolicyVisibilityFilter(undefined, ['employee'])).toEqual({
          visibility: PolicyVisibility.ALL,
        });
      });

      it('should return ALL-only filter for "none" department', () => {
        expect(
          buildPolicyVisibilityFilter(Departments.none, ['employee']),
        ).toEqual({
          visibility: PolicyVisibility.ALL,
        });
      });
    });

    describe('null/empty roles', () => {
      it('should treat null roles as non-privileged', () => {
        const filter = buildPolicyVisibilityFilter(Departments.it, null);
        expect(filter).toEqual({
          OR: [
            { visibility: PolicyVisibility.ALL },
            {
              visibility: PolicyVisibility.DEPARTMENT,
              visibleToDepartments: { has: Departments.it },
            },
          ],
        });
      });

      it('should treat empty roles as non-privileged', () => {
        const filter = buildPolicyVisibilityFilter(Departments.hr, []);
        expect(filter).toEqual({
          OR: [
            { visibility: PolicyVisibility.ALL },
            {
              visibility: PolicyVisibility.DEPARTMENT,
              visibleToDepartments: { has: Departments.hr },
            },
          ],
        });
      });
    });
  });

  describe('canViewPolicy', () => {
    describe('privileged roles', () => {
      const departmentPolicy = {
        visibility: PolicyVisibility.DEPARTMENT,
        visibleToDepartments: [Departments.gov],
      };

      it('should return true for admin regardless of visibility', () => {
        expect(canViewPolicy(departmentPolicy, Departments.it, ['admin'])).toBe(
          true,
        );
      });

      it('should return true for owner regardless of visibility', () => {
        expect(canViewPolicy(departmentPolicy, null, ['owner'])).toBe(true);
      });
    });

    describe('ALL visibility policies', () => {
      const allPolicy = {
        visibility: PolicyVisibility.ALL,
        visibleToDepartments: [],
      };

      it('should return true for employee', () => {
        expect(canViewPolicy(allPolicy, Departments.it, ['employee'])).toBe(
          true,
        );
      });

      it('should return true for employee with no department', () => {
        expect(canViewPolicy(allPolicy, null, ['employee'])).toBe(true);
      });

      it('should return true for contractor', () => {
        expect(canViewPolicy(allPolicy, Departments.hr, ['contractor'])).toBe(
          true,
        );
      });
    });

    describe('DEPARTMENT visibility policies', () => {
      const itAndHrPolicy = {
        visibility: PolicyVisibility.DEPARTMENT,
        visibleToDepartments: [Departments.it, Departments.hr],
      };

      it('should return true when member department is in visible list', () => {
        expect(
          canViewPolicy(itAndHrPolicy, Departments.it, ['employee']),
        ).toBe(true);
        expect(
          canViewPolicy(itAndHrPolicy, Departments.hr, ['contractor']),
        ).toBe(true);
      });

      it('should return false when member department is not in visible list', () => {
        expect(
          canViewPolicy(itAndHrPolicy, Departments.gov, ['employee']),
        ).toBe(false);
        expect(
          canViewPolicy(itAndHrPolicy, Departments.qms, ['contractor']),
        ).toBe(false);
      });

      it('should return false when member has no department', () => {
        expect(canViewPolicy(itAndHrPolicy, null, ['employee'])).toBe(false);
        expect(canViewPolicy(itAndHrPolicy, undefined, ['employee'])).toBe(
          false,
        );
      });

      it('should return false when member department is "none"', () => {
        expect(
          canViewPolicy(itAndHrPolicy, Departments.none, ['employee']),
        ).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should return false for unknown visibility type', () => {
        const unknownPolicy = {
          visibility: 'UNKNOWN' as PolicyVisibility,
          visibleToDepartments: [],
        };
        expect(
          canViewPolicy(unknownPolicy, Departments.it, ['employee']),
        ).toBe(false);
      });

      it('should handle empty visibleToDepartments array', () => {
        const emptyDeptPolicy = {
          visibility: PolicyVisibility.DEPARTMENT,
          visibleToDepartments: [],
        };
        expect(
          canViewPolicy(emptyDeptPolicy, Departments.it, ['employee']),
        ).toBe(false);
      });
    });
  });
});

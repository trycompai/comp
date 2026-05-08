import { isControlEdited, isTaskEdited, isPolicyEdited } from './framework-drift';

describe('framework-drift', () => {
  describe('isControlEdited', () => {
    it('returns false when instance matches manifest', () => {
      expect(isControlEdited(
        { name: 'Logical Access', description: 'desc' },
        { id: 'c1', name: 'Logical Access', description: 'desc', requirementIds: [], policyIds: [], taskIds: [] },
      )).toBe(false);
    });
    it('returns true when instance name differs', () => {
      expect(isControlEdited(
        { name: 'Access Controls (our name)', description: 'desc' },
        { id: 'c1', name: 'Logical Access', description: 'desc', requirementIds: [], policyIds: [], taskIds: [] },
      )).toBe(true);
    });
    it('returns true when instance description differs', () => {
      expect(isControlEdited(
        { name: 'Logical Access', description: 'our notes' },
        { id: 'c1', name: 'Logical Access', description: 'desc', requirementIds: [], policyIds: [], taskIds: [] },
      )).toBe(true);
    });
  });

  describe('isTaskEdited', () => {
    it('returns false when instance matches manifest', () => {
      expect(isTaskEdited(
        { title: 'Review', description: 'd', frequency: 'yearly', department: 'it' },
        { id: 't1', name: 'Review', description: 'd', frequency: 'yearly', department: 'it' },
      )).toBe(false);
    });
    it('returns true when instance frequency differs', () => {
      expect(isTaskEdited(
        { title: 'Review', description: 'd', frequency: 'quarterly', department: 'it' },
        { id: 't1', name: 'Review', description: 'd', frequency: 'yearly', department: 'it' },
      )).toBe(true);
    });
  });

  describe('isPolicyEdited', () => {
    it('returns false when fields and content match', () => {
      expect(isPolicyEdited(
        { name: 'P', description: 'x', content: [{ a: 1 }], frequency: null, department: null },
        { id: 'p1', name: 'P', description: 'x', content: [{ a: 1 }], frequency: null, department: null },
      )).toBe(false);
    });
    it('returns true when content differs', () => {
      expect(isPolicyEdited(
        { name: 'P', description: 'x', content: [{ a: 2 }], frequency: null, department: null },
        { id: 'p1', name: 'P', description: 'x', content: [{ a: 1 }], frequency: null, department: null },
      )).toBe(true);
    });
  });
});

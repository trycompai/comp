import { describe, expect, it } from 'vitest';
import { auditDetailsSchema, type AuditDetailsFormValues } from './audit-schema';

const base: AuditDetailsFormValues = {
  scope: 'The whole ISMS.',
  criteria: 'ISO/IEC 27001:2022 and the SoA.',
  auditorName: '',
  plannedStartDate: '',
  plannedEndDate: '',
  status: 'planned',
  conclusionVerdict: '',
  conclusionNotes: '',
};

describe('auditDetailsSchema planned-date order', () => {
  it('rejects an end date before the start date', () => {
    const result = auditDetailsSchema.safeParse({
      ...base,
      plannedStartDate: '2026-05-20',
      plannedEndDate: '2026-05-15',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['plannedEndDate']);
    }
  });

  it('accepts an ordered or same-day schedule, and open-ended dates', () => {
    expect(
      auditDetailsSchema.safeParse({
        ...base,
        plannedStartDate: '2026-05-15',
        plannedEndDate: '2026-05-15',
      }).success,
    ).toBe(true);
    expect(
      auditDetailsSchema.safeParse({
        ...base,
        plannedStartDate: '2026-05-15',
        plannedEndDate: '2026-05-20',
      }).success,
    ).toBe(true);
    // Either date may be left unset while planning.
    expect(
      auditDetailsSchema.safeParse({ ...base, plannedEndDate: '2026-05-20' })
        .success,
    ).toBe(true);
  });
});

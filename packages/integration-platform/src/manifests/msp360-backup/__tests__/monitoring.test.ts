import { describe, expect, it } from 'bun:test';
import {
  isBackupPlan,
  isIncompleteStatus,
  isRestorePlan,
  parseMonitoringPayload,
  rowId,
} from '../monitoring';

describe('msp360-backup monitoring helpers', () => {
  it('treats a known list envelope as ok and other objects as malformed', () => {
    expect(parseMonitoringPayload([]).ok).toBe(true);
    expect(parseMonitoringPayload({ data: [] }).ok).toBe(true);
    expect(parseMonitoringPayload({ items: [{ PlanName: 'x' }] }).ok).toBe(true);
    expect(parseMonitoringPayload({ unexpected: true }).ok).toBe(false);
    expect(parseMonitoringPayload(null).ok).toBe(false);
    expect(parseMonitoringPayload('nope').ok).toBe(false);
  });

  it('recognizes SQLResore spelling and restore numeric types before name fallback', () => {
    expect(isRestorePlan({ PlanType: 8, PlanName: 'SQL' })).toBe(true);
    expect(isRestorePlan({ PlanType: 'SQLResore' })).toBe(true);
    expect(isRestorePlan({ PlanType: 4, PlanName: 'Files' })).toBe(true);
    expect(isRestorePlan({ PlanType: 3, PlanName: 'Restore-looking backup' })).toBe(false);
    expect(isBackupPlan({ PlanType: 3, PlanName: 'Restore-looking backup' })).toBe(true);
  });

  it('treats Running and Unknown as incomplete, not failed', () => {
    expect(isIncompleteStatus(3)).toBe(true);
    expect(isIncompleteStatus(4)).toBe(true);
    expect(isIncompleteStatus('running')).toBe(true);
    expect(isIncompleteStatus(0)).toBe(false);
    expect(isIncompleteStatus(2)).toBe(false);
  });

  it('includes the loop index when PlanId is missing so rows do not collide', () => {
    expect(rowId({ ComputerName: 'a', PlanName: 'Files' }, 0)).toBe('a:Files:0');
    expect(rowId({ ComputerName: 'a', PlanName: 'Files' }, 1)).toBe('a:Files:1');
    expect(rowId({ PlanId: 'p1', ComputerName: 'a' }, 9)).toBe('p1');
  });
});

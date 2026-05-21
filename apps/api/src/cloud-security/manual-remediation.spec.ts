import {
  buildManualRemediationPreview,
  isManualRemediation,
} from './manual-remediation';

describe('manual remediation helpers', () => {
  it('detects remediation guidance that starts with the manual marker', () => {
    expect(
      isManualRemediation('[MANUAL] Cannot be auto-fixed. Recreate resource.'),
    ).toBe(true);
    expect(isManualRemediation('Use rds:ModifyDBInstanceCommand')).toBe(false);
    expect(isManualRemediation(null)).toBe(false);
  });

  it('builds a guided-only preview with no executable API calls', () => {
    const preview = buildManualRemediationPreview({
      remediation:
        '[MANUAL] Cannot be auto-fixed. RDS encryption requires snapshot copy and restore.',
      description: 'RDS instance is not encrypted.',
      severity: 'high',
    });

    expect(preview.guidedOnly).toBe(true);
    expect(preview.apiCalls).toEqual([]);
    expect(preview.rollbackSupported).toBe(false);
    expect(preview.risk).toBe('high');
    expect(preview.guidedSteps).toEqual([
      'Cannot be auto-fixed. RDS encryption requires snapshot copy and restore.',
    ]);
  });
});

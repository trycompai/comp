import { describe, expect, test } from 'bun:test';
import { createNativeScanCompletionBinding } from '../completion-binding';

const fixture = {
  sourceIdentity: 'a'.repeat(64),
  organizationId: 'synthetic-org',
  connectionId: 'synthetic-connection',
  runId: 'synthetic-run',
  startedAt: '2026-01-01T00:00:00.000Z',
  credentialRevision: 'synthetic-revision',
  variables: { regions: ['synthetic-region'] },
  configurationMetadata: { awsScanMode: 'comp_scanners' },
  scanMode: 'comp_scanners',
  baselineServices: ['kms'],
  enabledServices: null,
};

describe('task-agnostic cloud scan input binding', () => {
  test('has a stable exact-input digest without a fabricated task association', () => {
    expect(createNativeScanCompletionBinding(fixture)).toMatch(/^[a-f0-9]{64}$/);
    expect(createNativeScanCompletionBinding({ ...fixture })).toBe(
      createNativeScanCompletionBinding(fixture),
    );
  });
  for (const change of [
    { sourceIdentity: 'b'.repeat(64) },
    { connectionId: 'other' },
    { runId: 'other' },
    { organizationId: 'other' },
    { credentialRevision: 'rotated' },
    { startedAt: '2026-01-01T00:00:00.001Z' },
    { variables: { regions: ['added-region'] } },
    { configurationMetadata: { awsScanMode: 'security_hub' } },
    { scanMode: 'security_hub' },
    { baselineServices: ['kms', 'config'] },
    { enabledServices: ['s3'] },
  ]) {
    test(`binds ${Object.keys(change)[0]} to the actual invocation`, () => {
      expect(createNativeScanCompletionBinding({ ...fixture, ...change })).not.toBe(
        createNativeScanCompletionBinding(fixture),
      );
    });
  }
  for (const missing of [
    { sourceIdentity: null },
    { credentialRevision: null },
    { startedAt: 'invalid' },
  ]) {
    test(`keeps invalid ${Object.keys(missing)[0]} unknown`, () => {
      expect(createNativeScanCompletionBinding({ ...fixture, ...missing })).toBeNull();
    });
  }
});

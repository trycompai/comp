import { describe, expect, it } from 'vitest';
import {
  CLOUD_RECONNECT_CUTOFF_ISO_UTC,
  requiresCloudReconnect,
} from './cloud-reconnect-policy';

describe('requiresCloudReconnect', () => {
  it('returns true for cloud connections created before the cutoff date', () => {
    expect(
      requiresCloudReconnect({
        providerId: 'aws',
        createdAt: '2026-04-12T23:59:59.999Z',
        status: 'active',
      }),
    ).toBe(true);
  });

  it('returns false for cloud connections created exactly at the cutoff timestamp', () => {
    expect(
      requiresCloudReconnect({
        providerId: 'aws',
        createdAt: CLOUD_RECONNECT_CUTOFF_ISO_UTC,
        status: 'active',
      }),
    ).toBe(false);
  });

  it('returns true for cloud connections created earlier on the rollout day', () => {
    expect(
      requiresCloudReconnect({
        providerId: 'gcp',
        createdAt: '2026-04-13T15:00:00.000Z',
        status: 'active',
      }),
    ).toBe(true);
  });

  it('returns false for cloud connections created after the cutoff date', () => {
    expect(
      requiresCloudReconnect({
        providerId: 'gcp',
        createdAt: '2026-04-14T00:00:00.000Z',
        status: 'active',
      }),
    ).toBe(false);
  });

  it('returns false for non-cloud providers', () => {
    expect(
      requiresCloudReconnect({
        providerId: 'github',
        createdAt: CLOUD_RECONNECT_CUTOFF_ISO_UTC,
        status: 'active',
      }),
    ).toBe(false);
  });

  it('returns false for invalid dates', () => {
    expect(
      requiresCloudReconnect({
        providerId: 'azure',
        createdAt: 'not-a-date',
        status: 'active',
      }),
    ).toBe(false);
  });

  it('returns true for legacy cloud connections', () => {
    expect(
      requiresCloudReconnect({
        providerId: 'aws',
        isLegacy: true,
        status: 'active',
      }),
    ).toBe(true);
  });

  it('returns false when connection was reconnected after cutoff', () => {
    expect(
      requiresCloudReconnect({
        providerId: 'gcp',
        createdAt: '2026-04-12T12:00:00.000Z',
        reconnectedAt: '2026-04-13T20:00:00.000Z',
        status: 'active',
      }),
    ).toBe(false);
  });

  it('returns true when reconnect marker is before cutoff', () => {
    expect(
      requiresCloudReconnect({
        providerId: 'azure',
        createdAt: '2026-04-10T12:00:00.000Z',
        reconnectedAt: '2026-04-13T17:00:00.000Z',
        status: 'active',
      }),
    ).toBe(true);
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  describeError,
  dispatchOnboardingJobs,
  type OnboardingJobHandle,
} from './dispatch-onboarding-jobs';

const HANDLE: OnboardingJobHandle = { id: 'run_123', publicAccessToken: 'tok_abc' };
const ORG = 'org_test';

/** Mirrors the error thrown by @trigger.dev/sdk when no worker is configured. */
function apiClientMissingError(): Error {
  const err = new Error(
    'You need to set the TRIGGER_SECRET_KEY environment variable.',
  );
  err.name = 'ApiClientMissingError';
  return err;
}

const silent = { warn: () => {} };

describe('dispatchOnboardingJobs', () => {
  it('returns the handle and reports no failures when both jobs dispatch', async () => {
    const fleet = vi.fn().mockResolvedValue({ id: 'run_fleet' });

    const result = await dispatchOnboardingJobs({
      organizationId: ORG,
      triggerOnboardOrganization: () => Promise.resolve(HANDLE),
      triggerCreateFleetLabel: fleet,
      logger: silent,
    });

    expect(result.handle).toEqual(HANDLE);
    expect(result.failed).toEqual([]);
    expect(fleet).toHaveBeenCalledOnce();
  });

  it('does not throw when no Trigger.dev worker is configured', async () => {
    const result = await dispatchOnboardingJobs({
      organizationId: ORG,
      triggerOnboardOrganization: () => Promise.reject(apiClientMissingError()),
      triggerCreateFleetLabel: () => Promise.reject(apiClientMissingError()),
      logger: silent,
    });

    // The regression this guards: onboarding used to surface success: false
    // for an organization that had already been created correctly.
    expect(result.handle).toBeUndefined();
    expect(result.failed).toEqual(['onboard-organization', 'create-fleet-label-for-org']);
  });

  it('still dispatches the fleet label when the enrichment job fails', async () => {
    const fleet = vi.fn().mockResolvedValue(undefined);

    const result = await dispatchOnboardingJobs({
      organizationId: ORG,
      triggerOnboardOrganization: () => Promise.reject(apiClientMissingError()),
      triggerCreateFleetLabel: fleet,
      logger: silent,
    });

    expect(fleet).toHaveBeenCalledOnce();
    expect(result.failed).toEqual(['onboard-organization']);
    expect(result.handle).toBeUndefined();
  });

  it('keeps the handle when only the fleet label fails', async () => {
    const result = await dispatchOnboardingJobs({
      organizationId: ORG,
      triggerOnboardOrganization: () => Promise.resolve(HANDLE),
      triggerCreateFleetLabel: () => Promise.reject(new Error('fleet unavailable')),
      logger: silent,
    });

    expect(result.handle).toEqual(HANDLE);
    expect(result.failed).toEqual(['create-fleet-label-for-org']);
  });

  it('logs each failure with the organization id, without throwing', async () => {
    const warn = vi.fn();

    await dispatchOnboardingJobs({
      organizationId: ORG,
      triggerOnboardOrganization: () => Promise.reject(apiClientMissingError()),
      triggerCreateFleetLabel: () => Promise.reject(new Error('fleet unavailable')),
      logger: { warn },
    });

    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][1]).toMatchObject({ organizationId: ORG });
    expect(warn.mock.calls[0][1].error).toContain('TRIGGER_SECRET_KEY');
    expect(warn.mock.calls[1][1].error).toBe('fleet unavailable');
  });

  it('tolerates a non-Error throwable', async () => {
    const warn = vi.fn();

    const result = await dispatchOnboardingJobs({
      organizationId: ORG,
      // eslint-disable-next-line prefer-promise-reject-errors
      triggerOnboardOrganization: () => Promise.reject('string failure'),
      triggerCreateFleetLabel: () => Promise.resolve(undefined),
      logger: { warn },
    });

    expect(result.failed).toEqual(['onboard-organization']);
    expect(warn.mock.calls[0][1].error).toBe('string failure');
  });
});

describe('describeError', () => {
  it('uses the message for Errors and stringifies anything else', () => {
    expect(describeError(new Error('boom'))).toBe('boom');
    expect(describeError('boom')).toBe('boom');
    expect(describeError(42)).toBe('42');
    expect(describeError(null)).toBe('null');
  });
});

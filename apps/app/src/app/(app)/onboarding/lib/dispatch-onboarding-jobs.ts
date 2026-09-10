/** The parts of a Trigger.dev run handle that onboarding actually uses. */
export interface OnboardingJobHandle {
  id: string;
  publicAccessToken: string;
}

export interface DispatchOnboardingJobsResult {
  /** Present only when the enrichment job was accepted by a worker. */
  handle?: OnboardingJobHandle;
  /** Job names that could not be dispatched, in dispatch order. */
  failed: string[];
}

/**
 * Dispatch the post-onboarding enrichment jobs, tolerating their absence.
 *
 * Both jobs are enrichment, not correctness: by the time this runs the
 * organization, its framework instances and its onboarding record have all
 * been committed. A dispatch failure must therefore never fail onboarding —
 * doing so strands the user on the final step behind an organization that was
 * in fact created successfully.
 *
 * That is not hypothetical. Deployments running without a Trigger.dev worker
 * (a supported configuration for self-hosted installs) got
 * `ApiClientMissingError` from `tasks.trigger`, which propagated out of the
 * action as `success: false`.
 *
 * The two jobs are dispatched independently so one failing does not suppress
 * the other.
 */
export async function dispatchOnboardingJobs({
  organizationId,
  triggerOnboardOrganization,
  triggerCreateFleetLabel,
  logger = console,
}: {
  organizationId: string;
  triggerOnboardOrganization: () => Promise<OnboardingJobHandle>;
  triggerCreateFleetLabel: () => Promise<unknown>;
  logger?: Pick<Console, 'warn'>;
}): Promise<DispatchOnboardingJobsResult> {
  const failed: string[] = [];
  let handle: OnboardingJobHandle | undefined;

  try {
    handle = await triggerOnboardOrganization();
  } catch (error) {
    failed.push('onboard-organization');
    logger.warn(
      '[complete-onboarding] onboard-organization was not dispatched. The organization ' +
        'is complete, but AI enrichment (risks, vendors, tailored policies) will not run.',
      { organizationId, error: describeError(error) },
    );
  }

  try {
    await triggerCreateFleetLabel();
  } catch (error) {
    failed.push('create-fleet-label-for-org');
    logger.warn('[complete-onboarding] create-fleet-label-for-org was not dispatched.', {
      organizationId,
      error: describeError(error),
    });
  }

  return { handle, failed };
}

/** Narrow an unknown throwable to something loggable. */
export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

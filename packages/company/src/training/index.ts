/**
 * Canonical employee-training identifiers and eligibility rules.
 *
 * Training completion has two independent write paths that must stay in
 * agreement:
 *
 *  - `TrainingService.markVideoComplete` (NestJS, RBAC-gated), and
 *  - the portal's `/api/portal/complete-training` route, which authorizes on
 *    session + org membership so employees on custom roles without
 *    `portal:update` can still complete their own training.
 *
 * If the two disagree about which videos exist, or about which orgs may
 * complete HIPAA training, the paths desync — one can create completion
 * records (and trigger certificate artifacts) that the other would reject.
 * Both import from here so there is only one definition to change.
 */

/** Security Awareness Training videos every employee must complete. */
export const GENERAL_TRAINING_VIDEO_IDS = ['sat-1', 'sat-2', 'sat-3', 'sat-4', 'sat-5'] as const;

export type GeneralTrainingVideoId = (typeof GENERAL_TRAINING_VIDEO_IDS)[number];

/** HIPAA Security Awareness Training — gated on the org's HIPAA framework. */
export const HIPAA_TRAINING_ID = 'hipaa-sat-1';

export const ALL_TRAINING_VIDEO_IDS = [...GENERAL_TRAINING_VIDEO_IDS, HIPAA_TRAINING_ID] as const;

export type TrainingVideoId = (typeof ALL_TRAINING_VIDEO_IDS)[number];

export function isTrainingVideoId(videoId: string): videoId is TrainingVideoId {
  return (ALL_TRAINING_VIDEO_IDS as readonly string[]).includes(videoId);
}

/** Framework an organization must have enabled to be offered HIPAA training. */
export const HIPAA_FRAMEWORK_NAME = 'HIPAA';

/** Shared rejection copy so both paths fail identically for ineligible orgs. */
export const HIPAA_TRAINING_UNAVAILABLE_MESSAGE =
  'HIPAA training is not available for this organization';

/**
 * Prisma `where` fragment identifying an org's HIPAA framework instance.
 *
 * Returned as plain data rather than running the query here, so this package
 * stays free of a Prisma client — the API and the portal each hold their own.
 */
export function hipaaFrameworkInstanceWhere(organizationId: string) {
  return {
    organizationId,
    framework: { name: HIPAA_FRAMEWORK_NAME },
  };
}

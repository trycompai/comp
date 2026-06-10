/** Why a per-resource read failed: the real error plus its classification. */
export interface ReadFailure {
  /** "ErrorName: message" — preserved in finding evidence so the failure is diagnosable. */
  error: string;
  /** true for authorization failures (403/AccessDenied); false for transient/network errors. */
  denied: boolean;
  /** true when the region is disabled / not opted in — permanent, re-running won't help. */
  regionDisabled?: boolean;
}

export const TRANSIENT_READ_REMEDIATION =
  'The read failed with the error shown in the evidence — not a missing permission. Re-run the check; if it keeps failing, contact support.';

export const REGION_DISABLED_REMEDIATION =
  "The failing region(s) appear to be disabled or not opted in for this AWS account (see the error in the evidence) — remove them from the connection's regions or enable them in AWS, then re-run the check.";

/**
 * Classify a thrown read error so an "unverified" finding can tell a
 * permissions problem ("grant X to the role") apart from a transient one
 * ("re-run") or a disabled region ("remove the region") — asserting a missing
 * permission for what was actually a transient failure sends customers on a
 * wild-goose IAM audit.
 */
export function toReadFailure(err: unknown): ReadFailure {
  const error =
    err instanceof Error
      ? `${err.name}: ${err.message}`.slice(0, 300)
      : String(err).slice(0, 300);
  const status = (err as { $metadata?: { httpStatusCode?: number } } | null)
    ?.$metadata?.httpStatusCode;
  const denied =
    status === 403 ||
    (err instanceof Error &&
      /AccessDenied|UnauthorizedOperation|Forbidden|NotAuthorized/i.test(
        err.name,
      ));
  // OptInRequired / AuthFailure are what opted-out or disabled regions throw —
  // a permanent condition for this connection, not something a re-run fixes.
  const regionDisabled =
    !denied &&
    err instanceof Error &&
    /OptInRequired|AuthFailure/i.test(err.name);
  return { error, denied, regionDisabled };
}

/**
 * Collapse per-region/per-resource failures into one classification for an
 * aggregate finding: denied wins (the grant hint is actionable), and
 * region-disabled applies only when EVERY failure is one — on mixed causes the
 * transient wording is used so nobody removes a healthy region.
 */
export function combineReadFailures(
  failures: ReadFailure[],
): ReadFailure | undefined {
  if (failures.length === 0) return undefined;
  return {
    error: failures
      .map((f) => f.error)
      .join('; ')
      .slice(0, 600),
    denied: failures.some((f) => f.denied),
    regionDisabled: failures.every((f) => f.regionDisabled === true),
  };
}

/**
 * Remediation for an unverified-read finding: the specific grant hint only
 * when the error really was an authorization failure (or when no failure
 * detail exists — legacy paths); otherwise advice matching the actual cause.
 */
export function remediationForReadFailure(
  failure: ReadFailure | undefined,
  grantRemediation: string,
): string {
  if (!failure || failure.denied) return grantRemediation;
  if (failure.regionDisabled) return REGION_DISABLED_REMEDIATION;
  return TRANSIENT_READ_REMEDIATION;
}

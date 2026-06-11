// HTTP flavor of the AWS read-failure classifier (the generic ReadFailure
// machinery lives in aws/checks/read-failure.ts where it shipped first).
// Used by the Azure and GCP checks, whose ctx.fetch/ctx.post errors are plain
// Errors carrying a `.status` number and an "HTTP <status>: ..." message.
import {
  combineReadFailures,
  remediationForReadFailure,
  type ReadFailure,
} from './aws/checks/read-failure';

export { combineReadFailures, remediationForReadFailure, type ReadFailure };

/**
 * Classify a thrown ctx.fetch/ctx.post error so an "unverified" finding can
 * tell a permissions problem ("grant X") apart from a transient one
 * ("re-run") — asserting a missing permission for what was actually a
 * transient failure sends customers on a wild-goose permissions audit.
 * GCP returns 403 PERMISSION_DENIED; ARM returns 403 AuthorizationFailed.
 */
export function toHttpReadFailure(err: unknown): ReadFailure {
  const error =
    err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300);
  const status = (err as { status?: number } | null)?.status;
  const denied =
    status === 401 ||
    status === 403 ||
    (err instanceof Error &&
      /PERMISSION_DENIED|AuthorizationFailed|Forbidden/i.test(err.message));
  return { error, denied, regionDisabled: false };
}

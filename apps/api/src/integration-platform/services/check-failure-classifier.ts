/**
 * Classifies WHY a dynamic-integration check failed, so the self-heal layer can
 * decide what the customer sees:
 *
 *   - 'compliance'    → the check evaluated fine and returned a real finding
 *                        (customer is genuinely non-compliant). SHOW as a fail.
 *   - 'transient'     → timeout / 5xx / rate-limit. RETRY, show nothing.
 *   - 'customer_side' → their credentials / plan / config. Show "action needed".
 *   - 'our_side'      → our bug / a vendor change we don't handle yet. HIDE the
 *                        red, hand to the agent / open a ticket.
 *
 * Guiding rule (the product guarantee): NEVER blame the customer without positive
 * proof. Any ambiguous EXECUTION failure defaults to 'our_side', and a customer-
 * looking error that is actually failing fleet-wide is treated as 'our_side'.
 *
 * Pure function — no I/O, no secrets. `errorText` MUST be pre-redacted by the caller.
 */

export type FailureClass =
  | 'compliance'
  | 'transient'
  | 'customer_side'
  | 'our_side';

export interface ClassifyInput {
  /** HTTP status the failure carried, if any (e.g. 401, 404, 503). */
  httpStatus?: number | null;
  /** Error message / response-body snippet. MUST already be redacted of secrets. */
  errorText?: string | null;
  /** True if the runtime itself threw (a code error), not a vendor response. */
  threw?: boolean;
  /**
   * Optional fleet signal for the SAME check across the provider's other active
   * connections. Used only to avoid blaming a single customer for a fleet-wide
   * (i.e. our-side) breakage.
   */
  fleet?: { passing: number; failing: number } | null;
}

export interface ClassifyResult {
  class: FailureClass;
  reason: string;
  /** True only for a confirmed customer_side result (safe to ask them to act). */
  customerActionable: boolean;
}

const TRANSIENT_RE =
  /(timeout|timed out|etimedout|econnreset|econnrefused|socket hang up|network error|fetch failed|eai_again|temporarily unavailable|service unavailable|try again)/i;

const CUSTOMER_RE =
  /(invalid api key|invalid token|invalid credentials|unauthorized|authentication failed|access denied|token (has )?expired|expired token|revoked|not entitled|api access is not|no access to the api|upgrade your plan|plan does ?n.?t include|plan does not include|insufficient (permission|scope|privileges))/i;

const OUR_SIDE_RE =
  /(scoped to|org_id is required|not allowed for organization|deprecated|no longer supported|is not a function|cannot read propert|undefined is not|unexpected (token|response|status|end of)|method not allowed|missing_header|malformed)/i;

function make(
  cls: FailureClass,
  reason: string,
  customerActionable = false,
): ClassifyResult {
  return { class: cls, reason, customerActionable };
}

export function classifyCheckFailure(input: ClassifyInput): ClassifyResult {
  const status = input.httpStatus ?? null;
  const text = input.errorText ?? '';
  const fleet = input.fleet ?? null;
  // "Failing for many, passing for none" = almost certainly our bug, not one
  // customer's problem.
  const fleetWide = !!fleet && fleet.failing >= 2 && fleet.passing === 0;

  // 1. A runtime exception in our own code is unambiguously our-side.
  if (input.threw) {
    return make('our_side', 'Runtime error while executing the check.');
  }

  const hasHttpError = status != null && status >= 400;
  const hasErrorText = text.trim().length > 0;

  // 2. No execution-failure signal at all → the check evaluated and returned a
  //    genuine finding. Show it (this is the product working correctly).
  if (!hasHttpError && !hasErrorText) {
    return make('compliance', 'Check evaluated and returned a finding.');
  }

  // 3. Transient — retry, show nothing.
  if (
    status === 408 ||
    status === 425 ||
    status === 429 ||
    (status != null && status >= 500) ||
    TRANSIENT_RE.test(text)
  ) {
    return make('transient', 'Transient network/availability error.');
  }

  // 4. Customer-side — requires a positive signal (hard 401/403 or an explicit
  //    creds/plan message). Even then, if the whole fleet is failing it is ours.
  const customerSignal = status === 401 || status === 403 || CUSTOMER_RE.test(text);
  if (customerSignal) {
    if (fleetWide) {
      return make(
        'our_side',
        'Auth/plan-looking error, but the check is failing fleet-wide → treat as our-side.',
      );
    }
    return make(
      'customer_side',
      'Authentication/authorization/plan issue specific to this connection.',
      true,
    );
  }

  // 5. Known our-side shapes: 4xx on endpoints we should handle, deprecated
  //    endpoints, unhandled response shapes, etc.
  if (
    status === 404 ||
    status === 400 ||
    status === 405 ||
    status === 422 ||
    OUR_SIDE_RE.test(text)
  ) {
    return make(
      'our_side',
      'Endpoint/response our check does not handle (our bug or a vendor change).',
    );
  }

  // 6. Fleet tiebreaker + conservative default: never blame the customer without
  //    proof — any remaining ambiguous execution failure is treated as our-side.
  if (fleetWide) {
    return make('our_side', 'Ambiguous error failing fleet-wide → our-side.');
  }
  return make(
    'our_side',
    'Ambiguous execution failure → defaulting to our-side (never blame the customer without proof).',
  );
}

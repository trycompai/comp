/**
 * Shapes returned by the CybeDefend findings export API.
 *
 * Verified against a live response: the payload is wrapped in a
 * `{ success, data, message }` envelope, and the documented fields live under
 * `data`.
 */

/**
 * Free-form per-finding metadata. Keys present depend on the scanner.
 *
 * Shapes confirmed against live data: `cwe` and `owasp` are arrays, not
 * strings, and `owasp` is frequently empty.
 */
export interface CybeDefendFindingDetails {
  cwe?: string[] | null;
  line?: number | null;
  path?: string | null;
  owasp?: string[] | null;
  branch?: string | null;
  language?: string | null;
  [key: string]: unknown;
}

export interface CybeDefendFinding {
  /** Stable fingerprint. Survives refactors, and is the only reliable identity. */
  id: string;
  title: string;
  description: string;
  remediation: string;
  severity: string;
  status: string;
  finding_type: string;
  project_id: string;
  project_name: string;
  first_detected_at: string | null;
  last_detected_at: string | null;
  triaged_at: string | null;
  resolved_at: string | null;
  triaged_by: string | null;
  triaged_by_type: string | null;
  dismissal_reason: string | null;
  updated_at: string;
  /** Deep link to the vulnerability in the CybeDefend UI. */
  url: string;
  details: CybeDefendFindingDetails;
}

/** The `data` object inside the response envelope. */
export interface CybeDefendFindingsPage {
  findings: CybeDefendFinding[];
  next_cursor: string | null;
  has_more: boolean;
  next_since: string | null;
}

/** The full response envelope. */
export interface CybeDefendResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

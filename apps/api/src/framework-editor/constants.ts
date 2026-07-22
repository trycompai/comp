/**
 * Shared framework-editor DTO limits.
 *
 * Requirement descriptions carry full regulatory control text, which can be very
 * long: NIST SP800-53r5 PL-2 exceeds 6,000 chars and many HITRUST CSF
 * requirements run past 70,000 (FRAME-2). The DB column is unbounded `text`; the
 * only ceiling is API-side `@MaxLength` validation, so this single constant is
 * the source of truth across every requirement-description path (create /
 * update / batch-update / framework import) to keep them from drifting.
 */
export const REQUIREMENT_DESCRIPTION_MAX_LENGTH = 100_000;

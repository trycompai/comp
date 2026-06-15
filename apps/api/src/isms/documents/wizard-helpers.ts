/**
 * Helpers shared across the per-document derivations for consuming ISMS wizard
 * answers (CS-438).
 */

/** Strip the `custom:` prefix the wizard uses for free-text regulator entries. */
export function formatRegulatorLabel(value: string): string {
  return value.startsWith('custom:') ? value.slice('custom:'.length) : value;
}

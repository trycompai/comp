/**
 * Shared by every surface that renders credential fields, so a field hidden on
 * the connect screen cannot reappear in the reconfigure dialog.
 */

export interface ConditionalCredentialField {
  id: string;
  showIf?: { field: string; equals: string };
}

/** An array controlling value never matches: `['dedicated']` is not `'dedicated'`. */
export const isCredentialFieldVisible = (
  field: ConditionalCredentialField,
  values: Record<string, string | string[] | undefined>,
): boolean => {
  if (!field.showIf) return true;

  const controlling = values[field.showIf.field];
  if (typeof controlling !== 'string') return false;

  return controlling === field.showIf.equals;
};

export const visibleCredentialFields = <T extends ConditionalCredentialField>(
  fields: T[],
  values: Record<string, string | string[] | undefined>,
): T[] => fields.filter((field) => isCredentialFieldVisible(field, values));

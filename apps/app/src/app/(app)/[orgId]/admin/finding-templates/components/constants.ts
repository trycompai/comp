/**
 * Finding template categories. The `value`s must match the strings stored in
 * the `FindingTemplate.category` column (and previously managed by the
 * cx-dashboard admin UI): evidence_issue, further_evidence, task_specific,
 * na_incorrect.
 */
export const FINDING_TEMPLATE_CATEGORIES = [
  { value: 'evidence_issue', label: 'Issue with uploaded evidence' },
  { value: 'further_evidence', label: 'Further evidence needed' },
  { value: 'task_specific', label: 'Task-specific issues' },
  { value: 'na_incorrect', label: 'Marked N/A incorrectly' },
] as const;

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  FINDING_TEMPLATE_CATEGORIES.map((category) => [category.value, category.label]),
);

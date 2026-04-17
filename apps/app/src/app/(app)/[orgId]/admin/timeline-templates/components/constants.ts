export const COMPLETION_OPTIONS = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'AUTO_TASKS', label: 'Auto (Tasks)' },
  { value: 'AUTO_POLICIES', label: 'Auto (Policies)' },
  { value: 'AUTO_PEOPLE', label: 'Auto (People)' },
  { value: 'AUTO_FINDINGS', label: 'Auto (Findings)' },
  { value: 'AUTO_UPLOAD', label: 'Auto (Upload)' },
] as const;

export type CompletionType = (typeof COMPLETION_OPTIONS)[number]['value'];

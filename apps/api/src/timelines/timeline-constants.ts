export const COMPLETION_TYPES = [
  'AUTO_TASKS',
  'AUTO_POLICIES',
  'AUTO_PEOPLE',
  'AUTO_FINDINGS',
  'AUTO_UPLOAD',
  'MANUAL',
] as const;

export type CompletionType = (typeof COMPLETION_TYPES)[number];

import { z } from 'zod';

export const evidenceFormTypeSchema = z.enum([
  'board-meeting',
  'it-leadership-meeting',
  'risk-committee-meeting',
  'access-request',
  'whistleblower-report',
  'penetration-test',
  'rbac-matrix',
  'infrastructure-inventory',
  'employee-performance-evaluation',
]);

export type EvidenceFormType = z.infer<typeof evidenceFormTypeSchema>;

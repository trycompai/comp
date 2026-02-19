import { z } from 'zod';

export const evidenceFormTypeSchema = z.enum([
  'board-meeting',
  'it-leadership-meeting',
  'risk-committee-meeting',
  'meeting',
  'access-request',
  'whistleblower-report',
  'penetration-test',
  'rbac-matrix',
  'infrastructure-inventory',
  'employee-performance-evaluation',
  'network-diagram',
  'tabletop-exercise',
]);

export type EvidenceFormType = z.infer<typeof evidenceFormTypeSchema>;

export const meetingSubTypes = [
  { label: 'Board Meeting', value: 'board-meeting' as const },
  { label: 'IT Leadership Meeting', value: 'it-leadership-meeting' as const },
  { label: 'Risk Committee Meeting', value: 'risk-committee-meeting' as const },
] as const;

export type MeetingSubType = (typeof meetingSubTypes)[number]['value'];

export const meetingSubTypeValues: MeetingSubType[] = meetingSubTypes.map((m) => m.value);

import { z } from 'zod';
import { evidenceFormFileSchema } from './file-schema';
import type { EvidenceFormType } from './form-types';

const required = (label?: string) => {
  const msg = label ? `${label} is required` : 'This field is required';
  return z.string({ error: msg }).min(1, msg);
};

const requiredTrimmed = (label?: string) => {
  const msg = label ? `${label} is required` : 'This field is required';
  return z.string({ error: msg }).trim().min(1, msg);
};

const meetingDataSchema = z.object({
  submissionDate: required('Submission date'),
  attendees: required('Attendees'),
  date: required('Meeting date'),
  meetingMinutes: required('Meeting minutes'),
  meetingMinutesApprovedBy: required('Approved by'),
  approvedDate: required('Approved date'),
});

const accessRequestDataSchema = z.object({
  submissionDate: required('Submission date'),
  userName: required('User name'),
  accountsNeeded: required('Accounts needed'),
  permissionsNeeded: z.enum(['read', 'write', 'admin'], {
    error: 'Please select a permissions level',
  }),
  reasonForRequest: required('Reason for request'),
  accessGrantedBy: required('Access granted by'),
  dateAccessGranted: required('Date access granted'),
});

const whistleblowerReportDataSchema = z.object({
  submissionDate: required('Submission date'),
  incidentDate: required('Incident date'),
  complaintDetails: required('Complaint details'),
  individualsInvolved: required('Individuals involved'),
  evidence: required('Evidence'),
  evidenceFile: evidenceFormFileSchema.optional(),
});

const penetrationTestDataSchema = z.object({
  submissionDate: required('Submission date'),
  testDate: required('Test date'),
  vendorName: required('Vendor name'),
  summary: required('Summary of findings'),
  pentestReport: evidenceFormFileSchema,
});

const rbacMatrixRowSchema = z.object({
  system: requiredTrimmed('System'),
  roleName: requiredTrimmed('Role name'),
  permissionsScope: requiredTrimmed('Permissions / Scope'),
  approvedBy: requiredTrimmed('Approved by'),
  lastReviewed: requiredTrimmed('Last reviewed'),
});

const rbacMatrixDataSchema = z.object({
  submissionDate: required('Submission date'),
  matrixRows: z.array(rbacMatrixRowSchema).min(1, 'At least one RBAC entry is required'),
});

const infrastructureInventoryRowSchema = z.object({
  assetId: requiredTrimmed('Asset ID'),
  systemType: requiredTrimmed('System type'),
  environment: requiredTrimmed('Environment'),
  location: z.string().trim().optional(),
  assignedOwner: requiredTrimmed('Assigned owner'),
  lastReviewed: requiredTrimmed('Last reviewed'),
});

const infrastructureInventoryDataSchema = z.object({
  submissionDate: required('Submission date'),
  inventoryRows: z
    .array(infrastructureInventoryRowSchema)
    .min(1, 'At least one infrastructure asset is required'),
});

const employeePerformanceEvaluationDataSchema = z.object({
  submissionDate: required('Submission date'),
  employeeName: requiredTrimmed('Employee name'),
  manager: requiredTrimmed('Manager'),
  reviewPeriodTo: required('Review period end date'),
  overallRating: z.enum(['needs-improvement', 'meets-expectations', 'exceeds-expectations'], {
    error: 'Please select an overall rating',
  }),
  managerComments: requiredTrimmed('Manager comments'),
  managerSignature: requiredTrimmed('Manager signature'),
  managerSignatureDate: required('Manager signature date'),
});

const networkDiagramDataSchema = z
  .object({
    submissionDate: required('Submission date'),
    diagramUrl: z.string().trim().optional(),
    diagramFile: evidenceFormFileSchema.optional(),
  })
  .refine((data) => (data.diagramUrl && data.diagramUrl.length > 0) || data.diagramFile, {
    message: 'Provide either a link to the diagram or upload a file',
    path: ['diagramFile'],
  });

const tabletopExerciseAttendeeRowSchema = z.object({
  name: requiredTrimmed('Name'),
  roleTitle: requiredTrimmed('Role / Title'),
  department: requiredTrimmed('Department'),
});

const tabletopExerciseActionItemRowSchema = z.object({
  finding: requiredTrimmed('Finding'),
  improvementAction: requiredTrimmed('Improvement action'),
  assignedOwner: requiredTrimmed('Assigned owner'),
  dueDate: requiredTrimmed('Due date'),
});

const tabletopExerciseDataSchema = z.object({
  submissionDate: required('Submission date'),
  exerciseDate: required('Exercise date'),
  facilitator: requiredTrimmed('Facilitator'),
  scenarioType: z.enum(
    [
      'data-breach',
      'ransomware',
      'insider-threat',
      'phishing',
      'ddos',
      'third-party-breach',
      'natural-disaster',
      'custom',
    ],
    { error: 'Please select a scenario type' },
  ),
  scenarioDescription: required('Scenario description'),
  attendees: z.array(tabletopExerciseAttendeeRowSchema).min(1, 'At least one attendee is required'),
  sessionNotes: required('Session notes'),
  actionItems: z
    .array(tabletopExerciseActionItemRowSchema)
    .min(1, 'At least one after-action finding is required'),
  evidenceFile: evidenceFormFileSchema.optional(),
});

export const evidenceFormSubmissionSchemaMap = {
  meeting: meetingDataSchema,
  'board-meeting': meetingDataSchema,
  'it-leadership-meeting': meetingDataSchema,
  'risk-committee-meeting': meetingDataSchema,
  'access-request': accessRequestDataSchema,
  'whistleblower-report': whistleblowerReportDataSchema,
  'penetration-test': penetrationTestDataSchema,
  'rbac-matrix': rbacMatrixDataSchema,
  'infrastructure-inventory': infrastructureInventoryDataSchema,
  'employee-performance-evaluation': employeePerformanceEvaluationDataSchema,
  'network-diagram': networkDiagramDataSchema,
  'tabletop-exercise': tabletopExerciseDataSchema,
} as const satisfies Record<EvidenceFormType, z.ZodTypeAny>;

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

// Lenient row schema — accepts empty strings so the default empty row
// doesn't block Zod parsing before the superRefine can check for a file.
const rbacMatrixRowSchemaLenient = z.object({
  system: z.string().default(''),
  roleName: z.string().default(''),
  permissionsScope: z.string().default(''),
  approvedBy: z.string().default(''),
  lastReviewed: z.string().default(''),
});

const rbacMatrixDataSchema = z
  .object({
    submissionDate: required('Submission date'),
    matrixRows: z.array(rbacMatrixRowSchemaLenient).optional(),
    matrixFile: evidenceFormFileSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.matrixFile) return;

    const rows = data.matrixRows ?? [];
    const isRowEmpty = (row: Record<string, string>) =>
      Object.values(row).every((v) => v.trim().length === 0);

    const hasFilledRow = rows.some((row) => !isRowEmpty(row));
    if (!hasFilledRow) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter at least one RBAC row or upload a spreadsheet',
        path: ['matrixRows'],
      });
      return;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || isRowEmpty(row)) continue;
      const result = rbacMatrixRowSchema.safeParse(row);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({
            ...issue,
            path: ['matrixRows', i, ...issue.path],
          });
        }
      }
    }
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

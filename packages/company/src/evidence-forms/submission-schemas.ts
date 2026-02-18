import { z } from 'zod';
import { evidenceFormFileSchema } from './file-schema';
import type { EvidenceFormType } from './form-types';

const meetingDataSchema = z.object({
  submissionDate: z.string().min(1),
  attendees: z.string().min(1),
  date: z.string().min(1),
  meetingMinutes: z.string().min(1),
  meetingMinutesApprovedBy: z.string().min(1),
  approvedDate: z.string().min(1),
});

const accessRequestDataSchema = z.object({
  submissionDate: z.string().min(1),
  userName: z.string().min(1),
  accountsNeeded: z.string().min(1),
  permissionsNeeded: z.enum(['read', 'write', 'admin']),
  reasonForRequest: z.string().min(1),
  accessGrantedBy: z.string().min(1),
  dateAccessGranted: z.string().min(1),
});

const whistleblowerReportDataSchema = z.object({
  submissionDate: z.string().min(1),
  incidentDate: z.string().min(1),
  complaintDetails: z.string().min(1),
  individualsInvolved: z.string().min(1),
  evidence: z.string().min(1),
  evidenceFile: evidenceFormFileSchema.optional(),
});

const penetrationTestDataSchema = z.object({
  submissionDate: z.string().min(1),
  testDate: z.string().min(1),
  vendorName: z.string().min(1),
  summary: z.string().min(1),
  pentestReport: evidenceFormFileSchema,
});

const rbacMatrixRowSchema = z.object({
  system: z.string().trim().min(1),
  roleName: z.string().trim().min(1),
  permissionsScope: z.string().trim().min(1),
  approvedBy: z.string().trim().min(1),
  lastReviewed: z.string().trim().min(1),
});

const rbacMatrixDataSchema = z.object({
  submissionDate: z.string().min(1),
  matrixRows: z.array(rbacMatrixRowSchema).min(1),
});

const infrastructureInventoryRowSchema = z.object({
  assetId: z.string().trim().min(1),
  systemType: z.string().trim().min(1),
  environment: z.string().trim().min(1),
  location: z.string().trim().optional(),
  assignedOwner: z.string().trim().min(1),
  lastReviewed: z.string().trim().min(1),
});

const infrastructureInventoryDataSchema = z.object({
  submissionDate: z.string().min(1),
  inventoryRows: z.array(infrastructureInventoryRowSchema).min(1),
});

const employeePerformanceEvaluationDataSchema = z.object({
  submissionDate: z.string().min(1),
  employeeName: z.string().trim().min(1),
  manager: z.string().trim().min(1),
  reviewPeriodTo: z.string().min(1),
  overallRating: z.enum(['needs-improvement', 'meets-expectations', 'exceeds-expectations']),
  managerComments: z.string().trim().min(1),
  managerSignature: z.string().trim().min(1),
  managerSignatureDate: z.string().min(1),
});

export const evidenceFormSubmissionSchemaMap = {
  'board-meeting': meetingDataSchema,
  'it-leadership-meeting': meetingDataSchema,
  'risk-committee-meeting': meetingDataSchema,
  'access-request': accessRequestDataSchema,
  'whistleblower-report': whistleblowerReportDataSchema,
  'penetration-test': penetrationTestDataSchema,
  'rbac-matrix': rbacMatrixDataSchema,
  'infrastructure-inventory': infrastructureInventoryDataSchema,
  'employee-performance-evaluation': employeePerformanceEvaluationDataSchema,
} as const satisfies Record<EvidenceFormType, z.ZodTypeAny>;

import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import type { IsmsContextIssueService } from '../isms-context-issue.service';
import type { IsmsInterestedPartyService } from '../isms-interested-party.service';
import type { IsmsObjectiveService } from '../isms-objective.service';
import type { IsmsRequirementService } from '../isms-requirement.service';
import type { IsmsRoleService } from '../isms-role.service';
import type { IsmsRoleAssignmentService } from '../isms-role-assignment.service';
import type { IsmsMetricService } from '../isms-metric.service';
import type { IsmsMeasurementService } from '../isms-measurement.service';
import type { IsmsAuditService } from '../isms-audit.service';
import type { IsmsAuditControlService } from '../isms-audit-control.service';
import type { IsmsAuditFindingService } from '../isms-audit-finding.service';
import type { IsmsManagementReviewService } from '../isms-management-review.service';
import type { IsmsReviewInputService } from '../isms-review-input.service';
import type { IsmsReviewActionService } from '../isms-review-action.service';
import { reviewAttendeeSchema } from '../documents/management-review';

/**
 * One generic dispatch for every ISMS register row (context issues, interested
 * parties, requirements, objectives). The controller exposes three endpoints —
 * create / update / delete — and routes by the `:register` path segment to the
 * matching service here. Bodies are validated with zod off `req.body` (the
 * global ValidationPipe mangles nested JSON), per-register schemas mirroring the
 * original DTOs. This replaces the 13 near-identical per-register endpoints.
 */

const position = z.number().int().min(0).optional();
const OBJECTIVE_STATUS = ['not_started', 'on_track', 'at_risk', 'met'] as const;
const AUDIT_ROUTE = ['in_house', 'external', 'training_planned'] as const;
const COMPETENCE_BASIS = [
  'education',
  'training',
  'experience',
  'combination',
] as const;
const METRIC_CADENCE = ['monthly', 'quarterly'] as const;
const AUDIT_STATUS = ['planned', 'in_progress', 'complete'] as const;
const AUDIT_CONCLUSION_VERDICT = [
  'conform',
  'substantially_conform',
  'not_yet_conform',
] as const;
const AUDIT_CONTROL_RESULT = [
  'conformity_confirmed',
  'nonconformity_raised',
  'observation_raised',
  'not_sampled',
] as const;
const AUDIT_FINDING_TYPE = ['nc_major', 'nc_minor', 'ofi', 'observation'] as const;
const AUDIT_FINDING_STATUS = ['open', 'in_progress', 'closed'] as const;
const REVIEW_STATUS = ['planned', 'in_progress', 'complete'] as const;
const REVIEW_CONCLUSION_VERDICT = ['suitable', 'adequate', 'effective'] as const;
const REVIEW_ACTION_STATUS = ['open', 'in_progress', 'closed'] as const;

const schemas = {
  contextIssueCreate: z.object({
    kind: z.enum(['internal', 'external']),
    category: z.string().optional(),
    description: z.string(),
    effect: z.string(),
    position,
  }),
  contextIssueUpdate: z.object({
    kind: z.enum(['internal', 'external']).optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    effect: z.string().optional(),
    position,
  }),
  interestedPartyCreate: z.object({
    name: z.string(),
    category: z.string(),
    needsExpectations: z.string(),
    position,
  }),
  interestedPartyUpdate: z.object({
    name: z.string().optional(),
    category: z.string().optional(),
    needsExpectations: z.string().optional(),
    position,
  }),
  requirementCreate: z.object({
    // Nullish: the UI sends null for an unlinked requirement, and the service
    // treats null/empty as "no linked party" (see IsmsRequirementService).
    interestedPartyId: z.string().nullish(),
    partyName: z.string(),
    requirement: z.string(),
    treatment: z.string(),
    position,
  }),
  requirementUpdate: z.object({
    // Nullish, not optional: undefined = leave the link as-is, null = clear it.
    // The service relies on this three-state contract.
    interestedPartyId: z.string().nullish(),
    partyName: z.string().optional(),
    requirement: z.string().optional(),
    treatment: z.string().optional(),
    position,
  }),
  objectiveCreate: z.object({
    objective: z.string(),
    target: z.string().optional(),
    ownerMemberId: z.string().optional(),
    cadence: z.string().optional(),
    plan: z.string().optional(),
    measurementMethod: z.string().optional(),
    status: z.enum(OBJECTIVE_STATUS).optional(),
    position,
  }),
  objectiveUpdate: z.object({
    objective: z.string().optional(),
    target: z.string().optional(),
    ownerMemberId: z.string().optional(),
    cadence: z.string().optional(),
    plan: z.string().optional(),
    measurementMethod: z.string().optional(),
    status: z.enum(OBJECTIVE_STATUS).optional(),
    position,
  }),
  roleCreate: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    responsibilities: z.string().optional(),
    authorities: z.string().optional(),
    authorityGrantedBy: z.string().optional(),
    requiredCompetence: z.string().optional(),
    position,
  }),
  roleUpdate: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    responsibilities: z.string().optional(),
    authorities: z.string().optional(),
    authorityGrantedBy: z.string().optional(),
    requiredCompetence: z.string().optional(),
    // Internal Auditor route. Nullish: undefined = leave as-is, null = clear.
    auditRoute: z.enum(AUDIT_ROUTE).nullish(),
    auditRouteMemberId: z.string().nullish(),
    auditFirmName: z.string().nullish(),
    auditEvidenceRef: z.string().nullish(),
    auditCourse: z.string().nullish(),
    auditDueDate: z.string().nullish(), // ISO date string
    position,
  }),
  roleAssignmentCreate: z.object({
    roleId: z.string(),
    memberId: z.string(),
    basisOfCompetence: z.enum(COMPETENCE_BASIS).nullish(),
    evidenceRetained: z.string().nullish(),
    gap: z.string().nullish(),
    remediationAction: z.string().nullish(),
    remediationDueDate: z.string().nullish(),
    position,
  }),
  roleAssignmentUpdate: z.object({
    basisOfCompetence: z.enum(COMPETENCE_BASIS).nullish(),
    evidenceRetained: z.string().nullish(),
    gap: z.string().nullish(),
    remediationAction: z.string().nullish(),
    remediationDueDate: z.string().nullish(),
    position,
  }),
  metricCreate: z.object({
    name: z.string().min(1),
    whatIsMeasured: z.string().optional(),
    method: z.string().optional(),
    // Nullish: a custom metric can be drafted without a cadence; the clause-9.1
    // submit gate requires one on every active metric.
    cadence: z.enum(METRIC_CADENCE).nullish(),
    monitorMemberId: z.string().nullish(),
    analyzeMemberId: z.string().nullish(),
    target: z.string().nullish(),
    objectiveId: z.string().nullish(),
    isActive: z.boolean().optional(),
    position,
  }),
  metricUpdate: z.object({
    name: z.string().min(1).optional(),
    whatIsMeasured: z.string().optional(),
    method: z.string().optional(),
    // Nullish: undefined = leave as-is, null = clear.
    cadence: z.enum(METRIC_CADENCE).nullish(),
    monitorMemberId: z.string().nullish(),
    analyzeMemberId: z.string().nullish(),
    target: z.string().nullish(),
    objectiveId: z.string().nullish(),
    isActive: z.boolean().optional(),
    position,
  }),
  measurementCreate: z.object({
    metricId: z.string(),
    periodStart: z.string(), // 'YYYY-MM-DD'; cadence alignment checked by the service
    value: z.string().trim().min(1),
    note: z.string().nullish(),
  }),
  // recordedAt / enteredById / source are server-set and immutable by design.
  measurementUpdate: z.object({
    periodStart: z.string().optional(),
    value: z.string().trim().min(1).optional(),
    note: z.string().nullish(),
  }),
  // reference is server-generated ("IA-YYYY-NN") and immutable; scope/criteria
  // default to the clause-9.2 template text when omitted or blank.
  auditCreate: z.object({
    scope: z.string().optional(),
    criteria: z.string().optional(),
    auditorName: z.string().nullish(),
    plannedStartDate: z.string().nullish(), // ISO date string
    plannedEndDate: z.string().nullish(),
    position,
  }),
  auditUpdate: z.object({
    scope: z.string().trim().min(1).optional(),
    criteria: z.string().trim().min(1).optional(),
    // Nullish: undefined = leave as-is, null = clear.
    auditorName: z.string().nullish(),
    plannedStartDate: z.string().nullish(),
    plannedEndDate: z.string().nullish(),
    status: z.enum(AUDIT_STATUS).optional(),
    conclusionVerdict: z.enum(AUDIT_CONCLUSION_VERDICT).nullish(),
    conclusionNotes: z.string().nullish(),
    // Sign-off slots: free-text names + ISO dates, each independently clearable.
    signoffAuditorName: z.string().nullish(),
    signoffAuditorDate: z.string().nullish(),
    signoffSpoName: z.string().nullish(),
    signoffSpoDate: z.string().nullish(),
    signoffTopMgmtName: z.string().nullish(),
    signoffTopMgmtDate: z.string().nullish(),
    position,
  }),
  auditControlCreate: z.object({
    auditId: z.string(),
    controlRef: z.string().trim().min(1),
    whatWasTested: z.string().optional(),
    whereToFind: z.string().optional(),
    // Nullish: a row can be drafted before the auditor records an outcome.
    result: z.enum(AUDIT_CONTROL_RESULT).nullish(),
    notes: z.string().nullish(),
    position,
  }),
  auditControlUpdate: z.object({
    controlRef: z.string().trim().min(1).optional(),
    whatWasTested: z.string().optional(),
    whereToFind: z.string().optional(),
    result: z.enum(AUDIT_CONTROL_RESULT).nullish(),
    notes: z.string().nullish(),
    position,
  }),
  // reference is server-generated ("F-NN") and immutable.
  auditFindingCreate: z.object({
    auditId: z.string(),
    type: z.enum(AUDIT_FINDING_TYPE),
    // Nullish: null/absent = a standalone finding not tied to a control row.
    controlId: z.string().nullish(),
    clauseOrControl: z.string().nullish(),
    description: z.string().trim().min(1),
    ownerMemberId: z.string().nullish(),
    dueDate: z.string().nullish(), // ISO date string
    status: z.enum(AUDIT_FINDING_STATUS).optional(),
    closureEvidence: z.string().nullish(),
    position,
  }),
  auditFindingUpdate: z.object({
    type: z.enum(AUDIT_FINDING_TYPE).optional(),
    controlId: z.string().nullish(),
    clauseOrControl: z.string().nullish(),
    description: z.string().trim().min(1).optional(),
    ownerMemberId: z.string().nullish(),
    dueDate: z.string().nullish(),
    status: z.enum(AUDIT_FINDING_STATUS).optional(),
    closureEvidence: z.string().nullish(),
    position,
  }),
  // reference ("MR-YYYY-NN") and recordedAt are server-generated and immutable;
  // chair/attendees default to the Roles (5.3) Top Management + SPO holders and
  // the outputs default to the clause-9.3 template text when omitted.
  reviewCreate: z.object({
    meetingDate: z.string().nullish(), // ISO date string
    chairName: z.string().nullish(),
    attendees: z.array(reviewAttendeeSchema).optional(),
    position,
  }),
  reviewUpdate: z.object({
    // Nullish: undefined = leave as-is, null = clear.
    meetingDate: z.string().nullish(),
    chairName: z.string().nullish(),
    attendees: z.array(reviewAttendeeSchema).optional(),
    status: z.enum(REVIEW_STATUS).optional(),
    conclusionVerdict: z.enum(REVIEW_CONCLUSION_VERDICT).nullish(),
    conclusionNotes: z.string().nullish(),
    decisionsText: z.string().nullish(),
    changesText: z.string().nullish(),
    // Single sign-off slot: free-text chair name + ISO date, each clearable.
    signoffChairName: z.string().nullish(),
    signoffChairDate: z.string().nullish(),
    position,
  }),
  reviewInputCreate: z.object({
    reviewId: z.string(),
    inputRef: z.string().trim().min(1),
    whatItCovers: z.string().optional(),
    whereToFind: z.string().optional(),
    discussionNotes: z.string().nullish(),
    discussed: z.boolean().optional(),
    position,
  }),
  reviewInputUpdate: z.object({
    inputRef: z.string().trim().min(1).optional(),
    whatItCovers: z.string().optional(),
    whereToFind: z.string().optional(),
    discussionNotes: z.string().nullish(),
    discussed: z.boolean().optional(),
    position,
  }),
  // reference is server-generated ("A01", shown as "MR-YYYY-NN-A01") and immutable.
  reviewActionCreate: z.object({
    reviewId: z.string(),
    description: z.string().trim().min(1),
    ownerMemberId: z.string().nullish(),
    dueDate: z.string().nullish(), // ISO date string
    status: z.enum(REVIEW_ACTION_STATUS).optional(),
    position,
  }),
  reviewActionUpdate: z.object({
    description: z.string().trim().min(1).optional(),
    ownerMemberId: z.string().nullish(),
    dueDate: z.string().nullish(),
    status: z.enum(REVIEW_ACTION_STATUS).optional(),
    position,
  }),
} as const;

/** One-save payload for the "Metrics due" / backfill views. */
export const measurementBulkCreateSchema = z.object({
  measurements: z
    .array(schemas.measurementCreate)
    .min(1)
    .max(200), // a backfill save is bounded by the missing-period cap per metric
});

// Inferred input types — the single source of truth for register row shapes.
// Service method signatures use these directly; the per-register DTO classes were
// removed because they only duplicated these schemas.
export type CreateContextIssueInput = z.infer<typeof schemas.contextIssueCreate>;
export type UpdateContextIssueInput = z.infer<typeof schemas.contextIssueUpdate>;
export type CreateInterestedPartyInput = z.infer<
  typeof schemas.interestedPartyCreate
>;
export type UpdateInterestedPartyInput = z.infer<
  typeof schemas.interestedPartyUpdate
>;
export type CreateRequirementInput = z.infer<typeof schemas.requirementCreate>;
export type UpdateRequirementInput = z.infer<typeof schemas.requirementUpdate>;
export type CreateObjectiveInput = z.infer<typeof schemas.objectiveCreate>;
export type UpdateObjectiveInput = z.infer<typeof schemas.objectiveUpdate>;
export type CreateRoleInput = z.infer<typeof schemas.roleCreate>;
export type UpdateRoleInput = z.infer<typeof schemas.roleUpdate>;
export type CreateRoleAssignmentInput = z.infer<
  typeof schemas.roleAssignmentCreate
>;
export type UpdateRoleAssignmentInput = z.infer<
  typeof schemas.roleAssignmentUpdate
>;
export type CreateMetricInput = z.infer<typeof schemas.metricCreate>;
export type UpdateMetricInput = z.infer<typeof schemas.metricUpdate>;
export type CreateMeasurementInput = z.infer<typeof schemas.measurementCreate>;
export type UpdateMeasurementInput = z.infer<typeof schemas.measurementUpdate>;
export type BulkCreateMeasurementInput = z.infer<
  typeof measurementBulkCreateSchema
>;
export type CreateAuditInput = z.infer<typeof schemas.auditCreate>;
export type UpdateAuditInput = z.infer<typeof schemas.auditUpdate>;
export type CreateAuditControlInput = z.infer<
  typeof schemas.auditControlCreate
>;
export type UpdateAuditControlInput = z.infer<
  typeof schemas.auditControlUpdate
>;
export type CreateAuditFindingInput = z.infer<
  typeof schemas.auditFindingCreate
>;
export type UpdateAuditFindingInput = z.infer<
  typeof schemas.auditFindingUpdate
>;
export type CreateReviewInput = z.infer<typeof schemas.reviewCreate>;
export type UpdateReviewInput = z.infer<typeof schemas.reviewUpdate>;
export type CreateReviewInputInput = z.infer<
  typeof schemas.reviewInputCreate
>;
export type UpdateReviewInputInput = z.infer<
  typeof schemas.reviewInputUpdate
>;
export type CreateReviewActionInput = z.infer<
  typeof schemas.reviewActionCreate
>;
export type UpdateReviewActionInput = z.infer<
  typeof schemas.reviewActionUpdate
>;

export const ISMS_REGISTER_KEYS = [
  'context-issues',
  'interested-parties',
  'requirements',
  'objectives',
  'roles',
  'role-assignments',
  'metrics',
  'measurements',
  'audits',
  'audit-controls',
  'audit-findings',
  'reviews',
  'review-inputs',
  'review-actions',
] as const;

export type IsmsRegisterKey = (typeof ISMS_REGISTER_KEYS)[number];

export interface RegisterHandler {
  create(args: {
    documentId: string;
    organizationId: string;
    data: unknown;
    /** The caller's member id (session auth only). Measurements record it as enteredById. */
    memberId?: string | null;
  }): Promise<unknown>;
  update(args: {
    rowId: string;
    organizationId: string;
    data: unknown;
  }): Promise<unknown>;
  remove(args: { rowId: string; organizationId: string }): Promise<unknown>;
}

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ');
    throw new BadRequestException(`Invalid register row: ${detail}`);
  }
  return result.data;
}

export interface RegisterServices {
  contextIssues: IsmsContextIssueService;
  interestedParties: IsmsInterestedPartyService;
  requirements: IsmsRequirementService;
  objectives: IsmsObjectiveService;
  roles: IsmsRoleService;
  roleAssignments: IsmsRoleAssignmentService;
  metrics: IsmsMetricService;
  measurements: IsmsMeasurementService;
  audits: IsmsAuditService;
  auditControls: IsmsAuditControlService;
  auditFindings: IsmsAuditFindingService;
  reviews: IsmsManagementReviewService;
  reviewInputs: IsmsReviewInputService;
  reviewActions: IsmsReviewActionService;
}

/** Build the register → handler map from the injected per-register services. */
export function createRegisterRegistry(
  services: RegisterServices,
): Record<IsmsRegisterKey, RegisterHandler> {
  return {
    'context-issues': {
      create: ({ documentId, organizationId, data }) =>
        services.contextIssues.create({
          documentId,
          organizationId,
          dto: parse(schemas.contextIssueCreate, data),
        }),
      update: ({ rowId, organizationId, data }) =>
        services.contextIssues.update({
          issueId: rowId,
          organizationId,
          dto: parse(schemas.contextIssueUpdate, data),
        }),
      remove: ({ rowId, organizationId }) =>
        services.contextIssues.remove({ issueId: rowId, organizationId }),
    },
    'interested-parties': {
      create: ({ documentId, organizationId, data }) =>
        services.interestedParties.create({
          documentId,
          organizationId,
          dto: parse(schemas.interestedPartyCreate, data),
        }),
      update: ({ rowId, organizationId, data }) =>
        services.interestedParties.update({
          partyId: rowId,
          organizationId,
          dto: parse(schemas.interestedPartyUpdate, data),
        }),
      remove: ({ rowId, organizationId }) =>
        services.interestedParties.remove({ partyId: rowId, organizationId }),
    },
    requirements: {
      create: ({ documentId, organizationId, data }) =>
        services.requirements.create({
          documentId,
          organizationId,
          dto: parse(schemas.requirementCreate, data),
        }),
      update: ({ rowId, organizationId, data }) =>
        services.requirements.update({
          requirementId: rowId,
          organizationId,
          dto: parse(schemas.requirementUpdate, data),
        }),
      remove: ({ rowId, organizationId }) =>
        services.requirements.remove({ requirementId: rowId, organizationId }),
    },
    objectives: {
      create: ({ documentId, organizationId, data }) =>
        services.objectives.create({
          documentId,
          organizationId,
          dto: parse(schemas.objectiveCreate, data),
        }),
      update: ({ rowId, organizationId, data }) =>
        services.objectives.update({
          objectiveId: rowId,
          organizationId,
          dto: parse(schemas.objectiveUpdate, data),
        }),
      remove: ({ rowId, organizationId }) =>
        services.objectives.remove({ objectiveId: rowId, organizationId }),
    },
    roles: {
      create: ({ documentId, organizationId, data }) =>
        services.roles.create({
          documentId,
          organizationId,
          dto: parse(schemas.roleCreate, data),
        }),
      update: ({ rowId, organizationId, data }) =>
        services.roles.update({
          roleId: rowId,
          organizationId,
          dto: parse(schemas.roleUpdate, data),
        }),
      remove: ({ rowId, organizationId }) =>
        services.roles.remove({ roleId: rowId, organizationId }),
    },
    'role-assignments': {
      create: ({ documentId, organizationId, data }) =>
        services.roleAssignments.create({
          documentId,
          organizationId,
          dto: parse(schemas.roleAssignmentCreate, data),
        }),
      update: ({ rowId, organizationId, data }) =>
        services.roleAssignments.update({
          assignmentId: rowId,
          organizationId,
          dto: parse(schemas.roleAssignmentUpdate, data),
        }),
      remove: ({ rowId, organizationId }) =>
        services.roleAssignments.remove({
          assignmentId: rowId,
          organizationId,
        }),
    },
    metrics: {
      create: ({ documentId, organizationId, data }) =>
        services.metrics.create({
          documentId,
          organizationId,
          dto: parse(schemas.metricCreate, data),
        }),
      update: ({ rowId, organizationId, data }) =>
        services.metrics.update({
          metricId: rowId,
          organizationId,
          dto: parse(schemas.metricUpdate, data),
        }),
      remove: ({ rowId, organizationId }) =>
        services.metrics.remove({ metricId: rowId, organizationId }),
    },
    measurements: {
      create: ({ documentId, organizationId, data, memberId }) =>
        services.measurements.create({
          documentId,
          organizationId,
          memberId,
          dto: parse(schemas.measurementCreate, data),
        }),
      update: ({ rowId, organizationId, data }) =>
        services.measurements.update({
          measurementId: rowId,
          organizationId,
          dto: parse(schemas.measurementUpdate, data),
        }),
      remove: ({ rowId, organizationId }) =>
        services.measurements.remove({
          measurementId: rowId,
          organizationId,
        }),
    },
    audits: {
      create: ({ documentId, organizationId, data }) =>
        services.audits.create({
          documentId,
          organizationId,
          dto: parse(schemas.auditCreate, data),
        }),
      update: ({ rowId, organizationId, data }) =>
        services.audits.update({
          auditId: rowId,
          organizationId,
          dto: parse(schemas.auditUpdate, data),
        }),
      remove: ({ rowId, organizationId }) =>
        services.audits.remove({ auditId: rowId, organizationId }),
    },
    'audit-controls': {
      create: ({ documentId, organizationId, data }) =>
        services.auditControls.create({
          documentId,
          organizationId,
          dto: parse(schemas.auditControlCreate, data),
        }),
      update: ({ rowId, organizationId, data }) =>
        services.auditControls.update({
          controlId: rowId,
          organizationId,
          dto: parse(schemas.auditControlUpdate, data),
        }),
      remove: ({ rowId, organizationId }) =>
        services.auditControls.remove({ controlId: rowId, organizationId }),
    },
    'audit-findings': {
      create: ({ documentId, organizationId, data }) =>
        services.auditFindings.create({
          documentId,
          organizationId,
          dto: parse(schemas.auditFindingCreate, data),
        }),
      update: ({ rowId, organizationId, data }) =>
        services.auditFindings.update({
          findingId: rowId,
          organizationId,
          dto: parse(schemas.auditFindingUpdate, data),
        }),
      remove: ({ rowId, organizationId }) =>
        services.auditFindings.remove({ findingId: rowId, organizationId }),
    },
    reviews: {
      create: ({ documentId, organizationId, data }) =>
        services.reviews.create({
          documentId,
          organizationId,
          dto: parse(schemas.reviewCreate, data),
        }),
      update: ({ rowId, organizationId, data }) =>
        services.reviews.update({
          reviewId: rowId,
          organizationId,
          dto: parse(schemas.reviewUpdate, data),
        }),
      remove: ({ rowId, organizationId }) =>
        services.reviews.remove({ reviewId: rowId, organizationId }),
    },
    'review-inputs': {
      create: ({ documentId, organizationId, data }) =>
        services.reviewInputs.create({
          documentId,
          organizationId,
          dto: parse(schemas.reviewInputCreate, data),
        }),
      update: ({ rowId, organizationId, data }) =>
        services.reviewInputs.update({
          inputId: rowId,
          organizationId,
          dto: parse(schemas.reviewInputUpdate, data),
        }),
      remove: ({ rowId, organizationId }) =>
        services.reviewInputs.remove({ inputId: rowId, organizationId }),
    },
    'review-actions': {
      create: ({ documentId, organizationId, data }) =>
        services.reviewActions.create({
          documentId,
          organizationId,
          dto: parse(schemas.reviewActionCreate, data),
        }),
      update: ({ rowId, organizationId, data }) =>
        services.reviewActions.update({
          actionId: rowId,
          organizationId,
          dto: parse(schemas.reviewActionUpdate, data),
        }),
      remove: ({ rowId, organizationId }) =>
        services.reviewActions.remove({ actionId: rowId, organizationId }),
    },
  };
}

/** Parse the bulk-measurements body (used by the dedicated bulk endpoint). */
export function parseMeasurementBulkBody(
  data: unknown,
): BulkCreateMeasurementInput {
  return parse(measurementBulkCreateSchema, data);
}

import { z } from 'zod';
import {
  AUDIT_STATUSES,
  CONCLUSION_VERDICTS,
  FINDING_STATUSES,
  FINDING_TYPES,
} from './internal-audit-constants';

/**
 * Canonical zod schemas for the Internal Audit forms (clause 9.2). Empty
 * strings stand in for "not set" while editing; the payload mappers convert
 * them to null for the register API (which treats null as "clear").
 */

export const auditDetailsSchema = z
  .object({
    scope: z.string().trim().min(1, 'Scope is required'),
    criteria: z.string().trim().min(1, 'Criteria is required'),
    auditorName: z.string(),
    plannedStartDate: z.string(),
    plannedEndDate: z.string(),
    status: z.enum(AUDIT_STATUSES),
    conclusionVerdict: z.union([z.enum(CONCLUSION_VERDICTS), z.literal('')]),
    conclusionNotes: z.string(),
  })
  .superRefine((values, ctx) => {
    // YYYY-MM-DD strings order lexicographically, so direct comparison is safe.
    if (
      values.plannedStartDate &&
      values.plannedEndDate &&
      values.plannedEndDate < values.plannedStartDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['plannedEndDate'],
        message: 'Planned end date must be on or after the start date',
      });
    }
  });

export type AuditDetailsFormValues = z.infer<typeof auditDetailsSchema>;

export function toAuditPayload(values: AuditDetailsFormValues) {
  return {
    scope: values.scope,
    criteria: values.criteria,
    auditorName: values.auditorName || null,
    plannedStartDate: values.plannedStartDate || null,
    plannedEndDate: values.plannedEndDate || null,
    status: values.status,
    conclusionVerdict: values.conclusionVerdict || null,
    conclusionNotes: values.conclusionNotes || null,
  };
}

export const auditControlSchema = z.object({
  controlRef: z.string().trim().min(1, 'Control reference is required'),
  whatWasTested: z.string(),
  whereToFind: z.string(),
  notes: z.string(),
});

export type AuditControlFormValues = z.infer<typeof auditControlSchema>;

export function toControlPayload(values: AuditControlFormValues) {
  return {
    controlRef: values.controlRef,
    whatWasTested: values.whatWasTested,
    whereToFind: values.whereToFind,
    notes: values.notes || null,
  };
}

export const findingSchema = z.object({
  type: z.enum(FINDING_TYPES),
  controlId: z.string(),
  clauseOrControl: z.string(),
  description: z.string().trim().min(1, 'Description is required'),
  ownerMemberId: z.string(),
  dueDate: z.string(),
  status: z.enum(FINDING_STATUSES),
  closureEvidence: z.string(),
});

export type FindingFormValues = z.infer<typeof findingSchema>;

export function toFindingPayload(values: FindingFormValues) {
  return {
    type: values.type,
    controlId: values.controlId || null,
    clauseOrControl: values.clauseOrControl || null,
    description: values.description,
    ownerMemberId: values.ownerMemberId || null,
    dueDate: values.dueDate || null,
    status: values.status,
    closureEvidence: values.closureEvidence || null,
  };
}

export const signoffSchema = z.object({
  signoffAuditorName: z.string(),
  signoffAuditorDate: z.string(),
  signoffSpoName: z.string(),
  signoffSpoDate: z.string(),
  signoffTopMgmtName: z.string(),
  signoffTopMgmtDate: z.string(),
});

export type SignoffFormValues = z.infer<typeof signoffSchema>;

export function toSignoffPayload(values: SignoffFormValues) {
  return {
    signoffAuditorName: values.signoffAuditorName || null,
    signoffAuditorDate: values.signoffAuditorDate || null,
    signoffSpoName: values.signoffSpoName || null,
    signoffSpoDate: values.signoffSpoDate || null,
    signoffTopMgmtName: values.signoffTopMgmtName || null,
    signoffTopMgmtDate: values.signoffTopMgmtDate || null,
  };
}

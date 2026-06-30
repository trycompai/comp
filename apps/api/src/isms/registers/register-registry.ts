import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import type { IsmsContextIssueService } from '../isms-context-issue.service';
import type { IsmsInterestedPartyService } from '../isms-interested-party.service';
import type { IsmsObjectiveService } from '../isms-objective.service';
import type { IsmsRequirementService } from '../isms-requirement.service';

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
} as const;

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

export const ISMS_REGISTER_KEYS = [
  'context-issues',
  'interested-parties',
  'requirements',
  'objectives',
] as const;

export type IsmsRegisterKey = (typeof ISMS_REGISTER_KEYS)[number];

export interface RegisterHandler {
  create(args: {
    documentId: string;
    organizationId: string;
    data: unknown;
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
  };
}

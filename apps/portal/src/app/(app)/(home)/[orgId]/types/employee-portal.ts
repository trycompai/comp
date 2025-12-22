import { z } from 'zod';

export const FleetPolicySchema = z
  .object({
    id: z.number(),
    name: z.string(),
    response: z.string().optional(),
  })
  .passthrough();

export const MdmSchema = z
  .object({
    connected_to_fleet: z.boolean().optional(),
  })
  .passthrough();

export const HostSchema = z
  .object({
    computer_name: z.string().optional(),
    policies: z.array(FleetPolicySchema).default([]),
    mdm: MdmSchema.optional(),
  })
  .passthrough();

export const PolicySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    signedBy: z.array(z.string()).default([]),
    pdfUrl: z.string().nullable().optional(),
    displayFormat: z.string().optional(),
    status: z.string().optional(),
    isRequiredToSign: z.boolean().optional(),
  })
  .passthrough();

export const TrainingVideoCompletionSchema = z
  .object({
    id: z.string(),
    videoId: z.string(),
    completedAt: z.string().datetime().nullable().optional(),
  })
  .passthrough();

export const MemberSchema = z
  .object({
    id: z.string(),
    organizationId: z.string(),
    user: z.object({}).passthrough(),
    organization: z.object({}).passthrough(),
  })
  .passthrough();

export const EmployeePortalDashboardSchema = z.object({
  member: MemberSchema,
  policies: z.array(PolicySchema),
  trainingVideos: z.array(TrainingVideoCompletionSchema),
  host: HostSchema.nullable(),
  fleetPolicies: z.array(FleetPolicySchema),
});

export type EmployeePortalDashboard = z.infer<typeof EmployeePortalDashboardSchema>;

import { z } from 'zod';

/**
 * Update the public Trust Portal selection for a single org-authored custom
 * framework. Mirrors the enabled + status that native frameworks store as
 * columns on `Trust`. At least one of `enabled` / `status` must be provided.
 */
export const UpdateTrustCustomFrameworkSchema = z
  .object({
    customFrameworkId: z.string().min(1),
    enabled: z.boolean().optional(),
    status: z.enum(['started', 'in_progress', 'compliant']).optional(),
  })
  .refine((data) => data.enabled !== undefined || data.status !== undefined, {
    message: 'At least one of `enabled` or `status` must be provided',
  });

export type UpdateTrustCustomFrameworkDto = z.infer<
  typeof UpdateTrustCustomFrameworkSchema
>;

/** A custom framework plus its Trust Portal selection state (admin view). */
export interface TrustCustomFrameworkAdminItem {
  customFrameworkId: string;
  name: string;
  description: string;
  /** Whether the framework is shown on the public portal. */
  enabled: boolean;
  /** Displayed status; defaults to 'started' when never configured. */
  status: 'started' | 'in_progress' | 'compliant';
  /** Whether a compliance certificate PDF has been uploaded. */
  hasCertificate: boolean;
  certificateFileName: string | null;
}

/** A custom framework as shown on the public portal. */
export interface TrustCustomFrameworkPublicItem {
  id: string;
  name: string;
  description: string;
  status: 'started' | 'in_progress' | 'compliant';
  hasCertificate: boolean;
}

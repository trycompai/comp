// Import enums + types from `@prisma/client` directly (not `@db`) so this
// module has no runtime dependency on the PrismaClient singleton. That lets
// the spec import it without needing to mock `@db`.
import { Impact, Likelihood, type Prisma } from '@prisma/client';
import { z } from 'zod';

/**
 * Output of the vendor AI risk assessment — two independent dimensions.
 *
 * Replaces the previous single-level → diagonal-cell mapping, which pooled
 * every vendor into 5 of 25 possible cells (5 of 10 score buckets).
 *
 * `likelihood` = probability of a security incident originating from or
 *   involving this vendor (adversary motivation + exposure + data handled).
 * `impact`     = blast radius if the vendor is compromised (regulatory
 *   exposure, customer-data sensitivity, operational criticality).
 */
export const assessmentOutputSchema = z.object({
  likelihood: z.nativeEnum(Likelihood),
  impact: z.nativeEnum(Impact),
  rationale: z.string().min(20),
});

export type AssessmentOutput = z.infer<typeof assessmentOutputSchema>;

/**
 * Extract the inherent likelihood + impact from a vendor risk assessment payload.
 * Returns null if the payload doesn't conform to `assessmentOutputSchema`
 * (e.g. old-format payloads from globalVendors created before ENG-221).
 */
export function extractInherentRisk(
  payload: Prisma.InputJsonValue,
): { likelihood: Likelihood; impact: Impact } | null {
  const parsed = assessmentOutputSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }
  return { likelihood: parsed.data.likelihood, impact: parsed.data.impact };
}

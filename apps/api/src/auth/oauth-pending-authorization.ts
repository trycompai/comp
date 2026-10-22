import { z } from 'zod';

const pendingAuthorizationSchema = z.object({
  clientId: z.string(),
  userId: z.string(),
  redirectURI: z.string(),
  requireConsent: z.boolean(),
});

export type PendingAuthorization = z.infer<typeof pendingAuthorizationSchema>;

export function parsePendingAuthorization(
  value: string,
): PendingAuthorization | null {
  try {
    const result = pendingAuthorizationSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

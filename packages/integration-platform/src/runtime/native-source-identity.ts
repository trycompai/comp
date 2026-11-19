import { z } from 'zod';
import generatedIdentity from './native-source-identity.json';

const identitySchema = z.object({
  schemaVersion: z.literal(1),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
});

export function getNativeSourceIdentity(): string | null {
  if (process.env.NODE_ENV !== 'production') return null;
  const parsed = identitySchema.safeParse(generatedIdentity);
  return parsed.success ? parsed.data.digest : null;
}

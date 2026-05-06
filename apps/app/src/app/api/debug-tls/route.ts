import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const envVar = process.env.NODE_EXTRA_CA_CERTS;
  const candidates = [
    envVar,
    '/var/task/packages/db/certs/rds-global-bundle.pem',
    '/vercel/path0/packages/db/certs/rds-global-bundle.pem',
    join(process.cwd(), 'packages/db/certs/rds-global-bundle.pem'),
    join(process.cwd(), '../../packages/db/certs/rds-global-bundle.pem'),
  ].filter((p): p is string => Boolean(p));

  const probes = candidates.map((p) => {
    try {
      const exists = existsSync(p);
      const size = exists ? statSync(p).size : null;
      return { path: p, exists, size };
    } catch (e) {
      return { path: p, exists: false, error: (e as Error).message };
    }
  });

  return Response.json({
    cwd: process.cwd(),
    nodeExtraCaCerts: envVar ?? null,
    prismaAllowInsecureTls: process.env.PRISMA_ALLOW_INSECURE_TLS ?? null,
    probes,
    nodeVersion: process.version,
    platform: process.platform,
  });
}

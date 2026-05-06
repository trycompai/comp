#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pemPath = join(__dirname, '..', 'certs', 'rds-global-bundle.pem');
const monorepoRoot = join(__dirname, '..', '..', '..');

const pem = readFileSync(pemPath, 'utf8');
const escaped = JSON.stringify(pem);

const banner =
  '// Auto-generated from packages/db/certs/rds-global-bundle.pem.\n' +
  '// Do not edit by hand — run `bun run packages/db/scripts/generate-ca-bundle-ts.mjs` to regenerate.\n' +
  '// The cert is inlined as a string so it lands in every bundler\'s output (Webpack, Turbopack, Rollup).\n' +
  '// Background: Next.js `outputFileTracingIncludes` is silently ignored under Turbopack builds, so file-based\n' +
  '// approaches that rely on tracing don\'t work. See `next/dist/build/index.js` line ~1537.\n\n';

const body = `export const RDS_CA_BUNDLE = ${escaped};\n`;

const targets = [
  join(monorepoRoot, 'packages/db/src/rds-ca-bundle.ts'),
  join(monorepoRoot, 'apps/app/prisma/rds-ca-bundle.ts'),
  join(monorepoRoot, 'apps/portal/prisma/rds-ca-bundle.ts'),
  join(monorepoRoot, 'apps/framework-editor/prisma/rds-ca-bundle.ts'),
];

for (const target of targets) {
  writeFileSync(target, banner + body);
  console.log(`wrote ${target}`);
}

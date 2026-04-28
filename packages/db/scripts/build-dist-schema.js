#!/usr/bin/env node
/**
 * Builds dist/schema.prisma from prisma/schema/*.prisma so consumers that
 * pull from the published @trycompai/db package (e.g. comp-private apps,
 * which run `cp .../@trycompai/db/dist/schema.prisma prisma/schema.prisma`)
 * receive a single, ready-to-use schema.
 *
 * Native multi-file Prisma v7 schemas live in `prisma/schema/`. Inside the
 * monorepo, consumers can read those files directly. Outside the monorepo
 * they cannot, so we ship a flattened copy in dist/.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const schemaDir = path.join(root, 'prisma/schema');
const distDir = path.join(root, 'dist');
const outFile = path.join(distDir, 'schema.prisma');

if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

// schema.prisma (generator + datasource) must come first; everything else
// after, in deterministic order.
const all = fs.readdirSync(schemaDir).filter((f) => f.endsWith('.prisma'));
const ordered = [
  'schema.prisma',
  ...all.filter((f) => f !== 'schema.prisma').sort(),
];

const parts = ordered.map((file) => {
  const body = fs.readFileSync(path.join(schemaDir, file), 'utf8').trimEnd();
  if (file === 'schema.prisma') return body;
  return `// ===== ${file} =====\n${body}`;
});

fs.writeFileSync(outFile, parts.join('\n\n') + '\n');
console.log(`[build-dist-schema] wrote ${outFile} (${ordered.length} files)`);

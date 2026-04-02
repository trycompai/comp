#!/usr/bin/env node
/**
 * Generates a prisma-client-js client to populate @prisma/client at node_modules.
 * This is fast (no .ts files to compile) and provides runtime enums + types
 * for packages that import from @trycompai/db.
 *
 * The combined schema uses prisma-client provider. This script patches a temp copy
 * to use prisma-client-js (no custom output) and generates to node_modules/@prisma/client.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../dist/schema.prisma');
const tempSchema = path.join(__dirname, '../dist/.schema-clientjs.prisma');

let schema = fs.readFileSync(schemaPath, 'utf8');

// Surgically patch: swap provider and remove output line.
// Preserves all other generator settings (previewFeatures, etc.).
schema = schema
  .replace(/provider\s*=\s*"prisma-client"/g, 'provider = "prisma-client-js"')
  .replace(/\s*output\s*=\s*"[^"]*"\n?/g, '\n');

fs.writeFileSync(tempSchema, schema);

try {
  execFileSync('bunx', ['prisma', 'generate', `--schema=${tempSchema}`], { stdio: 'inherit' });
} finally {
  fs.unlinkSync(tempSchema);
}

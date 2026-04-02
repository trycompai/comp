#!/usr/bin/env node
/**
 * Generates a prisma-client-js client to populate @prisma/client at node_modules.
 * This is fast (no .ts files to compile) and provides runtime enums + types
 * for packages that import from @trycompai/db.
 *
 * Creates a temp schema directory inside packages/db (so @prisma/client resolves
 * correctly), copies all model files from prisma/schema/, generates, then cleans up.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(__dirname, '..');
const schemaDir = path.join(root, 'prisma/schema');
const configPath = path.join(root, 'prisma.config.ts');
const configBackup = configPath + '.bak';
// Use a temp dir inside packages/db so prisma can resolve @prisma/client via node_modules
const tempDir = fs.mkdtempSync(path.join(root, '.prisma-clientjs-'));

// Temporarily hide prisma.config.ts so prisma doesn't override our --schema flag.
const hasConfig = fs.existsSync(configPath);
if (hasConfig) fs.renameSync(configPath, configBackup);

try {
  // Copy all model files (everything except schema.prisma)
  const modelFiles = fs
    .readdirSync(schemaDir)
    .filter((f) => f.endsWith('.prisma') && f !== 'schema.prisma');

  for (const file of modelFiles) {
    fs.copyFileSync(path.join(schemaDir, file), path.join(tempDir, file));
  }

  // Write a schema.prisma with prisma-client-js generator (no custom output).
  const schemaPrisma = `generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  extensions = [pgcrypto]
}
`;
  fs.writeFileSync(path.join(tempDir, 'schema.prisma'), schemaPrisma);

  // Use require.resolve to find prisma's CLI entry point — works regardless of hoisting.
  const prismaCli = path.join(
    path.dirname(require.resolve('prisma/package.json')),
    'build',
    'index.js',
  );
  execFileSync(process.execPath, [prismaCli, 'generate', `--schema=${tempDir}`], {
    stdio: 'inherit',
    cwd: root,
  });
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
  if (hasConfig && fs.existsSync(configBackup)) fs.renameSync(configBackup, configPath);
}

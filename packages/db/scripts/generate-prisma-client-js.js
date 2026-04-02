#!/usr/bin/env node
/**
 * Generates a prisma-client-js client to populate @prisma/client at node_modules.
 * Creates a temp schema dir, copies model files, generates with prisma-client-js.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const schemaDir = path.join(root, 'prisma/schema');
const configPath = path.join(root, 'prisma.config.ts');
const configBackup = configPath + '.bak';
const tempDir = fs.mkdtempSync(path.join(root, '.prisma-clientjs-'));

// Hide prisma.config.ts so prisma doesn't try to load it
const hasConfig = fs.existsSync(configPath);
if (hasConfig) fs.renameSync(configPath, configBackup);

try {
  // Copy model files
  for (const file of fs.readdirSync(schemaDir).filter(f => f.endsWith('.prisma') && f !== 'schema.prisma')) {
    fs.copyFileSync(path.join(schemaDir, file), path.join(tempDir, file));
  }

  // Write prisma-client-js generator schema
  fs.writeFileSync(path.join(tempDir, 'schema.prisma'), `generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  extensions = [pgcrypto]
}
`);

  // Resolve prisma CLI via Node/Bun module resolution (handles hoisting)
  const prismaPackage = require.resolve('prisma/package.json');
  const prismaCli = path.join(path.dirname(prismaPackage), 'build', 'index.js');

  execFileSync(process.execPath, [prismaCli, 'generate', `--schema=${tempDir}`], {
    stdio: 'inherit',
    cwd: root,
  });
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
  if (hasConfig && fs.existsSync(configBackup)) fs.renameSync(configBackup, configPath);
}

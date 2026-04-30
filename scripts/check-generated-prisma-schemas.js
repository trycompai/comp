#!/usr/bin/env node

const { existsSync, readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');

const repoRoot = process.cwd();
const canonicalDir = path.join(repoRoot, 'packages/db/prisma/schema');
const appsDir = path.join(repoRoot, 'apps');

const readPrismaFiles = (directory) =>
  new Set(
    readdirSync(directory)
      .filter((file) => file.endsWith('.prisma'))
      .filter((file) => file !== 'schema.prisma'),
  );

const canonicalFiles = readPrismaFiles(canonicalDir);
const errors = [];

for (const appName of readdirSync(appsDir)) {
  const appPrismaDir = path.join(appsDir, appName, 'prisma');
  const schemaDir = path.join(appPrismaDir, 'schema');

  if (!existsSync(schemaDir)) {
    continue;
  }

  const localFiles = readPrismaFiles(schemaDir);

  for (const file of localFiles) {
    if (!canonicalFiles.has(file)) {
      errors.push(`${appName}: stale Prisma schema fragment ${file}`);
    }
  }

  for (const file of canonicalFiles) {
    if (!localFiles.has(file)) {
      errors.push(`${appName}: missing Prisma schema fragment ${file}`);
      continue;
    }

    const canonicalPath = path.join(canonicalDir, file);
    const localPath = path.join(schemaDir, file);
    const canonicalContents = readFileSync(canonicalPath, 'utf8');
    const localContents = readFileSync(localPath, 'utf8');
    if (localContents !== canonicalContents) {
      errors.push(`${appName}: Prisma schema fragment ${file} is out of sync`);
    }
  }

  const legacySchemaFile = path.join(appPrismaDir, 'schema.prisma');
  if (!existsSync(legacySchemaFile)) {
    continue;
  }

  const legacySchema = readFileSync(legacySchemaFile, 'utf8');
  if (/^model\s+\w+/m.test(legacySchema)) {
    errors.push(`${appName}: legacy prisma/schema.prisma contains model definitions`);
  }
}

if (errors.length > 0) {
  console.error('Generated Prisma schemas are out of sync:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Generated Prisma schemas are in sync.');

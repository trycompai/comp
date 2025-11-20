#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

type GenerateOptions = {
  projectRoot?: string;
  force?: boolean;
  log?: (message: string) => void;
};

type SchemaResolution = {
  path?: string;
  searched: string[];
};

const executableName = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';

export function generatePrismaClient(options: GenerateOptions = {}): { schema: string } {
  const projectRoot = options.projectRoot ?? process.cwd();
  const log = options.log ?? ((message: string) => console.log(`[prisma-postinstall] ${message}`));

  const resolution = resolveSchemaPath(projectRoot);

  if (!resolution.path) {
    throw new Error(
      [
        'Unable to locate schema.prisma from @trycompai/db.',
        'Looked in the following locations:',
        ...resolution.searched.map((candidate) => ` - ${candidate}`),
      ].join('\n'),
    );
  }

  const schemaDir = resolve(projectRoot, 'prisma');
  const schemaDestination = resolve(schemaDir, 'schema.prisma');

  mkdirSync(schemaDir, { recursive: true });
  copyFileSync(resolution.path, schemaDestination);
  log(`Copied schema from ${resolution.path} to ${schemaDestination}`);

  const clientEntryPoint = resolve(projectRoot, 'node_modules/.prisma/client/default.js');
  if (!options.force && existsSync(clientEntryPoint)) {
    log('Prisma client already exists. Skipping generation.');
    return { schema: schemaDestination };
  }

  const prismaBinary = resolvePrismaBinary(projectRoot);

  if (!prismaBinary) {
    throw new Error(
      [
        'Prisma CLI not found in this workspace. Ensure "prisma" is installed.',
        `Checked paths:`,
        ...buildBinaryCandidates(projectRoot).map((candidate) => ` - ${candidate}`),
      ].join('\n'),
    );
  }

  log('Generating Prisma client for Trigger deploy...');
  const result = spawnSync(prismaBinary, ['generate', `--schema=${schemaDestination}`], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      PRISMA_HIDE_UPDATE_MESSAGE: '1',
    },
  });

  if (result.status !== 0) {
    throw new Error(`Prisma generate exited with code ${result.status ?? -1}`);
  }

  log('Prisma client generation complete.');
  return { schema: schemaDestination };
}

function resolveSchemaPath(projectRoot: string): SchemaResolution {
  const candidates = buildSchemaCandidates(projectRoot);
  const path = candidates.find((candidate) => existsSync(candidate));
  return { path, searched: candidates };
}

function buildSchemaCandidates(projectRoot: string): string[] {
  const candidates = new Set<string>();

  const addCandidates = (start: string | undefined) => {
    if (!start) {
      return;
    }

    let current = start;
    while (true) {
      candidates.add(resolve(current, 'node_modules/@trycompai/db/dist/schema.prisma'));
      const parent = dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  };

  addCandidates(projectRoot);
  const initCwd = process.env.INIT_CWD;
  if (initCwd && initCwd !== projectRoot) {
    addCandidates(initCwd);
  }

  candidates.add(resolve(projectRoot, '../../packages/db/dist/schema.prisma'));
  candidates.add(resolve(projectRoot, '../packages/db/dist/schema.prisma'));

  return Array.from(candidates);
}

function resolvePrismaBinary(projectRoot: string): string | undefined {
  const candidates = buildBinaryCandidates(projectRoot);
  return candidates.find((candidate) => existsSync(candidate));
}

function buildBinaryCandidates(projectRoot: string): string[] {
  const candidates = new Set<string>();

  const addCandidates = (start: string | undefined) => {
    if (!start) {
      return;
    }

    let current = start;
    while (true) {
      candidates.add(resolve(current, 'node_modules', '.bin', executableName));
      const parent = dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  };

  addCandidates(projectRoot);
  const initCwd = process.env.INIT_CWD;
  if (initCwd && initCwd !== projectRoot) {
    addCandidates(initCwd);
  }

  return Array.from(candidates);
}

function shouldRunCli(force: boolean): boolean {
  if (force) {
    return true;
  }

  if (process.env.TRIGGER_PRISMA_FORCE_GENERATE === '1') {
    return true;
  }

  return Boolean(
    process.env.TRIGGER_SECRET_KEY ||
      process.env.TRIGGER_DEPLOYMENT ||
      process.env.CI === 'true' ||
      process.env.PRISMA_GENERATE_ON_INSTALL === '1',
  );
}

function runCli() {
  const force = process.argv.includes('--force');

  if (!shouldRunCli(force)) {
    process.exit(0);
  }

  try {
    generatePrismaClient({ projectRoot: process.cwd(), force });
  } catch (error) {
    console.error('[prisma-postinstall] Failed to generate Prisma client:', error);
    process.exit(1);
  }
}

const executedAsScript =
  typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module;

if (executedAsScript) {
  runCli();
}

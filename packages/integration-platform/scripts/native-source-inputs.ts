import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface NativeSourceInput {
  path: string;
  mode: string;
  sha256: string;
}

export interface NativeSourceManifest {
  schemaVersion: 1;
  digest: string;
  inputs: NativeSourceInput[];
}

const INPUTS = [
  'apps/api',
  'packages',
  'scripts',
  'patches',
  'bun.lock',
  'bunfig.toml',
  'package.json',
  'turbo.json',
  'tsconfig.json',
  '.npmrc',
  '.gitignore',
  '.dockerignore',
  'Dockerfile',
  'buildspec.yml',
];
const REQUIRED = [
  'bun.lock',
  'bunfig.toml',
  'package.json',
  'packages/integration-platform/package.json',
];
const GENERATED = [
  ':(exclude,glob)**/node_modules/**',
  ':(exclude,glob)**/.turbo/**',
  ':(exclude,glob)**/.next/**',
  ':(exclude,glob)**/coverage/**',
  ':(exclude,glob)**/*.tsbuildinfo',
  ':(exclude,glob)packages/*/dist/**',
  ':(exclude,glob)apps/api/dist/**',
  ':(exclude,glob)apps/api/prisma/schema/**',
  ':(exclude,glob)apps/api/prisma/generated/**',
  ':(exclude,glob)packages/db/src/generated/**',
];

function git({ root, args }: { root: string; args: string[] }): string {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 16 * 1024 * 1024,
    env: {
      PATH: process.env.PATH,
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_OPTIONAL_LOCKS: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function entries(value: string): string[] {
  return value.split('\0').filter(Boolean);
}

export function sourceDigest(inputs: NativeSourceInput[]): string {
  return createHash('sha256').update(JSON.stringify(inputs)).digest('hex');
}

export async function captureNativeSource(root: string): Promise<NativeSourceManifest> {
  const actualRoot = await realpath(root);
  const gitRoot = git({ root: actualRoot, args: ['rev-parse', '--show-toplevel'] }).trim();
  if ((await realpath(gitRoot)) !== actualRoot) {
    throw new Error('Native source root differs from the checkout');
  }
  for (const ignored of [false, true]) {
    const args = ['ls-files', '--others', '--exclude-standard', '-z'];
    if (ignored) args.push('--ignored');
    const unknown = entries(
      git({ root: actualRoot, args: [...args, '--', ...INPUTS, ...GENERATED] }),
    );
    if (unknown.length > 0) {
      throw new Error('Native runtime inputs include an untracked input file');
    }
  }
  const tracked = entries(
    git({ root: actualRoot, args: ['ls-files', '--stage', '-z', '--', ...INPUTS] }),
  );
  const inputs: NativeSourceInput[] = [];
  for (const entry of tracked) {
    const separator = entry.indexOf('\t');
    if (separator < 0) throw new Error('Invalid native source index record');
    const [mode, , stage] = entry.slice(0, separator).split(' ');
    const path = entry.slice(separator + 1);
    if (!['100644', '100755'].includes(mode) || stage !== '0') {
      throw new Error('Native source contains an unsupported or unmerged input');
    }
    const file = resolve(actualRoot, path);
    const before = await lstat(file);
    if (!before.isFile() || ((before.mode & 0o100) !== 0) !== (mode === '100755')) {
      throw new Error('Native source input type or mode changed');
    }
    const descriptor = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const opened = await descriptor.stat();
      const bytes = await descriptor.readFile();
      const after = await lstat(file);
      if (
        before.ino !== opened.ino ||
        before.ino !== after.ino ||
        before.size !== after.size ||
        before.mtimeMs !== after.mtimeMs
      ) {
        throw new Error('Native source changed while hashing');
      }
      inputs.push({ path, mode, sha256: createHash('sha256').update(bytes).digest('hex') });
    } finally {
      await descriptor.close();
    }
  }
  inputs.sort((left, right) => left.path.localeCompare(right.path, 'en'));
  if (!REQUIRED.every((path) => inputs.some((input) => input.path === path))) {
    throw new Error('Native source or dependency lock inputs are missing');
  }
  return { schemaVersion: 1, digest: sourceDigest(inputs), inputs };
}

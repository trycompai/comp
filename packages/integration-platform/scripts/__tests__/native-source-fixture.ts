import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import type { NativeBuildPaths } from '../native-source-build';

export async function writeFixture({
  root,
  path,
  content,
}: {
  root: string;
  path: string;
  content: string;
}): Promise<void> {
  const target = resolve(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
}

export function fixtureGit({ root, args }: { root: string; args: string[] }): string {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: '/dev/null',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export async function sourceFixture(): Promise<NativeBuildPaths> {
  const root = await mkdtemp(resolve(tmpdir(), 'trycomp-native-source-'));
  const files = {
    'bun.lock': 'frozen dependency lock\n',
    'bunfig.toml': '[install]\nlinker = "hoisted"\n',
    'package.json': '{"private":true}\n',
    'turbo.json': '{}\n',
    '.gitignore': 'node_modules/\nignored/\npackages/*/dist/\n',
    'packages/integration-platform/package.json': '{"name":"fixture"}\n',
    'packages/integration-platform/src/check.ts': 'export const check = true;\n',
    'apps/api/src/complete.ts': 'export const complete = true;\n',
  };
  for (const [path, content] of Object.entries(files)) await writeFixture({ root, path, content });
  fixtureGit({ root, args: ['init', '-q'] });
  fixtureGit({ root, args: ['add', '--all'] });
  return { root, packageRoot: resolve(root, 'packages/integration-platform') };
}

export async function readIdentity(packageRoot: string): Promise<unknown> {
  return JSON.parse(
    await readFile(resolve(packageRoot, 'dist/runtime/native-source-identity.json'), 'utf8'),
  );
}

import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, rm, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { captureNativeSource } from '../native-source-inputs';
import { fixtureGit, sourceFixture, writeFixture } from './native-source-fixture';

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture() {
  const paths = await sourceFixture();
  roots.push(paths.root);
  return paths;
}

describe('actual native source inputs', () => {
  test('is stable across generated output and includes API, package and frozen lock bytes', async () => {
    const { root } = await fixture();
    const before = await captureNativeSource(root);
    expect(before.inputs.map((input) => input.path)).toEqual([
      '.gitignore',
      'apps/api/src/complete.ts',
      'bun.lock',
      'bunfig.toml',
      'package.json',
      'packages/integration-platform/package.json',
      'packages/integration-platform/src/check.ts',
      'turbo.json',
    ]);
    await writeFixture({
      root,
      path: 'packages/integration-platform/dist/output.js',
      content: 'generated',
    });
    expect(await captureNativeSource(root)).toEqual(before);
    for (const path of [
      'apps/api/src/complete.ts',
      'packages/integration-platform/src/check.ts',
      'bun.lock',
    ]) {
      await writeFixture({ root, path, content: 'changed actual bytes\n' });
      expect((await captureNativeSource(root)).digest).not.toBe(before.digest);
    }
  });

  test.each([
    'apps/api/new.ts',
    'packages/integration-platform/ignored/new.ts',
    'apps/api/README.md',
    'scripts/helper.sh',
  ])('refuses every untracked or ignored input: %s', async (path) => {
    const { root } = await fixture();
    await writeFixture({ root, path, content: 'export const unadmitted = true;\n' });
    await expect(captureNativeSource(root)).rejects.toThrow('untracked input file');
  });

  test('reads actual bytes even when the index marks the file assume-unchanged', async () => {
    const { root } = await fixture();
    const before = await captureNativeSource(root);
    const path = 'apps/api/src/complete.ts';
    fixtureGit({ root, args: ['update-index', '--assume-unchanged', path] });
    await writeFixture({ root, path, content: 'export const changed = true;\n' });
    expect((await captureNativeSource(root)).digest).not.toBe(before.digest);
  });

  test('refuses missing tracked inputs and missing dependency locks', async () => {
    const { root } = await fixture();
    await rm(resolve(root, 'bun.lock'));
    await expect(captureNativeSource(root)).rejects.toThrow();
    fixtureGit({ root, args: ['rm', '--cached', 'bun.lock'] });
    await expect(captureNativeSource(root)).rejects.toThrow('inputs are missing');
  });

  test('refuses changed executable modes and symlink replacements', async () => {
    const { root } = await fixture();
    const path = resolve(root, 'apps/api/src/complete.ts');
    await chmod(path, 0o755);
    await expect(captureNativeSource(root)).rejects.toThrow('type or mode changed');
    await rm(path);
    await symlink(resolve(root, 'package.json'), path);
    await expect(captureNativeSource(root)).rejects.toThrow('type or mode changed');
  });

  test('refuses a nested directory instead of the actual checkout root', async () => {
    const { packageRoot } = await fixture();
    await expect(captureNativeSource(packageRoot)).rejects.toThrow('root differs');
  });
});

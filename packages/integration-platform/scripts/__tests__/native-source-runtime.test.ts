import { afterEach, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildNativeSourcePackage, verifyNativeSourceBuild } from '../native-source-build';
import { captureNativeSource } from '../native-source-inputs';
import { fixtureGit, sourceFixture } from './native-source-fixture';

const projectRoot = resolve(import.meta.dir, '../../../..');
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe('compiled and bundled native source identity', () => {
  test('loads the actual compiled identity in production and carries it into a Node bundle', async () => {
    const paths = await sourceFixture();
    roots.push(paths.root);
    await symlink(resolve(projectRoot, 'node_modules'), resolve(paths.root, 'node_modules'));
    const sourceRuntime = resolve(paths.packageRoot, 'src/runtime');
    await mkdir(sourceRuntime, { recursive: true });
    await copyFile(
      resolve(import.meta.dir, '../../src/runtime/native-source-identity.ts'),
      resolve(sourceRuntime, 'native-source-identity.ts'),
    );
    await writeFile(resolve(sourceRuntime, 'native-source-identity.json'), 'null\n');
    fixtureGit({ root: paths.root, args: ['add', '--all'] });
    await buildNativeSourcePackage({
      ...paths,
      compile: async () => {
        const result = spawnSync(
          'node',
          [
            resolve(projectRoot, 'node_modules/typescript/bin/tsc'),
            resolve(sourceRuntime, 'native-source-identity.ts'),
            '--outDir',
            resolve(paths.packageRoot, 'dist/runtime'),
            '--module',
            'commonjs',
            '--moduleResolution',
            'node',
            '--target',
            'ES2022',
            '--esModuleInterop',
            '--resolveJsonModule',
            '--strict',
            '--skipLibCheck',
            '--types',
            'node',
          ],
          { cwd: paths.packageRoot, encoding: 'utf8' },
        );
        expect(result.error).toBeUndefined();
        if (result.status !== 0) throw new Error(result.stdout + result.stderr);
        return result.status;
      },
    });
    const digest = (await captureNativeSource(paths.root)).digest;
    expect(await verifyNativeSourceBuild(paths)).toBe(true);
    const compiled = resolve(paths.packageRoot, 'dist/runtime/native-source-identity.js');
    for (const nodeEnv of ['production', 'test', 'development']) {
      const result = spawnSync(
        'node',
        [
          '-e',
          'process.stdout.write(JSON.stringify(require(process.argv[1]).getNativeSourceIdentity()))',
          compiled,
        ],
        { env: { PATH: process.env.PATH, NODE_ENV: nodeEnv }, encoding: 'utf8' },
      );
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toBe(nodeEnv === 'production' ? digest : null);
    }
    const bundlePath = resolve(paths.root, 'bundle.cjs');
    const bundle = await Bun.build({
      entrypoints: [compiled],
      target: 'node',
      format: 'cjs',
      define: { 'process.env.NODE_ENV': JSON.stringify('production') },
      outdir: paths.root,
      naming: 'bundle.cjs',
    });
    expect(bundle.success).toBe(true);
    const result = spawnSync(
      'node',
      [
        '-e',
        'process.stdout.write(JSON.stringify(require(process.argv[1]).getNativeSourceIdentity()))',
        bundlePath,
      ],
      { env: { PATH: process.env.PATH, NODE_ENV: 'production' }, encoding: 'utf8' },
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toBe(digest);
    // Production bundles carry the digest, not the private input inventory.
    expect(await readFile(bundlePath, 'utf8')).not.toContain('apps/api/src/complete.ts');
  }, 30_000);
});

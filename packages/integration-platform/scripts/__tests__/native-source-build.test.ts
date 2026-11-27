import { afterEach, describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildNativeSourcePackage, verifyNativeSourceBuild } from '../native-source-build';
import { captureNativeSource } from '../native-source-inputs';
import { readIdentity, sourceFixture, writeFixture } from './native-source-fixture';

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture() {
  const paths = await sourceFixture();
  roots.push(paths.root);
  return paths;
}

describe('native build provenance', () => {
  test('invalidates prior identity before compilation and verifies the actual inputs afterward', async () => {
    const paths = await fixture();
    await writeFixture({
      root: paths.packageRoot,
      path: 'dist/runtime/native-source-identity.json',
      content: '"stale"',
    });
    await buildNativeSourcePackage({
      ...paths,
      compile: async () => {
        expect(await readIdentity(paths.packageRoot)).toBeNull();
        return 0;
      },
    });
    expect(await readIdentity(paths.packageRoot)).toEqual({
      schemaVersion: 1,
      digest: (await captureNativeSource(paths.root)).digest,
    });
    expect(await verifyNativeSourceBuild(paths)).toBe(true);
  });

  test.each(['apps/api/src/complete.ts', 'bun.lock'])(
    'rejects stale compiled identity after changing %s',
    async (path) => {
      const paths = await fixture();
      await buildNativeSourcePackage({ ...paths, compile: async () => 0 });
      await writeFixture({ root: paths.root, path, content: 'new input' });
      await expect(verifyNativeSourceBuild(paths)).rejects.toThrow('is stale');
      expect(await readIdentity(paths.packageRoot)).toBeNull();
    },
  );

  test('fails and invalidates if source changes during compilation', async () => {
    const paths = await fixture();
    await expect(
      buildNativeSourcePackage({
        ...paths,
        compile: async () => {
          await writeFixture({
            root: paths.root,
            path: 'apps/api/src/complete.ts',
            content: 'changed',
          });
          return 0;
        },
      }),
    ).rejects.toThrow('changed during compilation');
    expect(await readIdentity(paths.packageRoot)).toBeNull();
  });

  test.each([false, true])(
    'compiler failure invalidates even if it wrote an identity, throws=%s',
    async (throws) => {
      const paths = await fixture();
      await expect(
        buildNativeSourcePackage({
          ...paths,
          compile: async () => {
            await writeFixture({
              root: paths.packageRoot,
              path: 'dist/runtime/native-source-identity.json',
              content: '"invalid"',
            });
            if (throws) throw new Error('compiler execution failed');
            return 42;
          },
        }),
      ).rejects.toThrow(throws ? 'compiler execution failed' : 'exit 42');
      expect(await readIdentity(paths.packageRoot)).toBeNull();
    },
  );

  test.each(['untracked', 'no-git'])(
    'ordinary compilation without provable source retains unknown: %s',
    async (kind) => {
      const paths = await fixture();
      if (kind === 'no-git') await rm(resolve(paths.root, '.git'), { recursive: true });
      else await writeFixture({ root: paths.root, path: 'apps/api/new.ts', content: 'untracked' });
      let compiled = false;
      await buildNativeSourcePackage({
        ...paths,
        compile: async () => {
          compiled = true;
          return 0;
        },
      });
      expect(compiled).toBe(true);
      expect(await readIdentity(paths.packageRoot)).toBeNull();
      expect(await verifyNativeSourceBuild(paths)).toBe(false);
    },
  );

  test.each(['native-source-manifest.json', 'native-source-identity.json'])(
    'does not authorize tampered output %s',
    async (name) => {
      const paths = await fixture();
      await buildNativeSourcePackage({ ...paths, compile: async () => 0 });
      const value = name.includes('manifest')
        ? '{"schemaVersion":1,"digest":"' +
          '0'.repeat(64) +
          '","inputs":[{"path":"wrong","mode":"100644","sha256":"' +
          '0'.repeat(64) +
          '"}]}'
        : '{"schemaVersion":1,"digest":"' + '0'.repeat(64) + '"}';
      await writeFixture({ root: paths.packageRoot, path: 'dist/runtime/' + name, content: value });
      await expect(verifyNativeSourceBuild(paths)).rejects.toThrow();
      expect(await readIdentity(paths.packageRoot)).toBeNull();
    },
  );
});

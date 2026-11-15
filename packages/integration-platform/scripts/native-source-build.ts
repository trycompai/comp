import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { captureNativeSource, type NativeSourceManifest } from './native-source-inputs';

const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  inputs: z
    .array(
      z.object({
        path: z.string(),
        mode: z.enum(['100644', '100755']),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    )
    .min(1),
});

export interface NativeBuildPaths {
  root: string;
  packageRoot: string;
}

async function writeIdentity({
  packageRoot,
  manifest,
}: {
  packageRoot: string;
  manifest: NativeSourceManifest | null;
}): Promise<void> {
  const output = resolve(packageRoot, 'dist/runtime');
  await mkdir(output, { recursive: true });
  // Keep the detailed build manifest out of the JSON imported by frontend bundles.
  await writeFile(resolve(output, 'native-source-manifest.json'), JSON.stringify(manifest) + '\n');
  await writeFile(
    resolve(output, 'native-source-identity.json'),
    JSON.stringify(manifest ? { schemaVersion: 1, digest: manifest.digest } : null) + '\n',
  );
}

export async function buildNativeSourcePackage({
  root,
  packageRoot,
  compile,
}: NativeBuildPaths & {
  compile: () => Promise<number>;
}): Promise<void> {
  await writeIdentity({ packageRoot, manifest: null });
  let before: NativeSourceManifest | null;
  try {
    before = await captureNativeSource(root);
  } catch {
    before = null;
  }
  let status: number;
  try {
    status = await compile();
  } catch (error) {
    await writeIdentity({ packageRoot, manifest: null });
    throw error;
  }
  if (status !== 0) {
    await writeIdentity({ packageRoot, manifest: null });
    throw new Error(`Integration platform compiler failed with exit ${status}`);
  }
  if (!before) {
    await writeIdentity({ packageRoot, manifest: null });
    console.warn('Native source identity unavailable; automatic task completion stays disabled');
    return;
  }
  try {
    const after = await captureNativeSource(root);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      throw new Error('Native source changed during compilation');
    }
    await writeIdentity({ packageRoot, manifest: after });
  } catch (error) {
    await writeIdentity({ packageRoot, manifest: null });
    throw error;
  }
}

export async function verifyNativeSourceBuild({
  root,
  packageRoot,
}: NativeBuildPaths): Promise<boolean> {
  const output = resolve(packageRoot, 'dist/runtime');
  try {
    const raw: unknown = JSON.parse(
      await readFile(resolve(output, 'native-source-manifest.json'), 'utf8'),
    );
    const manifest = manifestSchema.safeParse(raw);
    if (!manifest.success) {
      await writeIdentity({ packageRoot, manifest: null });
      return false;
    }
    const current = await captureNativeSource(root);
    if (JSON.stringify(manifest.data) !== JSON.stringify(current)) {
      throw new Error('Native source identity is stale; rebuild @trycompai/integration-platform');
    }
    const identity: unknown = JSON.parse(
      await readFile(resolve(output, 'native-source-identity.json'), 'utf8'),
    );
    const expected = { schemaVersion: 1, digest: current.digest };
    if (JSON.stringify(identity) !== JSON.stringify(expected)) {
      throw new Error('Native source identity differs from its verified build manifest');
    }
    return true;
  } catch (error) {
    await writeIdentity({ packageRoot, manifest: null });
    throw error;
  }
}

const script = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === script) {
  const packageRoot = resolve(dirname(script), '..');
  const root = resolve(packageRoot, '../..');
  if (process.argv[2] === 'verify') {
    const verified = await verifyNativeSourceBuild({ root, packageRoot });
    if (!verified)
      console.warn('Native source identity is unknown; automatic completion stays disabled');
  } else if (process.argv[2] === 'build') {
    await buildNativeSourcePackage({
      root,
      packageRoot,
      compile: async () => {
        const result = spawnSync('bun', ['run', 'tsc'], { cwd: packageRoot, stdio: 'inherit' });
        if (result.error) throw result.error;
        return result.status ?? 1;
      },
    });
  } else {
    throw new Error('Expected native-source-build.ts build or verify');
  }
}

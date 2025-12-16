import type {
  BuildContext,
  BuildExtension,
  BuildManifest,
} from '@trigger.dev/build';
import { existsSync } from 'node:fs';
import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/**
 * Custom Trigger.dev build extension for @comp/integration-platform workspace package.
 *
 * Since @comp/integration-platform is a workspace package (not published to npm),
 * we need to manually copy its built dist files into the trigger.dev deployment.
 */
export function integrationPlatformExtension(): IntegrationPlatformExtension {
  return new IntegrationPlatformExtension();
}

class IntegrationPlatformExtension implements BuildExtension {
  public readonly name = 'IntegrationPlatformExtension';

  externalsForTarget(target: string) {
    if (target === 'dev') {
      return [];
    }
    // Mark as external so esbuild doesn't try to bundle it
    return ['@comp/integration-platform'];
  }

  async onBuildComplete(context: BuildContext, manifest: BuildManifest) {
    if (context.target === 'dev') {
      return;
    }

    // Find the integration-platform package dist
    const packageDistPath = this.findPackageDist(context.workingDir);

    if (!packageDistPath) {
      throw new Error(
        [
          'IntegrationPlatformExtension could not find @comp/integration-platform dist.',
          'Make sure the package is built (run `bun run build` in packages/integration-platform).',
          'Searched in: ' +
            resolve(
              context.workingDir,
              '../../packages/integration-platform/dist',
            ),
        ].join('\n'),
      );
    }

    context.logger.debug(
      `Found integration-platform dist at ${packageDistPath}`,
    );

    // Copy the entire dist to the build output
    const destPath = resolve(
      manifest.outputPath,
      'node_modules/@comp/integration-platform',
    );
    const destDistPath = resolve(destPath, 'dist');

    await mkdir(destDistPath, { recursive: true });

    // Copy dist files
    await cp(packageDistPath, destDistPath, { recursive: true });

    // Copy package.json for proper module resolution
    const packageJsonPath = resolve(dirname(packageDistPath), 'package.json');
    if (existsSync(packageJsonPath)) {
      await cp(packageJsonPath, resolve(destPath, 'package.json'));
    }

    context.logger.log(
      'Copied @comp/integration-platform to deployment bundle',
    );
  }

  private findPackageDist(workingDir: string): string | undefined {
    // Look for the package relative to the api app
    const candidates = [
      resolve(workingDir, '../../packages/integration-platform/dist'),
      resolve(workingDir, '../packages/integration-platform/dist'),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }
}

import type {
  BuildContext,
  BuildExtension,
  BuildManifest,
} from '@trigger.dev/build';
import type { Plugin } from 'esbuild';
import { existsSync } from 'node:fs';
import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const PACKAGE_NAME = '@comp/integration-platform';

/**
 * Custom Trigger.dev build extension for @comp/integration-platform workspace package.
 *
 * Since @comp/integration-platform is a workspace package (not published to npm),
 * we need to:
 * 1. Add an esbuild plugin to resolve the import path during build
 * 2. Copy the built dist files into the trigger.dev deployment
 */
export function integrationPlatformExtension(): IntegrationPlatformExtension {
  return new IntegrationPlatformExtension();
}

class IntegrationPlatformExtension implements BuildExtension {
  public readonly name = 'IntegrationPlatformExtension';
  private _packagePath: string | undefined;

  async onBuildStart(context: BuildContext) {
    if (context.target === 'dev') {
      return;
    }

    // Find the package path
    this._packagePath = this.findPackageRoot(context.workingDir);

    if (!this._packagePath) {
      throw new Error(
        [
          `IntegrationPlatformExtension could not find ${PACKAGE_NAME}.`,
          'Make sure the package is built (run `bun run build` in packages/integration-platform).',
        ].join('\n'),
      );
    }

    context.logger.debug(`Found integration-platform at ${this._packagePath}`);

    // Register esbuild plugin to resolve the workspace package
    const packagePath = this._packagePath;
    const resolvePlugin: Plugin = {
      name: 'resolve-integration-platform',
      setup(build) {
        // Resolve bare import
        build.onResolve({ filter: /^@comp\/integration-platform$/ }, () => {
          return {
            path: resolve(packagePath, 'dist/index.js'),
          };
        });

        // Resolve subpath imports like @comp/integration-platform/types
        build.onResolve(
          { filter: /^@comp\/integration-platform\// },
          (args) => {
            const subpath = args.path.replace(`${PACKAGE_NAME}/`, '');
            return {
              path: resolve(packagePath, 'dist', `${subpath}/index.js`),
            };
          },
        );
      },
    };

    context.registerPlugin(resolvePlugin);
  }

  async onBuildComplete(context: BuildContext, manifest: BuildManifest) {
    if (context.target === 'dev') {
      return;
    }

    const packagePath = this._packagePath;
    if (!packagePath) {
      return;
    }

    const packageDistPath = resolve(packagePath, 'dist');

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
    const packageJsonPath = resolve(packagePath, 'package.json');
    if (existsSync(packageJsonPath)) {
      await cp(packageJsonPath, resolve(destPath, 'package.json'));
    }

    context.logger.log(
      'Copied @comp/integration-platform to deployment bundle',
    );
  }

  private findPackageRoot(workingDir: string): string | undefined {
    // Look for the package relative to the api app
    const candidates = [
      resolve(workingDir, '../../packages/integration-platform'),
      resolve(workingDir, '../packages/integration-platform'),
    ];

    for (const candidate of candidates) {
      if (
        existsSync(candidate) &&
        existsSync(resolve(candidate, 'dist/index.js'))
      ) {
        return candidate;
      }
    }

    return undefined;
  }
}

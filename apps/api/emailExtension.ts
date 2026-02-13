import type {
  BuildContext,
  BuildExtension,
  BuildManifest,
} from '@trigger.dev/build';
import type { Plugin } from 'esbuild';
import { existsSync } from 'node:fs';
import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const PACKAGE_NAME = '@trycompai/email';

/**
 * Custom Trigger.dev build extension for @trycompai/email workspace package.
 *
 * Since @trycompai/email is a workspace package (not published to npm),
 * we need to:
 * 1. Add an esbuild plugin to resolve the import path during build
 * 2. Copy the built dist files into the trigger.dev deployment
 */
export function emailExtension(): EmailExtension {
  return new EmailExtension();
}

class EmailExtension implements BuildExtension {
  public readonly name = 'EmailExtension';
  private _packagePath: string | undefined;

  async onBuildStart(context: BuildContext) {
    if (context.target === 'dev') {
      return;
    }

    this._packagePath = this.findPackageRoot(context.workingDir);

    if (!this._packagePath) {
      throw new Error(
        [
          `EmailExtension could not find ${PACKAGE_NAME}.`,
          'Make sure the package is built (run `bun run build` in packages/email).',
        ].join('\n'),
      );
    }

    context.logger.debug(`Found email package at ${this._packagePath}`);

    const packagePath = this._packagePath;
    const resolvePlugin: Plugin = {
      name: 'resolve-email',
      setup(build) {
        build.onResolve({ filter: /^@trycompai\/email$/ }, () => {
          return {
            path: resolve(packagePath, 'dist/index.js'),
          };
        });

        build.onResolve(
          { filter: /^@trycompai\/email\// },
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

    const destPath = resolve(
      manifest.outputPath,
      'node_modules/@trycompai/email',
    );
    const destDistPath = resolve(destPath, 'dist');

    await mkdir(destDistPath, { recursive: true });

    await cp(packageDistPath, destDistPath, { recursive: true });

    const packageJsonPath = resolve(packagePath, 'package.json');
    if (existsSync(packageJsonPath)) {
      await cp(packageJsonPath, resolve(destPath, 'package.json'));
    }

    context.logger.log(
      'Copied @trycompai/email to deployment bundle',
    );
  }

  private findPackageRoot(workingDir: string): string | undefined {
    const candidates = [
      resolve(workingDir, '../../packages/email'),
      resolve(workingDir, '../packages/email'),
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

import { binaryForRuntime, BuildContext, BuildExtension, BuildManifest } from '@trigger.dev/build';
import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

export type PrismaExtensionOptions = {
  version?: string;
  migrate?: boolean;
  directUrlEnvVarName?: string;
  /**
   * The version of the @trycompai/db package to use
   */
  dbPackageVersion?: string;
};

export function prismaExtension(options: PrismaExtensionOptions = {}): PrismaExtension {
  return new PrismaExtension(options);
}

export class PrismaExtension implements BuildExtension {
  moduleExternals: string[];
  public readonly name = 'PrismaExtension';
  private _resolvedSchemaPath?: string;

  constructor(private options: PrismaExtensionOptions) {
    this.moduleExternals = [
      '@prisma/client',
      '@prisma/engines',
      '@trycompai/db', // Add the published package to externals
    ];
  }

  externalsForTarget(target: any) {
    if (target === 'dev') {
      return [];
    }
    return this.moduleExternals;
  }

  async onBuildStart(context: BuildContext) {
    if (context.target === 'dev') {
      return;
    }

    // Resolve the path to the schema from the published @trycompai/db package
    // In a monorepo, node_modules are typically hoisted to the workspace root
    // Walk up the directory tree to find the workspace root (where node_modules/@trycompai/db exists)
    let workspaceRoot = context.workingDir;
    let dbPackagePath = resolve(workspaceRoot, 'node_modules/@trycompai/db/dist/schema.prisma');

    // If not found in working dir, try parent directories
    while (!existsSync(dbPackagePath) && workspaceRoot !== dirname(workspaceRoot)) {
      workspaceRoot = dirname(workspaceRoot);
      dbPackagePath = resolve(workspaceRoot, 'node_modules/@trycompai/db/dist/schema.prisma');
    }

    this._resolvedSchemaPath = dbPackagePath;

    context.logger.debug(`Workspace root: ${workspaceRoot}`);
    context.logger.debug(
      `Resolved the prisma schema from @trycompai/db package to: ${this._resolvedSchemaPath}`,
    );

    // Debug: List contents of the @trycompai/db package directory
    const dbPackageDir = resolve(workspaceRoot, 'node_modules/@trycompai/db');
    const dbDistDir = resolve(workspaceRoot, 'node_modules/@trycompai/db/dist');

    try {
      const { readdirSync } = require('node:fs');
      context.logger.debug(`@trycompai/db package directory contents:`, readdirSync(dbPackageDir));
      context.logger.debug(`@trycompai/db/dist directory contents:`, readdirSync(dbDistDir));
    } catch (err) {
      context.logger.debug(`Failed to list directory contents:`, err);
    }

    // Check that the prisma schema exists in the published package
    if (!existsSync(this._resolvedSchemaPath)) {
      throw new Error(
        `PrismaExtension could not find the prisma schema at ${this._resolvedSchemaPath}. Make sure @trycompai/db package is installed with version ${this.options.dbPackageVersion || 'latest'}`,
      );
    }
  }

  async onBuildComplete(context: BuildContext, manifest: BuildManifest) {
    if (context.target === 'dev') {
      return;
    }

    assert(this._resolvedSchemaPath, 'Resolved schema path is not set');

    context.logger.debug('Looking for @prisma/client in the externals', {
      externals: manifest.externals,
    });

    const prismaExternal = manifest.externals?.find(
      (external) => external.name === '@prisma/client',
    );
    const version = prismaExternal?.version ?? this.options.version;

    if (!version) {
      throw new Error(
        `PrismaExtension could not determine the version of @prisma/client. It's possible that the @prisma/client was not used in the project. If this isn't the case, please provide a version in the PrismaExtension options.`,
      );
    }

    context.logger.debug(
      `PrismaExtension is generating the Prisma client for version ${version} from @trycompai/db package`,
    );

    const commands: string[] = [];
    const env: Record<string, string | undefined> = {};

    // Copy the prisma schema from the published package to the build output path
    const schemaDestinationPath = join(manifest.outputPath, 'prisma', 'schema.prisma');
    context.logger.debug(
      `Copying the prisma schema from ${this._resolvedSchemaPath} to ${schemaDestinationPath}`,
    );
    await cp(this._resolvedSchemaPath, schemaDestinationPath);

    // Add prisma generate command to generate the client from the copied schema
    commands.push(
      `${binaryForRuntime(manifest.runtime)} node_modules/prisma/build/index.js generate --schema=./prisma/schema.prisma`,
    );

    // Only handle migrations if requested
    if (this.options.migrate) {
      context.logger.debug(
        'Migration support not implemented for published package - please handle migrations separately',
      );
      // You could add migration commands here if needed
      // commands.push(`${binaryForRuntime(manifest.runtime)} pnpx prisma migrate deploy`);
    }

    // Set up environment variables
    env.DATABASE_URL = manifest.deploy.env?.DATABASE_URL;

    if (this.options.directUrlEnvVarName) {
      env[this.options.directUrlEnvVarName] =
        manifest.deploy.env?.[this.options.directUrlEnvVarName] ??
        process.env[this.options.directUrlEnvVarName];
      if (!env[this.options.directUrlEnvVarName]) {
        context.logger.warn(
          `prismaExtension could not resolve the ${this.options.directUrlEnvVarName} environment variable. Make sure you add it to your environment variables or provide it as an environment variable to the deploy CLI command. See our docs for more info: https://trigger.dev/docs/deploy-environment-variables`,
        );
      }
    } else {
      env.DIRECT_URL = manifest.deploy.env?.DIRECT_URL;
      env.DIRECT_DATABASE_URL = manifest.deploy.env?.DIRECT_DATABASE_URL;
    }

    if (!env.DATABASE_URL) {
      context.logger.warn(
        'prismaExtension could not resolve the DATABASE_URL environment variable. Make sure you add it to your environment variables. See our docs for more info: https://trigger.dev/docs/deploy-environment-variables',
      );
    }

    context.logger.debug('Adding the prisma layer with the following commands', {
      commands,
      env,
      dependencies: {
        prisma: version,
        '@trycompai/db': this.options.dbPackageVersion || 'latest',
      },
    });

    context.addLayer({
      id: 'prisma',
      commands,
      dependencies: {
        prisma: version,
        '@trycompai/db': this.options.dbPackageVersion || 'latest',
      },
      build: {
        env,
      },
    });
  }
}

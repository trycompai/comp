import { BuildContext, BuildExtension, BuildManifest } from '@trigger.dev/build';

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

    context.logger.debug('Using published @trycompai/db package - no local generation needed');
  }

  async onBuildComplete(context: BuildContext, manifest: BuildManifest) {
    if (context.target === 'dev') {
      return;
    }

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
      `PrismaExtension is using Prisma client version ${version} from published package`,
    );

    const commands: string[] = [];
    const env: Record<string, string | undefined> = {};

    // Only handle migrations if requested
    if (this.options.migrate) {
      context.logger.debug(
        'Migration support not implemented for published package - please handle migrations separately',
      );
      // You could add migration commands here if needed
      // commands.push(`${binaryForRuntime(manifest.runtime)} npx prisma migrate deploy`);
    }

    // Set up environment variables
    env.DATABASE_URL = manifest.deploy.env?.DATABASE_URL;

    if (this.options.directUrlEnvVarName) {
      env[this.options.directUrlEnvVarName] =
        manifest.deploy.env?.[this.options.directUrlEnvVarName] ??
        process.env[this.options.directUrlEnvVarName];
      if (!env[this.options.directUrlEnvVarName]) {
        context.logger.warn(
          `prismaExtension could not resolve the ${this.options.directUrlEnvVarName} environment variable. Make sure you add it to your environment variables or provide it as an environment variable to the deploy CLI command.`,
        );
      }
    } else {
      env.DIRECT_URL = manifest.deploy.env?.DIRECT_URL;
      env.DIRECT_DATABASE_URL = manifest.deploy.env?.DIRECT_DATABASE_URL;
    }

    if (!env.DATABASE_URL) {
      context.logger.warn(
        'prismaExtension could not resolve the DATABASE_URL environment variable. Make sure you add it to your environment variables.',
      );
    }

    context.logger.debug('Adding the prisma layer for published package', {
      commands,
      env,
      dependencies: {
        '@prisma/client': version,
        '@trycompai/db': this.options.dbPackageVersion || 'latest',
      },
    });

    context.addLayer({
      id: 'prisma',
      commands,
      dependencies: {
        '@prisma/client': version,
        '@trycompai/db': this.options.dbPackageVersion || 'latest',
      },
      build: {
        env: {
          ...env,
          PRISMA_CLI_BINARY_TARGETS: 'debian-openssl-3.0.x',
        },
      },
    });
  }
}

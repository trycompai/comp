import type { BuildContext, BuildExtension, BuildManifest } from '@trigger.dev/build';
import { existsSync } from 'node:fs';
import { cp, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

// Path relative to the monorepo root (apps/api or apps/app → ../../packages/db/certs/...)
const BUNDLE_RELATIVE_FROM_APP = '../../packages/db/certs/rds-global-bundle.pem';
const BUNDLE_DEST_REL = 'certs/rds-global-bundle.pem';

function findBundleSrc(workingDir: string): string | undefined {
  // Walk up from workingDir to find the cert — handles both normal checkouts and git worktrees
  // where workspaceDir points to the main worktree root (wrong for us).
  const candidates = [
    resolve(workingDir, BUNDLE_RELATIVE_FROM_APP),
    resolve(workingDir, '../packages/db/certs/rds-global-bundle.pem'),
    resolve(workingDir, 'packages/db/certs/rds-global-bundle.pem'),
  ];

  return candidates.find((c) => existsSync(c));
}

export function caBundleExtension(): BuildExtension {
  return {
    name: 'CABundleExtension',
    onBuildStart: (context) => {
      // Real OS env var at task spawn time — verified flow:
      //   addLayer.deploy.env → manifest.deploy.sync.env → syncEnvVarsWithServer →
      //   taskRunProcessProvider injects into worker env before Node TLS init.
      context.addLayer({
        id: 'ca-bundle-env',
        deploy: {
          env: { NODE_EXTRA_CA_CERTS: `/app/${BUNDLE_DEST_REL}` },
          override: true,
        },
      });
    },
    onBuildComplete: async (context: BuildContext, manifest: BuildManifest) => {
      const src = findBundleSrc(context.workingDir);
      if (!src) {
        throw new Error(
          `CABundleExtension: rds-global-bundle.pem not found. Searched relative to ${context.workingDir}`,
        );
      }
      const dest = join(manifest.outputPath, BUNDLE_DEST_REL);
      await mkdir(dirname(dest), { recursive: true });
      await cp(src, dest);
      context.logger.log(`Copied RDS CA bundle to ${BUNDLE_DEST_REL}`);
    },
  };
}

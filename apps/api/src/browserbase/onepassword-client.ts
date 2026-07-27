import { Logger } from '@nestjs/common';

type OnePasswordModule = typeof import('@1password/sdk');
export type OnePasswordClient = Awaited<
  ReturnType<OnePasswordModule['createClient']>
>;

const OP_INTEGRATION_NAME = 'Comp AI Browser Automations';
const OP_INTEGRATION_VERSION = '1.0.0';

const logger = new Logger('OnePasswordClient');
let clientPromise: Promise<OnePasswordClient> | null = null;

export function getOnePasswordServiceAccountToken(): string | undefined {
  const token = process.env.OP_SERVICE_ACCOUNT_TOKEN?.trim();
  return token ? token : undefined;
}

export function isOnePasswordConfigured(): boolean {
  return Boolean(getOnePasswordServiceAccountToken());
}

// Dynamic import keeps the WASM-backed SDK out of the module graph until it is
// actually needed, so runtimes that never touch 1Password don't pay to load it
// and bundlers don't have to resolve the WASM core eagerly. Exported so the
// write path can read the SDK's runtime enums (ItemCategory/ItemFieldType)
// without a static import that would defeat the lazy load.
export async function loadOnePasswordModule(): Promise<OnePasswordModule> {
  return import('@1password/sdk');
}

export async function getOnePasswordClient(): Promise<OnePasswordClient> {
  const token = getOnePasswordServiceAccountToken();
  if (!token) {
    throw new Error(
      'OP_SERVICE_ACCOUNT_TOKEN is not configured; cannot reach 1Password.',
    );
  }

  if (!clientPromise) {
    clientPromise = (async () => {
      const { createClient } = await loadOnePasswordModule();
      logger.log('Initializing 1Password service account client.');
      return createClient({
        auth: token,
        integrationName: OP_INTEGRATION_NAME,
        integrationVersion: OP_INTEGRATION_VERSION,
      });
    })().catch((error: unknown) => {
      // Reset so a transient failure doesn't permanently poison the singleton.
      clientPromise = null;
      throw error;
    });
  }

  return clientPromise;
}

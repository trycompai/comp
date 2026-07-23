import { Logger } from '@nestjs/common';
import {
  type BrowserCredentialVaultAdapter,
  type RuntimeCredentialMaterial,
} from './credential-vault';
import {
  getOnePasswordClient,
  type OnePasswordClient,
} from './onepassword-client';
import {
  ONEPASSWORD_PROVIDER,
  buildFieldReference,
  buildTotpReference,
  PASSWORD_FIELD_TITLE,
  USERNAME_FIELD_TITLE,
} from './onepassword-credential-item';

/**
 * Resolves a browser auth profile's stored login (username, password, live TOTP)
 * from 1Password at run time using its `op://<vault>/<item>` reference. Secrets
 * are fetched just-in-time and never persisted or logged.
 */
export class OnePasswordCredentialVaultAdapter implements BrowserCredentialVaultAdapter {
  private readonly logger = new Logger(OnePasswordCredentialVaultAdapter.name);

  async resolveCredentialReference(params: {
    profileId: string;
    provider?: string | null;
    externalItemRef?: string | null;
    connectionId?: string | null;
  }): Promise<RuntimeCredentialMaterial | null> {
    if (params.provider !== ONEPASSWORD_PROVIDER) return null;

    const itemRef = params.externalItemRef?.trim();
    if (!itemRef) return null;

    const client = await getOnePasswordClient();

    const [username, password] = await Promise.all([
      this.resolveField(
        client,
        buildFieldReference(itemRef, USERNAME_FIELD_TITLE),
      ),
      this.resolveField(
        client,
        buildFieldReference(itemRef, PASSWORD_FIELD_TITLE),
      ),
    ]);
    // Resolve the OTP separately so its rotation window is as fresh as possible.
    const totpCode = await this.resolveField(
      client,
      buildTotpReference(itemRef),
    );

    if (!username && !password && !totpCode) return null;

    return {
      username: username ?? undefined,
      password: password ?? undefined,
      totpCode: totpCode ?? undefined,
    };
  }

  private async resolveField(
    client: OnePasswordClient,
    reference: string,
  ): Promise<string | null> {
    try {
      const value = await client.secrets.resolve(reference);
      return value?.trim() ? value : null;
    } catch {
      // A missing optional field (e.g. a login with no TOTP configured) resolves
      // as an error; treat it as absent rather than failing the whole sign-in.
      this.logger.debug(`1Password reference not resolvable: ${reference}`);
      return null;
    }
  }
}

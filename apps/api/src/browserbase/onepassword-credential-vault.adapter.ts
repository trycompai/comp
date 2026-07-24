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
  TOTP_FIELD_TITLE,
  USERNAME_FIELD_TITLE,
} from './onepassword-credential-item';

const RESERVED_FIELD_TITLES = new Set<string>([
  USERNAME_FIELD_TITLE,
  PASSWORD_FIELD_TITLE,
  TOTP_FIELD_TITLE,
]);

function parseItemRef(itemRef: string): { vaultId?: string; itemId?: string } {
  const [vaultId, itemId] = itemRef.replace(/^op:\/\//, '').split('/');
  return { vaultId, itemId };
}

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
    const extraFields = await this.resolveExtraFields(client, itemRef);

    if (!username && !password && !totpCode && extraFields.length === 0) {
      return null;
    }

    return {
      username: username ?? undefined,
      password: password ?? undefined,
      totpCode: totpCode ?? undefined,
      extraFields: extraFields.length > 0 ? extraFields : undefined,
    };
  }

  // Reads any site-specific custom fields (workspace, subdomain, …) the customer
  // added. Best-effort: a vault without custom fields (or an older SDK) just
  // yields none, and never blocks the standard username/password/TOTP path.
  private async resolveExtraFields(
    client: OnePasswordClient,
    itemRef: string,
  ): Promise<{ label: string; value: string }[]> {
    try {
      const { vaultId, itemId } = parseItemRef(itemRef);
      if (!vaultId || !itemId) return [];
      const item = await client.items.get(vaultId, itemId);
      return item.fields
        .filter(
          (field) =>
            !RESERVED_FIELD_TITLES.has(field.title) &&
            Boolean(field.value?.trim()),
        )
        .map((field) => ({ label: field.title, value: field.value }));
    } catch {
      return [];
    }
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

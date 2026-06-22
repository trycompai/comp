export interface RuntimeCredentialMaterial {
  username?: string;
  password?: string;
  totpCode?: string;
}

export const BROWSER_CREDENTIAL_VAULT_ADAPTER =
  'BROWSER_CREDENTIAL_VAULT_ADAPTER';

export interface BrowserCredentialVaultAdapter {
  resolveCredentialReference(params: {
    profileId: string;
    provider?: string | null;
    externalItemRef?: string | null;
    connectionId?: string | null;
  }): Promise<RuntimeCredentialMaterial | null>;
}

export class NoopBrowserCredentialVaultAdapter
  implements BrowserCredentialVaultAdapter
{
  async resolveCredentialReference(_params: {
    profileId: string;
    provider?: string | null;
    externalItemRef?: string | null;
    connectionId?: string | null;
  }): Promise<RuntimeCredentialMaterial | null> {
    return null;
  }
}

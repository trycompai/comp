export interface RuntimeCredentialMaterial {
  username?: string;
  password?: string;
  totpCode?: string;
}

export interface BrowserCredentialVaultAdapter {
  resolveCredentialReference(params: {
    profileId: string;
  }): Promise<RuntimeCredentialMaterial | null>;
}

export class NoopBrowserCredentialVaultAdapter
  implements BrowserCredentialVaultAdapter
{
  async resolveCredentialReference(): Promise<RuntimeCredentialMaterial | null> {
    return null;
  }
}

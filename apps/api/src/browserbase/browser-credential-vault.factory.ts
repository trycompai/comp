import {
  type BrowserCredentialVaultAdapter,
  NoopBrowserCredentialVaultAdapter,
} from './credential-vault';
import { isOnePasswordConfigured } from './onepassword-client';
import { OnePasswordCredentialVaultAdapter } from './onepassword-credential-vault.adapter';

/**
 * Picks the credential vault adapter for the current runtime: the 1Password
 * adapter when a service account token is configured, otherwise the Noop adapter
 * (which resolves nothing, preserving today's human re-auth behavior).
 */
export function resolveBrowserCredentialVaultAdapter(): BrowserCredentialVaultAdapter {
  if (isOnePasswordConfigured()) {
    return new OnePasswordCredentialVaultAdapter();
  }
  return new NoopBrowserCredentialVaultAdapter();
}

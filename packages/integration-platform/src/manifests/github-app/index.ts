/**
 * GitHub App Integration Manifest (CS-710)
 *
 * A read-only GitHub integration built on a GitHub *App* rather than the legacy
 * `github` OAuth App.
 *
 * Why this exists: an OAuth App can only reach private repositories via the broad
 * `repo` scope, which unavoidably grants **write** access (there is no read-only
 * scope for private repos). Customers who were promised a read-only integration
 * see that write permission at connect time. A GitHub App instead exposes
 * fine-grained, READ-ONLY permissions and lets the customer choose exactly which
 * repositories to share.
 *
 * This is a NEW, additive integration — the existing `github` OAuth integration
 * is left completely untouched so current connections keep working. New/concerned
 * customers opt into this one.
 *
 * Connect flow (user-to-server token):
 *   1. The customer is sent to the App's installation page
 *      (`https://github.com/apps/{APP_SLUG}/installations/new`).
 *   2. They install the App on their org/account and pick repositories.
 *   3. With "Request user authorization (OAuth) during installation" enabled on
 *      the App, GitHub redirects back through the OAuth flow and returns a `code`
 *      (plus `installation_id`).
 *   4. The shared OAuth callback exchanges the `code` for a user-to-server access
 *      token (read-only, capped by the App's permissions) and stores it like any
 *      other OAuth token. The `installation_id` is persisted on the connection so
 *      a future server-to-server (installation token) upgrade needs no re-connect.
 *
 * The five checks are reused verbatim from the `github` manifest — only the way
 * the token is obtained differs (read-only App vs read/write OAuth App), so there
 * is no logic duplication and both integrations stay in lockstep.
 */

import type { IntegrationManifest } from '../../types';
import {
  branchProtectionCheck,
  codeScanningCheck,
  dependabotCheck,
  sanitizedInputsCheck,
  twoFactorAuthCheck,
} from '../github/checks';

export const githubAppManifest: IntegrationManifest = {
  id: 'github-app',
  name: 'GitHub App',
  description:
    'Connect GitHub with secure, read-only access to the repositories you choose. Monitors repository security, branch protection, and organization settings.',
  category: 'Development',
  logoUrl: 'https://img.logo.dev/github.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  docsUrl: 'https://docs.trycomp.ai/integrations/github',

  // API configuration for the ctx.fetch helper (identical to the OAuth GitHub).
  baseUrl: 'https://api.github.com',
  defaultHeaders: {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'CompAI-Integration',
  },

  auth: {
    type: 'oauth2',
    config: {
      // "Connect" installs the GitHub App. {APP_SLUG} is replaced at runtime with
      // customSettings.appSlug from the configured platform/org credentials
      // (reuses the same token-substitution mechanism as Rippling's {APP_NAME}).
      authorizeUrl: 'https://github.com/apps/{APP_SLUG}/installations/new',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      // GitHub Apps ignore OAuth scopes — permissions come from the App's own
      // configuration (set to read-only when the App is created). Intentionally
      // empty so no scope is requested at connect time.
      scopes: [],
      pkce: false,
      clientAuthMethod: 'body',
      // This is a GitHub App *installation* flow, not a standard OAuth authorize.
      // The connect step redirects to the install URL; the callback still returns
      // an OAuth `code` (with user-authorization-during-installation enabled).
      appInstallFlow: true,
      // With "Expire user authorization tokens" DISABLED on the App, the token is
      // long-lived (like the legacy GitHub OAuth token), so no refresh is needed.
      supportsRefreshToken: false,
      revoke: {
        // Revoke the *grant* (app authorization) so a reconnect starts fresh.
        url: 'https://api.github.com/applications/{CLIENT_ID}/grant',
        method: 'DELETE',
        auth: 'basic',
        body: 'json',
        tokenField: 'access_token',
      },
      setupInstructions: `Create the GitHub App once (a GitHub organization owner must do this):
1. GitHub > Settings > Developer settings > GitHub Apps > "New GitHub App".
2. Set "Callback URL" to the callback URL shown below, and enable
   "Request user authorization (OAuth) during installation".
3. Disable "Expire user authorization tokens" (so tokens stay valid, like the
   old integration).
4. Under Permissions, grant READ-ONLY access:
   • Repository → Metadata, Contents, Pull requests, Administration, Dependabot alerts
   • Organization → Members
5. Create the App, then generate a client secret.
6. Enter the Client ID, Client Secret, and the App slug (the "<slug>" in the
   App's public URL github.com/apps/<slug>) in the credentials form.`,
      createAppUrl: 'https://github.com/settings/apps/new',
      additionalOAuthSettings: [
        {
          id: 'appSlug',
          label: 'GitHub App Slug',
          type: 'text',
          required: true,
          placeholder: 'comp-ai',
          helpText:
            "Your GitHub App's slug from its public page (github.com/apps/<slug>). Used to build the installation URL.",
          token: '{APP_SLUG}',
        },
      ],
    },
  },

  capabilities: ['checks'],

  services: [
    {
      id: 'code-security',
      name: 'Code Security',
      description: 'Branch protection and code review policies',
      enabledByDefault: true,
      implemented: true,
    },
    {
      id: 'dependency-management',
      name: 'Dependency Management',
      description: 'Automated dependency updates and vulnerability scanning',
      enabledByDefault: true,
      implemented: true,
    },
  ],

  // Reused verbatim from the `github` manifest — same objects, same check ids.
  // Check results are keyed per (connectionId, checkId) and connections are
  // provider-scoped, so sharing ids across the two manifests cannot collide.
  checks: [
    branchProtectionCheck,
    codeScanningCheck,
    dependabotCheck,
    sanitizedInputsCheck,
    twoFactorAuthCheck,
  ],

  isActive: true,
};

export default githubAppManifest;

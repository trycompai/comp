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
 * Connect flow (user-to-server token — GitHub separates user *authorization*
 * from app *installation*, so the callback bridges the two):
 *   1. The customer is sent to `https://github.com/login/oauth/authorize` with
 *      the App's client id. This returns a `code` to our callback whether or not
 *      the App is installed (unlike the install URL, which dead-ends on a
 *      "manage" page for already-installed orgs), and it honors `redirect_uri`
 *      for per-environment callback routing.
 *   2. The callback exchanges the `code` for a user-to-server token, then checks
 *      whether the user actually has an installation (GET /user/installations):
 *        - Installed  → finalize the connection.
 *        - NOT installed → redirect to `installUrl` so the user installs the App
 *          on their org and picks repositories. GitHub then returns through
 *          install-time OAuth (with an `installation_id`), the check passes, and
 *          the connection is finalized. The `installation_id` on the return trip
 *          is used only as a loop guard, never persisted.
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
      // Standard OAuth user-authorization flow — but the client id/secret belong
      // to a GitHub *App*, not an OAuth App. GitHub Apps ignore OAuth scopes (the
      // App's own read-only permissions apply), so no scope is requested.
      //
      // We use login/oauth/authorize rather than the App's install URL on
      // purpose: the authorize URL returns a `code` whether or not the App is
      // already installed (the install URL dead-ends on the "manage" page for
      // already-installed orgs) and honors redirect_uri so each environment
      // routes to its own callback.
      authorizeUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      // Where to send a user who authorized but has NOT installed the App yet, so
      // they can install it on their org and choose repositories. The public app
      // slug is the same across environments (one App, multiple callback URLs).
      installUrl: 'https://github.com/apps/comp-ai-compliance/installations/new',
      scopes: [],
      pkce: false,
      clientAuthMethod: 'body',
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
2. Set "Callback URL" to the callback URL shown below (add one per environment),
   and enable "Request user authorization (OAuth) during installation".
3. Disable "Expire user authorization tokens" (so tokens stay valid, like the
   old integration).
4. Under Permissions, grant READ-ONLY access:
   • Repository → Metadata, Contents, Pull requests, Administration, Dependabot alerts
   • Organization → Members
5. Set "Where can this GitHub App be installed?" to "Any account".
6. Create the App, then generate a client secret.
7. Enter the Client ID and Client Secret in the credentials form.`,
      createAppUrl: 'https://github.com/settings/apps/new',
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

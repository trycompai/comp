import type { IntegrationManifest } from '../../types';
import {
  adminPrivilegeChangesCheck,
  adminSecurityEventsCheck,
  employeeAccessCheck,
  twoFactorAuthCheck,
} from './checks';
import {
  adminAuditApprovedActorsVariable,
  adminAuditLookbackDaysVariable,
  targetDomainsVariable,
  targetGroupsVariable,
  syncExcludedEmailsVariable,
  syncIncludedEmailsVariable,
  syncUserFilterModeVariable,
  targetOrgUnitsVariable,
} from './variables';

export const googleWorkspaceManifest: IntegrationManifest = {
  id: 'google-workspace',
  name: 'Google Workspace',
  description: 'Monitor security settings and user compliance in Google Workspace',
  category: 'Identity & Access',
  logoUrl: 'https://img.logo.dev/google.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ&format=png&retina=true',
  docsUrl: 'https://developers.google.com/admin-sdk',
  isActive: true,

  auth: {
    type: 'oauth2',
    config: {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/admin.directory.user.readonly',
        'https://www.googleapis.com/auth/admin.directory.orgunit.readonly',
        // Expands admin roles assigned to groups; without it, group-granted
        // admin access is invisible to the access review.
        'https://www.googleapis.com/auth/admin.directory.group.readonly',
        // Lists verified domains for the domain filter.
        'https://www.googleapis.com/auth/admin.directory.domain.readonly',
        'https://www.googleapis.com/auth/admin.directory.rolemanagement.readonly',
        // Admin audit log (Reports API) — powers the admin-audit service.
        // Connections created before this was added must reconnect to grant it.
        'https://www.googleapis.com/auth/admin.reports.audit.readonly',
      ],
      pkce: false,
      clientAuthMethod: 'body',
      supportsRefreshToken: true,
      authorizationParams: {
        access_type: 'offline',
        // select_account forces Google's account chooser so an admin can switch
        // from a wrong (e.g. non-admin) account when connecting/reconnecting;
        // consent keeps the consent screen so a refresh token is always issued.
        prompt: 'select_account consent',
      },
      setupInstructions: `To enable Google Workspace Admin SDK:
1. Go to Google Cloud Console (console.cloud.google.com)
2. Create or select a project
3. Enable the Admin SDK API (Directory and Reports)
4. Create OAuth 2.0 credentials (Web application type)
5. Add the callback URL shown below to "Authorized redirect URIs"
6. Copy the Client ID and Client Secret

Note: The user authorizing must be a Google Workspace admin.`,
      createAppUrl: 'https://console.cloud.google.com/apis/credentials',
    },
  },

  baseUrl: 'https://admin.googleapis.com',
  defaultHeaders: {
    'Content-Type': 'application/json',
  },

  capabilities: ['checks', 'sync'],

  // Google Workspace is the customer's authoritative employee directory:
  // users provisioned here are employees, users removed here are offboarded.
  // Phase 2 deactivation is intentionally allowed for this provider.
  isDirectorySource: true,

  services: [
    { id: 'user-sync', name: 'User Sync', description: 'Sync users from Google Workspace as organization members', enabledByDefault: true, implemented: true },
    { id: 'mfa-compliance', name: 'MFA Compliance', description: 'Monitor two-factor authentication enforcement', enabledByDefault: true, implemented: true },
    { id: 'admin-audit', name: 'Admin Audit', description: 'Track admin console activity and permission changes', enabledByDefault: true, implemented: true },
  ],

  variables: [
    targetOrgUnitsVariable,
    targetGroupsVariable,
    targetDomainsVariable,
    syncUserFilterModeVariable,
    syncExcludedEmailsVariable,
    syncIncludedEmailsVariable,
    adminAuditLookbackDaysVariable,
    adminAuditApprovedActorsVariable,
  ],

  checks: [
    twoFactorAuthCheck,
    employeeAccessCheck,
    adminPrivilegeChangesCheck,
    adminSecurityEventsCheck,
  ],
};

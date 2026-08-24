import type { IntegrationManifest } from '../../types';
import {
  appAvailabilityCheck,
  backupLogsCheck,
  backupRestorationTestCheck,
  employeeAccessCheck,
} from './checks';

export const msp360BackupManifest: IntegrationManifest = {
  id: 'msp360-backup',
  name: 'MSP360 Backup',
  description:
    'Collect Managed Backup evidence: console/API availability, administrator access, latest backup runs, and restore tests. Uses Provider Login — not the RMM token.',
  category: 'Monitoring',
  logoUrl: 'https://img.logo.dev/msp360.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  docsUrl: 'https://help.mspbackups.com/mbs-api-specification/managed-backup-api/methods/api-methods',
  isActive: true,
  supportsMultipleConnections: false,

  baseUrl: 'https://api.mspbackups.com',
  defaultHeaders: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },

  auth: {
    type: 'custom',
    config: {
      description:
        'Managed Backup Provider Login (username + password). Never paste an RMM API token into this connection.',
      credentialFields: [
        {
          id: 'username',
          label: 'API username',
          type: 'text',
          required: true,
          placeholder: 'api-user@example.com',
          helpText: 'Management Console → Settings → General → API login (Provider Login).',
        },
        {
          id: 'password',
          label: 'API password',
          type: 'password',
          required: true,
          helpText: 'Password for the Managed Backup API user. Not an RMM token.',
        },
        {
          id: 'baseUrl',
          label: 'Backup API base URL',
          type: 'url',
          required: false,
          placeholder: 'https://api.mspbackups.com',
          helpText: 'Leave blank for https://api.mspbackups.com unless MSP360 gave you a regional host.',
        },
      ],
      setupInstructions: `Connect MSP360 Backup (not RMM):

1. In the MSP360 / CloudBerry Management Console go to Settings → General → API.
2. Copy the API username and password used for Provider Login (POST /api/Provider/Login).
3. Paste them here. Do not use an RMM API token — that belongs on the separate MSP360 RMM integration.
4. Employee access is GET /api/Administrators only. GET /api/Users is backup customers and is never used as staff.`,
    },
  },

  capabilities: ['checks'],

  services: [
    {
      id: 'availability',
      name: 'Availability',
      description: 'Provider Login plus authenticated API ping',
      enabledByDefault: true,
      implemented: true,
    },
    {
      id: 'user-sync',
      name: 'Administrators',
      description: 'Console administrator roster (not backup customers)',
      enabledByDefault: true,
      implemented: true,
    },
    {
      id: 'backup',
      name: 'Backup monitoring',
      description: 'Latest plan runs and restore-test filter',
      enabledByDefault: true,
      implemented: true,
    },
  ],

  checks: [appAvailabilityCheck, employeeAccessCheck, backupLogsCheck, backupRestorationTestCheck],
};

export default msp360BackupManifest;
export * from './types';

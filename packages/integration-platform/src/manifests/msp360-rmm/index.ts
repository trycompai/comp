import type { IntegrationManifest } from '../../types';
import {
  deviceListCheck,
  infrastructureInventoryCheck,
  monitoringAlertingCheck,
  secureDevicesCheck,
} from './checks';

export const msp360RmmManifest: IntegrationManifest = {
  id: 'msp360-rmm',
  name: 'MSP360 RMM',
  description:
    'Collect RMM fleet evidence: device list, antivirus, monitoring/alerts, and hardware/software inventory. Uses an RMM API Bearer token — not Backup Provider Login.',
  category: 'Infrastructure',
  logoUrl: 'https://images.msp360.com/bimi/msp360-logo.svg',
  docsUrl: 'https://help.mspbackups.com/mbs-api-specification/rmm-api/get-started-rmm-api',
  isActive: true,
  supportsMultipleConnections: false,

  baseUrl: 'https://api.rmm.mspbackups.com',
  defaultHeaders: {
    Accept: 'application/json',
  },

  auth: {
    type: 'api_key',
    config: { in: 'header', name: 'Authorization', prefix: 'Bearer ' },
  },
  credentialFields: [
    {
      id: 'api_key',
      label: 'RMM API token',
      type: 'password',
      required: true,
      helpText:
        'Management Console → Settings → General → RMM API tokens. The admin must have an RMM license. Community Edition has no API. Do not paste Backup Provider Login here.',
    },
    {
      id: 'baseUrl',
      label: 'RMM API base URL',
      type: 'url',
      required: false,
      placeholder: 'https://api.rmm.mspbackups.com',
      helpText: 'Default https://api.rmm.mspbackups.com. Some tenants use a regional host shown in Swagger.',
    },
  ],

  capabilities: ['checks'],

  services: [
    {
      id: 'inventory',
      name: 'Fleet inventory',
      description: 'Host, hardware, and software stats',
      enabledByDefault: true,
      implemented: true,
    },
    {
      id: 'security',
      name: 'Endpoint security',
      description: 'Antivirus / summary stats',
      enabledByDefault: true,
      implemented: true,
    },
    {
      id: 'monitoring',
      name: 'Monitoring',
      description: 'Summary alerts (~10 minute refresh)',
      enabledByDefault: true,
      implemented: true,
    },
  ],

  checks: [deviceListCheck, secureDevicesCheck, monitoringAlertingCheck, infrastructureInventoryCheck],
};

export default msp360RmmManifest;
export * from './types';

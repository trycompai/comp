import type { IntegrationManifest } from '../../types';
import { azureCredentialFields, azureSetupInstructions } from './credentials';

export const azureManifest: IntegrationManifest = {
  id: 'azure',
  name: 'Microsoft Azure',
  description: 'Monitor alerting configurations in Microsoft Azure',
  category: 'Cloud',
  logoUrl: 'https://img.logo.dev/azure.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  docsUrl: 'https://docs.microsoft.com/en-us/azure/defender-for-cloud/',
  isActive: true,

  auth: {
    type: 'custom',
    config: {
      description: 'Azure Service Principal - secure application access',
      credentialFields: azureCredentialFields,
      setupInstructions: azureSetupInstructions,
    },
  },

  baseUrl: 'https://management.azure.com',

  capabilities: ['checks'],

  checks: [],
};

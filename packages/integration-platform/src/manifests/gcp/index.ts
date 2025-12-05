import type { IntegrationManifest } from '../../types';
import { iamAccessCheck, monitoringAlertingCheck, securityFindingsCheck } from './checks';
import { gcpCredentialFields, gcpSetupInstructions } from './credentials';

export const gcpManifest: IntegrationManifest = {
  id: 'gcp',
  name: 'Google Cloud Platform',
  description: 'Monitor security findings, IAM access, and alerting in Google Cloud Platform',
  category: 'Cloud',
  logoUrl:
    'https://img.logo.dev/cloud.google.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ&format=png&retina=true',
  docsUrl: 'https://cloud.google.com/security-command-center/docs',
  isActive: true,

  auth: {
    type: 'custom',
    config: {
      credentialFields: gcpCredentialFields,
      setupInstructions: gcpSetupInstructions,
    },
  },

  capabilities: ['checks'],

  checks: [securityFindingsCheck, iamAccessCheck, monitoringAlertingCheck],
};

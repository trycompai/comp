import type { IntegrationManifest } from '../../types';
import { awsCredentialFields, awsCredentialSchema, awsSetupInstructions } from './credentials';

export const awsManifest: IntegrationManifest = {
  id: 'aws',
  name: 'Amazon Web Services',
  description: 'Monitor security configurations and compliance across your AWS infrastructure',
  category: 'Cloud',
  logoUrl: 'https://img.logo.dev/aws.amazon.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  docsUrl:
    'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html',
  isActive: true,

  auth: {
    type: 'custom',
    config: {
      description: 'AWS IAM Role Assumption - secure cross-account access',
      credentialFields: awsCredentialFields,
      validationSchema: awsCredentialSchema,
      setupInstructions: awsSetupInstructions,
    },
  },

  baseUrl: '',

  capabilities: ['checks'],
  checks: [],
};

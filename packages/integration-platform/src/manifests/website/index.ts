import type { IntegrationManifest } from '../../types';
import {
  contactInformationCheck,
  publicPoliciesCheck,
  tlsHttpsCheck,
} from './checks';

export const manifest: IntegrationManifest = {
  id: 'website',
  name: 'Website',
  description:
    'Automatically verify TLS/HTTPS, public policies, and contact information on your organization website.',
  category: 'Security',
  logoUrl: 'https://img.logo.dev/trycomp.ai?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  docsUrl: 'https://docs.trycomp.ai/integrations/website',

  baseUrl: '',
  defaultHeaders: {},

  auth: {
    type: 'custom',
    config: {
      description:
        'No credentials required. Uses the website URL from your organization settings.',
    },
  },

  capabilities: ['checks'],
  checks: [tlsHttpsCheck, publicPoliciesCheck, contactInformationCheck],
  isActive: true,
};

export default manifest;
export * from './types';

import { Logo } from './assets/logo';
// Import the function directly instead of through integrations
import { fetch } from './src';

// Type the export directly with inline annotation
const config: {
  name: string;
  id: string;
  active: boolean;
  logo: React.ComponentType;
  short_description: string;
  guide_url: string;
  description: string;
  images: unknown[];
  settings: {
    id: string;
    label: string;
    description: string;
    type: string;
    required: boolean;
    value: string;
  }[];
  category: string;
  sync: boolean;
  fetch: any;
} = {
  name: 'Google Cloud Platform',
  id: 'gcp',
  active: true,
  logo: Logo,
  short_description:
    'Connect with Google Cloud Platform to show your cloud infrastructure is compliant.',
  guide_url: 'https://trycomp.ai/docs/cloud-tests/gcp',
  description:
    'Comp AI can automatically collect evidence from your Google Cloud Platform account to show your cloud infrastructure is compliant with different compliance frameworks.',
  images: [],
  settings: [
    {
      id: 'organization_id',
      label: 'Google Cloud organization identifier',
      description: 'The organization identifier of your Google Cloud account',
      type: 'text',
      required: true,
      value: '',
    },
    {
      id: 'service_account_key',
      label: 'Google Cloud service account key',
      description: 'JSON key for a service account with security center access',
      type: 'text',
      required: true,
      value: '',
    },
  ],
  category: 'Cloud',
  sync: true, // This integration syncs on a schedule
  fetch: fetch,
};

export default config;

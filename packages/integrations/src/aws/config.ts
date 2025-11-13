import { getIntegrationHandler } from '../factory';
import { Logo } from './assets/logo';

// Get the handler from the factory
const awsHandler = getIntegrationHandler('aws');

// Type the export directly with inline annotation
const config: {
  name: string;
  id: string;
  active: boolean;
  logo: React.ComponentType;
  short_description: string;
  guide_url: string;
  description: string;
  images: string[]; // array of base64 image strings
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
  name: 'Amazon Web Services',
  id: 'aws',
  active: true,
  logo: Logo,
  short_description:
    'Connect with Amazon Web Services to show your cloud infrastructure is compliant.',
  guide_url: 'https://trycomp.ai/docs/cloud-tests/aws',
  description:
    'Comp AI can automatically collect evidence from your AWS account to show your cloud infrastructure is compliant with different compliance frameworks.',
  images: [],
  settings: [
    {
      id: 'region',
      label: 'AWS region',
      description: 'The region of your AWS account',
      type: 'text',
      required: true,
      value: '',
    },
    {
      id: 'access_key_id',
      label: 'AWS access key ID',
      description: 'The API access key ID for your AWS account',
      type: 'text',
      required: true,
      value: '',
    },
    {
      id: 'secret_access_key',
      label: 'AWS secret access key',
      description: 'The API secret access key for your AWS account',
      type: 'text',
      required: true,
      value: '',
    },
  ],
  category: 'Cloud',
  sync: true, // This integration syncs on a schedule
  // Use the fetch method from the handler
  fetch: awsHandler?.fetch,
};

export default config;

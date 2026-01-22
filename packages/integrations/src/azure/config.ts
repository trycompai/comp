import { getIntegrationHandler } from '../factory';
import { Logo } from './assets/logo';

// Get the handler from the factory
const azureHandler = getIntegrationHandler('azure');

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
    placeholder?: string;
    type: string;
    required: boolean;
    value: string;
  }[];
  category: string;
  sync: boolean;
  fetch: any;
} = {
  name: 'Microsoft Azure',
  id: 'azure',
  active: true,
  logo: Logo,
  short_description: 'Connect with Microsoft Azure to show your cloud infrastructure is compliant.',
  guide_url: 'https://trycomp.ai/docs/cloud-tests/azure',
  description:
    'Comp AI can automatically collect evidence from your Microsoft Azure account to show your cloud infrastructure is compliant with different compliance frameworks.',
  images: [],
  settings: [
    {
      id: 'AZURE_CLIENT_ID',
      label: 'Client ID',
      description: 'The client id from Microsoft Azure',
      type: 'text',
      required: true,
      value: '',
      placeholder: 'Enter your Azure Client ID',
    },
    {
      id: 'AZURE_CLIENT_SECRET',
      label: 'Client Secret',
      description: 'The client secret from Microsoft Azure',
      type: 'text',
      required: true,
      value: '',
      placeholder: 'Enter your Azure Client Secret',
    },
    {
      id: 'AZURE_TENANT_ID',
      label: 'Tenant ID',
      description: 'The tenant id of your Microsoft Azure subscription',
      type: 'text',
      required: true,
      value: '',
      placeholder: 'Enter your Azure Tenant ID',
    },
    {
      id: 'AZURE_SUBSCRIPTION_ID',
      label: 'Subscription ID',
      description: 'The subscription identifier of your Microsoft Azure account',
      type: 'text',
      required: true,
      value: '',
      placeholder: 'Enter your Azure Subscription ID',
    },
  ],
  category: 'Cloud',
  sync: true, // This integration syncs on a schedule
  // Use the fetch method from the handler
  fetch: azureHandler?.fetch,
};

export default config;

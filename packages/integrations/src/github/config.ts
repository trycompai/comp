import { getIntegrationHandler } from '../factory';
import { Logo } from './assets/logo';

// Get the handler from the factory
const githubHandler = getIntegrationHandler('github');

// Type the export directly with inline annotation
const config: {
  name: string;
  id: string;
  active: boolean;
  logo: React.ComponentType;
  short_description: string;
  guide_url: string;
  description: string;
  images: string[];
  settings: {
    id: string;
    label: string;
    description: string;
    type: string;
    required: boolean;
    value: string;
    placeholder?: string;
  }[];
  category: string;
  sync: boolean;
  fetch: any;
} = {
  name: 'GitHub',
  id: 'github',
  active: true,
  logo: Logo,
  short_description: 'Store GitHub credentials for use in automations.',
  guide_url: 'https://trycomp.ai/docs/cloud-tests/github',
  description:
    'This allows AI automations to check repository settings like Dependabot status, branch protection rules, and pull request configurations.',
  images: [],
  settings: [
    {
      id: 'GITHUB_TOKEN',
      label: 'Personal Access Token',
      description: 'Your GitHub personal access token with required permissions',
      type: 'text',
      required: true,
      value: '',
      placeholder: 'ghp_xxxxxxxxxxxx',
    },
  ],
  category: 'Development',
  sync: false, // This integration doesn't sync on a schedule
  // Use the fetch method from the handler
  fetch: githubHandler?.fetch,
};

export default config;

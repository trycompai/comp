import { getIntegrationHandler } from '../factory';
import { Logo } from './assets/logo';

// Get the handler from the factory
const deelHandler = getIntegrationHandler('deel');

export default {
  name: 'Deel',
  description: 'Automatically add/remove employees from Deel, and sync their information.',
  short_description: 'Integrate with Deel to automatically add employees to Comp AI.',
  id: 'deel',
  // Use direct reference to the public image
  logo: Logo,
  category: 'HR',
  active: true,
  // Include both fields and settings for backward compatibility
  settings: [
    {
      id: 'api_key',
      label: 'API Key',
      description: 'Enter your Deel API key',
      type: 'text',
      required: true,
      value: '',
    },
  ],
  fields: [
    {
      name: 'api_key',
      label: 'API Key',
      type: 'password',
      required: true,
      placeholder: 'Enter your Deel API key',
      description: 'You can find your API key in your Deel account settings.',
      encrypted: true,
    },
  ],
  // Add metadata about the integration runs
  metadata: {
    // Define fields for displaying the last run and next run
    lastRun: {
      label: 'Last Sync',
      description: 'The last time this integration successfully ran',
    },
    nextRun: {
      label: 'Next Sync',
      description: 'When this integration will run next (every 24 hours)',
    },
  },
  images: [], // Add empty images array for compatibility
  sync: true, // This integration syncs on a schedule
  // Use the fetch method from the handler
  fetch: deelHandler?.fetch,
};

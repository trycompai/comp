import type { Preview } from '@storybook/react-vite';
import '../styles/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#09090b' },
      ],
    },
  },
  decorators: [
    (Story, context) => {
      const isDark = context.globals?.backgrounds?.value === '#09090b';
      return (
        <div className={isDark ? 'dark' : ''}>
          <div className="bg-background text-foreground p-6 min-h-screen">
            <Story />
          </div>
        </div>
      );
    },
  ],
};

export default preview;

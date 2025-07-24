import type { Config } from 'tailwindcss';
import baseConfig from '../../packages/ui/tailwind.config';

export default {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/invoice/src/**/*.{ts,tsx}',
  ],
  presets: [baseConfig],
} satisfies Config;

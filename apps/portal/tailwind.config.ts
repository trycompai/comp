import baseConfig from '@trycompai/design-system/tailwind.config';
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}', '../../packages/design-system/src/**/*.{ts,tsx}'],
  presets: [baseConfig],
} satisfies Config;

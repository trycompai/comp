import baseConfig from '@trycompai/ui-shadcn/tailwind.config';
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui-shadcn/src/**/*.{ts,tsx}'],
  presets: [baseConfig],
} satisfies Config;

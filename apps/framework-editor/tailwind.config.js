import baseConfig from '@comp/ui/tailwind.config';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/invoice/src/**/*.{ts,tsx}',
  ],
  presets: [baseConfig],
};

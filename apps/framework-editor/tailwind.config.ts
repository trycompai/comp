import baseConfig from '@gideon-defender/ui/tailwind.config';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    '../../node_modules/@gideon-defender/ui/dist/components/**/*.{ts,tsx,js}',
    '../../node_modules/@trycompai/design-system/src/**/*.{ts,tsx}',
  ],
  presets: [baseConfig],
};

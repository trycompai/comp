import baseConfig from '@trycompai/ui/tailwind.config';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    '../../node_modules/@trycompai/ui/dist/components/**/*.{ts,tsx,js}',
  ],
  presets: [baseConfig],
};

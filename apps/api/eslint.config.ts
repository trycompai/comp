import { defineConfig } from 'eslint/config';

import { baseConfig } from '@trycompai/eslint-config/base';

export default defineConfig(
  {
    ignores: ['dist/**'],
  },
  baseConfig,
);

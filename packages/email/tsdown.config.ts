import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/**/*.ts', 'src/**/*.tsx'],
  sourcemap: true,
  dts: true,
});

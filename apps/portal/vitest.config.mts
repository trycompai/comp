import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'e2e'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@db/server': resolve(__dirname, './prisma/server.ts'),
      '@db': resolve(__dirname, './prisma'),
    },
  },
});

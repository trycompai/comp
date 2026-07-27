import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

// No @vitejs/plugin-react on purpose: esbuild already transforms TSX with the
// automatic JSX runtime, and the plugin's vite Plugin type clashes with
// vitest's bundled vite during Next's build-time typecheck on Vercel.
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['app/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});

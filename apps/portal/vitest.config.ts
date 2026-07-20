import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

// No vite plugins on purpose: esbuild already transforms TSX with the automatic
// JSX runtime, and plugin types (e.g. @vitejs/plugin-react, vite-tsconfig-paths)
// can clash with vitest's bundled vite during Next's build-time typecheck on
// Vercel. Aliases are mirrored by hand from tsconfig instead — see
// apps/framework-editor/vitest.config.ts for the same approach.
export default defineConfig({
  test: {
    // jsdom, not node: the include glob covers component tests (.jsx/.tsx) that
    // need DOM APIs (e.g. testing-library's render). Matches apps/app and
    // apps/framework-editor. Node-only tests run fine under jsdom too.
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next'],
  },
  resolve: {
    // Mirror the tsconfig `@/*` path alias so tests can import via `@/...`.
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});

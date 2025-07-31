import { glob } from 'glob';
import { defineConfig } from 'tsup';

const components = glob.sync('src/components/**/*.{ts,tsx}');
const hooks = glob.sync('src/hooks/**/*.{ts,tsx}');
const utils = glob.sync('src/utils/**/*.{ts,tsx}');

export default defineConfig({
  entry: ['src/index.ts', ...components, ...hooks, ...utils],
  format: ['esm'],
  dts: true,
  splitting: false,
  clean: true,
  bundle: false,
  external: ['react', 'react-dom'],
  target: 'es2022',
  platform: 'neutral',
  esbuildOptions(options) {
    // Preserve JSX - let Next.js handle the transformation
    options.jsx = 'preserve';
    options.platform = 'neutral';
    options.packages = 'external';
  },
  outDir: 'dist',
  onSuccess: async () => {
    const { cp } = await import('fs/promises');
    await cp('src/globals.css', 'dist/globals.css');
    await cp('src/editor.css', 'dist/editor.css');
  },
});

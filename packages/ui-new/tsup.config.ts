import { glob } from 'glob';
import { defineConfig } from 'tsup';

const components = glob.sync('src/components/**/*.{ts,tsx}');

export default defineConfig({
  entry: ['src/index.ts', ...components],
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
});

import { defineConfig } from 'tsup';

export default defineConfig({
  // tsup expands these globs itself via tinyglobby (picomatch/fdir). We avoid
  // importing the `glob` package here: loading it during config evaluation
  // pulls in glob→minimatch→brace-expansion (ESM), whose `balanced-match`
  // resolution is fragile under bun's hoisting and breaks the build on CI.
  entry: [
    'src/index.ts',
    'src/components/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    'src/utils/**/*.{ts,tsx}',
  ],
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

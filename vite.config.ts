import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { stripUnusedRouterFramework } from './scripts/strip-framework-loader';
import { stripUnusedExternalFeatures } from './scripts/strip-external-features';

export default defineConfig({
  plugins: [stripUnusedRouterFramework(), stripUnusedExternalFeatures(), tsconfigPaths({ root: import.meta.dirname }), react()],
  base: './',
  resolve: { alias: { papaparse: new URL('./node_modules/papaparse/papaparse.js', import.meta.url).pathname }, dedupe: ['react', 'react-dom', 'react-router'] },
  build: { sourcemap: false },
  server: { host: '127.0.0.1' },
});

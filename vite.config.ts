import { defineConfig } from 'vite';
import path from 'path';

import pkg from './package.json';

export default defineConfig({
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    __VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'Pinaka',
      fileName: format => `pinaka.${format}.js`,
    },
    rollupOptions: {
      external: ['node_modules'],
      output: {
        globals: {},
      },
    },
  },
});

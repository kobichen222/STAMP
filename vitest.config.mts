import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // Use the ESM build (named exports) like the Next.js bundler does.
      'opentype.js': path.resolve(import.meta.dirname, 'node_modules/opentype.js/dist/opentype.mjs'),
    },
  },
  test: { include: ['tests/**/*.test.ts'] },
});

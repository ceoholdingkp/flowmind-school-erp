import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['test/setup.ts'],
  },
  resolve: {
    alias: {
      '@flowmind/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@flowmind/validators': resolve(__dirname, '../../packages/validators/src/index.ts'),
    },
  },
});

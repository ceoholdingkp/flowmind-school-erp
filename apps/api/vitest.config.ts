import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/*.dto.ts', '**/main.ts'],
    },
  },
  resolve: {
    alias: {
      '@flowmind/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@flowmind/validators': resolve(__dirname, '../../packages/validators/src/index.ts'),
    },
  },
});

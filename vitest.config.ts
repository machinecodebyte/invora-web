import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    // The unrestricted fork pool exhausts worker startup capacity on the
    // supported Windows environment, causing test-worker timeouts. Two forks
    // retain parallel execution while keeping the default `npm run test` gate
    // deterministic for local development and CI.
    pool: 'forks',
    maxWorkers: 2,
    globals: false,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'e2e/**'],
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/lib/**/*.ts',
        'src/hooks/**/*.ts',
        'src/components/**/*.tsx',
        'src/types/**/*.ts',
      ],
      exclude: ['src/**/index.ts'],
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
    },
  },
});

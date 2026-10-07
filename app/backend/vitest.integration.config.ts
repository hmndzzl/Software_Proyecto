import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    globals: true,
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    reporters: ['default', 'junit'],
    outputFile: { junit: 'test-results/integration-junit.xml' },
  },
});

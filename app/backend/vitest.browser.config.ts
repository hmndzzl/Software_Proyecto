import { defineConfig } from 'vitest/config';
import integrationConfig from './vitest.integration.config';

export default defineConfig({
  test: {
    ...integrationConfig.test,
    include: ['tests/browser/**/*.test.ts'],
    outputFile: { junit: 'test-results/agenda-ui-junit.xml' },
  },
});

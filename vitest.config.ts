import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

export default defineConfig({
  test: {
    // Run tests in Node environment
    environment: 'node',

    // Global test timeout
    testTimeout: 30000,

    // Include patterns
    include: ['tests/**/*.test.ts', 'tests/**/*.llm.test.ts'],

    // Exclude patterns
    exclude: ['node_modules', '.svelte-kit', 'build'],

    // Reporter
    reporters: ['verbose'],

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['tests/**', 'cli/**', 'src/**', 'scripts/**'],
    },
  },
});

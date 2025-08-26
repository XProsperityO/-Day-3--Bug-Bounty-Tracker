import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: ['**/node_modules/**','dist/**'],
      thresholds: {
        lines: 70,
        statements: 70,
        branches: 60,
        functions: 70,
      }
    }
  }
});

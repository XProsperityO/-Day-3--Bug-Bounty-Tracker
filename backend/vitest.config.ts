import { defineConfig } from 'vitest/config';

// Minimal config: Node environment, standard test globs, avoid worker threads to be
// friendlier on constrained CI/Windows paths.
export default defineConfig({
  test: {
  environment: 'node',
  globals: true,
  setupFiles: ['./test/setup-debug.ts'],
    include: ['test/**/*.test.*', 'test/**/*.spec.*'],
    exclude: ['node_modules', 'dist'],
    // Disable worker threads to avoid Windows path / spawn edge cases in some setups
    // (Vitest will accept this flag in CLI; keeping here for clarity)
    // threads: false // commented because older Vitest versions may not accept it
  },
});

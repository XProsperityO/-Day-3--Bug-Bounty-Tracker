(async () => {
  process.env.NODE_ENV = 'test';
  try {
    // Import the TypeScript source entry using tsx so we reproduce Vitest import behavior
    await import('../src/index.ts');
    // eslint-disable-next-line no-console
    console.log('imported src/index.ts successfully');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('import failed:', err && (err.stack || err));
    process.exit(1);
  }
})();

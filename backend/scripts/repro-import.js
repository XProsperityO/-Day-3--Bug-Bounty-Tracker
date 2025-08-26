try {
  process.env.NODE_ENV = 'test';
  (async () => {
    try {
      // The compiled entrypoint is at dist/index.js
      await import('../dist/index.js');
      // eslint-disable-next-line no-console
      console.log('imported ../dist/index.js successfully');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('import failed:', err && (err.stack || err));
      process.exit(1);
    }
  })();
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('import failed:', err && (err.stack || err));
  process.exit(1);
}

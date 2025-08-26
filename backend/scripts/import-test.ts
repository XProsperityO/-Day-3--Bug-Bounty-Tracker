import 'dotenv/config';
(async () => {
  try {
    console.log('importing test file...');
    await import('../test/integration/billing.integration.test.ts');
    console.log('import succeeded');
  } catch (err) {
    console.error('import error', err && (err.stack || err));
    process.exit(1);
  }
})();

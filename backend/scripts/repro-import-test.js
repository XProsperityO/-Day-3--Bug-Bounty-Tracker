(async ()=>{
  try {
    await import('../test/integration/auth.integration.test.ts');
    console.log('imported test file ok');
  } catch (e) {
    console.error('import failed', e && (e.stack || e));
    process.exit(1);
  }
})();

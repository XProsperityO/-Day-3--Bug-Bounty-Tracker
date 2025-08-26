(async () => {
  process.env.NODE_ENV = 'test';
  try {
    const mod = await import('../src/index.ts');
    const buildServer = mod.buildServer || mod.default && mod.default.buildServer;
    if (!buildServer) {
      // eslint-disable-next-line no-console
      console.log('buildServer not found on import');
      process.exit(0);
    }
    // call buildServer to reproduce import-time and runtime initialization
    await buildServer();
    // eslint-disable-next-line no-console
    console.log('buildServer returned successfully');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('repro-buildServer error:', err && (err.stack || err));
    process.exit(1);
  }
})();

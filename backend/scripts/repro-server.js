(async () => {
  try {
    const { buildServer } = await import('../dist/src/index.js');
    const server = await buildServer();
    console.log('Server built OK');
    await server.close();
  } catch (err) {
    console.error('Failed to build server:', err);
    process.exit(1);
  }
})();

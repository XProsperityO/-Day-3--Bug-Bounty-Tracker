(async () => {
  process.env.NODE_ENV = 'test';
  try {
    const mod = await import('../src/index.ts');
    const buildServer = mod.buildServer || mod.default && mod.default.buildServer;
    const server = await buildServer();
    const res = await server.inject({ method: 'POST', url: '/auth/register', payload: { email: `repro_${Date.now()}@example.com`, password: 'SuperSecurePass123!', displayName: 'Repro' } });
    console.log('status', res.statusCode, 'body', res.body);
    if (res.statusCode >= 500) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('repro-register error:', err && (err.stack || err));
    process.exit(1);
  }
})();

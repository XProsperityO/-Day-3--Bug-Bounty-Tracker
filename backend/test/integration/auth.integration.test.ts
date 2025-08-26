let prisma: any;

// Build server lazily inside each test to avoid import/registration side-effects during collection
async function getServer() {
  const mod = await import('../../src/index');
  const server = await mod.buildServer();
  prisma = (await import('../../src/lib/prisma')).prisma;
  return server;
}

describe('auth flow', () => {
  it('registers, logs in, refreshes and logs out', async () => {
    const server = await getServer();
    const email = `tester_${Date.now()}@example.com`;
    const password = 'SuperSecurePass123!';
    const registerRes = await server.inject({ method: 'POST', url: '/auth/register', payload: { email, password, displayName: 'Tester' } });
    expect(registerRes.statusCode).toBe(200);
    const { tokens } = registerRes.json();
    expect(tokens.access).toBeDefined();

    const loginRes = await server.inject({ method: 'POST', url: '/auth/login', payload: { email, password } });
    expect(loginRes.statusCode).toBe(200);

    const refreshRes = await server.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken: tokens.refresh } });
    expect(refreshRes.statusCode).toBe(200);

    const logoutRes = await server.inject({ method: 'POST', url: '/auth/logout', payload: { refreshToken: tokens.refresh } });
    expect(logoutRes.statusCode).toBe(200);
  });
});

// use global vitest APIs
// afterAll remains as a global
// afterAll removed temporarily during debugging to avoid collection-time side-effects

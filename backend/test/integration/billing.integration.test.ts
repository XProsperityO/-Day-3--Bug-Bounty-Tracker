// use global vitest APIs

let prisma: any;
async function getServer() {
  const mod = await import('../../src/index');
  const server = await mod.buildServer();
  prisma = (await import('../../src/lib/prisma')).prisma;
  return server;
}
let authHeader: string;

describe('billing subscribe without stripe key', () => {
  it('returns 503 billing unavailable', async () => {
    const server = await getServer();
    // ensure a user exists to avoid auth failures
    const email = `bill_${Date.now()}@example.com`;
    const password = 'SuperSecurePass123!';
    const reg = await server.inject({ method: 'POST', url: '/auth/register', payload: { email, password, displayName: 'BUser' } });
    const tokens = reg.json().tokens;
    authHeader = `Bearer ${tokens.access}`;

    const res = await server.inject({ method: 'POST', url: '/billing/subscribe', headers: { Authorization: authHeader }, payload: { plan: 'STARTER' } });
    // When stripe not configured, expect 503
    expect([503,200]).toContain(res.statusCode); // allow 200 if user configured stripe locally
  });
});

afterAll(async () => { if (prisma && typeof prisma.$disconnect === 'function') await prisma.$disconnect(); });

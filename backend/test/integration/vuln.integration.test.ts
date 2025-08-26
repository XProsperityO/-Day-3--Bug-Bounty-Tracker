// use global vitest APIs

let prisma: any;
async function getServer() {
  const mod = await import('../../src/index');
  const server = await mod.buildServer();
  prisma = (await import('../../src/lib/prisma')).prisma;
  return server;
}
let authHeader: string;

describe('vulnerability lifecycle', () => {
  it('creates and updates status', async () => {
    const server = await getServer();
    const email = `vuln_${Date.now()}@example.com`;
    const password = 'SuperSecurePass123!';
    const reg = await server.inject({ method: 'POST', url: '/auth/register', payload: { email, password, displayName: 'VUser' } });
    const tokens = reg.json().tokens;
    authHeader = `Bearer ${tokens.access}`;

    const create = await server.inject({ method: 'POST', url: '/vulnerabilities', headers: { Authorization: authHeader }, payload: { title: 'Test Vuln', description: 'Example description for vulnerability', severity: 'LOW' } });
    expect(create.statusCode).toBe(200);
    const vuln = create.json().vulnerability;
    const patch = await server.inject({ method: 'PATCH', url: `/vulnerabilities/${vuln.id}/status`, headers: { Authorization: authHeader }, payload: { status: 'REPORTED' } });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().vulnerability.status).toBe('REPORTED');
  });
});

afterAll(async () => { if (prisma && typeof prisma.$disconnect === 'function') await prisma.$disconnect(); });

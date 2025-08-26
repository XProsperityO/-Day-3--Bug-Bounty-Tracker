// Emulate minimal Vitest globals and then execute the auth integration test body to capture errors
(global as any).beforeAll = async (fn: any) => { try { await fn(); } catch (e) { console.error('[emulate] beforeAll error', e && (e.stack || String(e))); throw e; } };
(global as any).afterAll = async (fn: any) => { try { await fn(); } catch (e) { console.error('[emulate] afterAll error', e && (e.stack || String(e))); } };
(global as any).describe = (name: string, fn: any) => { try { fn(); } catch (e) { console.error('[emulate] describe error', e && (e.stack || String(e))); } };
(global as any).it = (name: string, fn: any) => { /* noop */ };
(global as any).expect = (val: any) => ({ toBe: () => {}, toBeDefined: () => {}, toContain: () => {} });

// --- start of inlined auth.integration.test.ts (vitest import removed) ---

let server: any;
let prisma: any;

beforeAll(async () => {
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret_1234567890123456';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_123456789012345678901234567890123456';
  if (!process.env.DATABASE_URL) {
    throw new Error('Set DATABASE_URL for integration tests');
  }
  try {
  const mod = await import('../src/index');
  server = await mod.buildServer();
  prisma = (await import('../src/lib/prisma')).prisma;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('buildServer threw in auth.integration beforeAll:', err && (err.stack || err));
    throw err;
  }
});

describe('auth flow', () => {
  it('registers, logs in, refreshes and logs out', async () => {
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

afterAll(async () => {
  await prisma.$disconnect();
});

// --- end of inlined test ---

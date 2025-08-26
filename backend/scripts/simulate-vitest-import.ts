// Lightweight simulation of vitest global functions to import a test file and capture errors
(global as any).describe = (name: string, fn: Function) => { try { fn(); } catch (e) { /* ignore */ } };
(global as any).it = (name: string, fn: Function) => { /* noop */ };
(global as any).beforeAll = (fn: Function) => { /* noop */ };
(global as any).afterAll = (fn: Function) => { /* noop */ };
(global as any).expect = (val: any) => ({ toBe: () => {}, toContain: () => {} });

import('dotenv/config');
(async () => {
  try {
    await import('../test/integration/billing.integration.test.ts');
    console.log('imported test file successfully');
  } catch (err) {
    console.error('simulated import error:', err && (err.stack || err));
    process.exit(1);
  }
})();

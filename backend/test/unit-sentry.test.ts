/// <reference types="vitest" />

describe('sentry lazy init', () => {
  it('does nothing when DSN is empty', async () => {
    const mod = await import('../src/lib/sentry.js');
    await mod.initSentry('');
    // When Sentry is not installed, initSentry is a no-op and global remains unset
    expect((globalThis as unknown as { __SENTRY__?: unknown }).__SENTRY__).toBeUndefined();
  });

  it('does not throw when DSN provided but @sentry/node is absent', async () => {
    const mod = await import('../src/lib/sentry.js');
    await expect(mod.initSentry('fake-dsn')).resolves.not.toThrow();
  });
});

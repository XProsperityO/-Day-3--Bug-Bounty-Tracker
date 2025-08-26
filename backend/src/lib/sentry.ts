// Lazy Sentry initializer. Dynamically imports @sentry/node when a DSN is provided.
export async function initSentry(dsn?: string | null) {
  if (!dsn || typeof dsn !== 'string' || dsn.trim() === '') return;
  try {
    const Sentry = await import('@sentry/node');
    // Optional: @sentry/tracing is not required; ignore if missing
    try { await import('@sentry/tracing'); } catch (e) { /* ok */ }
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'production',
      tracesSampleRate: 0.0
    });
    // Expose a small facade on globalThis for other modules to use without importing Sentry directly.
    (globalThis as any).__SENTRY__ = Sentry;
    // Provide a no-op capture for older code paths if necessary
    return Sentry;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Sentry initialization failed (optional):', err && (err instanceof Error ? err.message : String(err)));
    // leave global unset
  }
}

export function captureException(err: unknown) {
  try {
    const s = (globalThis as any).__SENTRY__;
    if (s && typeof s.captureException === 'function') s.captureException(err);
  } catch (e) {
    // swallow
  }
}

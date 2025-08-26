export default async function check() {
  try {
    const Sentry = await import('@sentry/node');
    // Call init with a disabled DSN to avoid network calls.
  Sentry.init({ dsn: process.env.SENTRY_DSN || '', tracesSampleRate: 0 });
  // Give Sentry a moment to initialize synchronously
  // Print a distinct message so the runner can detect success
  console.log('SENTRY_OK: Sentry imported and init called successfully');
  return 0;
  } catch (err) {
  // Print entire error for debugging
  console.error('SENTRY_ERR: Sentry import/init failed:', err);
  throw err;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // If run directly, execute check
  check().then(code => process.exit(code ?? 0));
}

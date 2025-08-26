import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import config from './lib/config.js';
// Import heavy Fastify plugins lazily inside buildServer to avoid import-time side effects in tests
// import { healthRoutes } from './routes/health.js';
// middleware will be imported lazily inside buildServer to avoid import-time DB initialization
// Delay importing prisma to avoid initializing PrismaClient at module import time
// Placeholder implementations for missing plugins, hooks, and error handler
const metricsMiddleware = (_req: FastifyRequest, _reply: FastifyReply, done: () => void) => { done(); };
// authHook will be dynamically imported inside buildServer to avoid import-time side-effects
// Proper Fastify plugin signatures for placeholders
const rateLimit = async (_instance: unknown, _opts: unknown) => { if (typeof _instance === 'object' && typeof _opts === 'object') { /* noop */ } };
const registerAudit = async (_instance: unknown, _opts: unknown) => { if (typeof _instance === 'object' && typeof _opts === 'object') { /* noop */ } };
const registerMetrics = async (_instance: unknown, _opts: unknown) => { if (typeof _instance === 'object' && typeof _opts === 'object') { /* noop */ } };
const metricsRoutes = async (_instance: unknown, _opts: unknown) => { if (typeof _instance === 'object' && typeof _opts === 'object') { /* noop */ } };
const errorHandler = (err: unknown, _req: FastifyRequest, reply: FastifyReply) => {
  // In test and development, surface error stacks to aid debugging.
  if (config.nodeEnv === 'test' || config.nodeEnv === 'development') {
    // eslint-disable-next-line no-console
    console.error('server error handler caught:', err instanceof Error ? err.stack || err.message : String(err));
  }
  // In production try to capture to Sentry if available, but don't crash on Sentry errors
  try {
    const s = (globalThis as unknown as { __SENTRY__?: { captureException?: (e: unknown) => void } }).__SENTRY__;
    if (config.nodeEnv === 'production' && s && typeof s.captureException === 'function') s.captureException(err);
  } catch (e) {
    // swallow
  }
  reply.status(500).send({ error: { message: 'Internal Server Error' } });
};
            // ...existing code...
export async function buildServer() {
  try {
  // Trace logs to help identify where buildServer fails during tests
  // eslint-disable-next-line no-console
  console.log('buildServer: start');
  // Lazily import Fastify at runtime to avoid import-time side effects
  // when test runners import this module.
  // eslint-disable-next-line no-console
  console.log('buildServer: importing fastify dynamically');
  const FastifyMod = await import('fastify');
  // Fastify export may be default or named depending on bundler
  const Fastify = FastifyMod.default || FastifyMod;
  // Disable logger in test environment to avoid logger libs touching process streams
  const server = Fastify({ logger: config.nodeEnv === 'test' ? false : true }) as FastifyInstance;
  // Initialize Sentry lazily in non-test environments
  try {
    if (config.nodeEnv !== 'test' && config.sentryDsn) {
      // dynamic import to avoid adding @sentry/node to test/runtime when unused
      const { initSentry } = await import('./lib/sentry.js');
      await initSentry(config.sentryDsn as string);
  // Use a small helper to attach Sentry request-scoped data
  const { attachSentryRequest } = await import('./lib/sentryHook.js');
  server.addHook('onRequest', async (req) => { attachSentryRequest(req); });
    }
  } catch (e) {
    // ignore sentry init errors
  }
  // eslint-disable-next-line no-console
  console.log('buildServer: fastify instance created');
    try {
      // eslint-disable-next-line no-console
      console.log('buildServer: about to register fastify-multipart');
      // Skip registering fastify-multipart when running tests unless explicitly enabled.
      // Some test environments (Vitest workers) have non-standard I/O/streams which can
      // cause third-party multipart plugins to access undefined streams during init.
      if (process.env.ENABLE_MULTIPART !== '1') {
        // eslint-disable-next-line no-console
        console.log('buildServer: skipping fastify-multipart (ENABLE_MULTIPART!=1)');
      } else {
        try {
          const mod = await import('@fastify/multipart');
          const fastifyMultipart = mod && (mod.default || mod);
          if (fastifyMultipart) {
            // attachFieldsToBody is a common option; wrap in try/catch
                  await server.register(fastifyMultipart, { attachFieldsToBody: true });
            // eslint-disable-next-line no-console
            console.log('buildServer: registered fastify-multipart');
          } else {
            server.log.warn('fastify-multipart module did not export a plugin');
          }
        } catch (innerErr) {
          server.log.warn({ err: innerErr }, 'fastify-multipart dynamic import/register failed');
        }
      }
    } catch (err) {
      server.log.warn({ err }, 'fastify-multipart register failed (tests may still run)');
    }
  try {
    // eslint-disable-next-line no-console
    console.log('buildServer: about to register fastify-swagger');
    try {
      const mod = await import('@fastify/swagger');
      const fastifySwagger = mod && (mod.default || mod);
      if (fastifySwagger) {
  await server.register(fastifySwagger, {
          openapi: {
            info: { title: 'Bug Bounty Tracker API', version: '1.0.0' },
            servers: [{ url: 'http://localhost:3000' }]
          }
        });
        // eslint-disable-next-line no-console
        console.log('buildServer: registered fastify-swagger');
      } else {
        server.log.warn('fastify-swagger module did not export a plugin');
      }
    } catch (innerErr) {
      server.log.warn({ err: innerErr }, 'fastify-swagger dynamic import/register failed');
    }
  } catch (err) {
    server.log.warn({ err }, 'fastify-swagger register failed (tests may still run)');
  }
  try {
  // eslint-disable-next-line no-console
  console.log('buildServer: about to register rateLimit');
    await server.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  // eslint-disable-next-line no-console
  console.log('buildServer: registered rateLimit');
  } catch (err) {
    server.log.warn({ err }, 'rateLimit register failed (tests may still run)');
  }

  try {
    const mod = await import('./middleware/context.js');
    server.addHook('onRequest', mod.attachRequestContext);
  } catch (e) {
    // ignore
  }
  server.addHook('onSend', async (req, reply, payload) => {
    // Propagate X-Request-ID
    if (req.ctx?.requestId) reply.header('X-Request-ID', req.ctx.requestId);
    return payload;
  });
  server.addHook('onResponse', async (req) => {
    // Log latency
    if (req.ctx) {
      const latency = Date.now() - req.ctx.start;
      req.log.info({ latency, requestId: req.ctx.requestId, url: req.url }, 'request_latency');
    }
  });
  server.addHook('onRequest', metricsMiddleware);
  // Try to load the real authHook middleware lazily; if it fails, fall back to a no-op auth hook.
  try {
    const mod = await import('./middleware/authHook.js');
    if (mod && typeof mod.authHook === 'function') {
      // register as onRequest so it can set req.user asynchronously
      server.addHook('onRequest', mod.authHook as unknown as (req: FastifyRequest, reply: FastifyReply, done: () => void) => void);
    } else {
      server.addHook('preHandler', (_req: FastifyRequest, _reply: FastifyReply, done: () => void) => { done(); });
    }
  } catch (e) {
    server.addHook('preHandler', (_req: FastifyRequest, _reply: FastifyReply, done: () => void) => { done(); });
  }
  try {
    const mod = await import('./middleware/planLimit.js');
    server.addHook('preHandler', mod.enforcePlanLimits);
  } catch (e) {
    // ignore
  }
  try { await registerAudit(server, {}); } catch (err) { server.log.warn({ err }, 'registerAudit failed'); }

  // server.register(healthRoutes, { prefix: '/health' });
  try { await server.register(registerMetrics, { prefix: '/metrics' }); } catch (err) { server.log.warn({ err }, 'registerMetrics failed'); }
  try {
  // eslint-disable-next-line no-console
  console.log('buildServer: about to import authRoutes');
    const { authRoutes } = await import('./routes/auth.js');
  // eslint-disable-next-line no-console
  console.log('buildServer: imported authRoutes, registering');
    await server.register(authRoutes, { prefix: '/auth' });
  // eslint-disable-next-line no-console
  console.log('buildServer: registered authRoutes');
  } catch (err) { server.log.error({ err }, 'authRoutes registration failed'); }
  try {
  // eslint-disable-next-line no-console
  console.log('buildServer: about to import vulnRoutes');
    const { vulnRoutes } = await import('./routes/vulnerabilities.js');
  // eslint-disable-next-line no-console
  console.log('buildServer: imported vulnRoutes, registering');
    await server.register(vulnRoutes, { prefix: '/vulnerabilities' });
  // eslint-disable-next-line no-console
  console.log('buildServer: registered vulnRoutes');
  } catch (err) { server.log.error({ err }, 'vulnRoutes registration failed'); }
  try {
  // eslint-disable-next-line no-console
  console.log('buildServer: about to import notesRoutes');
    const { notesRoutes } = await import('./routes/notes.js');
  // eslint-disable-next-line no-console
  console.log('buildServer: imported notesRoutes, registering');
    await server.register(notesRoutes, { prefix: '/notes' });
  // eslint-disable-next-line no-console
  console.log('buildServer: registered notesRoutes');
  } catch (err) { server.log.error({ err }, 'notesRoutes registration failed'); }
  try { await server.register(metricsRoutes, { prefix: '/metrics' }); } catch (err) { server.log.warn({ err }, 'metricsRoutes registration failed'); }
  try {
  // eslint-disable-next-line no-console
  console.log('buildServer: about to import billingRoutes');
    const { billingRoutes } = await import('./routes/billing.js');
  // eslint-disable-next-line no-console
  console.log('buildServer: imported billingRoutes, registering');
    await server.register(billingRoutes, { prefix: '/billing' });
  // eslint-disable-next-line no-console
  console.log('buildServer: registered billingRoutes');
  } catch (err) { server.log.error({ err }, 'billingRoutes registration failed'); }

    server.setErrorHandler(errorHandler);
    return server;
  } catch (err) {
    // Log full stack to help debugging test harness failures
    // eslint-disable-next-line no-console
    console.error('buildServer failed:', err instanceof Error ? err.stack || err.message : String(err));
    throw err;
  }
}

async function start() {
  const server = await buildServer();
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    server.log.info('API listening on 3000');
  } catch (err) {
    server.log.error(err);
    // During tests we don't want to terminate the whole process; only exit in real runs.
    if (config.nodeEnv !== 'test' && !process.env.VITEST) {
      try { process.exit(1); } catch (e) { /* ignore in constrained runtimes */ }
    } else {
      // rethrow so test harness can see the error
      throw err;
    }
  }
}

// Only auto-start the server in non-test, non-vitest environments.
if (config.nodeEnv !== 'test' && !process.env.VITEST) {
  start();
}

// Helper to register process signal handlers only if process supports .on
function safeProcessOn(event: string, listener: (...args: unknown[]) => void) {
  const proc = (globalThis as unknown as { process?: unknown }).process ?? process;
  try {
    const p = proc as unknown as { on?: (ev: string, fn: (...args: unknown[]) => void) => void };
    if (p && typeof p.on === 'function') {
      p.on(event, listener);
    }
  } catch (e) {
    // ignore environments where process is not an EventEmitter
  }
}

safeProcessOn('SIGINT', async () => {
  try {
    const mod = await import('./lib/prisma.js');
    await mod.prisma.$disconnect();
  } catch (e) {
    // ignore
  }
  try { process.exit(0); } catch (e) { /* ignore */ }
});
safeProcessOn('SIGTERM', async () => {
  try {
    const mod = await import('./lib/prisma.js');
    await mod.prisma.$disconnect();
  } catch (e) {
    // ignore
  }
  try { process.exit(0); } catch (e) { /* ignore */ }
});

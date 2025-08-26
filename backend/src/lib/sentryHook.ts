import type { FastifyRequest } from 'fastify';

type SentryScope = { setUser?: (user: { id?: string; email?: string }) => void; setTag?: (k: string, v: string) => void };
type SentryLike = { configureScope?: (cb: (scope: SentryScope) => void) => void };

export function attachSentryRequest(req: FastifyRequest) {
  try {
    const maybe = (globalThis as unknown as { __SENTRY__?: SentryLike }).__SENTRY__;
    if (maybe && typeof maybe.configureScope === 'function') {
      maybe.configureScope((scope) => {
        try {
          const u = (req as unknown as { user?: { id?: string; email?: string } }).user;
          if (u && typeof scope.setUser === 'function') scope.setUser({ id: u.id, email: u.email });
        } catch (e) { /* ignore */ }
        try {
          if (typeof scope.setTag === 'function') {
            const routerPath = (req as unknown as Record<string, unknown>)['routerPath'];
            const rp = typeof routerPath === 'string' ? routerPath : undefined;
            scope.setTag('route', rp || req.url || 'unknown');
          }
        } catch (e) { /* ignore */ }
      });
    }
  } catch (e) {
    // ignore
  }
}

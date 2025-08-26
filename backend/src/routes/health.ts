import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import Stripe from 'stripe';
import { env } from '../lib/config.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/live', async () => ({ status: 'ok' }));
  app.get('/ready', async (_req: FastifyRequest, reply: FastifyReply) => {
    const checks: Record<string, unknown> = {};
    // DB check
    const dbStart = Date.now();
    try { await prisma.$queryRaw`SELECT 1`; checks.db = { status: 'ok', latencyMs: Date.now() - dbStart }; } catch (e) { checks.db = { status: 'fail', error: String(e) }; }
    // Stripe check
    if (env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY);
        const products = await stripe.products.list({ limit: 1 });
        checks.stripe = { status: 'ok', productCount: products.data.length };
      } catch (e) {
        checks.stripe = { status: 'fail', error: String(e) };
      }
    } else {
      checks.stripe = { status: 'skipped' };
    }
    // Backup/restore hooks (placeholder)
    checks.backup = { status: 'skipped' };
    checks.restore = { status: 'skipped' };
    // Overall
  const ok = Object.values(checks).every((c) => (c as { status: string }).status === 'ok' || (c as { status: string }).status === 'skipped');
    if (!ok) return reply.status(500).send({ status: 'fail', checks });
    return { status: 'ok', checks };
  });
  // Backup/restore endpoints (admin only, placeholder)
  app.post('/backup', async (_req: FastifyRequest, reply: FastifyReply) => {
    // TODO: implement DB dump, file upload, etc.
    reply.send({ status: 'not_implemented' });
  });
  app.post('/restore', async (_req: FastifyRequest, reply: FastifyReply) => {
    // TODO: implement DB restore, file download, etc.
    reply.send({ status: 'not_implemented' });
  });
}

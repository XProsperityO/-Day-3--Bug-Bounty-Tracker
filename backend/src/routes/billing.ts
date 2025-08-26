import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Readable } from 'stream';
import { z } from 'zod';
import Stripe from 'stripe';
import { env } from '../lib/config.js';
import { prisma } from '../lib/prisma.js';

const planSchema = z.object({ plan: z.enum(['STARTER','PROFESSIONAL','ENTERPRISE']) });

// Stripe client is lazily instantiated inside billingRoutes to avoid import-time side effects
let stripe: Stripe | null = null;

const PRICE_MAP: Record<string,string> = {
  STARTER: process.env.STRIPE_PRICE_STARTER || 'price_starter_placeholder',
  PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_pro_placeholder',
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || 'price_ent_placeholder'
};

export async function billingRoutes(app: FastifyInstance) {
  if (!stripe && env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }
  app.post('/subscribe', { preHandler: ensureAuth }, async (req: FastifyRequest, reply: FastifyReply) => {
    if (!stripe) return reply.status(503).send({ error: { message: 'Billing unavailable' } });
  const user = (req as FastifyRequest & { user?: { id: string; email?: string } }).user;
  if (!user) return reply.status(401).send({ error: { message: 'Unauthorized' } });
  const { plan } = planSchema.parse(req.body);
    const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { plan: true } });
    // Only allow upgrade, not downgrade
    const planOrder = ['STARTER','PROFESSIONAL','ENTERPRISE'];
    if (fresh?.plan && planOrder.indexOf(plan) < planOrder.indexOf(fresh.plan)) {
      return reply.status(400).send({ error: { message: 'Downgrade not allowed via self-service. Contact support.' } });
    }
    const priceId = PRICE_MAP[plan];
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.APP_BASE_URL || 'http://localhost:5173'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.APP_BASE_URL || 'http://localhost:5173'}/billing/cancel`,
      customer_email: user.email,
      metadata: { userId: user.id, plan }
    });
    reply.send({ checkoutUrl: session.url });
  });

  app.post('/webhook/stripe', async (req: FastifyRequest, reply: FastifyReply) => {
    // Require Stripe to be configured
    if (!stripe) return reply.status(503).send();

    // Allow multiple webhook secrets for rotation: STRIPE_WEBHOOK_SECRET and STRIPE_WEBHOOK_SECRET_OLD
    const webhookSecrets = [] as string[];
    if (env.STRIPE_WEBHOOK_SECRET) webhookSecrets.push(env.STRIPE_WEBHOOK_SECRET);
    if (process.env.STRIPE_WEBHOOK_SECRET_OLD) webhookSecrets.push(process.env.STRIPE_WEBHOOK_SECRET_OLD);
    if (webhookSecrets.length === 0) return reply.status(503).send();

    const sig = req.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') return reply.status(400).send({ error: { message: 'Missing stripe-signature header' } });

    const raw = (req as FastifyRequest & { rawBody?: string }).rawBody || (await getRawBody(req));
    let event: Stripe.Event | null = null;
    // Try each webhook secret to support rotation
    for (const secret of webhookSecrets) {
      try {
        event = stripe.webhooks.constructEvent(raw, sig as string, secret);
        break;
      } catch (err) {
        // Continue to next secret
      }
    }
    if (!event) {
      // eslint-disable-next-line no-console
      console.warn('stripe webhook signature verification failed for available secrets');
      return reply.status(400).send({ error: { message: 'Webhook signature verification failed' } });
    }
    // handle relevant events
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan as string | undefined;
      if (userId && plan && ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(plan)) {
        const planValue = plan as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
        try {
          // Idempotency: only update when subscriptionId differs or plan is not already set
          const existing = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true, subscriptionId: true } });
          const newSub = (session.subscription as string | undefined) ?? undefined;
          if (!existing || existing.subscriptionId !== newSub || existing.plan !== planValue) {
            await prisma.user.update({ where: { id: userId }, data: { plan: planValue, planUpdatedAt: new Date(), subscriptionId: newSub, customerId: session.customer as string | undefined } });
          } else {
            // already in desired state; ignore
          }
        } catch (err) {
          // Log the error, but respond 200 to avoid Stripe retries causing duplicate processing loops.
          // eslint-disable-next-line no-console
          console.error('Error applying checkout.session.completed to DB:', err instanceof Error ? err.stack || err.message : String(err));
        }
      }
    }
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      try {
        const user = await prisma.user.findFirst({ where: { subscriptionId: sub.id } });
        if (user) {
          await prisma.user.update({ where: { id: user.id }, data: { plan: 'STARTER', planUpdatedAt: new Date(), subscriptionId: undefined } });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error applying customer.subscription.deleted to DB:', err instanceof Error ? err.stack || err.message : String(err));
      }
    }
    reply.send({ received: true });
  });
}

function ensureAuth(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!(req as FastifyRequest & { user?: { id: string } }).user) return reply.status(401).send({ error: { message: 'Unauthorized' } });
  done();
}

async function getRawBody(req: FastifyRequest): Promise<string> {
  return await new Promise((resolve, reject) => {
    let data = '';
    try {
      const maybeRaw = (req as FastifyRequest & { raw?: import('http').IncomingMessage; rawBody?: string }).raw;
      if (maybeRaw && typeof maybeRaw === 'object') {
        const streamCandidate = maybeRaw as unknown as Readable | undefined;
        if (streamCandidate && typeof streamCandidate.on === 'function') {
          const stream = streamCandidate as Readable;
          stream.on('data', (chunk: Buffer | string) => { data += typeof chunk === 'string' ? chunk : chunk.toString(); });
          stream.on('end', () => resolve(data));
          stream.on('error', reject);
          return;
        }
      }
    } catch (e) {
      // Defensive: if accessing req.raw throws in certain test harnesses, ignore and continue to fallbacks
      // eslint-disable-next-line no-console
      const err = e as Error;
      console.warn('getRawBody: reading req.raw threw, falling back to alternatives', err && (err.stack || String(err)));
    }
    // Fallback: some test harnesses attach rawBody directly
    const rawBody = (req as FastifyRequest & { rawBody?: string }).rawBody;
    if (typeof rawBody === 'string') return resolve(rawBody);
    // Final fallback: attempt to read from req as any stream-like object
    try {
      const anyReq = req as unknown as Readable | undefined;
      if (anyReq && typeof anyReq.on === 'function') {
        // Some test runners or frameworks may expose a readable-like interface on req
        anyReq.on('data', (chunk: Buffer | string) => { data += typeof chunk === 'string' ? chunk : chunk.toString(); });
        anyReq.on('end', () => resolve(data));
        anyReq.on('error', (err: unknown) => reject(err));
        return;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      const err = e as Error;
      console.warn('getRawBody: reading req as stream threw, falling back to empty body', err && (err.stack || String(err)));
    }
    resolve('');
  });
}

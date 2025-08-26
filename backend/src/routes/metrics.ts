import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma.js';

export async function metricsRoutes(app: FastifyInstance) {
  function ensureAuth(req: FastifyRequest, reply: FastifyReply, done: () => void) {
    if (!(req as FastifyRequest & { user?: { id: string } }).user) {
      return reply.status(401).send({ error: { message: 'Unauthorized' } });
    }
    done();
  }

  app.addHook('onRequest', ensureAuth);

  app.get('/summary', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as FastifyRequest & { user?: { id: string } }).user;
    if (!user) return reply.status(401).send({ error: { message: 'Unauthorized' } });
    const [total, paid, open] = await Promise.all([
      prisma.vulnerability.count({ where: { userId: user.id } }),
      prisma.vulnerability.count({ where: { userId: user.id, status: 'PAID' } }),
      prisma.vulnerability.count({ where: { userId: user.id, status: { in: ['OPEN','REPORTED','TRIAGED'] } } }),
    ]);
    const earnings = await prisma.vulnerability.aggregate({ _sum: { payoutAmount: true }, where: { userId: user.id, payoutAmount: { not: null } } });
    reply.send({ metrics: { total, paid, open, totalEarnings: earnings._sum.payoutAmount || 0 } });
  });
}

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export function registerAudit(server: FastifyInstance) {
  server.addHook('onResponse', async (req: FastifyRequest, reply: FastifyReply) => {
  const userId = req.user?.id;
    const sensitive = req.url.startsWith('/auth') || req.url.startsWith('/billing');
    if (sensitive) {
  server.log.info({ audit: true, compliance: true, eventType: 'ACCESS', userId, method: req.method, url: req.url, status: reply.statusCode, ip: req.ip, requestId: req.ctx?.requestId }, 'audit');
    }
  });
}

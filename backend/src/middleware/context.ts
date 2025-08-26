import { FastifyRequest } from 'fastify';
import { randomUUID } from 'crypto';

export interface RequestContext { requestId: string; start: number }
declare module 'fastify' { interface FastifyRequest { ctx?: RequestContext; user?: { id: string; email?: string; role?: string; totpEnabled?: boolean; plan?: string | null } } }
export async function attachRequestContext(req: FastifyRequest) {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.ctx = { requestId, start: Date.now() };
  req.log = req.log.child({ requestId });
}

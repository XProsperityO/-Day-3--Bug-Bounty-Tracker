import { FastifyRequest } from 'fastify';
import { verifyAccess } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

const publicPaths = [
  { method: 'POST', path: '/auth/register' },
  { method: 'POST', path: '/auth/login' },
  { method: 'POST', path: '/auth/refresh' },
];

export async function authHook(req: FastifyRequest) {
  if (publicPaths.some(p => p.method === req.method && req.url.startsWith(p.path))) return;
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return; // optional auth (some endpoints also check explicitly)
  const token = auth.slice(7);
  try {
    const payload = verifyAccess(token);
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  (req as FastifyRequest & { user?: { id: string; email?: string; totpEnabled?: boolean; plan?: string | null } | undefined }).user = user || undefined;
  } catch {
    // ignore, user stays undefined
  }
}

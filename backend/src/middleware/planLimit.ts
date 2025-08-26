import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma.js';

// Simple plan-based limit middleware scaffold: restrict vulnerability count for STARTER
export async function enforcePlanLimits(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user;
  if (!user) return;
  // RBAC: Only ADMIN can access /metrics, /backup, /restore
  if (['/metrics','/health/backup','/health/restore'].includes(req.url) && user.role !== 'ADMIN') {
    return reply.status(403).send({ error: { message: 'Admin access required.' } });
  }
  // Plan limits
  const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { plan: true } });
  const plan = fresh?.plan || 'STARTER';
  const limits = {
    STARTER: { vulnerabilities: 25, notes: 50, submissions: 10 },
    PROFESSIONAL: { vulnerabilities: 250, notes: 500, submissions: 100 },
    ENTERPRISE: { vulnerabilities: 10000, notes: 10000, submissions: 1000 }
  };
  // Vulnerabilities
  if (req.method === 'POST' && req.url.startsWith('/vulnerabilities')) {
    const count = await prisma.vulnerability.count({ where: { userId: user.id } });
    if (count >= limits[plan].vulnerabilities) {
      return reply.status(402).send({ error: { message: `${plan} plan limit reached (${limits[plan].vulnerabilities} vulnerabilities). Upgrade plan to add more.` } });
    }
  }
  // Notes
  if (req.method === 'POST' && req.url.startsWith('/notes')) {
    const count = await prisma.note.count({ where: { userId: user.id } });
    if (count >= limits[plan].notes) {
      return reply.status(402).send({ error: { message: `${plan} plan limit reached (${limits[plan].notes} notes). Upgrade plan to add more.` } });
    }
  }
  // Submissions
  if (req.method === 'POST' && req.url.startsWith('/submissions')) {
    const count = await prisma.submission.count({ where: { vulnerability: { userId: user.id } } });
    if (count >= limits[plan].submissions) {
      return reply.status(402).send({ error: { message: `${plan} plan limit reached (${limits[plan].submissions} submissions). Upgrade plan to add more.` } });
    }
  }
}

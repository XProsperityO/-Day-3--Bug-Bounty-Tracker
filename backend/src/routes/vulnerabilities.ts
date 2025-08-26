import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { computeCvss } from '../lib/cvss.js';

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  severity: z.enum(['INFO','LOW','MEDIUM','HIGH','CRITICAL']).default('MEDIUM'),
  target: z.string().optional(),
  tags: z.array(z.string()).default([]),
  cvssVector: z.string().optional()
});

const updateStatusSchema = z.object({ status: z.enum(['OPEN','REPORTED','TRIAGED','RESOLVED','REJECTED','DUPLICATE','PAID']) });

export async function vulnRoutes(app: FastifyInstance) {
  app.addHook('onRequest', ensureAuth);

  app.post('/', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as FastifyRequest & { user?: { id: string } }).user;
    if (!user) return reply.status(401).send({ error: { message: 'Unauthorized' } });
    const data = createSchema.parse(req.body);
    let cvssScore: number | undefined;
    if (data.cvssVector) {
      try {
        cvssScore = await computeCvss(data.cvssVector);
      } catch {
        return reply.status(400).send({ error: { message: 'Invalid CVSS vector' } });
      }
    }
    const { cvssVector, ...rest } = data;
    const vuln = await prisma.vulnerability.create({ data: { ...rest, cvssVector, cvssScore, userId: user.id } });
    reply.send({ vulnerability: vuln });
  });

  app.get('/', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as FastifyRequest & { user?: { id: string } }).user;
    if (!user) return reply.status(401).send({ error: { message: 'Unauthorized' } });
    const list = await prisma.vulnerability.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
    reply.send({ vulnerabilities: list });
  });

  app.patch('/:id/status', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as FastifyRequest & { user?: { id: string } }).user;
    if (!user) return reply.status(401).send({ error: { message: 'Unauthorized' } });
    const { id } = req.params as { id: string };
    const { status } = updateStatusSchema.parse(req.body);
    const vuln = await prisma.vulnerability.findFirst({ where: { id, userId: user.id } });
    if (!vuln) return reply.status(404).send({ error: { message: 'Not found' } });
    // auto timestamp transitions
    const timestampData: Record<string, unknown> = {};
    if (status === 'REPORTED' && !vuln.reportedAt) timestampData.reportedAt = new Date();
    if (status === 'RESOLVED' && !vuln.resolvedAt) timestampData.resolvedAt = new Date();
    if (status === 'PAID' && !vuln.paidAt) timestampData.paidAt = new Date();
    const updated = await prisma.vulnerability.update({ where: { id }, data: { status, ...timestampData } });
    reply.send({ vulnerability: updated });
  });
  // Evidence file upload (MVP: metadata only)
  app.post('/:id/evidence', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as FastifyRequest & { user?: { id: string } }).user;
    if (!user) return reply.status(401).send({ error: { message: 'Unauthorized' } });
    const { id } = req.params as { id: string };
    const vuln = await prisma.vulnerability.findFirst({ where: { id, userId: user.id } });
    if (!vuln) return reply.status(404).send({ error: { message: 'Not found' } });
    // Accept multipart/form-data with file
    if (!req.isMultipart()) return reply.status(400).send({ error: { message: 'Expected multipart/form-data' } });
    const parts = req.files();
    let file: { filename?: string; mimetype?: string; file?: { length?: number } } | undefined;
    for await (const p of parts) {
      // first file only for MVP
      file = p as unknown as { filename?: string; mimetype?: string; file?: { length?: number } };
      break;
    }
    if (!file || !file.filename) return reply.status(400).send({ error: { message: 'No file uploaded' } });
    // Store metadata only (MVP)
    const meta = {
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.file?.length ?? 0,
      uploadedAt: new Date()
    };
    // TODO: store file in S3 or local disk, save reference in DB
    reply.send({ evidence: meta });
  });
}

function ensureAuth(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!(req as FastifyRequest & { user?: { id: string } }).user) return reply.status(401).send({ error: { message: 'Unauthorized' } });
  done();
}

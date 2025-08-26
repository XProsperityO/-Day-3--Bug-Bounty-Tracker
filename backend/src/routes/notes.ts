import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

const createSchema = z.object({ title: z.string().min(2), content: z.string().min(1), tags: z.array(z.string()).default([]), vulnerabilityId: z.string().uuid().optional() });

export async function notesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', ensureAuth);

  app.post('/', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as FastifyRequest & { user?: { id: string } }).user;
    const data = createSchema.parse(req.body);
    const note = await prisma.note.create({ data: { ...data, userId: user!.id } });
    reply.send({ note });
  });

  app.get('/', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as FastifyRequest & { user?: { id: string } }).user;
    const notes = await prisma.note.findMany({ where: { userId: user!.id }, orderBy: { createdAt: 'desc' } });
    reply.send({ notes });
  });
  // Evidence file upload for notes (MVP: metadata only)
  app.post('/:id/evidence', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as FastifyRequest & { user?: { id: string } }).user;
    if (!user) return reply.status(401).send({ error: { message: 'Unauthorized' } });
    const { id } = req.params as { id: string };
    const note = await prisma.note.findFirst({ where: { id, userId: user.id } });
    if (!note) return reply.status(404).send({ error: { message: 'Not found' } });
    if (!req.isMultipart()) return reply.status(400).send({ error: { message: 'Expected multipart/form-data' } });
    const parts = req.files();
    let file: { filename?: string; mimetype?: string; file?: { length?: number } } | undefined;
    for await (const p of parts) {
      file = p as unknown as { filename?: string; mimetype?: string; file?: { length?: number } };
      break;
    }
    if (!file || !file.filename) return reply.status(400).send({ error: { message: 'No file uploaded' } });
    const meta = {
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.file?.length ?? 0,
      uploadedAt: new Date()
    };
    reply.send({ evidence: meta });
  });
}

function ensureAuth(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!(req as FastifyRequest & { user?: { id: string } }).user) return reply.status(401).send({ error: { message: 'Unauthorized' } });
  done();
}

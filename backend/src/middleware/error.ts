import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export function errorHandler(error: FastifyError, _req: FastifyRequest, reply: FastifyReply) {
  const status = error.statusCode || 500;
  reply.status(status).send({ error: { message: status === 500 ? 'Internal error' : error.message, code: error.code || 'ERR_GENERAL' } });
}

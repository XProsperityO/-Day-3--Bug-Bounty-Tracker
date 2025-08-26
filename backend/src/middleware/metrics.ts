import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import client from 'prom-client';

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5]
});
const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

export async function metricsMiddleware(req: FastifyRequest) {
  (req as unknown as { metricsStart?: [number, number] }).metricsStart = process.hrtime();
}

export async function registerMetrics(app: FastifyInstance) {
  app.get('/', async (_req, reply) => {
    reply.header('Content-Type', client.register.contentType);
    reply.send(await client.register.metrics());
  });
  app.addHook('onResponse', async (req: FastifyRequest, reply: FastifyReply) => {
    const start = (req as unknown as { metricsStart?: [number, number] }).metricsStart;
    if (start) {
      const diff = process.hrtime(start);
      const duration = diff[0] + diff[1] / 1e9;
      httpRequestDuration.labels(req.method, req.routerPath || req.url, String(reply.statusCode)).observe(duration);
      httpRequestTotal.labels(req.method, req.routerPath || req.url, String(reply.statusCode)).inc();
    }
  });
}

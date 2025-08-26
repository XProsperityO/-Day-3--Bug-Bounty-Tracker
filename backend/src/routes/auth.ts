import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import argon2 from 'argon2';
import { z } from 'zod';
import { signAccessToken, signRefreshToken, verifyRefresh } from '../lib/jwt.js';
import { authenticator } from 'otplib';
import crypto from 'crypto';

const registerSchema = z.object({ email: z.string().email(), password: z.string().min(10), displayName: z.string().min(2).max(60) });
const loginSchema = z.object({ email: z.string().email(), password: z.string() });

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (req: FastifyRequest, reply: FastifyReply) => {
    const { email, password, displayName } = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return reply.status(400).send({ error: { message: 'Email already used' } });
    // Prefer Argon2id; fallback to bcrypt only if Argon2 fails (env without native build)
    let passwordHash: string;
    try {
      passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    } catch {
      passwordHash = await bcrypt.hash(password, 12);
    }
    const user = await prisma.user.create({ data: { email, passwordHash, displayName } });
    const access = signAccessToken(user.id);
    const refresh = signRefreshToken(user.id);
    await storeRefresh(user.id, refresh);
    return { user: publicUser(user), tokens: { access, refresh } };
  });

  app.post('/login', async (req: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return reply.status(400).send({ error: { message: 'Invalid credentials' } });
    let valid = false;
    if (user.passwordHash.startsWith('$argon2')) {
      try { valid = await argon2.verify(user.passwordHash, password); } catch { valid = false; }
    } else {
      valid = await bcrypt.compare(password, user.passwordHash);
    }
    if (!valid) return reply.status(400).send({ error: { message: 'Invalid credentials' } });
    const access = signAccessToken(user.id);
    const refresh = signRefreshToken(user.id);
    await storeRefresh(user.id, refresh);
    return { user: publicUser(user), tokens: { access, refresh } };
  });

  app.post('/refresh', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { refreshToken?: string } | undefined;
    const token = body?.refreshToken;
    if (!token) return reply.status(400).send({ error: { message: 'Missing token' } });
    try {
      const payload = verifyRefresh(token);
      const hash = hashToken(token);
      const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
      if (!stored || stored.revoked || stored.expiresAt < new Date()) throw new Error('invalid');
      // rotate
      await prisma.refreshToken.update({ where: { tokenHash: hash }, data: { revoked: true } });
      const newRefresh = signRefreshToken(payload.sub);
      await storeRefresh(payload.sub, newRefresh);
      const access = signAccessToken(payload.sub);
      return { tokens: { access, refresh: newRefresh } };
    } catch {
      return reply.status(401).send({ error: { message: 'Invalid refresh token' } });
    }
  });

  app.post('/logout', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { refreshToken?: string } | undefined;
    const token = body?.refreshToken;
    if (!token) return reply.status(400).send({ error: { message: 'Missing token' } });
    const hash = hashToken(token);
    await prisma.refreshToken.update({ where: { tokenHash: hash }, data: { revoked: true } }).catch(() => {});
    reply.send({ success: true });
  });

  // TOTP enrollment (simple MVP; ensure HTTPS & encryption in production)
  app.post('/totp/enroll', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user; if (!user) return reply.status(401).send({ error: { message: 'Unauthorized' } });
    if (user.totpEnabled) return reply.status(400).send({ error: { message: 'Already enabled' } });
    const secret = authenticator.generateSecret();
    await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret } });
  const otpauth = authenticator.keyuri(user.email || 'user', 'BugBountyTracker', secret);
    reply.send({ otpauth });
  });

  app.post('/totp/verify', async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user; if (!user) return reply.status(401).send({ error: { message: 'Unauthorized' } });
    const body = req.body as { code?: string } | undefined;
    const code = body?.code; if (!code) return reply.status(400).send({ error: { message: 'Missing code' } });
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fresh?.totpSecret) return reply.status(400).send({ error: { message: 'Not enrolled' } });
    const valid = authenticator.check(code, fresh.totpSecret);
    if (!valid) return reply.status(400).send({ error: { message: 'Invalid code' } });
    await prisma.user.update({ where: { id: user.id }, data: { totpEnabled: true } });
    reply.send({ success: true });
  });
}

interface UserRecord { id: string; email: string; passwordHash: string; displayName?: string | null; role: string; totpSecret?: string | null; totpEnabled: boolean; plan?: string | null }
function publicUser(u: UserRecord) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _, totpSecret: __, ...rest } = u;
  return rest;
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function storeRefresh(userId: string, token: string) {
  const payload = verifyRefresh(token);
  const hash = hashToken(token);
  const expSec = (payload.exp ?? (Math.floor(Date.now()/1000) + 7*24*60*60));
  const exp = new Date(expSec * 1000);
  await prisma.refreshToken.create({ data: { userId, tokenHash: hash, expiresAt: exp } });
}

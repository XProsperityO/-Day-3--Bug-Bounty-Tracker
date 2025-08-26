import jwt, { SignOptions } from 'jsonwebtoken';
import { nanoid } from 'nanoid';

// Secrets pulled lazily to allow config validation layer to run first
function accessSecret() {
  if (!process.env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET missing');
  return process.env.JWT_ACCESS_SECRET;
}
function refreshSecret() {
  if (!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET missing');
  return process.env.JWT_REFRESH_SECRET;
}

export interface AccessJwtPayload { sub: string; type: 'access'; [k: string]: unknown }
export interface RefreshJwtPayload { sub: string; type: 'refresh'; jti: string; exp?: number }
export function signAccessToken(userId: string, extra: Record<string, unknown> = {}) {
  const minutes = parseInt(process.env.ACCESS_TOKEN_TTL_MINUTES || '10', 10);
  const opts: SignOptions = { expiresIn: minutes * 60 }; // seconds
  return jwt.sign({ sub: userId, type: 'access', ...extra } as AccessJwtPayload, accessSecret(), opts);
}

export function signRefreshToken(userId: string) {
  const days = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10);
  const opts: SignOptions = { expiresIn: days * 24 * 60 * 60 }; // seconds
  return jwt.sign({ sub: userId, type: 'refresh', jti: nanoid() } as RefreshJwtPayload, refreshSecret(), opts);
}

export function verifyAccess(token: string): AccessJwtPayload {
  return jwt.verify(token, accessSecret()) as AccessJwtPayload;
}

export function verifyRefresh(token: string): RefreshJwtPayload {
  return jwt.verify(token, refreshSecret()) as RefreshJwtPayload;
}

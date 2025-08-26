import { signAccessToken, verifyAccess } from '../src/lib/jwt';

describe('jwt helpers', () => {
  it('signs and verifies access token', () => {
    process.env.JWT_ACCESS_SECRET = 'test_access_secret_1234567890123456';
  const token = signAccessToken('user123');
  const payload = verifyAccess(token) as { sub: string };
  expect(payload.sub).toBe('user123');
  });
});
